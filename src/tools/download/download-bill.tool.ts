import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { xeroClient } from "../../clients/xero-client.js";
import { getClientHeaders } from "../../helpers/get-client-headers.js";
import { formatError } from "../../helpers/format-error.js";
import { Invoice } from "xero-node";

const DownloadBillTool = CreateXeroTool(
  "download-bill",
  "Download a bill (ACCPAY invoice) by its invoice reference. This tool specifically searches for and downloads bills/ACCPAY invoices, not reports. Use this when you want to download a specific bill document.",
  {
    invoiceReference: z.string().describe("The invoice reference of the bill to download. This is the reference field for ACCPAY invoices (bills) in Xero. For example: 'RPT', 'INV-001', 'BILL-2024-001', etc. This should be the actual invoice reference, not a request for a report."),
    selectedInvoiceId: z.string().optional().describe("Optional: The specific invoice ID to download when multiple bills are found with the same reference. This should be provided when the tool returns multiple matching bills."),
  },
  async ({ invoiceReference, selectedInvoiceId }) => {
    try {
      await xeroClient.authenticate();

      // If a specific invoice ID is provided, download that specific bill
      if (selectedInvoiceId) {
        const invoiceResponse = await xeroClient.accountingApi.getInvoice(
          xeroClient.tenantId,
          selectedInvoiceId,
          undefined, // unitdp
          getClientHeaders() // options
        );

        if (!invoiceResponse.body.invoices || invoiceResponse.body.invoices.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Bill with ID '${selectedInvoiceId}' not found.`,
              },
            ],
          };
        }

        const invoice = invoiceResponse.body.invoices[0];
        
        // Verify this is actually a bill (ACCPAY)
        if (invoice.type !== Invoice.TypeEnum.ACCPAY) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: The selected invoice is not a bill (ACCPAY). It is of type: ${invoice.type}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Bill found successfully:",
                `Invoice ID: ${invoice.invoiceID}`,
                `Invoice Reference: ${invoice.reference || 'N/A'}`,
                `Contact: ${invoice.contact?.name || 'N/A'}`,
                `Total: ${invoice.total || 'N/A'}`,
                `Status: ${invoice.status || 'N/A'}`,
                `Date: ${invoice.date || 'N/A'}`,
                `Due Date: ${invoice.dueDate || 'N/A'}`,
                "",
                "Note: This tool currently provides bill information. For actual PDF download, additional implementation is required.",
              ].join("\n"),
            },
          ],
        };
      }

      // Search for bills with the given reference
      const invoicesResponse = await xeroClient.accountingApi.getInvoices(
        xeroClient.tenantId,
        undefined, // ifModifiedSince
        undefined, // where
        "UpdatedDateUTC DESC", // order
        undefined, // iDs
        undefined, // invoiceNumbers
        undefined, // contactIDs
        undefined, // statuses
        undefined, // page
        false, // includeArchived
        false, // createdByMyApp
        undefined, // unitdp
        false, // summaryOnly
        undefined, // pageSize
        invoiceReference, // searchTerm
        getClientHeaders()
      );

      const invoices = invoicesResponse.body.invoices || [];
      
      // Filter for ACCPAY invoices (bills) that match the reference
      const matchingBills = invoices.filter(invoice => 
        invoice.type === Invoice.TypeEnum.ACCPAY && 
        invoice.reference && 
        invoice.reference.toLowerCase().includes(invoiceReference.toLowerCase())
      );

      if (matchingBills.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `No bills found with reference containing '${invoiceReference}'.`,
                "",
                "Note: This tool searches for bills (ACCPAY invoices), not reports. If you're looking for a business report, please use the appropriate report generation tool.",
                "",
                "Please check the reference and try again, or use a different tool if you need a report instead of a bill download.",
              ].join("\n"),
            },
          ],
        };
      }

      if (matchingBills.length === 1) {
        // Only one bill found, proceed with download
        const bill = matchingBills[0];
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Bill found successfully:",
                `Invoice ID: ${bill.invoiceID}`,
                `Invoice Reference: ${bill.reference || 'N/A'}`,
                `Contact: ${bill.contact?.name || 'N/A'}`,
                `Total: ${bill.total || 'N/A'}`,
                `Status: ${bill.status || 'N/A'}`,
                `Date: ${bill.date || 'N/A'}`,
                `Due Date: ${bill.dueDate || 'N/A'}`,
                "",
                "Note: This tool currently provides bill information. For actual PDF download, additional implementation is required.",
              ].join("\n"),
            },
          ],
        };
      }

      // Multiple bills found with the same reference
      const billOptions = matchingBills.map((bill, index) => [
        `${index + 1}. Invoice ID: ${bill.invoiceID}`,
        `   Reference: ${bill.reference || 'N/A'}`,
        `   Contact: ${bill.contact?.name || 'N/A'}`,
        `   Total: ${bill.total || 'N/A'}`,
        `   Status: ${bill.status || 'N/A'}`,
        `   Date: ${bill.date || 'N/A'}`,
        `   Due Date: ${bill.dueDate || 'N/A'}`,
        ""
      ].join("\n")).join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Found ${matchingBills.length} bills with reference containing '${invoiceReference}':`,
              "",
              billOptions,
              "Please specify which bill you want to download by providing the 'selectedInvoiceId' parameter with the Invoice ID of your choice.",
              "",
              "Example: Use the Invoice ID from one of the options above (e.g., 'inv-0016')",
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error downloading bill: ${formatError(error)}`,
          },
        ],
      };
    }
  },
);

export default DownloadBillTool;

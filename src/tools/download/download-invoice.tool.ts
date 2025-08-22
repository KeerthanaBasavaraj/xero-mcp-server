import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { xeroClient } from "../../clients/xero-client.js";
import { getClientHeaders } from "../../helpers/get-client-headers.js";
import { formatError } from "../../helpers/format-error.js";
import { Invoice } from "xero-node";

const DownloadInvoiceTool = CreateXeroTool(
  "download-invoice",
  "Download the default Xero-generated invoice PDF. This tool specifically downloads individual invoices (ACCREC), not reports. Use this when you want to download a specific invoice document.",
  {
    invoiceId: z.string().optional().describe("The ID of the invoice to download. This should be the invoice ID from Xero (e.g., 'inv-0016' or the full Xero invoice ID). This is for downloading individual invoices, not generating reports."),
    invoiceReference: z.string().optional().describe("The invoice reference to search for. This is the reference field for invoices in Xero. For example: 'RPT', 'INV-001', etc. This should be the actual invoice reference, not a request for a report."),
    selectedInvoiceId: z.string().optional().describe("Optional: The specific invoice ID to download when multiple invoices are found with the same reference. This should be provided when the tool returns multiple matching invoices."),
  },
  async ({ invoiceId, invoiceReference, selectedInvoiceId }) => {
    try {
      await xeroClient.authenticate();

      // If a specific invoice ID is provided, download that specific invoice
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
                text: `Error: Invoice with ID '${selectedInvoiceId}' not found.`,
              },
            ],
          };
        }

        const invoice = invoiceResponse.body.invoices[0];
        const invoiceNumber = invoice.invoiceNumber || invoice.invoiceID || selectedInvoiceId;
        
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Invoice found successfully:",
                `Invoice ID: ${invoice.invoiceID}`,
                `Invoice Number: ${invoiceNumber}`,
                `Invoice Reference: ${invoice.reference || 'N/A'}`,
                `Contact: ${invoice.contact?.name || 'N/A'}`,
                `Total: ${invoice.total || 'N/A'}`,
                `Status: ${invoice.status || 'N/A'}`,
                "",
                "Note: This tool currently provides invoice information. For actual PDF download, additional implementation is required.",
              ].join("\n"),
            },
          ],
        };
      }

      // If invoiceId is provided, download that specific invoice
      if (invoiceId) {
        const invoiceResponse = await xeroClient.accountingApi.getInvoice(
          xeroClient.tenantId,
          invoiceId,
          undefined, // unitdp
          getClientHeaders() // options
        );

        if (!invoiceResponse.body.invoices || invoiceResponse.body.invoices.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Invoice with ID '${invoiceId}' not found.`,
              },
            ],
          };
        }

        const invoice = invoiceResponse.body.invoices[0];
        const invoiceNumber = invoice.invoiceNumber || invoice.invoiceID || invoiceId;
        
        return {
          content: [
            {
              type: "text" as const,
              text: [
                "Invoice found successfully:",
                `Invoice ID: ${invoice.invoiceID || invoiceId}`,
                `Invoice Number: ${invoiceNumber}`,
                `Invoice Reference: ${invoice.reference || 'N/A'}`,
                `Contact: ${invoice.contact?.name || 'N/A'}`,
                `Total: ${invoice.total || 'N/A'}`,
                `Status: ${invoice.status || 'N/A'}`,
                "",
                "Note: This tool currently provides invoice information. For actual PDF download, additional implementation is required.",
              ].join("\n"),
            },
          ],
        };
      }

      // If invoiceReference is provided, search for invoices with that reference
      if (invoiceReference) {
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
        
        // Filter for ACCREC invoices (sales invoices) that match the reference
        const matchingInvoices = invoices.filter(invoice => 
          invoice.type === Invoice.TypeEnum.ACCREC && 
          invoice.reference && 
          invoice.reference.toLowerCase().includes(invoiceReference.toLowerCase())
        );

        if (matchingInvoices.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: [
                  `No invoices found with reference containing '${invoiceReference}'.`,
                  "",
                  "Note: This tool searches for invoices (ACCREC), not reports. If you're looking for a business report, please use the appropriate report generation tool.",
                  "",
                  "Please check the reference and try again, or use a different tool if you need a report instead of an invoice download.",
                ].join("\n"),
              },
            ],
          };
        }

        if (matchingInvoices.length === 1) {
          // Only one invoice found, proceed with download
          const invoice = matchingInvoices[0];
          const invoiceNumber = invoice.invoiceNumber || invoice.invoiceID;
          return {
            content: [
              {
                type: "text" as const,
                text: [
                  "Invoice found successfully:",
                  `Invoice ID: ${invoice.invoiceID}`,
                  `Invoice Number: ${invoiceNumber}`,
                  `Invoice Reference: ${invoice.reference || 'N/A'}`,
                  `Contact: ${invoice.contact?.name || 'N/A'}`,
                  `Total: ${invoice.total || 'N/A'}`,
                  `Status: ${invoice.status || 'N/A'}`,
                  "",
                  "Note: This tool currently provides invoice information. For actual PDF download, additional implementation is required.",
                ].join("\n"),
              },
            ],
          };
        }

        // Multiple invoices found with the same reference
        const invoiceOptions = matchingInvoices.map((invoice, index) => [
          `${index + 1}. Invoice ID: ${invoice.invoiceID}`,
          `   Reference: ${invoice.reference || 'N/A'}`,
          `   Contact: ${invoice.contact?.name || 'N/A'}`,
          `   Total: ${invoice.total || 'N/A'}`,
          `   Status: ${invoice.status || 'N/A'}`,
          `   Date: ${invoice.date || 'N/A'}`,
          `   Due Date: ${invoice.dueDate || 'N/A'}`,
          ""
        ].join("\n")).join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Found ${matchingInvoices.length} invoices with reference containing '${invoiceReference}':`,
                "",
                invoiceOptions,
                "Please specify which invoice you want to download by providing the 'selectedInvoiceId' parameter with the Invoice ID of your choice.",
                "",
                "Example: Use the Invoice ID from one of the options above (e.g., 'inv-0016')",
              ].join("\n"),
            },
          ],
        };
      }

      // No parameters provided
      return {
        content: [
          {
            type: "text" as const,
            text: [
              "Error: Please provide either an 'invoiceId' or 'invoiceReference' parameter.",
              "",
              "Examples:",
              "- Use 'invoiceId' with a specific Xero invoice ID (e.g., 'inv-0016')",
              "- Use 'invoiceReference' to search for invoices by reference (e.g., 'RPT', 'INV-001')",
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error downloading invoice: ${formatError(error)}`,
          },
        ],
      };
    }
  },
);

export default DownloadInvoiceTool;

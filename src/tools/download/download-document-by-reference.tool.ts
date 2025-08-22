import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { xeroClient } from "../../clients/xero-client.js";
import { getClientHeaders } from "../../helpers/get-client-headers.js";
import { formatError } from "../../helpers/format-error.js";
import { Invoice } from "xero-node";

const DownloadDocumentByReferenceTool = CreateXeroTool(
  "download-document-by-reference",
  "Search for and download documents (invoices or bills) by their reference. This tool specifically searches for actual documents, not reports. Use this when you want to download a specific document by its reference number.",
  {
    documentReference: z.string().describe("The reference of the document to search for and download. This could be an invoice reference, bill reference, or any document reference in Xero. For example: 'RPT', 'INV-001', 'BILL-2024-001', etc. This searches for actual documents, not generates reports."),
    documentType: z.enum(["invoice", "bill", "any"]).optional().describe("Optional: Specify the type of document to search for. 'invoice' for sales invoices (ACCREC), 'bill' for bills (ACCPAY), or 'any' for both. Default is 'any'."),
    selectedDocumentId: z.string().optional().describe("Optional: The specific document ID to download when multiple documents are found with the same reference. This should be provided when the tool returns multiple matching documents."),
  },
  async ({ documentReference, documentType = "any", selectedDocumentId }) => {
    try {
      await xeroClient.authenticate();

      // If a specific document ID is provided, download that specific document
      if (selectedDocumentId) {
        const invoiceResponse = await xeroClient.accountingApi.getInvoice(
          xeroClient.tenantId,
          selectedDocumentId,
          undefined, // unitdp
          getClientHeaders() // options
        );

        if (!invoiceResponse.body.invoices || invoiceResponse.body.invoices.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Document with ID '${selectedDocumentId}' not found.`,
              },
            ],
          };
        }

        const document = invoiceResponse.body.invoices[0];
        const documentNumber = document.invoiceNumber || document.invoiceID || selectedDocumentId;
        const documentTypeName = document.type === Invoice.TypeEnum.ACCREC ? "Invoice" : "Bill";
        
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `${documentTypeName} found successfully:`,
                `Document ID: ${document.invoiceID}`,
                `Document Number: ${documentNumber}`,
                `Document Reference: ${document.reference || 'N/A'}`,
                `Contact: ${document.contact?.name || 'N/A'}`,
                `Total: ${document.total || 'N/A'}`,
                `Status: ${document.status || 'N/A'}`,
                `Date: ${document.date || 'N/A'}`,
                `Due Date: ${document.dueDate || 'N/A'}`,
                "",
                "Note: This tool currently provides document information. For actual PDF download, additional implementation is required.",
              ].join("\n"),
            },
          ],
        };
      }

      // Search for documents with the given reference
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
        documentReference, // searchTerm
        getClientHeaders()
      );

      const invoices = invoicesResponse.body.invoices || [];
      
      // Filter documents based on type preference
      let matchingDocuments = invoices.filter(invoice => 
        invoice.reference && 
        invoice.reference.toLowerCase().includes(documentReference.toLowerCase())
      );

      if (documentType === "invoice") {
        matchingDocuments = matchingDocuments.filter(invoice => invoice.type === Invoice.TypeEnum.ACCREC);
      } else if (documentType === "bill") {
        matchingDocuments = matchingDocuments.filter(invoice => invoice.type === Invoice.TypeEnum.ACCPAY);
      }

      if (matchingDocuments.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `No documents found with reference containing '${documentReference}'${documentType !== "any" ? ` of type '${documentType}'` : ""}.`,
                "",
                "Note: This tool searches for actual documents (invoices/bills), not reports. If you're looking for a business report, please use the appropriate report generation tool.",
                "",
                "Please check the reference and try again, or use a different tool if you need a report instead of a document download.",
              ].join("\n"),
            },
          ],
        };
      }

      if (matchingDocuments.length === 1) {
        // Only one document found, proceed with download
        const document = matchingDocuments[0];
        const documentNumber = document.invoiceNumber || document.invoiceID;
        const documentTypeName = document.type === Invoice.TypeEnum.ACCREC ? "Invoice" : "Bill";
        
        return {
          content: [
            {
              type: "text" as const,
              text: [
                `${documentTypeName} found successfully:`,
                `Document ID: ${document.invoiceID}`,
                `Document Number: ${documentNumber}`,
                `Document Reference: ${document.reference || 'N/A'}`,
                `Contact: ${document.contact?.name || 'N/A'}`,
                `Total: ${document.total || 'N/A'}`,
                `Status: ${document.status || 'N/A'}`,
                `Date: ${document.date || 'N/A'}`,
                `Due Date: ${document.dueDate || 'N/A'}`,
                "",
                "Note: This tool currently provides document information. For actual PDF download, additional implementation is required.",
              ].join("\n"),
            },
          ],
        };
      }

      // Multiple documents found with the same reference
      const documentOptions = matchingDocuments.map((document, index) => {
        const documentTypeName = document.type === Invoice.TypeEnum.ACCREC ? "Invoice" : "Bill";
        return [
          `${index + 1}. Document ID: ${document.invoiceID}`,
          `   Type: ${documentTypeName}`,
          `   Reference: ${document.reference || 'N/A'}`,
          `   Contact: ${document.contact?.name || 'N/A'}`,
          `   Total: ${document.total || 'N/A'}`,
          `   Status: ${document.status || 'N/A'}`,
          `   Date: ${document.date || 'N/A'}`,
          `   Due Date: ${document.dueDate || 'N/A'}`,
          ""
        ].join("\n");
      }).join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Found ${matchingDocuments.length} documents with reference containing '${documentReference}':`,
              "",
              documentOptions,
              "Please specify which document you want to download by providing the 'selectedDocumentId' parameter with the Document ID of your choice.",
              "",
              "Example: Use the Document ID from one of the options above (e.g., 'inv-0016')",
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error downloading document: ${formatError(error)}`,
          },
        ],
      };
    }
  },
);

export default DownloadDocumentByReferenceTool;

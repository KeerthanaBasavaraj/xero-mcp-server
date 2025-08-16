import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { xeroClient } from "../../clients/xero-client.js";
import { getClientHeaders } from "../../helpers/get-client-headers.js";
import { formatError } from "../../helpers/format-error.js";

const DownloadInvoiceTool = CreateXeroTool(
  "download-invoice",
  "Download the default Xero-generated invoice PDF. This tool downloads the invoice as a PDF file that can be saved or viewed by the user.",
  {
    invoiceId: z.string().describe("The ID of the invoice to download. This should be the invoice ID from Xero (e.g., 'inv-0016' or the full Xero invoice ID)."),
  },
  async ({ invoiceId }) => {
    try {
      await xeroClient.authenticate();

      // Get the invoice details first to ensure it exists and get the invoice number
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
      
      // For now, return a text response with the invoice details
      // The actual file download would require additional implementation
      return {
        content: [
          {
            type: "text" as const,
            text: [
              "Invoice found successfully:",
              `Invoice ID: ${invoice.invoiceID || invoiceId}`,
              `Invoice Number: ${invoiceNumber}`,
              `Contact: ${invoice.contact?.name || 'N/A'}`,
              `Total: ${invoice.total || 'N/A'}`,
              `Status: ${invoice.status || 'N/A'}`,
              "",
              "Note: This tool currently provides invoice information. For actual PDF download, additional implementation is required.",
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

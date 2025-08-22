import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { searchXeroBillsByReference } from "../../handlers/search-xero-bills-by-reference.handler.js";
import { listXeroBillAttachments } from "../../handlers/list-xero-bill-attachments.handler.js";
import { downloadXeroAttachment } from "../../handlers/download-xero-attachment.handler.js";

const DownloadBillAttachmentTool = CreateXeroTool(
  "download-bill-attachment",
  "Download an attachment from a bill (ACCPAY invoice) by invoice reference. Since invoice references can be duplicate, this tool will show all matching bills and ask the user to select which one to download from.\n\nRequired arguments:\n- invoiceReference: The invoice reference of the bill (e.g., 'RPT', 'INV-001').\n- fileName: The name of the attachment file to download.\n- selectedBillId: The ID of the specific bill to download from (provided after user selection).\n\nThis tool will:\n1. Search for all bills with the given invoice reference\n2. If multiple bills are found, show them to the user for selection\n3. Download the specified attachment from the selected bill\n\nNote: Invoice references are not unique in Xero, so multiple bills may have the same reference. Use the search-bills-by-reference tool first to see all matches, then use this tool with the selected bill ID.",
  {
    invoiceReference: z
      .string()
      .describe("The invoice reference of the bill (e.g., 'RPT', 'INV-001'). This is the reference field, not the invoice number."),
    fileName: z
      .string()
      .describe("The name of the attachment file to download."),
    selectedBillId: z
      .string()
      .optional()
      .describe("The ID of the specific bill to download from. If not provided, the tool will search for bills and show options."),
  },
  async ({ invoiceReference, fileName, selectedBillId }) => {
    // If no bill ID is provided, search for bills with the given reference
    if (!selectedBillId) {
      const searchResult = await searchXeroBillsByReference(invoiceReference);
      
      if (searchResult.isError) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching for bills: ${searchResult.error}`,
            },
          ],
        };
      }

      const bills = searchResult.result?.bills || [];
      
      if (bills.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No bills found with invoice reference "${invoiceReference}". Please check the reference and try again.`,
            },
          ],
        };
      }

      if (bills.length === 1) {
        // Only one bill found, proceed with download
        const bill = bills[0];
        // Get attachment metadata first to determine content type
        const attachmentsResult = await listXeroBillAttachments(bill.invoiceID!);
        
        if (attachmentsResult.isError || !attachmentsResult.result) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error getting attachment list: ${attachmentsResult.error}`,
              },
            ],
          };
        }

        const attachmentMeta = attachmentsResult.result.find(att => att.fileName === fileName);
        if (!attachmentMeta) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Attachment "${fileName}" not found on bill ${bill.invoiceID}.\n\nAvailable attachments:\n${attachmentsResult.result.map(att => `- ${att.fileName} (${att.mimeType})`).join('\n') || 'None'}`,
              },
            ],
          };
        }
        const contentType = attachmentMeta.mimeType || "application/octet-stream";
        
        const downloadResult = await downloadXeroAttachment("invoices", bill.invoiceID!, fileName, contentType);
        
        if (downloadResult.isError) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error downloading attachment: ${downloadResult.error}`,
              },
            ],
          };
        }

        const downloadedAttachment = downloadResult.result?.attachment;
        const fileBuffer = downloadResult.result?.fileBuffer;

        return {
          content: [
            {
              type: "text" as const,
              text: `Attachment downloaded successfully from bill:\n\nBill ID: ${bill.invoiceID}\nContact: ${bill.contact?.name}\nDate: ${bill.date}\nTotal: ${bill.total}\nStatus: ${bill.status}\n\nAttachment: ${downloadedAttachment?.fileName}\nSize: ${downloadedAttachment?.contentLength} bytes\nMIME Type: ${downloadedAttachment?.mimeType}`,
            },
            {
              type: "resource" as const,
              resource: {
                uri: `data:${downloadedAttachment?.mimeType || "application/octet-stream"};base64,${fileBuffer?.toString('base64')}`,
                text: `Downloaded attachment: ${downloadedAttachment?.fileName || fileName}`,
                mimeType: downloadedAttachment?.mimeType || "application/octet-stream",
              },
            },
          ],
        };
      }

      // Multiple bills found, show options to user
      const billOptions = bills.map((bill, index) => {
        const lineItems = bill.lineItems?.map(item => 
          `${item.description}: ${item.quantity} x ${item.unitAmount} = ${item.lineAmount}`
        ).join('\n  ') || 'No line items';
        
        return `${index + 1}. Bill ID: ${bill.invoiceID}
   Contact: ${bill.contact?.name}
   Date: ${bill.date}
   Total: ${bill.total}
   Status: ${bill.status}
   Line Items:
   ${lineItems}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${bills.length} bills with invoice reference "${invoiceReference}". Please select which bill to download from:\n\n${billOptions}\n\nTo download from a specific bill, use this tool again with the selectedBillId parameter set to the desired bill ID.`,
          },
        ],
      };
    }

    // Bill ID provided, proceed with download
    // Get attachment metadata first to determine content type
    const attachmentsResult = await listXeroBillAttachments(selectedBillId);
    
    if (attachmentsResult.isError || !attachmentsResult.result) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error getting attachment list: ${attachmentsResult.error}`,
          },
        ],
      };
    }

    const attachmentMeta = attachmentsResult.result.find(att => att.fileName === fileName);
    if (!attachmentMeta) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Attachment "${fileName}" not found on bill ${selectedBillId}.\n\nAvailable attachments:\n${attachmentsResult.result.map(att => `- ${att.fileName} (${att.mimeType})`).join('\n') || 'None'}`,
          },
        ],
      };
    }
    const contentType = attachmentMeta.mimeType || "application/octet-stream";
    
    const downloadResult = await downloadXeroAttachment("invoices", selectedBillId, fileName, contentType);
    
    if (downloadResult.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error downloading attachment: ${downloadResult.error}`,
          },
        ],
      };
    }

    const downloadedAttachment = downloadResult.result?.attachment;
    const fileBuffer = downloadResult.result?.fileBuffer;

    return {
      content: [
        {
          type: "text" as const,
          text: `Attachment downloaded successfully!\n\nAttachment: ${downloadedAttachment?.fileName}\nSize: ${downloadedAttachment?.contentLength} bytes\nMIME Type: ${downloadedAttachment?.mimeType}`,
        },
        {
          type: "resource" as const,
          resource: {
            uri: `data:${downloadedAttachment?.mimeType || "application/octet-stream"};base64,${fileBuffer?.toString('base64')}`,
            text: `Downloaded attachment: ${downloadedAttachment?.fileName || fileName}`,
            mimeType: downloadedAttachment?.mimeType || "application/octet-stream",
          },
        },
      ],
    };
  },
);

export default DownloadBillAttachmentTool;

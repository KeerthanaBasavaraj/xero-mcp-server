import { z } from "zod";
import { createXeroAttachment } from "../../handlers/create-xero-attachment.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const UploadAttachmentTool = CreateXeroTool(
  "upload-attachment",
  "Upload an attachment to a Xero entity after user confirmation. This tool should only be used after the user has confirmed the attachment details from the check-attachment-duplicates tool.\n\nRequired arguments:\n- entityType: The type of entity to upload the attachment to.\n- entityId: The ID of the entity to upload the attachment to.\n- fileUrl: The public URL of the file to upload.\n- fileName: The final filename to use for the attachment (should be the unique filename if duplicates were detected).",
  {
    entityType: z
      .enum([
        "invoices",
        "contacts",
        "creditnotes",
        "banktransactions",
        "manualjournals",
        "receipts",
        "accounts",
      ])
      .describe("The type of entity to upload the attachment to."),
    entityId: z
      .string()
      .describe("The ID of the entity to upload the attachment to."),
    fileUrl: z.string().url().describe("The public URL of the file to upload."),
    fileName: z
      .string()
      .describe("The final filename to use for the attachment."),
  },
  async ({ entityType, entityId, fileUrl, fileName }) => {
    // Validate file extension before attempting upload
    const fileExtension = fileName.toLowerCase().split('.').pop();
    const supportedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'tiff', 'gif', 'xml'];
    
    if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `**UPLOAD FAILED - INVALID FILE TYPE**\n\nFile extension "${fileExtension}" is not supported.\nSupported formats: ${supportedExtensions.join(', ').toUpperCase()}\n\nPlease ensure your file has a supported extension and try again.`,
          },
        ],
      };
    }

    console.log(`Starting attachment upload for ${entityType} ${entityId} with file: ${fileName}`);
    
    const result = await createXeroAttachment(
      entityType,
      entityId,
      fileUrl,
      fileName,
    );
    
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `**UPLOAD FAILED**\n\nError: ${result.error}\n\nPlease check:\n• The file URL is accessible\n• The entity ID is correct\n• The file format is supported\n• Your Xero connection is working\n\nTry again or contact support if the issue persists.`,
          },
        ],
      };
    }
    
    const attachment = result.result;
    
    if (!attachment) {
      return {
        content: [
          {
            type: "text" as const,
            text: `**UPLOAD FAILED**\n\nNo attachment was returned from Xero. This could indicate:\n• The upload was not completed successfully\n• There was an issue with the Xero API response\n• The file format was rejected by Xero\n\nPlease try again or check the file format.`,
          },
        ],
      };
    }
    
    return {
      content: [
        {
          type: "text" as const,
          text: [
            "**ATTACHMENT UPLOADED SUCCESSFULLY!**",
            "",
            "**Upload Details:**",
            `• Entity: ${entityType}`,
            `• Entity ID: ${entityId}`,
            `• Attachment ID: ${attachment.attachmentID || 'N/A'}`,
            `• File Name: ${attachment.fileName || fileName}`,
            `• Mime Type: ${attachment.mimeType || 'N/A'}`,
            `• Size: ${attachment.contentLength ? `${attachment.contentLength} bytes` : 'N/A'}`,
            "",
            "The attachment has been successfully uploaded to Xero and is now available in your account.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      isDashboard: true,
    };
  },
);

export default UploadAttachmentTool;

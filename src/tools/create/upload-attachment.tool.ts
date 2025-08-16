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
            text: `Error uploading attachment: ${result.error}`,
          },
        ],
      };
    }
    
    const attachment = result.result;
    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Attachment uploaded successfully!",
            "",
            "Upload Details:",
            `Entity: ${entityType}`,
            `Entity ID: ${entityId}`,
            `Attachment ID: ${attachment?.attachmentID}`,
            `File Name: ${attachment?.fileName}`,
            `Mime Type: ${attachment?.mimeType}`,
            `Size: ${attachment?.contentLength} bytes`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default UploadAttachmentTool;

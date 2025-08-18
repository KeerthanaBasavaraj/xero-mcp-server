import { z } from "zod";
import { listXeroAttachments } from "../../handlers/list-xero-attachments.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { generateUniqueFilename } from "../../helpers/generate-unique-filename.js";

const CreateAttachmentTool = CreateXeroTool(
  "check-attachment-duplicates",
  "Check for duplicate attachment filenames and generate unique names when needed. This tool should be used before uploading attachments to ensure no filename conflicts occur.\n\nRequired arguments:\n- entityType: The type of entity to upload the attachment to (e.g., invoices, contacts, creditnotes, etc.).\n- entityId: The ID of the entity to upload the attachment to.\n- fileUrl: The public URL of the file to upload.\n\nOptional arguments:\n- fileName: The file name to use for the attachment (if not provided, will use the name from the URL).Only supported file types: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX, CSV, TIFF, GIF, XML.\n\nThis tool will:\n1. Check existing attachments for the entity\n2. Detect if the filename already exists\n3. Generate a unique filename if duplicates are found\n4. Ask for user confirmation\n\nAfter confirmation, use the 'upload-attachment' tool with the final filename to complete the upload.\n\nDUPLICATE HANDLING: This tool automatically checks for duplicate filenames and generates unique names when needed. If a duplicate is found, it will show the new filename and ask for confirmation before proceeding.",
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
      .optional()
      .describe(
        "The file name to use for the attachment (optional, will use from URL if not provided).",
      ),
  },
  async ({ entityType, entityId, fileUrl, fileName }) => {
    // First, check for existing attachments to detect duplicates
    const existingAttachmentsResult = await listXeroAttachments(entityType, entityId);
    
    if (existingAttachmentsResult.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error checking existing attachments: ${existingAttachmentsResult.error}. Please verify the entity ID and try again.`,
          },
        ],
      };
    }
    
    const existingAttachments = existingAttachmentsResult.result || [];
    const existingFileNames = existingAttachments.map(att => att.fileName || "").filter(Boolean);
    
    // Generate the original filename
    const originalFileName = fileName || fileUrl.split("/").pop()?.split("?")[0] || "attachment";
    
    // Check if filename needs to be made unique
    const finalFileName = generateUniqueFilename(originalFileName, existingFileNames);
    const isDuplicate = finalFileName !== originalFileName;
    
    // Prepare confirmation message
    const baseMessage = [
      "**ATTACHMENT UPLOAD PREPARATION**",
      "",
      "**Upload Details:**",
      `• Entity Type: ${entityType}`,
      `• Entity ID: ${entityId}`,
      `• File URL: ${fileUrl}`,
      `• Original File Name: ${originalFileName}`,
      `• Final File Name: ${finalFileName}`,
      "",
      `**Existing Attachments:** ${existingAttachments.length} found`,
    ];
    
    let confirmationMessage: string[];
    
    if (isDuplicate) {
      confirmationMessage = [
        ...baseMessage,
        "",
        "**DUPLICATE FILENAME DETECTED!**",
        `The filename "${originalFileName}" already exists for this ${entityType}.`,
        `I've generated a unique filename: "${finalFileName}"`,
        "",
        "**CONFIRMATION REQUIRED:**",
        "Do you want to proceed with uploading this attachment with the new filename?",
        "",
        "**Next Step:** If you confirm, use the 'upload-attachment' tool with these exact parameters:",
        `• entityType: ${entityType}`,
        `• entityId: ${entityId}`,
        `• fileUrl: ${fileUrl}`,
        `• fileName: ${finalFileName}`,
        "",
        "Please confirm if you want to proceed with the upload."
      ];
    } else {
      confirmationMessage = [
        ...baseMessage,
        "",
        "**No duplicate filename detected.**",
        "You can proceed with the upload.",
        "",
        "**CONFIRMATION REQUIRED:**",
        "Do you want to proceed with uploading this attachment?",
        "",
        "**Next Step:** If you confirm, use the 'upload-attachment' tool with these exact parameters:",
        `• entityType: ${entityType}`,
        `• entityId: ${entityId}`,
        `• fileUrl: ${fileUrl}`,
        `• fileName: ${finalFileName}`,
        "",
        "Please confirm if you want to proceed with the upload."
      ];
    }
    
    return {
      content: [
        {
          type: "text" as const,
          text: confirmationMessage.join("\n"),
        },
      ],
      isDashboard: true,
    };
  },
);

export default CreateAttachmentTool;

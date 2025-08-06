import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const DeleteContactTool = CreateXeroTool(
  "delete-contact",
  `Handle contact deletion requests. 
   Note: Xero does not support direct contact deletion for data integrity and audit trail purposes. 
   Instead, contacts can be archived to maintain historical records while removing them from active use.
   This tool provides information about the limitation and suggests archiving as an alternative.`,
  {
    contactId: z.string().describe("The ID of the contact that was requested to be deleted."),
    contactName: z.string().optional().describe("The name of the contact (optional, for better messaging)."),
  },
  async ({ contactId, contactName }: { contactId: string; contactName?: string }) => {
    const contactDisplay = contactName ? `${contactName} (ID: ${contactId})` : `ID: ${contactId}`;
    
    return {
      content: [
        {
          type: "text" as const,
          text: [
            ` **Contact Deletion Not Supported**`,
            ``,
            `Xero does not support direct contact deletion to maintain data integrity and audit trails.`,
            `Contact: ${contactDisplay}`,
            ``,
            `**Alternative Solution:**`,
            `Instead of deletion, you can archive the contact using the \`archive-contact\` tool.`,
            `This will:`,
            `• Set the contact status to ARCHIVED`,
            `• Remove it from active contact lists`,
            `• Preserve all historical data and transactions`,
            `• Maintain audit trails for compliance`,
            ``,
            `**To archive this contact, use:**`,
            `\`archive-contact\` with contactId: \`${contactId}\``,
            ``,
            `Would you like me to archive this contact instead?`,
          ].join("\n"),
        },
      ],
    };
  },
);

export default DeleteContactTool; 
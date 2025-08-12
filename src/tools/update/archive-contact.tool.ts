import { archiveXeroContact } from "../../handlers/archive-xero-contact.handler.js";
import { z } from "zod";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { ensureError } from "../../helpers/ensure-error.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const ArchiveContactTool = CreateXeroTool(
  "archive-contact",
  `Archive a contact in Xero by setting its status to ARCHIVED. 
   Note: Xero does not support direct contact deletion. Instead, contacts are archived to maintain data integrity and audit trails.
   When a contact is archived, a deep link to the contact in Xero is returned. 
   This deep link can be used to view the contact in Xero directly. 
   This link should be displayed to the user.
   IMPORTANT: Before archiving a contact, you MUST ask the user for confirmation with the exact details of the contact to be archived. \
   Show them the contact ID and contact name, then ask 'Do you want to proceed with archiving this contact?' \
   Only proceed after receiving explicit confirmation from the user.`,
  {
    contactId: z.string().describe("The ID of the contact to archive."),
  },
  async ({ contactId }: { contactId: string }) => {
    try {
      const response = await archiveXeroContact(contactId);
      
      if (response.isError) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error archiving contact: ${response.error}`,
            },
          ],
        };
      }

      const contact = response.result;

      const deepLink = contact.contactID
        ? await getDeepLink(DeepLinkType.CONTACT, contact.contactID)
        : null;

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Contact archived successfully: ${contact.name} (ID: ${contact.contactID})`,
              `Status: ${contact.contactStatus || "ARCHIVED"}`,
              deepLink ? `Link to view: ${deepLink}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      };
    } catch (error) {
      const err = ensureError(error);

      return {
        content: [
          {
            type: "text" as const,
            text: `Error archiving contact: ${err.message}`,
          },
        ],
      };
    }
  },
);

export default ArchiveContactTool; 
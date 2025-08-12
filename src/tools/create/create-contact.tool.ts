import { createXeroContact } from "../../handlers/create-xero-contact.handler.js";
import { z } from "zod";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { ensureError } from "../../helpers/ensure-error.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const CreateContactTool = CreateXeroTool(
  "create-contact",
  "Create a contact in Xero.\
          When a contact is created, a deep link to the contact in Xero is returned. \
        This deep link can be used to view the contact in Xero directly. \
        This link should be displayed to the user. \
        IMPORTANT: Before creating a contact, you MUST ask the user for confirmation with the exact details of the contact to be created. \
        Show them the name, email, and phone number, then ask 'Do you want to proceed with creating this contact?' \
        Only proceed after receiving explicit confirmation from the user. \
        RE-CONFIRMATION: If the user initially cancels the operation but then says 'yes' to proceed, you MUST ask for re-confirmation by showing the exact contact details again and asking 'Please confirm the contact details once more before proceeding: [show details]. Do you want to proceed with creating this contact?' \
        Only proceed if the user confirms again.",
  {
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  },
  async ({ name, email, phone }) => {
    try {
      const response = await createXeroContact(name, email, phone);
      if (response.isError) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating contact: ${response.error}`,
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
              `Contact created: ${contact.name} (ID: ${contact.contactID})`,
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
            text: `Error creating contact: ${err.message}`,
          },
        ],
      };
    }
  },
);

export default CreateContactTool;

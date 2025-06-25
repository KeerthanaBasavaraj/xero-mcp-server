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
  This link should be displayed to the user.",
  {
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    confirmation: z.any().optional(),
  },
  async ({ name, email, phone, confirmation }) => {
    try {
      const response = await createXeroContact(
        { name, email, phone, type: "XeroContactData" },
        confirmation,
      );

      // Handle missing fields
      if (
        response.message?.startsWith(
          "Please provide the following required field",
        )
      ) {
        return {
          content: [
            {
              type: "text" as const,
              text: response.message,
            },
          ],
        };
      }

      // Handle confirmation prompt
      if (response.message?.includes("Can you confirm if I should proceed")) {
        return {
          content: [
            {
              type: "text" as const,
              text: response.message,
            },
          ],
        };
      }

      // Handle cancellation (if user says no/cancel, you should handle this in the client)
      if (response.message?.includes("the contact was not created")) {
        return {
          content: [
            {
              type: "text" as const,
              text: response.message,
            },
          ],
        };
      }

      // Handle error
      if (response.isError) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                response.message || `Error creating contact: ${response.error}`,
            },
          ],
        };
      }

      // Success: show contact and deep link
      const contact = response.result as any;
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

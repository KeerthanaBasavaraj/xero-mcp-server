import { createXeroContact } from "../../handlers/create-xero-contact.handler.js";
import { z } from "zod";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { ensureError } from "../../helpers/ensure-error.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

// Helper to format contact details in XeroContactData style
function formatXeroContactData(details: {
  name?: string;
  email?: string;
  phone?: string;
}) {
  return [
    `type: XeroContactData`,
    `name: ${details.name ?? "(not provided)"}`,
    `email: ${details.email ?? "(not provided)"}`,
    `phone: ${details.phone ?? "(not provided)"}`,
  ].join("\n");
}

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
    confirmation: z.boolean().optional(),
  },
  async ({ name, email, phone, confirmation }) => {
    try {
      const response = await createXeroContact(
        { name, email, phone },
        confirmation,
      );

      const { XeroContactData } = response.result;

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
            {
              type: "text" as const,
              text: formatXeroContactData(XeroContactData),
            },
          ],
        };
      }

      // Always ask for confirmation if not confirmed yet
      if (!confirmation) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                response.message ||
                `You are about to create a new Xero contact with the following details:\n\n` +
                  formatXeroContactData(XeroContactData) +
                  `\n\nCan you confirm if I should proceed with creating this contact in Xero? (yes/no)`,
            },
            {
              type: "text" as const,
              text: formatXeroContactData(XeroContactData),
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
            {
              type: "text" as const,
              text: formatXeroContactData(XeroContactData),
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
            {
              type: "text" as const,
              text: formatXeroContactData(XeroContactData),
            },
          ],
        };
      }

      // Success: show contact and deep link, plus XeroContactData
      const contact = XeroContactData as any;
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
          {
            type: "text" as const,
            text: formatXeroContactData(contact),
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
          {
            type: "text" as const,
            text: formatXeroContactData({ name, email, phone }),
          },
        ],
      };
    }
  },
);

export default CreateContactTool;

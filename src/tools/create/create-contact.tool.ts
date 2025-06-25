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
    `name: ${details.name ?? "(not provided)"}`,
    `email: ${details.email ?? "(not provided)"}`,
    details.phone ? `phone: ${details.phone}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

const CreateContactTool = CreateXeroTool(
  "create-contact",
  "Create a contact in Xero.\nWhen a contact is created, a deep link to the contact in Xero is returned. This deep link can be used to view the contact in Xero directly. This link should be displayed to the user.",
  {
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    confirmation: z.boolean().optional(),
  },
  async ({ name, email, phone, confirmation }) => {
    // 1. Validate Required Fields
    if (!name || !email) {
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!email) missingFields.push("email");
      return {
        content: [
          {
            type: "text" as const,
            text:
              missingFields.length === 1
                ? `Please provide the ${missingFields[0]} for the new contact.`
                : `Please provide the following required fields for the new contact: ${missingFields.join(", ")}.`,
          },
          {
            type: "text" as const,
            text: formatXeroContactData({ name, email, phone }),
          },
        ],
        result: {
          type: "ChatContactData",
          XeroContactData: { name, email, phone },
        },
        isError: false,
        error: null,
        message:
          missingFields.length === 1
            ? `Please provide the ${missingFields[0]} for the new contact.`
            : `Please provide the following required fields for the new contact: ${missingFields.join(", ")}.`,
        title: "Missing Required Fields",
        description: "Some required fields are missing for contact creation.",
      };
    }

    // 2. Always Ask for Confirmation Before Proceeding
    if (!confirmation) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              `You are about to create a new Xero contact with the following details:\n\n` +
              formatXeroContactData({ name, email, phone }) +
              `\n\nCan you confirm if I should proceed with creating this contact in Xero? (yes/no)`,
          },
          {
            type: "text" as const,
            text: formatXeroContactData({ name, email, phone }),
          },
        ],
        result: {
          type: "ChatContactData",
          XeroContactData: { name, email, phone },
        },
        isError: false,
        error: null,
        message:
          `You are about to create a new Xero contact with the following details:\n\n` +
          formatXeroContactData({ name, email, phone }) +
          `\n\nCan you confirm if I should proceed with creating this contact in Xero? (yes/no)`,
        title: "Confirm Contact Creation",
        description: "Confirmation required before creating contact in Xero.",
      };
    }

    // 4. Proceed with Creation in Xero
    try {
      const response = await createXeroContact(
        { name, email, phone },
        true, // confirmation is true here
      );

      // If Xero returns an error
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
              text: formatXeroContactData({ name, email, phone }),
            },
          ],
          result: {
            type: "DashboardContactData",
            XeroContactData: { name, email, phone },
          },
          isError: true,
          error: response.error,
          message:
            response.message || `Error creating contact: ${response.error}`,
          title: "Contact Creation Failed",
          description: "There was an error creating the contact in Xero.",
        };
      }

      // Success: show contact and deep link, plus XeroContactData
      const contact = response.result?.XeroContactData as any;
      const deepLink = contact?.contactID
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
        result: {
          type: "DashboardContactData",
          XeroContactData: contact,
        },
        isError: false,
        error: null,
        message:
          `Contact created successfully in Xero:\n\n` +
          formatXeroContactData(contact) +
          (deepLink ? `\n\nLink to view: ${deepLink}` : ""),
        title: "Contact Created",
        description: "The contact was created successfully in Xero.",
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
        result: {
          type: "DashboardContactData",
          XeroContactData: { name, email, phone },
        },
        isError: true,
        error: err.message,
        message: `Error creating contact: ${err.message}`,
        title: "Contact Creation Failed",
        description: "There was an error creating the contact in Xero.",
      };
    }
  },
);

export default CreateContactTool;

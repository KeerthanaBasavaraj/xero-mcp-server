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
  ].join("\n");
}

// Utility to ensure all available fields are included in XeroContactData
function buildXeroContactData(source: any = {}, fallback: any = {}) {
  return {
    name: source?.name ?? fallback?.name ?? null,
    email: source?.email ?? fallback?.email ?? null,
    phone: source?.phone ?? fallback?.phone ?? null,
    contactPerson: source?.contactPerson ?? fallback?.contactPerson ?? null,
    address: source?.address ?? fallback?.address ?? null,
    contactID: source?.contactID ?? fallback?.contactID ?? null,
  };
}

const CreateContactTool = CreateXeroTool(
  "create-contact",
  "Create a contact in Xero.\nWhen a contact is created, a deep link to the contact in Xero is returned. This deep link can be used to view the contact in Xero directly. This link should be displayed to the user.",
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

      // Always ask for confirmation if not confirmed yet
      if (!confirmation) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                response.message ||
                `You are about to create a new Xero contact. Can you confirm if I should proceed with creating this contact in Xero? (yes/no)`,
            },
          ],
          message: `You are about to create a new Xero contact. Can you confirm if I should proceed with creating this contact in Xero? (yes/no)`,
          title: "Confirm Contact Creation",
          description: "Confirmation required before creating contact in Xero.",
          type: "ChatContactData",
          XeroContactData: buildXeroContactData({ name, email, phone }),
          success: true,
        };
      }

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
          message: response.message,
          title: "Missing Required Fields",
          description: "Some required fields are missing for contact creation.",
          type: "ChatContactData",
          XeroContactData: buildXeroContactData(XeroContactData, {
            name,
            email,
            phone,
          }),
          success: false,
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
          message: response.message,
          title: "Contact Creation Cancelled",
          description: "User cancelled contact creation.",
          type: "ChatContactData",
          XeroContactData: buildXeroContactData(XeroContactData, {
            name,
            email,
            phone,
          }),
          success: false,
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
          message:
            response.message || `Error creating contact: ${response.error}`,
          title: "Contact Creation Failed",
          description: "There was an error creating the contact in Xero.",
          type: "DashboardContactData",
          XeroContactData: buildXeroContactData(XeroContactData, {
            name,
            email,
            phone,
          }),
          success: false,
        };
      }

      // Success: show contact and deep link, plus XeroContactData
      const contact = buildXeroContactData(XeroContactData);
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
        message: `Contact created successfully in Xero.`,
        title: "Contact Created",
        description: "The contact was created successfully in Xero.",
        type: "DashboardContactData",
        XeroContactData: contact,
        success: true,
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
        message: `Error creating contact: ${err.message}`,
        title: "Contact Creation Failed",
        description: "There was an error creating the contact in Xero.",
        type: "DashboardContactData",
        XeroContactData: buildXeroContactData({ name, email, phone }),
        success: false,
      };
    }
  },
);

export default CreateContactTool;

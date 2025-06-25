import { createXeroContact } from "../../handlers/create-xero-contact.handler.js";
import { z } from "zod";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { ensureError } from "../../helpers/ensure-error.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

// Helper to check for confirmation keywords
function isConfirmation(input: string): boolean {
  return /^(yes|confirm|yep|sure|okay|ok)$/i.test(input.trim());
}
function isCancel(input: string): boolean {
  return /^(no|cancel|stop|nevermind|abort)$/i.test(input.trim());
}

const CreateContactTool = CreateXeroTool(
  "create-contact",
  "Create a contact in Xero. When a contact is created, a deep link to the contact in Xero is returned. This deep link can be used to view the contact in Xero directly. This link should be displayed to the user.",
  {
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    confirmation: z
      .string()
      .optional()
      .describe("User confirmation to proceed (yes/no)"),
  },
  async ({ name, email, phone, confirmation }) => {
    // 1. Validate required fields
    const missingFields: string[] = [];
    if (!name) missingFields.push("name");
    if (!email) missingFields.push("email");

    if (missingFields.length > 0) {
      return {
        type: "ChatContactData",
        XeroContactData: { name, email, phone },
        message: `To create a contact, please provide the following missing field(s): ${missingFields.join(", ")}.`,
        title: "Missing Required Fields",
        description: "Some required fields are missing for contact creation.",
        content: [
          {
            type: "text" as const,
            text: `Missing required field(s): ${missingFields.join(", ")}. Please provide them to continue.`,
          },
        ],
      };
    }

    // 2. Ask for confirmation if not already provided
    if (!confirmation) {
      return {
        type: "ChatContactData",
        XeroContactData: { name, email, phone },
        message: `You are about to create a contact in Xero with the following details:\n\nName: ${name}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ""}\n\nCan you confirm if I should proceed with creating this contact in Xero? (yes/no)`,
        title: "Confirm Contact Creation",
        description: "Please confirm the contact details before proceeding.",
        content: [
          {
            type: "text" as const,
            text: [
              `Contact details to be created:`,
              `Name: ${name}`,
              `Email: ${email}`,
              phone ? `Phone: ${phone}` : null,
              "",
              "Can you confirm if I should proceed with creating this contact in Xero? (yes/no)",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      };
    }

    // 3. Handle user confirmation/cancellation
    if (isCancel(confirmation)) {
      return {
        type: "ChatContactData",
        XeroContactData: { name, email, phone },
        message:
          "Okay, the contact was not created. Let me know if you'd like to try again.",
        title: "Contact Creation Cancelled",
        description: "The contact creation process was cancelled by the user.",
        content: [
          {
            type: "text" as const,
            text: "Okay, the contact was not created. Let me know if you'd like to try again.",
          },
        ],
      };
    }
    if (!isConfirmation(confirmation)) {
      return {
        type: "ChatContactData",
        XeroContactData: { name, email, phone },
        message:
          "I didn't understand your response. Please reply with 'yes' to confirm or 'no' to cancel.",
        title: "Awaiting Confirmation",
        description: "Please confirm or cancel the contact creation.",
        content: [
          {
            type: "text" as const,
            text: "Please reply with 'yes' to confirm or 'no' to cancel.",
          },
        ],
      };
    }

    // 4. Proceed with creation in Xero
    try {
      const response = await createXeroContact(name as string, email, phone);
      if (response.isError) {
        return {
          type: "DashboardContactData",
          XeroContactData: { name, email, phone },
          message: `Error creating contact: ${response.error}`,
          title: "Contact Creation Failed",
          description: "There was an error while creating the contact in Xero.",
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
        type: "DashboardContactData",
        XeroContactData: contact,
        message: `Contact created successfully: ${contact.name} (ID: ${contact.contactID})${deepLink ? `\nLink to view: ${deepLink}` : ""}`,
        title: "Contact Created",
        description: "The contact was successfully created in Xero.",
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
        type: "DashboardContactData",
        XeroContactData: { name, email, phone },
        message: `Error creating contact: ${err.message}`,
        title: "Contact Creation Failed",
        description: "There was an error while creating the contact in Xero.",
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

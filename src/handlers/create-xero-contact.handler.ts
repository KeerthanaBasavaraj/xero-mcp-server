import { xeroClient } from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { Contact, Phone } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

export interface XeroContactDetails {
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

export interface XeroClientResponse<T> {
  result: {
    type: "ChatContactData" | "DashboardContactData";
    XeroContactData: T;
  };
  isError: boolean;
  error: any;
  message?: string;
}

// Helper to format contact details for confirmation message
function formatContactDetails(details: XeroContactDetails): string {
  return [
    `Name: ${details.name ?? "(not provided)"}`,
    `Email: ${details.email ?? "(not provided)"}`,
    `Phone: ${details.phone ?? "(not provided)"}`,
  ].join("\n");
}

export async function createXeroContact(
  input: XeroContactDetails,
  confirmation?: boolean,
): Promise<XeroClientResponse<XeroContactDetails | Contact>> {
  // Step 1: Validate required fields
  if (!input.name || !input.email) {
    const missing = [];
    if (!input.name) missing.push("name");
    if (!input.email) missing.push("email");
    return {
      result: {
        type: "ChatContactData",
        XeroContactData: {
          name: input.name ?? undefined,
          email: input.email ?? undefined,
          ...input, // include any other fields provided
        },
      },
      isError: false,
      error: null,
      message: `Please provide the following required field(s): ${missing.join(", ")}.`,
    };
  }

  // Step 2: Ask for confirmation if not already confirmed
  if (!confirmation) {
    return {
      result: {
        type: "ChatContactData",
        XeroContactData: { ...input },
      },
      isError: false,
      error: null,
      message:
        `You are about to create a new Xero contact with the following details:\n\n${formatContactDetails(input)}\n\n` +
        `Can you confirm if I should proceed with creating this contact in Xero? (yes/no)`,
    };
  }

  // Step 3: Proceed with creation if confirmed
  try {
    await xeroClient.authenticate();

    const contact: Contact = {
      name: input.name!,
      emailAddress: input.email!,
      phones: input.phone
        ? [
            {
              phoneNumber: input.phone,
              phoneType: Phone.PhoneTypeEnum.MOBILE,
            },
          ]
        : undefined,
    };

    const response = await xeroClient.accountingApi.createContacts(
      xeroClient.tenantId,
      { contacts: [contact] },
      true,
      undefined,
      getClientHeaders(),
    );

    const createdContact = response.body.contacts?.[0];

    if (!createdContact) {
      throw new Error("Contact creation failed.");
    }

    return {
      result: {
        type: "DashboardContactData",
        XeroContactData: createdContact,
      },
      isError: false,
      error: null,
      message: `Contact created successfully in Xero:\n\n${formatContactDetails(createdContact)}`,
    };
  } catch (error) {
    return {
      result: {
        type: "ChatContactData",
        XeroContactData: Object.fromEntries(
          Object.entries(input).filter(
            ([, v]) => v !== undefined && v !== null,
          ),
        ),
      },
      isError: true,
      error: formatError(error),
      message: `There was an error creating the contact: ${formatError(error)}\nWould you like to try again?`,
    };
  }
}

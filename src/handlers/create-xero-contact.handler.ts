import { xeroClient } from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { Contact, Phone } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

export interface XeroContactDetails {
  type: "XeroContactData";
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

// Helper to format contact details for confirmation message
function formatContactDetails(details: XeroContactDetails): string {
  return [
    `Name: ${details.name ?? "(not provided)"}`,
    `Email: ${details.email ?? "(not provided)"}`,
    `Phone: ${details.phone ?? "(not provided)"}`,
  ].join("\n");
}

// Main handler function
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
        ...input,
        type: "XeroContactData",
      },
      isError: false,
      error: null,
      message: `Please provide the following required field(s): ${missing.join(", ")}.`,
      type: "XeroContactData",
    } as XeroClientResponse<XeroContactDetails | Contact>;
  }

  // Step 2: Ask for confirmation if not already confirmed
  if (!confirmation) {
    return {
      result: {
        ...input,
        type: "XeroContactData",
      },
      isError: false,
      error: null,
      message:
        `You are about to create a new Xero contact with the following details:\n\n${formatContactDetails(input)}\n\n` +
        `Can you confirm if I should proceed with creating this contact in Xero? (yes/no)`,
      type: "XeroContactData",
    } as XeroClientResponse<XeroContactDetails | Contact>;
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
      result: createdContact,
      isError: false,
      error: null,
      message: `Contact created successfully in Xero:\n\n${formatContactDetails(input)}`,
      type: "XeroContactData",
    } as XeroClientResponse<XeroContactDetails | Contact>;
  } catch (error) {
    return {
      result: {
        ...input,
        type: "XeroContactData",
      },
      isError: true,
      error: formatError(error),
      message: `There was an error creating the contact: ${formatError(error)}\nWould you like to try again?`,
      type: "XeroContactData",
    };
  }
}

export interface XeroClientResponse<T> {
  result: T;
  isError: boolean;
  error: any;
  message?: string;
  type?: "XeroContactData";
}

import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Contact, Phone } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

export interface ContactInput {
  name: string;
  email?: string;
  phone?: string;
}

async function createContact(
  name: string,
  email?: string,
  phone?: string,
): Promise<Contact | undefined> {
  await xeroClient.authenticate();

  const contact: Contact = {
    name,
    emailAddress: email,
    phones: phone
      ? [
          {
            phoneNumber: phone,
            phoneType: Phone.PhoneTypeEnum.MOBILE,
          },
        ]
      : undefined,
  };

  const response = await xeroClient.accountingApi.createContacts(
    xeroClient.tenantId,
    {
      contacts: [contact],
    }, //contacts
    true, //summarizeErrors
    undefined, //idempotencyKey
    getClientHeaders(), // options
  );

  return response.body.contacts?.[0];
}

async function createContactsBatch(
  contacts: ContactInput[],
): Promise<Contact[]> {
  await xeroClient.authenticate();

  const contactsToCreate: Contact[] = contacts.map((contactInput) => ({
    name: contactInput.name,
    emailAddress: contactInput.email,
    phones: contactInput.phone
      ? [
          {
            phoneNumber: contactInput.phone,
            phoneType: Phone.PhoneTypeEnum.MOBILE,
          },
        ]
      : undefined,
  }));

  const response = await xeroClient.accountingApi.createContacts(
    xeroClient.tenantId,
    {
      contacts: contactsToCreate,
    }, //contacts
    true, //summarizeErrors
    undefined, //idempotencyKey
    getClientHeaders(), // options
  );

  return response.body.contacts || [];
}

/**
 * Create a new contact in Xero
 */
export async function createXeroContact(
  name: string,
  email?: string,
  phone?: string,
): Promise<XeroClientResponse<Contact>> {
  try {
    const createdContact = await createContact(name, email, phone);

    if (!createdContact) {
      throw new Error("Contact creation failed.");
    }

    return {
      result: createdContact,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}

/**
 * Create multiple contacts in Xero with batching (max 5 per batch)
 */
export async function createXeroContacts(
  contacts: ContactInput[],
): Promise<XeroClientResponse<Contact[]>> {
  try {
    const BATCH_SIZE = 5;
    const allCreatedContacts: Contact[] = [];
    const errors: string[] = [];

    // Process contacts in batches of 5
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      
      try {
        const batchResult = await createContactsBatch(batch);
        allCreatedContacts.push(...batchResult);
      } catch (error) {
        const errorMessage = formatError(error);
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${errorMessage}`);
      }
    }

    if (errors.length > 0 && allCreatedContacts.length === 0) {
      // All batches failed
      return {
        result: null,
        isError: true,
        error: errors.join("; "),
      };
    }

    if (errors.length > 0) {
      // Some batches failed, but some succeeded
      console.warn("Some batches failed:", errors);
    }

    return {
      result: allCreatedContacts,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}

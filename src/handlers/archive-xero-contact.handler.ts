import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Contact, Contacts } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function archiveContact(contactId: string): Promise<Contact | undefined> {
  await xeroClient.authenticate();

  // Create a contact object with ARCHIVED status
  const contact: Contact = {
    contactID: contactId,
    contactStatus: "ARCHIVED" as any, // Using any since Contact type might not have this field explicitly
  };

  const contacts: Contacts = {
    contacts: [contact],
  };

  const response = await xeroClient.accountingApi.updateContact(
    xeroClient.tenantId,
    contactId,
    contacts,
    undefined, // idempotencyKey
    getClientHeaders(),
  );

  const archivedContact = response.body.contacts?.[0];
  return archivedContact;
}

/**
 * Archive a contact in Xero by setting its status to ARCHIVED
 */
export async function archiveXeroContact(contactId: string): Promise<
  XeroClientResponse<Contact>
> {
  try {
    const archivedContact = await archiveContact(contactId);

    if (!archivedContact) {
      throw new Error("Contact archiving failed.");
    }

    return {
      result: archivedContact,
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
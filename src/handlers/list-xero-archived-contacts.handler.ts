import { xeroClient } from "../clients/xero-client.js";
import { Contact } from "xero-node";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getArchivedContacts(): Promise<{ contacts: Contact[], pagination?: any }> {
  await xeroClient.authenticate();

  // Use where condition to filter for archived contacts directly
  const where = 'ContactStatus=="ARCHIVED"';

  const contacts = await xeroClient.accountingApi.getContacts(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    where, // where - filter for archived contacts
    undefined, // order
    undefined, // iDs
    undefined, // page - no pagination needed
    true, // includeArchived - still include archived
    true, // summaryOnly
    undefined, // searchTerm
    undefined, // pageSize - no pagination needed
    getClientHeaders(),
  );
  return {
    contacts: contacts.body.contacts ?? [],
    pagination: contacts.body.pagination
  };
}

/**
 * List all archived contacts from Xero
 */
export async function listXeroArchivedContacts(): Promise<
  XeroClientResponse<{ contacts: Contact[], pagination?: any }>
> {
  try {
    const result = await getArchivedContacts();

    return {
      result: result,
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

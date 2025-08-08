import { xeroClient } from "../clients/xero-client.js";
import { Contact } from "xero-node";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getArchivedContacts(page?: number, pageSize?: number): Promise<{ contacts: Contact[], pagination?: any }> {
  await xeroClient.authenticate();

  const contacts = await xeroClient.accountingApi.getContacts(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    undefined, // where
    undefined, // order
    undefined, // iDs
    page, // page
    true, // includeArchived - always true for archived contacts
    true, // summaryOnly
    undefined, // searchTerm
    pageSize, // pageSize
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
export async function listXeroArchivedContacts(page?: number, pageSize?: number): Promise<
  XeroClientResponse<{ contacts: Contact[], pagination?: any }>
> {
  try {
    const result = await getArchivedContacts(page, pageSize);

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

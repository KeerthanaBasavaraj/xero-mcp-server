import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { CreditNote } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getCreditNotes(
  contactId: string | undefined,
  page: number,
  pageSize?: number,
): Promise<{ creditNotes: CreditNote[], pagination?: any }> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getCreditNotes(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    contactId ? `Contact.ContactID=guid("${contactId}")` : undefined, // where
    "UpdatedDateUTC DESC", // order
    page, // page
    undefined, // unitdp
    pageSize, // pageSize
    getClientHeaders(),
  );

  return {
    creditNotes: response.body.creditNotes ?? [],
    pagination: response.body.pagination
  };
}

/**
 * List all credit notes from Xero
 */
export async function listXeroCreditNotes(
  page: number = 1,
  contactId?: string,
  pageSize?: number,
): Promise<XeroClientResponse<{ creditNotes: CreditNote[], pagination?: any }>> {
  try {
    const result = await getCreditNotes(contactId, page, pageSize);

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

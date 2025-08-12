import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Invoice } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getInvoices(
  invoiceNumbers: string[] | undefined,
  contactIds: string[] | undefined,
  page?: number,
  pageSize?: number,
  searchTerm?: string,
): Promise<{ invoices: Invoice[], pagination?: any }> {
  await xeroClient.authenticate();

  const invoices = await xeroClient.accountingApi.getInvoices(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    undefined, // where
    "UpdatedDateUTC DESC", // order
    undefined, // iDs
    invoiceNumbers, // invoiceNumbers
    contactIds, // contactIDs
    undefined, // statuses
    page,
    false, // includeArchived
    false, // createdByMyApp
    undefined, // unitdp
    false, // summaryOnly
    pageSize, // pageSize
    searchTerm, // searchTerm
    getClientHeaders(),
  );
  return {
    invoices: invoices.body.invoices ?? [],
    pagination: invoices.body.pagination
  };
}

/**
 * List all invoices from Xero
 */
export async function listXeroInvoices(
  page?: number,
  contactIds?: string[],
  invoiceNumbers?: string[],
  pageSize?: number,
  searchTerm?: string,
): Promise<XeroClientResponse<{ invoices: Invoice[], pagination?: any }>> {
  try {
    // If page is not provided, don't use pagination (set both page and pageSize to undefined)
    const finalPage = page !== undefined ? page : undefined;
    const finalPageSize = page !== undefined ? pageSize : undefined;
    
    const result = await getInvoices(invoiceNumbers, contactIds, finalPage, finalPageSize, searchTerm);

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

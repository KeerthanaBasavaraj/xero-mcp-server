import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Invoice } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function searchBillsByReference(
  invoiceReference: string,
  page?: number,
  pageSize?: number,
): Promise<{ bills: Invoice[], pagination?: any }> {
  await xeroClient.authenticate();

  // Search for bills (ACCPAY invoices) by reference
  const bills = await xeroClient.accountingApi.getInvoices(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    `Type=="ACCPAY" AND Reference=="${invoiceReference}"`, // where clause to filter bills by reference
    "UpdatedDateUTC DESC", // order
    undefined, // iDs
    undefined, // invoiceNumbers
    undefined, // contactIDs
    undefined, // statuses
    page,
    false, // includeArchived
    false, // createdByMyApp
    undefined, // unitdp
    false, // summaryOnly
    pageSize, // pageSize
    undefined, // searchTerm (we're using where clause instead)
    getClientHeaders(),
  );

  return {
    bills: bills.body.invoices ?? [],
    pagination: bills.body.pagination
  };
}

/**
 * Search for bills (ACCPAY invoices) by invoice reference
 */
export async function searchXeroBillsByReference(
  invoiceReference: string,
  page?: number,
  pageSize?: number,
): Promise<XeroClientResponse<{ bills: Invoice[], pagination?: any }>> {
  try {
    const result = await searchBillsByReference(invoiceReference, page, pageSize);

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

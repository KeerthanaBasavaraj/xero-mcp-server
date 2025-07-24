import { xeroClient } from "../clients/xero-client.js";
import { Invoice } from "xero-node";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

async function getReceipts(page?: number): Promise<Invoice[]> {
  await xeroClient.authenticate();
  const result = await xeroClient.accountingApi.getInvoices(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    'Status=="PAID" AND Type=="ACCREC"', // where
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
    10, // pageSize
    undefined, // searchTerm
  );
  return result.body.invoices ?? [];
}
/**
 * List all receipts from Xero
 */
export async function listXeroReceipts(page?: number): Promise<XeroClientResponse<Invoice[]>> {
  try {
    const receipts = await getReceipts(page);
    return {
      result: receipts,
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

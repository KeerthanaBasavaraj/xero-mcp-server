import { xeroClient } from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";

/**
 * List all receipts in Xero (all invoices of type ACCREC and status PAID).
 *
 * In Xero, there is no separate "receipt" object. A paid sales invoice (Type=="ACCREC" and Status=="PAID") is considered a receipt.
 *
 * This function fetches all such invoices, so if a user asks for receipts, this will provide them.
 *
 * @param page Optional page number for pagination (default: 1)
 * @returns Array of paid ACCREC invoices (receipts)
 * @example
 *   // Get first page of receipts
 *   const receipts = await listXeroReceipts({ page: 1 });
 */
export async function listXeroReceipts({ page = 1 }: { page?: number }) {
  await xeroClient.authenticate();
  try {
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
  } catch (error) {
    throw formatError(error);
  }
}

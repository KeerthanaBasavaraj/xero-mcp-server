import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Payment } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getPayments(
  page: number = 1,
  {
    invoiceNumber,
    invoiceId,
    paymentId,
    reference,
  }: {
    invoiceNumber?: string;
    invoiceId?: string;
    paymentId?: string;
    reference?: string;
  },
  pageSize?: number,
): Promise<{ payments: Payment[], pagination?: any }> {
  await xeroClient.authenticate();

  // Build where clause for filtering
  const whereConditions: string[] = [];

  if (invoiceId) {
    whereConditions.push(`Invoice.InvoiceID==guid("${invoiceId}")`);
  }
  if (invoiceNumber) {
    whereConditions.push(`Invoice.InvoiceNumber=="${invoiceNumber}"`);
  }
  if (paymentId) {
    whereConditions.push(`PaymentID==guid("${paymentId}")`);
  }
  if (reference) {
    whereConditions.push(`Reference=="${reference}"`);
  }

  // Combine conditions
  const where =
    whereConditions.length > 0 ? whereConditions.join(" AND ") : undefined;

  const response = await xeroClient.accountingApi.getPayments(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    where,
    "UpdatedDateUTC DESC", // order
    page, // page
    pageSize, // pageSize
    getClientHeaders(), // options
  );

  return {
    payments: response.body.payments ?? [],
    pagination: response.body.pagination
  };
}

/**
 * List payments from Xero
 */
export async function listXeroPayments(
  page: number = 1,
  {
    invoiceNumber,
    invoiceId,
    paymentId,
    reference,
  }: {
    invoiceNumber?: string;
    invoiceId?: string;
    paymentId?: string;
    reference?: string;
  },
  pageSize?: number,
): Promise<XeroClientResponse<{ payments: Payment[], pagination?: any }>> {
  try {
    const result = await getPayments(page, {
      invoiceNumber,
      invoiceId,
      paymentId,
      reference,
    }, pageSize);

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

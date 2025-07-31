import { xeroClient } from "../clients/xero-client.js";
import { BankTransaction } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

async function getBankTransactions(
  page: number,
  bankAccountId?: string,
  pageSize?: number,
): Promise<{ bankTransactions: BankTransaction[], pagination?: any }> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getBankTransactions(xeroClient.tenantId,
      undefined, // ifModifiedSince
      bankAccountId ? `BankAccount.AccountID=guid("${bankAccountId}")` : undefined, // where
      "Date DESC", // order
      page, // page
      undefined, // unitdp
      pageSize, // pagesize
      getClientHeaders()
  );

  return {
    bankTransactions: response.body.bankTransactions ?? [],
    pagination: response.body.pagination
  };
}

export async function listXeroBankTransactions(
  page: number = 1,
  bankAccountId?: string,
  pageSize?: number
): Promise<XeroClientResponse<{ bankTransactions: BankTransaction[], pagination?: any }>> {
  try {
    const result = await getBankTransactions(page, bankAccountId, pageSize);

    return {
      result: result,
      isError: false,
      error: null
    }
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error)
    }
  }
}
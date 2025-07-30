import { ManualJournal } from "xero-node";
import { xeroClient } from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getManualJournals(
  page: number,
  manualJournalId?: string,
  modifiedAfter?: string,
  pageSize?: number,
): Promise<{ manualJournals: ManualJournal[], pagination?: any }> {
  await xeroClient.authenticate();

  if (manualJournalId) {
    const response = await xeroClient.accountingApi.getManualJournal(
      xeroClient.tenantId,
      manualJournalId,
      getClientHeaders(),
    );

    return {
      manualJournals: response.body.manualJournals ?? [],
      pagination: response.body.pagination
    };
  }

  const response = await xeroClient.accountingApi.getManualJournals(
    xeroClient.tenantId,
    modifiedAfter ? new Date(modifiedAfter) : undefined,
    undefined,
    "UpdatedDateUTC DESC",
    page,
    pageSize, // pageSize
    getClientHeaders(),
  );

  return {
    manualJournals: response.body.manualJournals ?? [],
    pagination: response.body.pagination
  };
}

/**
 * List all manual journals from Xero.
 */
export async function listXeroManualJournals(
  page: number = 1,
  manualJournalId?: string,
  modifiedAfter?: string,
  pageSize?: number,
): Promise<XeroClientResponse<{ manualJournals: ManualJournal[], pagination?: any }>> {
  try {
    const result = await getManualJournals(
      page,
      manualJournalId,
      modifiedAfter,
      pageSize,
    );

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

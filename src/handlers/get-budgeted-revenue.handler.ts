import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";

/**
 * Fetches budgeted revenue from Xero's BudgetSummary report.
 */
async function fetchBudgetedRevenue(
  startDate: string,
  endDate: string,
  trackingCategory?: string,
): Promise<Array<{ month: string; budgeted_amount: number }>> {
  await xeroClient.authenticate();

  const params: any = {
    fromDate: startDate,
    toDate: endDate,
  };
  if (trackingCategory) {
    params.trackingCategoryID = trackingCategory;
  }

  const response = await xeroClient.accountingApi.getReportBudgetSummary(
    xeroClient.tenantId,
    params.fromDate,
    params.toDate,
    params.trackingCategoryID,
    getClientHeaders(),
  );

  if (!response || !response.body) {
    throw new Error("No response from Xero API.");
  }

  const report = response.body.reports?.[0] as {
    rows: any[];
    columns: any[];
  };
  if (
    !report ||
    !Array.isArray(report.rows) ||
    !Array.isArray(report.columns)
  ) {
    throw new Error("No budget summary report data found or invalid format.");
  }

  const revenueRows: { month: string; budgeted_amount: number }[] = [];
  for (const row of report.rows) {
    if (
      row.cells &&
      Array.isArray(row.cells) &&
      row.cells.length > 0 &&
      typeof row.cells[0].value === "string" &&
      row.cells[0].value.toLowerCase().includes("revenue")
    ) {
      for (let i = 1; i < row.cells.length && i < report.columns.length; i++) {
        const columnTitle = report.columns[i]?.title;
        const month =
          typeof columnTitle === "string" ? columnTitle.slice(0, 7) : null;
        const cellValue = row.cells[i]?.value;
        const budgeted_amount =
          cellValue !== undefined &&
          cellValue !== null &&
          !isNaN(Number(cellValue))
            ? Number(cellValue)
            : 0;
        if (month && typeof month === "string" && !isNaN(budgeted_amount)) {
          revenueRows.push({ month, budgeted_amount });
        }
      }
    }
  }

  return revenueRows;
}

/**
 * Get budgeted revenue from Xero
 */
export async function getBudgetedRevenue(
  startDate: string,
  endDate: string,
  trackingCategory?: string,
): Promise<
  XeroClientResponse<Array<{ month: string; budgeted_amount: number }>>
> {
  try {
    const result = await fetchBudgetedRevenue(
      startDate,
      endDate,
      trackingCategory,
    );

    return {
      result,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: [],
      isError: true,
      error: formatError(error),
    };
  }
}

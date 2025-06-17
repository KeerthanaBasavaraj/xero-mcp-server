import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

async function fetchBudgetedRevenue(
  startDate: string,
  endDate: string,
  trackingCategory?: string,
) {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getReportBudgetSummary(
    xeroClient.tenantId,
    startDate,
    endDate,
    trackingCategory,
  );

  return response.body.reports?.[0];
}

/**
 * Fetches budgeted revenue from Xero's BudgetSummary report.
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} [trackingCategory] - Optional tracking category for product-level granularity
 * @returns {Promise<{ error: string | null, result: Array<{ month: string, budgeted_amount: number }> }>}
 */
export async function getBudgetedRevenue(
  startDate: string,
  endDate: string,
  trackingCategory?: string,
): Promise<XeroClientResponse<{ month: string; budgeted_amount: number }[]>> {
  try {
    const report = await fetchBudgetedRevenue(
      startDate,
      endDate,
      trackingCategory,
    );

    if (
      !report ||
      !Array.isArray(report.rows) ||
      !Array.isArray(report.columns)
    ) {
      return {
        result: [],
        isError: true,
        error: "No budget summary report data found or invalid format.",
      };
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
        for (
          let i = 1;
          i < row.cells.length && i < report.columns.length;
          i++
        ) {
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

    return {
      result: revenueRows,
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

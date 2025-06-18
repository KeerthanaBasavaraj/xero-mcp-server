import { xeroClient } from "../clients/xero-client.js";

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
) {
  try {
    const { accountingApi, tenantId } = xeroClient;

    // Build query params
    const params: any = {
      fromDate: startDate,
      toDate: endDate,
    };
    if (trackingCategory) {
      params.trackingCategoryID = trackingCategory;
    }

    // Call Xero API
    const response = await accountingApi.getReportBudgetSummary(
      tenantId,
      params.fromDate,
      params.toDate,
      params.trackingCategoryID,
    );

    // Defensive: log and check response
    if (!response || !response.body) {
      return { error: "No response from Xero API.", result: [] };
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
      return {
        error: "No budget summary report data found or invalid format.",
        result: [],
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

    // Always return a serializable object
    return { error: null, result: revenueRows };
  } catch (err: any) {
    // Defensive: always return a string error
    return {
      error: err && err.message ? String(err.message) : String(err),
      result: [],
    };
  }
}

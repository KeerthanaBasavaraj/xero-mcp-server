import { xeroClient } from "../clients/xero-client.js";

/**
 * Fetches actual revenue from Xero's Profit and Loss report.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 * @param trackingCategory Optional tracking category for product-level granularity
 */
export async function getActualRevenue(
  startDate: string,
  endDate: string,
  trackingCategory?: string
): Promise<{ error: string | null; result: Array<{ month: string; actual_amount: number }> }> {
  try {
    await xeroClient.authenticate();

    const params: any = {
      fromDate: startDate,
      toDate: endDate,
    };
    if (trackingCategory) {
      params.trackingCategoryID = trackingCategory;
    }

    // Use Profit and Loss report for actuals
    const response = await xeroClient.accountingApi.getReportProfitAndLoss(
      xeroClient.tenantId,
      params.fromDate,
      params.toDate,
      undefined, // periods
      "MONTH",   // timeframe
      undefined, // trackingCategoryID
      params.trackingCategoryID
    );

    const report = response.body.reports?.[0];
    const rows = report?.rows ?? [];
    const columns = (report && (report as any).columns?.slice(1)) || [];

    // Try to find revenue rows (by name)
    const revenueRows = rows.filter((row: any) =>
      Array.isArray(row.cells) &&
      row.cells.some(
        (cell: any) =>
          typeof cell.value === "string" &&
          cell.value.toLowerCase().includes("revenue")
      )
    );
    const targetRows = revenueRows.length > 0 ? revenueRows : rows;

    // Build result: sum actual amounts per month
    const result: Array<{ month: string; actual_amount: number }> = [];
    for (const row of targetRows) {
      if (!Array.isArray(row.cells)) continue;
      for (let i = 1; i < row.cells.length; i++) {
        const monthTitle = columns[i - 1]?.title;
        const value = Number(row.cells[i]?.value) || 0;
        if (!monthTitle) continue;
        const existing = result.find((r) => r.month === monthTitle);
        if (existing) {
          existing.actual_amount += value;
        } else {
          result.push({ month: monthTitle, actual_amount: value });
        }
      }
    }

    // Format month as YYYY-MM if possible
    result.forEach((r) => {
      if (/^\d{4}-\d{2}$/.test(r.month)) return;
      const d = new Date(r.month);
      if (!isNaN(d.getTime())) {
        r.month = d.toISOString().slice(0, 7);
      }
    });

    return { error: null, result };
  } catch (err: any) {
    return { error: err.message || "Unknown error", result: [] };
  }
}
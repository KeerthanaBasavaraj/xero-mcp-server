import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";

/**
 * This tool compares actual and budgeted values for a given metric (e.g., Net Profit, Revenue, Expenses) period-by-period (e.g., by month).
 * It aligns periods and ensures missing actuals or budgets are shown as null.
 */
const PeriodicActualVsBudgetTool = CreateXeroTool(
  "periodic-actual-vs-budget",
  "Compares actual and budgeted values for a given metric (e.g., Net Profit, Revenue, Expenses) for each period (month, quarter, or year) in the specified range. Returns an array of objects with period, actual, and budgeted values.",
  {
    metric: z
      .string()
      .describe(
        "The metric to compare (e.g., 'Net Profit', 'Revenue', 'Expenses'). Case-insensitive, matches section title in Xero report.",
      ),
    fromDate: z
      .string()
      .optional()
      .describe(
        "Start date in YYYY-MM-DD format (default: first day of current month)",
      ),
    toDate: z
      .string()
      .optional()
      .describe(
        "End date in YYYY-MM-DD format (default: last day of current month)",
      ),
    periods: z
      .number()
      .optional()
      .describe("Number of periods to compare (optional)"),
    timeframe: z
      .enum(["MONTH", "QUARTER", "YEAR"])
      .optional()
      .describe("Period type (MONTH, QUARTER, YEAR; default MONTH)"),
    standardLayout: z
      .boolean()
      .optional()
      .describe("Use standard layout (optional)"),
    paymentsOnly: z
      .boolean()
      .optional()
      .describe("Include only accounts with payments (optional)"),
  },
  async (args) => {
    // Set defaults
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const defaultToStr = defaultTo.toISOString().slice(0, 10);
    const fromDate = args.fromDate || defaultFrom;
    const toDate = args.toDate || defaultToStr;
    let periods = args.periods;
    const timeframe = args.timeframe || "MONTH";

    // If user requests a range over multiple months/quarters/years and periods is not set, calculate periods
    if (!periods && fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (timeframe === "MONTH") {
        periods =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
      } else if (timeframe === "QUARTER") {
        periods =
          (end.getFullYear() - start.getFullYear()) * 4 +
          (Math.floor(end.getMonth() / 3) - Math.floor(start.getMonth() / 3)) +
          1;
      } else if (timeframe === "YEAR") {
        periods = end.getFullYear() - start.getFullYear() + 1;
      }
    }

    // Fetch actuals (P&L)
    const actualResp = await listXeroProfitAndLoss(
      fromDate,
      toDate,
      periods,
      timeframe,
      args.standardLayout,
      args.paymentsOnly,
    );
    if (actualResp.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching actuals: ${actualResp.error}`,
          },
        ],
      };
    }
    const actualReport = actualResp.result;

    // Fetch budget
    const budgetResp = await listXeroBudgetSummary(
      fromDate,
      periods,
      timeframe === "YEAR" ? "YEAR" : "MONTH", // Budget summary only supports MONTH or YEAR
    );
    if (budgetResp.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching budget: ${budgetResp.error}`,
          },
        ],
      };
    }
    const budgetReport = budgetResp.result?.[0];

    // --- Extract and align periods for the specified metric ---
    const metricName = (args.metric || "Net Profit").toLowerCase();

    // Helper to extract period labels from columns
    function getPeriodLabels(report: any): string[] {
      if (!report?.columns) return [];
      // Usually first column is 'Description', skip it
      return report.columns.slice(1).map((col: any) => col.title);
    }

    // Helper to extract metric row from report
    function getMetricRow(report: any, metric: string): any | undefined {
      if (!report?.rows) return undefined;
      // Find row where first cell (Description) matches metric (case-insensitive)
      return report.rows.find((row: any) => {
        const desc = row.cells?.[0]?.value?.toLowerCase?.();
        return desc === metric;
      });
    }

    // Get period labels
    const actualPeriods = getPeriodLabels(actualReport);
    const budgetPeriods = getPeriodLabels(budgetReport);
    // Union of all periods (in order of actual, then any extra from budget)
    const allPeriods = Array.from(new Set([...actualPeriods, ...budgetPeriods]));

    // Get metric rows
    const actualMetricRow = getMetricRow(actualReport, metricName);
    const budgetMetricRow = getMetricRow(budgetReport, metricName);

    // Helper to get values for each period from a row
    function getValues(row: any): (number|null)[] {
      if (!row?.cells) return [];
      // Skip first cell (Description)
      return row.cells.slice(1).map((cell: any) => {
        const v = cell.value;
        if (v == null || v === "") return null;
        const n = Number(v.toString().replace(/[^\d.-]/g, ""));
        return isNaN(n) ? null : n;
      });
    }

    const actualValues = getValues(actualMetricRow);
    const budgetValues = getValues(budgetMetricRow);

    // Build result array
    const result = allPeriods.map((period, idx) => ({
      period,
      actual: idx < actualValues.length ? actualValues[idx] : null,
      budgeted: idx < budgetValues.length ? budgetValues[idx] : null,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

export default PeriodicActualVsBudgetTool;

import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";

/**
 * This tool compares actual and budgeted values for a given metric (e.g., Net Profit, Revenue, Expenses) period-by-period (e.g., by month, quarter, or year).
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
    const now = new Date();
    const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const fromDate = args.fromDate || defaultFrom;
    const timeframe = args.timeframe || "MONTH";

    // Auto-calculate periods if not provided
    let periods = args.periods;
    let start = new Date(fromDate);
    let end = args.toDate ? new Date(args.toDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (!periods && args.fromDate && args.toDate) {
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

    // Helper to get period start/end dates
    function getPeriodRange(idx: number) {
      let periodStart = new Date(start);
      let periodEnd = new Date(start);
      if (timeframe === "MONTH") {
        periodStart.setMonth(start.getMonth() + idx);
        periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
      } else if (timeframe === "QUARTER") {
        periodStart.setMonth(start.getMonth() + idx * 3);
        periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 3, 0);
      } else if (timeframe === "YEAR") {
        periodStart.setFullYear(start.getFullYear() + idx);
        periodEnd = new Date(periodStart.getFullYear(), 11, 31);
      }
      return {
        from: periodStart.toISOString().slice(0, 10),
        to: periodEnd.toISOString().slice(0, 10),
        label: timeframe === "MONTH"
          ? `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`
          : timeframe === "QUARTER"
          ? `Q${Math.floor(periodStart.getMonth() / 3) + 1} ${periodStart.getFullYear()}`
          : `${periodStart.getFullYear()}`
      };
    }

    const results: Array<{ period: string; actual: number | null; budgeted: number | null }> = [];

    for (let i = 0; i < (periods || 1); i++) {
      const { from, to, label } = getPeriodRange(i);

      // Fetch actuals for this period
      const actualResp = await listXeroProfitAndLoss(
        from,
        to,
        1,
        timeframe,
        true,
        args.paymentsOnly,
      );
      let actualValue: number | null = null;
      if (!actualResp.isError && actualResp.result) {
        const section = actualResp.result.rows?.find(
          (row: any) => row.title?.toLowerCase() === args.metric.toLowerCase()
        );
        actualValue = section?.cells?.[0]?.value ?? null;
      }

      // Fetch budget for this period
      const budgetResp = await listXeroBudgetSummary(
        from,
        1,
        timeframe === "YEAR" ? "YEAR" : "MONTH",
      );
      let budgetValue: number | null = null;
      if (!budgetResp.isError && budgetResp.result?.[0]) {
        const section = budgetResp.result[0].rows?.find(
          (row: any) => row.title?.toLowerCase() === args.metric.toLowerCase()
        );
        budgetValue = section?.cells?.[0]?.value ?? null;
      }

      results.push({
        period: label,
        actual: actualValue,
        budgeted: budgetValue,
      });
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  },
);

export default PeriodicActualVsBudgetTool;

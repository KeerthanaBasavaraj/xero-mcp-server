import { z } from "zod";
import { getBudgetedRevenue } from "../../handlers/get-budgeted-revenue.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const GetBudgetedRevenueTool = CreateXeroTool(
  "get-budgeted-revenue",
  "Fetches budgeted revenue from Xero using the BudgetSummary report. Returns a list of months and their budgeted amounts.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
    tracking_category: z.string().optional().describe("Optional tracking category for product-level granularity"),
  },
  async (args) => {
    const response = await getBudgetedRevenue(
      args.start_date,
      args.end_date,
      args.tracking_category
    );

    if (response.error !== null) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching budgeted revenue: ${response.error}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "json" as const,
          json: response.result,
        },
      ],
    };
  }
);

export default GetBudgetedRevenueTool;
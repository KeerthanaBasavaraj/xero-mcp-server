import { z } from "zod";
import { getActualRevenue } from "../../handlers/get-actual-revenue.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const GetActualRevenueTool = CreateXeroTool(
  "get-actual-revenue",
  "Fetches actual revenue from Xero using the Profit and Loss report. Returns a list of months and their actual revenue amounts.",
  {
    start_date: z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: z.string().describe("End date in YYYY-MM-DD format"),
    tracking_category: z
      .string()
      .optional()
      .describe("Optional tracking category for product-level granularity"),
  },
  async (args) => {
    const response = await getActualRevenue(
      args.start_date,
      args.end_date,
      args.tracking_category,
    );

    if (response.error !== null) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching actual revenue: ${response.error}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: response.result.map(
        (row: { month: string; actual_amount: number }) => ({
          type: "text" as const,
          text: `Month: ${row.month}, Actual Revenue: ${row.actual_amount}`,
        }),
      ),
      isError: false,
    };
  },
);

export default GetActualRevenueTool;

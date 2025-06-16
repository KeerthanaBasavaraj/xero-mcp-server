import { z } from "zod";
import { compareMoMRevenue } from "../../handlers/compare-mom-revenue.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const CompareMoMRevenueTool = CreateXeroTool(
  "compare-mom-revenue",
  "Compares revenue between two months in Xero and returns both values, the difference, and the variance percentage.",
  {
    currentMonth: z.string().describe("Current month in YYYY-MM format"),
    previousMonth: z.string().describe("Previous month in YYYY-MM format"),
  },
  async (args) => {
    const response = await compareMoMRevenue(args.currentMonth, args.previousMonth);

    if (response.error !== null) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error comparing month-over-month revenue: ${response.error}`,
          },
        ],
      };
    }

    const { currentMonthRevenue, previousMonthRevenue, difference, variancePercentage } = response.result;

    return {
      content: [
        { type: "text" as const, text: `Current Month Revenue: ${currentMonthRevenue}` },
        { type: "text" as const, text: `Previous Month Revenue: ${previousMonthRevenue}` },
        { type: "text" as const, text: `Difference: ${difference}` },
        { type: "text" as const, text: `Variance (%): ${variancePercentage !== null ? variancePercentage.toFixed(2) : "N/A"}` },
      ],
    };
  }
);

export default CompareMoMRevenueTool;
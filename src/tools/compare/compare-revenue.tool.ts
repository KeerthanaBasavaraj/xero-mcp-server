import { z } from "zod";
import { compareXeroRevenue } from "../../handlers/compare-xero-revenue.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const CompareRevenueTool = CreateXeroTool(
  "compare-revenue",
  "Compares actual revenue and budgeted revenue in Xero for a given date range. Returns both values, the difference, and the variance percentage.",
  {
    fromDate: z.string().describe("Start date in YYYY-MM-DD format"),
    toDate: z.string().describe("End date in YYYY-MM-DD format"),
  },
  async (args) => {
    const response = await compareXeroRevenue(args.fromDate, args.toDate);

    if (response.error !== null) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error comparing revenue: ${response.error}`,
          },
        ],
      };
    }

    const { actualRevenue, budgetRevenue, difference, variancePercentage } = response.result;

    return {
      content: [
        {
          type: "text" as const,
          text: `Actual Revenue: ${actualRevenue}`,
        },
        {
          type: "text" as const,
          text: `Budgeted Revenue: ${budgetRevenue}`,
        },
        {
          type: "text" as const,
          text: `Difference: ${difference}`,
        },
        {
          type: "text" as const,
          text: `Variance (%): ${variancePercentage !== null ? variancePercentage.toFixed(2) : "N/A"}`,
        },
      ],
    };
  }
);

export default CompareRevenueTool;

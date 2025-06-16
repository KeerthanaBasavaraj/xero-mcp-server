import { z } from "zod";
import { compareProductRevenue } from "../../handlers/compare-product-revenue.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const CompareProductRevenueTool = CreateXeroTool(
  "compare-product-revenue",
  "Compares actual vs. budgeted revenue for each product in Xero for a given date range. Returns values, difference, and variance percentage for each product.",
  {
    fromDate: z.string().describe("Start date in YYYY-MM-DD format"),
    toDate: z.string().describe("End date in YYYY-MM-DD format"),
  },
  async (args) => {
    const response = await compareProductRevenue(args.fromDate, args.toDate);

    if (response.error !== null) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error comparing product-wise revenue: ${response.error}`,
          },
        ],
      };
    }

    return {
      content: response.result.map((product: any) => ({
        type: "text" as const,
        text: `Product: ${product.name} | Actual: ${product.actual} | Budget: ${product.budget} | Difference: ${product.difference} | Variance (%): ${product.variancePercentage !== null ? product.variancePercentage.toFixed(2) : "N/A"}`,
      })),
    };
  }
);

export default CompareProductRevenueTool;
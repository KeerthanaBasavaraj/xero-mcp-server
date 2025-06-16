import { getXeroProductRevenue } from "../helpers/xero-revenue-helper.js";

export async function compareProductRevenue(fromDate: string, toDate: string) {
  try {
    const productRevenues = await getXeroProductRevenue(fromDate, toDate);

    const results = productRevenues.map((product) => {
      const { name, actual, budget } = product;
      const difference = actual - budget;
      const variancePercentage = budget !== 0 ? (difference / budget) * 100 : null;
      return { name, actual, budget, difference, variancePercentage };
    });

    return { error: null, result: results };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), result: null };
  }
}
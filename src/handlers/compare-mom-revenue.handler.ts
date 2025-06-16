import { getXeroRevenue } from "../helpers/xero-revenue-helper.js";

// Helper to get all months between two dates (inclusive), formatted as YYYY-MM
function getMonthRange(fromDate: string, toDate: string): string[] {
  const result: string[] = [];
  const start = new Date(fromDate + "-01");
  const end = new Date(toDate + "-01");
  let current = new Date(start);

  while (current <= end) {
    const year = current.getFullYear();
    const month = (current.getMonth() + 1).toString().padStart(2, "0");
    result.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }
  return result;
}

export async function compareMoMRevenue(fromDate: string, toDate: string) {
  try {
    const months = getMonthRange(fromDate, toDate);
    const results = [];

    for (const month of months) {
      // getXeroRevenue should return { actual: number, budget: number }
      const { actual, budget } = await getXeroRevenue(month);
      const difference = actual - budget;
      const variancePercentage = budget !== 0 ? (difference / budget) * 100 : null;
      results.push({
        month,
        actual,
        budget,
        difference,
        variancePercentage,
      });
    }

    return {
      error: null,
      result: results,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), result: null };
  }
}
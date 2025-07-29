import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroItems } from "../../handlers/list-xero-items.handler.js";
import { listXeroQuotes } from "../../handlers/list-xero-quotes.handler.js";

// Helper function to batch API calls
async function batchApiCalls<T>(calls: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];
  const batchSize = 5; // Rate limit constraint
  
  for (let i = 0; i < calls.length; i += batchSize) {
    const batch = calls.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(call => call()));
    results.push(...batchResults);
  }
  
  return results;
}

export default CreateXeroTool(
  "generateBusinessInsightReportRaw",
  "Fetches all raw data needed for a business insight report for a selected month. Returns profit and loss, previous profit and loss, budget summary, contacts, invoices, aged receivables, items, and quotes.",
  {
    month: z.string().describe("Month in YYYY-MM format"),
  },
  async ({ month }: { month: string }) => {
    // Calculate date ranges
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const endDate = new Date(year, monthNum, 0); // last day of month
    const endDateStr = `${endDate.getFullYear()}-${String(
      endDate.getMonth() + 1
    ).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    // Previous month
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const prevEndDate = new Date(prevYear, prevMonth, 0); // prevMonth is 1-based, so this is correct
    const prevEndDateStr = `${prevEndDate.getFullYear()}-${String(
      prevEndDate.getMonth() + 1
    ).padStart(2, "0")}-${String(prevEndDate.getDate()).padStart(2, "0")}`;

    // Define all API calls as functions
    const apiCalls = [
      // Profit and Loss for current and previous month
      () => listXeroProfitAndLoss(startDate, endDateStr),
      () => listXeroProfitAndLoss(prevStartDate, prevEndDateStr),
      // Budget summary for current month
      () => listXeroBudgetSummary(startDate),
      // Contacts (first page only)
      () => listXeroContacts(1),
      // Invoices (first page only)
      () => listXeroInvoices(1),
      // Aged receivables (no filters)
      () => listXeroAgedReceivables(),
      // Items (first page only)
      () => listXeroItems(1),
      // Quotes (first page only)
      () => listXeroQuotes(1),
    ];

    // Execute API calls in batches of 5 to respect rate limits
    const [
      profitAndLoss,
      profitAndLossPrev,
      budgetSummary,
      contacts,
      invoices,
      agedReceivables,
      items,
      quotes,
    ] = await batchApiCalls(apiCalls);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            period: { startDate, endDate: endDateStr },
            profitAndLoss,
            profitAndLossPrev,
            budgetSummary,
            contacts,
            invoices,
            agedReceivables,
            items,
            quotes,
          }, null, 2),
        },
      ],
    };
  },
);

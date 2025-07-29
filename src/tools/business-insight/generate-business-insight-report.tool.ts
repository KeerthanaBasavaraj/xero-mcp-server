import { z } from "zod";
import pLimit from "p-limit";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroItems } from "../../handlers/list-xero-items.handler.js";
import { listXeroQuotes } from "../../handlers/list-xero-quotes.handler.js";

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

    // Create concurrency limiter with max 5 concurrent calls
    const limit = pLimit(5);

    // Define all API calls with concurrency limiting
    const apiCalls = [
      // Profit and Loss for current and previous month
      limit(() => listXeroProfitAndLoss(startDate, endDateStr)),
      limit(() => listXeroProfitAndLoss(prevStartDate, prevEndDateStr)),
      // Budget summary for current month
      limit(() => listXeroBudgetSummary(startDate)),
      // Contacts (first page only)
      limit(() => listXeroContacts(1)),
      // Invoices (first page only)
      limit(() => listXeroInvoices(1)),
      // Aged receivables (no filters)
      limit(() => listXeroAgedReceivables()),
      // Items (first page only)
      limit(() => listXeroItems(1)),
      // Quotes (first page only)
      limit(() => listXeroQuotes(1)),
    ];

    // Execute all API calls with concurrency limiting
    const [
      profitAndLoss,
      profitAndLossPrev,
      budgetSummary,
      contacts,
      invoices,
      agedReceivables,
      items,
      quotes,
    ] = await Promise.all(apiCalls);

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

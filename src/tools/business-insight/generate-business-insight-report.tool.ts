import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroItems } from "../../handlers/list-xero-items.handler.js";
import { listXeroQuotes } from "../../handlers/list-xero-quotes.handler.js";
import pLimit from "p-limit";

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

    // Limit concurrency to 5
    const limit = pLimit(5);
    const tasks = [
      () => listXeroProfitAndLoss(startDate, endDateStr),
      () => listXeroProfitAndLoss(prevStartDate, prevEndDateStr),
      () => listXeroBudgetSummary(startDate),
      () => listXeroContacts(1),
      () => listXeroInvoices(1),
      () => listXeroAgedReceivables(),
      () => listXeroItems(1),
      () => listXeroQuotes(1),
    ];

    const [
      profitAndLoss,
      profitAndLossPrev,
      budgetSummary,
      contacts,
      invoices,
      agedReceivables,
      items,
      quotes,
    ] = await Promise.all(tasks.map(task => limit(task)));

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

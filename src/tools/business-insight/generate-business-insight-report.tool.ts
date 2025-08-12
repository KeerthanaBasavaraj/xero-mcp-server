import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroItems } from "../../handlers/list-xero-items.handler.js";
import { listXeroQuotes } from "../../handlers/list-xero-quotes.handler.js";
import { listXeroReportBalanceSheet } from "../../handlers/list-xero-report-balance-sheet.handler.js";

// Concurrency limiter class
class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => Promise<any>> = [];
  private maxConcurrency: number;

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const task = this.queue.shift()!;

    try {
      await task();
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}

export default CreateXeroTool(
  "generateBusinessInsightReportRaw",
  "Fetches all raw data needed for a business insight report for a selected month.",
  {
    month: z.string().describe("Month in YYYY-MM format"),
  },
  async ({ month }: { month: string }) => {
    // Calculate date ranges
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const endDate = new Date(year, monthNum, 0); // last day of month
    const endDateStr = `${endDate.getFullYear()}-${String(
      endDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    // Previous month
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const prevEndDate = new Date(prevYear, prevMonth, 0); // prevMonth is 1-based, so this is correct
    const prevEndDateStr = `${prevEndDate.getFullYear()}-${String(
      prevEndDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(prevEndDate.getDate()).padStart(2, "0")}`;

    // Create concurrency limiter with max 5 concurrent calls
    const limiter = new ConcurrencyLimiter(5);

    // Define all API calls
    const apiCalls = [
      // Profit and Loss for current and previous month
      () => limiter.run(() => listXeroProfitAndLoss(startDate, endDateStr)),
      () =>
        limiter.run(() => listXeroProfitAndLoss(prevStartDate, prevEndDateStr)),
      // Budget summary for current month
      () => limiter.run(() => listXeroBudgetSummary(startDate)),
      // Balance sheet for current month end
      () => limiter.run(() => listXeroReportBalanceSheet({ date: endDateStr })),
      // Contacts (first page only)
      () => limiter.run(() => listXeroContacts(1)),
      // Invoices (first page only)
      () => limiter.run(() => listXeroInvoices(1)),
      // Aged receivables (no filters)
      () => limiter.run(() => listXeroAgedReceivables()),
      // Items (first page only)
      () => limiter.run(() => listXeroItems(1)),
      // Quotes (first page only)
      () => limiter.run(() => listXeroQuotes(1)),
    ];

    // Execute all API calls with concurrency limiting
    const [
      profitAndLoss,
      profitAndLossPrev,
      budgetSummary,
      balanceSheet,
      contacts,
      invoices,
      agedReceivables,
      items,
      quotes,
    ] = await Promise.all(apiCalls.map((call) => call()));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              period: { startDate, endDate: endDateStr },
              profitAndLoss,
              profitAndLossPrev,
              budgetSummary,
              balanceSheet,
              contacts,
              invoices,
              agedReceivables,
              items,
              quotes,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

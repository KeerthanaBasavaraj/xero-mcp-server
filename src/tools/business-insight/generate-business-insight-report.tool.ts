import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroOrganisationDetails } from "../../handlers/list-xero-organisation-details.handler.js";
import { executeRateLimitedCalls } from "../../helpers/rate-limiter.js";

export default CreateXeroTool(
  "generateBusinessInsightReport",
  "Fetches all raw data needed for a business insight report for a selected month. Returns profit and loss, previous profit and loss, budget summary, contacts, invoices, aged receivables, and organisation details with rate-limited API calls.",
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
    const prevEndDate = new Date(prevYear, prevMonth, 0);
    const prevEndDateStr = `${prevEndDate.getFullYear()}-${String(
      prevEndDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(prevEndDate.getDate()).padStart(2, "0")}`;

    // Define all API calls needed for the report
    const apiCalls = [
      // Batch 1: Core financial data
      () =>
        listXeroProfitAndLoss(startDate, endDateStr, 1, "MONTH", true, false), // Current month P&L
      () =>
        listXeroProfitAndLoss(
          prevStartDate,
          prevEndDateStr,
          1,
          "MONTH",
          true,
          false,
        ), // Previous month P&L
      () => listXeroBudgetSummary(startDate, 1, "MONTH"), // Budget data
      () => listXeroAgedReceivables(), // Aged receivables for AR days calculation
      () => listXeroOrganisationDetails(), // Organisation details for report header

      // Batch 2: Client and transaction data
      () => listXeroContacts(1), // Client data for analysis
      () => listXeroInvoices(1), // Invoice data for revenue analysis
    ];

    // Execute API calls with rate limiting
    const [
      profitAndLoss,
      profitAndLossPrev,
      budgetSummary,
      agedReceivables,
      organisationDetails,
      contacts,
      invoices,
    ] = await executeRateLimitedCalls(apiCalls, {
      batchSize: 5,
      delayBetweenBatches: 1000,
      maxRetries: 3,
      retryDelay: 2000,
    });

    // Process and structure the data for the report
    const reportData = {
      // Report metadata
      reportPeriod: {
        currentMonth: { startDate, endDate: endDateStr },
        previousMonth: { startDate: prevStartDate, endDate: prevEndDateStr },
        organisation: organisationDetails.result,
      },

      // Financial data
      profitAndLoss: {
        current: profitAndLoss.result,
        previous: profitAndLossPrev.result,
        budget: budgetSummary.result,
      },

      // Client and transaction data
      clients: contacts.result,
      invoices: invoices.result,
      agedReceivables: agedReceivables.result,

      // Error tracking
      errors: {
        profitAndLoss: profitAndLoss.isError ? profitAndLoss.error : null,
        profitAndLossPrev: profitAndLossPrev.isError
          ? profitAndLossPrev.error
          : null,
        budgetSummary: budgetSummary.isError ? budgetSummary.error : null,
        agedReceivables: agedReceivables.isError ? agedReceivables.error : null,
        organisationDetails: organisationDetails.isError
          ? organisationDetails.error
          : null,
        contacts: contacts.isError ? contacts.error : null,
        invoices: invoices.isError ? invoices.error : null,
      },
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(reportData, null, 2),
        },
      ],
    };
  },
);

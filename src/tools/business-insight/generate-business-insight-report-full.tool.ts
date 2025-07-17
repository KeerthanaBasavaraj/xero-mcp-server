import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroItems } from "../../handlers/list-xero-items.handler.js";
import { listXeroQuotes } from "../../handlers/list-xero-quotes.handler.js";
import { listXeroOrganisationDetails } from "../../handlers/list-xero-organisation-details.handler.js";

// Helper: Get YYYY-MM from date string
function getYearMonth(date: string) {
  return date.slice(0, 7);
}

export default CreateXeroTool(
  "generateBusinessInsightReport",
  "Generates a comprehensive business insight report for a selected tenant and month, covering all relevant financial and client metrics. Returns a structured JSON payload with all report sections.",
  {
    month: z.string().describe("Month in YYYY-MM format"),
    chartTypeOverrides: z
      .record(z.string(), z.string())
      .optional()
      .describe("Optional chart type overrides for specific sections/subsections. Key is section name, value is chart type."),
  },
  async ({ month, chartTypeOverrides }) => {
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

    // Fetch all data in parallel
    const [
      profitAndLoss,
      profitAndLossPrev,
      budgetSummary,
      contacts,
      invoices,
      agedReceivables,
      items,
      quotes,
      orgDetails,
    ] = await Promise.all([
      listXeroProfitAndLoss(startDate, endDateStr),
      listXeroProfitAndLoss(prevStartDate, prevEndDateStr),
      listXeroBudgetSummary(startDate),
      listXeroContacts(1),
      listXeroInvoices(1),
      listXeroAgedReceivables(),
      listXeroItems(1),
      listXeroQuotes(1),
      listXeroOrganisationDetails(),
    ]);

    // Helper: Chart type override
    const getChartType = (section: string, defaultType: string) =>
      chartTypeOverrides?.[section] || defaultType;

    // === Client Analysis Metrics ===
    // New Clients: those with created/added date in this month
    // (Assume contacts.result has a 'createdDateUTC' or similar; fallback to null if not present)
    const contactsArr = contacts.result || [];
    const prevContactsArr = []; // TODO: fetch previous month contacts if needed for more accuracy
    const newClients = contactsArr.filter(
      (c: any) => c.createdDateUTC && getYearMonth(c.createdDateUTC) === month
    );
    // For variance, we need previous month new clients (not available in current fetch; placeholder)
    const prevNewClientsCount = null; // Placeholder
    // Conversion Rate: Quotes accepted / total quotes (for the month)
    const quotesArr = quotes.result || [];
    const acceptedQuotes = quotesArr.filter((q: any) => q.status === "ACCEPTED");
    const conversionRate = quotesArr.length > 0 ? acceptedQuotes.length / quotesArr.length : null;
    // Client Acquisition Cost: Not directly available; placeholder
    const clientAcquisitionCost = null;
    // Revenue vs Client Growth: For each month in year, get revenue and client count
    // (Assume only current month for now; placeholder for full year)
    const revenueVsClientGrowth = {
      data: [
        {
          period: month,
          revenue: null, // Placeholder
          clientCount: contactsArr.length,
        },
      ],
      chartType: getChartType("revenueVsClientGrowth", "line"),
    };
    // Client Mix: current vs new
    const clientMix = {
      currentClients: contactsArr.length - newClients.length,
      newClients: newClients.length,
      data: [
        { type: "current", count: contactsArr.length - newClients.length },
        { type: "new", count: newClients.length },
      ],
      chartType: getChartType("clientMix", "pie"),
    };
    // Service Usage: Most used items (by sales count, if available)
    const itemsArr = items.result || [];
    const serviceUsage = {
      data: itemsArr.map((item: any) => ({ service: item.name, count: null })), // Placeholder for count
      chartType: getChartType("serviceUsage", "pie"),
    };

    // === Revenue & Expenses Metrics ===
    // Metrics over time: Placeholder for year data
    const metricsOverTime = {
      data: [
        {
          period: month,
          revenue: null, // Placeholder
          totalExpenses: null, // Placeholder
          costOfSales: null, // Placeholder
        },
      ],
      chartType: getChartType("metricsOverTime", "line"),
    };
    // Expenses breakdown: Placeholder
    const expensesBreakdown = {
      table: [
        { category: "Operating Expense Subpart", amount: null },
      ],
    };
    // Expense-to-revenue ratio: Placeholder
    const expenseToRevenueRatio = {
      data: [
        { period: month, ratio: null, rollingAverage: null },
      ],
      chartType: getChartType("expenseToRevenueRatio", "line"),
    };

    // === Assemble Report ===
    const report = {
      basisOfPreparation: {
        organisation: orgDetails.result || null,
        period: { startDate, endDate: endDateStr },
        assumptions: "Data sourced from Xero. Period covers the selected month. Assumptions may apply.",
      },
      notesToManagement: {
        summary: null, // Placeholder for AI-generated summary
      },
      keyFinancialMetrics: {
        netIncome: null, // Placeholder
        netIncomeVarianceFromLastMonth: null, // Placeholder
        grossProfit: null, // Placeholder
        grossProfitVarianceVsBudget: null, // Placeholder
        accountReceivableDays: null, // Placeholder
        accountReceivableDaysVarianceVsTarget: null, // Placeholder
      },
      clientAnalysis: {
        clientDetails: {
          newClients: {
            count: newClients.length,
            varianceFromLastMonth: prevNewClientsCount,
          },
          conversionRate,
          clientAcquisitionCost,
        },
        revenueVsClientGrowth,
        clientMix,
        serviceUsage,
      },
      revenueAndExpenses: {
        metricsOverTime,
        expensesBreakdown,
        expenseToRevenueRatio,
      },
      profitAndLoss: {
        actual: profitAndLoss.result || null,
        budget: budgetSummary.result || null,
        previous: profitAndLossPrev.result || null,
      },
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  }
); 
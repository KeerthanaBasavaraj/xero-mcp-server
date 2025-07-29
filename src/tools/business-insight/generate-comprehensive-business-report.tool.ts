import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroOrganisationDetails } from "../../handlers/list-xero-organisation-details.handler.js";
import { executeRateLimitedCalls } from "../../helpers/rate-limiter.js";

// Helper function to calculate financial metrics
function calculateFinancialMetrics(currentPL: any, previousPL: any, budgetData: any, agedReceivables: any) {
  // Extract key figures from Profit & Loss
  const getRevenue = (pl: any) => {
    const revenueSection = pl?.sections?.find((s: any) => 
      s.title?.toLowerCase().includes('revenue') || s.title?.toLowerCase().includes('income')
    );
    return revenueSection?.rows?.reduce((sum: number, row: any) => sum + (row.value || 0), 0) || 0;
  };

  const getExpenses = (pl: any) => {
    const expenseSection = pl?.sections?.find((s: any) => 
      s.title?.toLowerCase().includes('expense') || s.title?.toLowerCase().includes('cost')
    );
    return expenseSection?.rows?.reduce((sum: number, row: any) => sum + (row.value || 0), 0) || 0;
  };

  const getGrossProfit = (pl: any) => {
    const grossProfitSection = pl?.sections?.find((s: any) => 
      s.title?.toLowerCase().includes('gross profit')
    );
    return grossProfitSection?.rows?.reduce((sum: number, row: any) => sum + (row.value || 0), 0) || 0;
  };

  const getNetIncome = (pl: any) => {
    const netIncomeSection = pl?.sections?.find((s: any) => 
      s.title?.toLowerCase().includes('net income') || s.title?.toLowerCase().includes('net profit')
    );
    return netIncomeSection?.rows?.reduce((sum: number, row: any) => sum + (row.value || 0), 0) || 0;
  };

  const currentRevenue = getRevenue(currentPL);
  const currentExpenses = getExpenses(currentPL);
  const currentGrossProfit = getGrossProfit(currentPL);
  const currentNetIncome = getNetIncome(currentPL);

  const previousRevenue = getRevenue(previousPL);
  const previousExpenses = getExpenses(previousPL);
  const previousNetIncome = getNetIncome(previousPL);

  // Calculate variances
  const revenueVariance = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const netIncomeVariance = previousNetIncome ? ((currentNetIncome - previousNetIncome) / previousNetIncome) * 100 : 0;

  // Calculate AR days
  const totalAR = agedReceivables?.rows?.reduce((sum: number, row: any) => sum + (row.value || 0), 0) || 0;
  const arDays = currentRevenue > 0 ? (totalAR / currentRevenue) * 30 : 0;

  // Budget variance for gross profit
  const budgetedGrossProfit = budgetData?.[0]?.sections?.find((s: any) => 
    s.title?.toLowerCase().includes('gross profit')
  )?.rows?.reduce((sum: number, row: any) => sum + (row.value || 0), 0) || 0;
  const grossProfitBudgetVariance = budgetedGrossProfit ? ((currentGrossProfit - budgetedGrossProfit) / budgetedGrossProfit) * 100 : 0;

  return {
    currentMonth: {
      revenue: currentRevenue,
      expenses: currentExpenses,
      grossProfit: currentGrossProfit,
      netIncome: currentNetIncome,
    },
    previousMonth: {
      revenue: previousRevenue,
      expenses: previousExpenses,
      netIncome: previousNetIncome,
    },
    variances: {
      revenueVariance,
      netIncomeVariance,
      grossProfitBudgetVariance,
    },
    metrics: {
      arDays,
      expenseToRevenueRatio: currentRevenue > 0 ? (currentExpenses / currentRevenue) * 100 : 0,
    }
  };
}

// Helper function to analyze client data
function analyzeClientData(contacts: any[], invoices: any[]) {
  const clientCount = contacts?.length || 0;
  const activeClients = invoices?.filter((inv: any) => inv.status === 'AUTHORISED').length || 0;
  
  // Analyze services used (from invoice line items)
  const serviceUsage = new Map();
  invoices?.forEach((invoice: any) => {
    invoice.lineItems?.forEach((item: any) => {
      const service = item.description || item.itemCode || 'Unknown';
      serviceUsage.set(service, (serviceUsage.get(service) || 0) + (item.lineAmount || 0));
    });
  });

  const topServices = Array.from(serviceUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    totalClients: clientCount,
    activeClients,
    clientGrowth: clientCount > 0 ? (activeClients / clientCount) * 100 : 0,
    topServices,
  };
}

export default CreateXeroTool(
  "generateComprehensiveBusinessReport",
  "Generates a comprehensive business insight report with structured sections including financial metrics, client analysis, revenue & expenses breakdown, and profit & loss data with variances. Handles rate limiting for API calls.",
  {
    month: z.string().describe("Month in YYYY-MM format"),
  },
  async ({ month }: { month: string }) => {
    // Calculate date ranges
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const endDate = new Date(year, monthNum, 0);
    const endDateStr = `${endDate.getFullYear()}-${String(
      endDate.getMonth() + 1
    ).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    
    // Previous month
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const prevEndDate = new Date(prevYear, prevMonth, 0);
    const prevEndDateStr = `${prevEndDate.getFullYear()}-${String(
      prevEndDate.getMonth() + 1
    ).padStart(2, "0")}-${String(prevEndDate.getDate()).padStart(2, "0")}`;

    // Define all API calls needed for the report
    const apiCalls = [
      // Batch 1: Core financial data
      () => listXeroProfitAndLoss(startDate, endDateStr, 1, "MONTH", true, false),
      () => listXeroProfitAndLoss(prevStartDate, prevEndDateStr, 1, "MONTH", true, false),
      () => listXeroBudgetSummary(startDate, 1, "MONTH"),
      () => listXeroAgedReceivables(),
      () => listXeroOrganisationDetails(),
      
      // Batch 2: Client and transaction data
      () => listXeroContacts(1),
      () => listXeroInvoices(1),
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
      retryDelay: 2000
    });

    // Check for errors
    const errors = [
      profitAndLoss.isError && `Profit & Loss: ${profitAndLoss.error}`,
      profitAndLossPrev.isError && `Previous P&L: ${profitAndLossPrev.error}`,
      budgetSummary.isError && `Budget: ${budgetSummary.error}`,
      agedReceivables.isError && `Aged Receivables: ${agedReceivables.error}`,
      organisationDetails.isError && `Organisation: ${organisationDetails.error}`,
      contacts.isError && `Contacts: ${contacts.error}`,
      invoices.isError && `Invoices: ${invoices.error}`,
    ].filter(Boolean);

    if (errors.length > 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error generating report: ${errors.join(', ')}`,
          },
        ],
      };
    }

    // Calculate financial metrics
    const financialMetrics = calculateFinancialMetrics(
      profitAndLoss.result,
      profitAndLossPrev.result,
      budgetSummary.result,
      agedReceivables.result
    );

    // Analyze client data
    const clientAnalysis = analyzeClientData(contacts.result, invoices.result);

    // Generate comprehensive report
    const report = {
      // 1. Report Sections to Include - Basis of Preparation
      basisOfPreparation: {
        dataSource: "Xero Accounting System",
        reportPeriod: `${startDate} to ${endDateStr}`,
        previousPeriod: `${prevStartDate} to ${prevEndDateStr}`,
        organisation: organisationDetails.result?.organisations?.[0]?.name || "Unknown",
        assumptions: [
          "All financial data is extracted from Xero's standard reports",
          "Variances are calculated as percentage changes",
          "AR days calculated using aged receivables and monthly revenue",
          "Budget comparisons use Xero's budget summary reports"
        ]
      },

      // 2. Notes to Management
      notesToManagement: {
        summary: `Business performance analysis for ${month}`,
        keyInsights: [
          `Net Income: $${financialMetrics.currentMonth.netIncome.toFixed(2)} (${financialMetrics.variances.netIncomeVariance > 0 ? '+' : ''}${financialMetrics.variances.netIncomeVariance.toFixed(1)}% vs previous month)`,
          `Revenue: $${financialMetrics.currentMonth.revenue.toFixed(2)} (${financialMetrics.variances.revenueVariance > 0 ? '+' : ''}${financialMetrics.variances.revenueVariance.toFixed(1)}% vs previous month)`,
          `Gross Profit: $${financialMetrics.currentMonth.grossProfit.toFixed(2)} (${financialMetrics.variances.grossProfitBudgetVariance > 0 ? '+' : ''}${financialMetrics.variances.grossProfitBudgetVariance.toFixed(1)}% vs budget)`,
          `AR Days: ${financialMetrics.metrics.arDays.toFixed(1)} days`,
          `Active Clients: ${clientAnalysis.activeClients} of ${clientAnalysis.totalClients} total clients`
        ]
      },

      // 3. Key Financial Metrics
      keyFinancialMetrics: {
        netIncome: {
          current: financialMetrics.currentMonth.netIncome,
          previous: financialMetrics.previousMonth.netIncome,
          variance: financialMetrics.variances.netIncomeVariance
        },
        grossProfit: {
          current: financialMetrics.currentMonth.grossProfit,
          budgetVariance: financialMetrics.variances.grossProfitBudgetVariance
        },
        accountReceivableDays: {
          days: financialMetrics.metrics.arDays,
          target: 30, // Assuming 30 days is target
          variance: financialMetrics.metrics.arDays - 30
        }
      },

      // 4. Client Analysis
      clientAnalysis: {
        totalClients: clientAnalysis.totalClients,
        activeClients: clientAnalysis.activeClients,
        clientGrowth: clientAnalysis.clientGrowth,
        topServices: clientAnalysis.topServices.map(([service, amount]) => ({
          service,
          revenue: amount
        }))
      },

      // 5. Revenue & Expenses
      revenueAndExpenses: {
        currentMonth: {
          revenue: financialMetrics.currentMonth.revenue,
          totalExpenses: financialMetrics.currentMonth.expenses,
          costOfSales: financialMetrics.currentMonth.revenue - financialMetrics.currentMonth.grossProfit
        },
        previousMonth: {
          revenue: financialMetrics.previousMonth.revenue,
          totalExpenses: financialMetrics.previousMonth.expenses,
          costOfSales: financialMetrics.previousMonth.revenue - (financialMetrics.previousMonth.netIncome + financialMetrics.previousMonth.expenses)
        },
        expenseToRevenueRatio: financialMetrics.metrics.expenseToRevenueRatio
      },

      // 6. Profit and Loss
      profitAndLoss: {
        current: profitAndLoss.result,
        previous: profitAndLossPrev.result,
        budget: budgetSummary.result,
        completeBreakdown: {
          sections: profitAndLoss.result?.sections?.map((section: any) => ({
            title: section.title,
            rows: section.rows?.map((row: any) => ({
              description: row.description,
              value: row.value,
              budgetValue: budgetSummary.result?.[0]?.sections?.find((s: any) => s.title === section.title)?.rows?.find((r: any) => r.description === row.description)?.value || 0
            }))
          }))
        }
      }
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(report, null, 2),
        },
      ],
    };
  },
); 
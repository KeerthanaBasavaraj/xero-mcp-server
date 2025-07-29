import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";

// Helper function to add delay between API calls to respect rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to calculate percentage variance
const calculateVariance = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Helper function to extract financial metrics from P&L data
const extractFinancialMetrics = (plData: any) => {
  if (!plData?.rows) return null;
  
  let revenue = 0;
  let expenses = 0;
  let costOfSales = 0;
  
  plData.rows.forEach((row: any) => {
    const accountType = row.cells?.[0]?.value;
    const amount = parseFloat(row.cells?.[1]?.value || '0');
    
    if (accountType?.includes('Revenue') || accountType?.includes('Income')) {
      revenue += amount;
    } else if (accountType?.includes('Cost of Sales')) {
      costOfSales += amount;
    } else if (accountType?.includes('Expense')) {
      expenses += amount;
    }
  });
  
  return {
    revenue,
    expenses,
    costOfSales,
    grossProfit: revenue - costOfSales,
    netIncome: revenue - expenses
  };
};

export default CreateXeroTool(
  "generateBusinessInsightReport",
  "Generates a comprehensive business insight report with financial metrics, client analysis, and detailed P&L breakdown. Handles rate limits by making sequential API calls.",
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
    const prevEndDate = new Date(prevYear, prevMonth, 0);
    const prevEndDateStr = `${prevEndDate.getFullYear()}-${String(
      prevEndDate.getMonth() + 1
    ).padStart(2, "0")}-${String(prevEndDate.getDate()).padStart(2, "0")}`;

    try {
      // Sequential API calls to respect rate limits
      const profitAndLoss = await listXeroProfitAndLoss(startDate, endDateStr);
      if (profitAndLoss.isError) {
        throw new Error(`Failed to fetch current month P&L: ${profitAndLoss.error}`);
      }
      await delay(1000); // 1 second delay between calls
      
      const profitAndLossPrev = await listXeroProfitAndLoss(prevStartDate, prevEndDateStr);
      if (profitAndLossPrev.isError) {
        throw new Error(`Failed to fetch previous month P&L: ${profitAndLossPrev.error}`);
      }
      await delay(1000);
      
      const budgetSummary = await listXeroBudgetSummary(startDate);
      if (budgetSummary.isError) {
        throw new Error(`Failed to fetch budget summary: ${budgetSummary.error}`);
      }
      await delay(1000);
      
      const agedReceivables = await listXeroAgedReceivables();
      if (agedReceivables.isError) {
        throw new Error(`Failed to fetch aged receivables: ${agedReceivables.error}`);
      }
      
      // Extract financial metrics
      const currentMetrics = extractFinancialMetrics(profitAndLoss.result);
      const previousMetrics = extractFinancialMetrics(profitAndLossPrev.result);
      
      // Calculate variances
      const netIncomeVariance = currentMetrics && previousMetrics 
        ? calculateVariance(currentMetrics.netIncome, previousMetrics.netIncome)
        : 0;
        
      const grossProfitVariance = currentMetrics && budgetSummary.result?.[0]
        ? calculateVariance(currentMetrics.grossProfit, budgetSummary.result[0].grossProfit || 0)
        : 0;
      
      // Calculate accounts receivable days (simplified calculation)
      const totalReceivables = agedReceivables.result?.rows?.reduce((sum: number, row: any) => 
        sum + (parseFloat(row["Overdue Amount"] || '0')), 0) || 0;
      const avgDailyRevenue = currentMetrics ? currentMetrics.revenue / 30 : 0;
      const receivableDays = avgDailyRevenue > 0 ? totalReceivables / avgDailyRevenue : 0;
      
      // Calculate expense to revenue ratios
      const currentExpenseRatio = currentMetrics && currentMetrics.revenue > 0 
        ? (currentMetrics.expenses / currentMetrics.revenue) * 100 
        : 0;
      const previousExpenseRatio = previousMetrics && previousMetrics.revenue > 0 
        ? (previousMetrics.expenses / previousMetrics.revenue) * 100 
        : 0;
      
      // Calculate average overdue amount
      const numberOfOverdueInvoices = agedReceivables.result?.rows?.length || 0;
      const averageOverdueAmount = numberOfOverdueInvoices > 0 
        ? totalReceivables / numberOfOverdueInvoices 
        : 0;

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              period: { 
                startDate, 
                endDate: endDateStr, 
                previousStart: prevStartDate, 
                previousEnd: prevEndDateStr 
              },
              profitAndLoss: profitAndLoss.result,
              profitAndLossPrev: profitAndLossPrev.result,
              budgetSummary: budgetSummary.result,
              agedReceivables: agedReceivables.result,
              calculatedMetrics: {
                currentMetrics,
                previousMetrics,
                netIncomeVariance,
                grossProfitVariance,
                receivableDays,
                totalReceivables,
                currentExpenseRatio,
                previousExpenseRatio,
                numberOfOverdueInvoices,
                averageOverdueAmount
              }
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Failed to generate business insight report",
              details: error instanceof Error ? error.message : String(error)
            }, null, 2),
          },
        ],
      };
    }
  },
);

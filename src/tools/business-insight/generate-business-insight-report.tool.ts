import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { listXeroReportBalanceSheet } from "../../handlers/list-xero-report-balance-sheet.handler.js";

const GenerateBusinessInsightReportTool = CreateXeroTool(
  "generate-business-insight-report",
  "Generates a comprehensive business insight report including Net Income, Gross Profit, Revenue, Total Expenses, Budget vs Actuals, Client Revenue, Services used by clients, and Accounts Receivable Days. This tool aggregates data from multiple Xero reports to provide a complete business overview.",
  {
    fromDate: z
      .string()
      .optional()
      .describe("Optional start date in YYYY-MM-DD format for the reporting period"),
    toDate: z
      .string()
      .optional()
      .describe("Optional end date in YYYY-MM-DD format for the reporting period"),
    periods: z
      .number()
      .optional()
      .describe("Optional number of periods to compare (defaults to 12 months if not specified)"),
    timeframe: z
      .enum(["MONTH", "QUARTER", "YEAR"])
      .optional()
      .describe("Optional timeframe for the report (MONTH, QUARTER, YEAR)"),
  },
  async ({ fromDate, toDate, periods = 12, timeframe = "MONTH" }) => {
    try {
      const reportDate = toDate || new Date().toISOString().split('T')[0];
      const startDate = fromDate || new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1).toISOString().split('T')[0];

      // 1. Get Profit & Loss data (Net Income, Gross Profit, Revenue, Total Expenses)
      const pnlResponse = await listXeroProfitAndLoss(
        startDate,
        reportDate,
        periods,
        timeframe,
        true,
        false
      );

      // 2. Get Budget Summary (Budget vs Actuals)
      const budgetResponse = await listXeroBudgetSummary(
        startDate,
        periods,
        timeframe === "QUARTER" ? "MONTH" : timeframe
      );

      // 3. Get Aged Receivables (Accounts Receivable Days)
      const arResponse = await listXeroAgedReceivables(
        undefined,
        reportDate,
        startDate,
        reportDate
      );

      // 4. Get Invoices for Client Revenue analysis
      const invoicesResponse = await listXeroInvoices(1);

      // 5. Get Contacts for client information
      const contactsResponse = await listXeroContacts(1);

      // 6. Get Balance Sheet for additional financial context
      const balanceSheetResponse = await listXeroReportBalanceSheet({
        date: reportDate,
        periods,
        timeframe,
        standardLayout: true,
        paymentsOnly: false
      });

      // Process and format the data
      const report = {
        reportPeriod: {
          fromDate: startDate,
          toDate: reportDate,
          periods,
          timeframe
        },
        generatedAt: new Date().toISOString(),
        profitAndLoss: pnlResponse.error ? { error: pnlResponse.error } : pnlResponse.result,
        budgetAnalysis: budgetResponse.isError ? { error: budgetResponse.error } : budgetResponse.result,
        accountsReceivable: arResponse.isError ? { error: arResponse.error } : arResponse.result,
        clientRevenue: invoicesResponse.error ? { error: invoicesResponse.error } : processClientRevenue(invoicesResponse.result || []),
        balanceSheet: balanceSheetResponse.error ? { error: balanceSheetResponse.error } : balanceSheetResponse.result,
        contacts: contactsResponse.isError ? { error: contactsResponse.error } : processContacts(contactsResponse.result || []),
        keyMetrics: await calculateKeyMetrics(
          pnlResponse.result,
          budgetResponse.result,
          arResponse.result,
          invoicesResponse.result || []
        )
      };

      return {
        content: [
          {
            type: "text" as const,
            text: "=== BUSINESS INSIGHT REPORT ===",
          },
          {
            type: "text" as const,
            text: `Report Period: ${startDate} to ${reportDate}`,
          },
          {
            type: "text" as const,
            text: `Generated: ${report.generatedAt}`,
          },
          {
            type: "text" as const,
            text: "=== KEY METRICS ===",
          },
          {
            type: "text" as const,
            text: JSON.stringify(report.keyMetrics, null, 2),
          },
          {
            type: "text" as const,
            text: "=== PROFIT & LOSS DATA ===",
          },
          {
            type: "text" as const,
            text: JSON.stringify(report.profitAndLoss, null, 2),
          },
          {
            type: "text" as const,
            text: "=== BUDGET VS ACTUAL ANALYSIS ===",
          },
          {
            type: "text" as const,
            text: JSON.stringify(report.budgetAnalysis, null, 2),
          },
          {
            type: "text" as const,
            text: "=== ACCOUNTS RECEIVABLE ANALYSIS ===",
          },
          {
            type: "text" as const,
            text: JSON.stringify(report.accountsReceivable, null, 2),
          },
          {
            type: "text" as const,
            text: "=== CLIENT REVENUE ANALYSIS ===",
          },
          {
            type: "text" as const,
            text: JSON.stringify(report.clientRevenue, null, 2),
          },
          {
            type: "text" as const,
            text: "=== BALANCE SHEET DATA ===",
          },
          {
            type: "text" as const,
            text: JSON.stringify(report.balanceSheet, null, 2),
          },
          {
            type: "text" as const,
            text: "=== CONTACTS SUMMARY ===",
          },
          {
            type: "text" as const,
            text: JSON.stringify(report.contacts, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error generating business insight report: ${error}`,
          },
        ],
      };
    }
  },
);

// Helper function to process client revenue data
function processClientRevenue(invoices: any[]) {
  if (!invoices) return { error: "No invoice data available" };

  const clientRevenue: Record<string, { total: number; count: number; paid: number; outstanding: number }> = {};
  
  invoices.forEach(invoice => {
    const clientName = invoice.contact?.name || 'Unknown Client';
    const amount = parseFloat(String(invoice.total || '0'));
    const amountPaid = parseFloat(String(invoice.amountPaid || '0'));
    const amountDue = parseFloat(String(invoice.amountDue || '0'));
    
    if (!clientRevenue[clientName]) {
      clientRevenue[clientName] = { total: 0, count: 0, paid: 0, outstanding: 0 };
    }
    
    clientRevenue[clientName].total += amount;
    clientRevenue[clientName].count += 1;
    clientRevenue[clientName].paid += amountPaid;
    clientRevenue[clientName].outstanding += amountDue;
  });

  return {
    totalClients: Object.keys(clientRevenue).length,
    totalRevenue: Object.values(clientRevenue).reduce((sum, client) => sum + client.total, 0),
    totalPaid: Object.values(clientRevenue).reduce((sum, client) => sum + client.paid, 0),
    totalOutstanding: Object.values(clientRevenue).reduce((sum, client) => sum + client.outstanding, 0),
    clientBreakdown: Object.entries(clientRevenue)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([client, data]) => ({
        client,
        totalRevenue: data.total,
        invoiceCount: data.count,
        amountPaid: data.paid,
        amountOutstanding: data.outstanding
      }))
  };
}

// Helper function to process contacts data
function processContacts(contacts: any[]) {
  if (!contacts) return { error: "No contact data available" };

  const contactTypes = {
    customers: 0,
    suppliers: 0,
    both: 0,
    total: contacts.length
  };

  contacts.forEach(contact => {
    if (contact.isCustomer && contact.isSupplier) {
      contactTypes.both++;
    } else if (contact.isCustomer) {
      contactTypes.customers++;
    } else if (contact.isSupplier) {
      contactTypes.suppliers++;
    }
  });

  return {
    summary: contactTypes,
    activeContacts: contacts.filter(c => c.contactStatus === 'ACTIVE').length,
    inactiveContacts: contacts.filter(c => c.contactStatus === 'INACTIVE').length
  };
}

// Helper function to calculate key metrics
async function calculateKeyMetrics(pnlData: any, budgetData: any, arData: any, invoiceData: any[]) {
  const metrics: any = {};

  // Extract key P&L metrics
  if (pnlData?.rows) {
    const revenueRow = pnlData.rows.find((row: any) => 
      row.title?.toLowerCase().includes('revenue') || 
      row.title?.toLowerCase().includes('sales') ||
      row.title?.toLowerCase().includes('income')
    );
    const expenseRow = pnlData.rows.find((row: any) => 
      row.title?.toLowerCase().includes('expense') || 
      row.title?.toLowerCase().includes('cost')
    );
    const grossProfitRow = pnlData.rows.find((row: any) => 
      row.title?.toLowerCase().includes('gross profit')
    );
    const netIncomeRow = pnlData.rows.find((row: any) => 
      row.title?.toLowerCase().includes('net income') ||
      row.title?.toLowerCase().includes('net profit')
    );

    if (revenueRow?.cells?.[0]?.value) {
      metrics.revenue = parseFloat(String(revenueRow.cells[0].value));
    }
    if (expenseRow?.cells?.[0]?.value) {
      metrics.totalExpenses = parseFloat(String(expenseRow.cells[0].value));
    }
    if (grossProfitRow?.cells?.[0]?.value) {
      metrics.grossProfit = parseFloat(String(grossProfitRow.cells[0].value));
    }
    if (netIncomeRow?.cells?.[0]?.value) {
      metrics.netIncome = parseFloat(String(netIncomeRow.cells[0].value));
    }
  }

  // Calculate Accounts Receivable Days
  if (arData?.rows) {
    const totalReceivables = arData.rows.reduce((sum: number, row: any) => {
      if (row.cells?.[0]?.value) {
        return sum + parseFloat(String(row.cells[0].value));
      }
      return sum;
    }, 0);
    
    if (totalReceivables > 0 && metrics.revenue) {
      // Simple calculation: (AR / Revenue) * 365
      metrics.accountsReceivableDays = Math.round((totalReceivables / metrics.revenue) * 365);
    }
  }

  // Calculate client metrics
  if (invoiceData) {
    const clientRevenue = processClientRevenue(invoiceData);
    metrics.totalClients = clientRevenue.totalClients;
    metrics.totalRevenue = clientRevenue.totalRevenue;
    metrics.totalOutstanding = clientRevenue.totalOutstanding;
  }

  return metrics;
}

export default GenerateBusinessInsightReportTool; 
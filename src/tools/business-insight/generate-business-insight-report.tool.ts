import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroItems } from "../../handlers/list-xero-items.handler.js";
import { ReportWithRow, Contact, Invoice, Item, RowType, ReportRow } from "xero-node";

function parsePLMetric(report: ReportWithRow | undefined, label: string): number | null {
  if (!report?.rows) return null;
  for (const row of report.rows) {
    if (row.rowType === RowType.Section && row.title?.toLowerCase().includes(label.toLowerCase())) {
      // Section total is usually in the last row of the section
      // Some Xero SDKs use RowType.SummaryRow, but fallback to RowType.Row if not available
      const totalRow = row.rows?.find((r: ReportRow) => (RowType as any).SummaryRow ? r.rowType === (RowType as any).SummaryRow : false) ||
        row.rows?.find((r: ReportRow) => r.rowType === RowType.Row);
      if (totalRow && totalRow.cells?.length) {
        // Value is usually in the last cell
        const val = totalRow.cells[totalRow.cells.length - 1]?.value;
        return val !== undefined ? Number(val) : null;
      }
    }
    // Sometimes it's a single row
    if (row.rowType === RowType.Row && row.cells?.[0]?.value?.toLowerCase().includes(label.toLowerCase())) {
      const val = row.cells[row.cells.length - 1]?.value;
      return val !== undefined ? Number(val) : null;
    }
  }
  return null;
}

function parseBudgetMetric(budgetReport: ReportWithRow | undefined, label: string): number | null {
  if (!budgetReport?.rows) return null;
  for (const row of budgetReport.rows) {
    if (row.rowType === RowType.Row && row.cells?.[0]?.value?.toLowerCase().includes(label.toLowerCase())) {
      const val = row.cells[row.cells.length - 1]?.value;
      return val !== undefined ? Number(val) : null;
    }
  }
  return null;
}

function getARdays(agedRecReport: ReportWithRow | undefined, revenue: number | null, daysInMonth = 30): number | null {
  if (!agedRecReport?.rows || !revenue) return null;
  const totalAR = agedRecReport.rows.reduce((sum: number, row: any) => sum + (Number(row["Overdue Amount"]) || 0), 0);
  return revenue > 0 ? (totalAR / revenue) * daysInMonth : null;
}

function getNewClients(contacts: Contact[] | undefined, month: string): number {
  if (!contacts) return 0;
  // Use updatedDateUTC as fallback if createdDateUTC is not available
  return contacts.filter((c) => {
    const created = (c as any).createdDateUTC || c.updatedDateUTC;
    return created && created.startsWith(month);
  }).length;
}

function getClientMix(invoices: Invoice[] | undefined): Record<string, number> {
  const mix: Record<string, number> = {};
  if (!invoices) return mix;
  for (const inv of invoices) {
    const name = inv.contact?.name || "Unknown";
    mix[name] = (mix[name] || 0) + (Number(inv.total) || 0);
  }
  return mix;
}

function getServiceUsage(invoices: Invoice[] | undefined): Record<string, number> {
  const usage: Record<string, number> = {};
  if (!invoices) return usage;
  for (const inv of invoices) {
    if (inv.lineItems) {
      for (const li of inv.lineItems) {
        const key = li.itemCode || li.description || "Unknown";
        usage[key] = (usage[key] || 0) + (Number(li.quantity) || 1);
      }
    }
  }
  return usage;
}

function getConversionRate(quotes: any[] | undefined, invoices: Invoice[] | undefined, month: string): number | null {
  if (!quotes || !invoices) return null;
  const quoteContacts = new Set(
    quotes.filter((q) => q.status === "ACCEPTED" && q.dateString && q.dateString.startsWith(month)).map((q) => q.contact?.contactID)
  );
  const invoiceContacts = new Set(
    invoices.filter((inv) => inv.date && inv.date.startsWith(month)).map((inv) => inv.contact?.contactID)
  );
  const converted = [...quoteContacts].filter((id) => invoiceContacts.has(id));
  return quoteContacts.size > 0 ? (converted.length / quoteContacts.size) * 100 : null;
}

function getExpenseBreakdown(plReport: ReportWithRow | undefined): { name: string; value: number }[] {
  const breakdown: { name: string; value: number }[] = [];
  if (!plReport?.rows) return breakdown;
  for (const row of plReport.rows) {
    if (row.rowType === RowType.Section && row.title?.toLowerCase().includes("expenses")) {
      for (const r of row.rows || []) {
        if (r.rowType === RowType.Row && r.cells?.length) {
          breakdown.push({
            name: r.cells[0]?.value || "Unknown",
            value: Number(r.cells[r.cells.length - 1]?.value) || 0,
          });
        }
      }
    }
  }
  return breakdown;
}

const GenerateBusinessInsightReportTool = CreateXeroTool(
  "generate-business-insight-report",
  "Generates a comprehensive business insight report for a selected tenant and month, covering all relevant financial and client metrics.",
  {
    month: z.string().describe("Month in YYYY-MM format for the report period."),
    tenantId: z.string().optional().describe("Optional Xero tenant ID if multi-tenant context."),
  },
  async ({ month, tenantId }) => {
    // 1. Parse dates
    const [year, monthNum] = month.split("-").map(Number);
    const fromDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const toDate = new Date(year, monthNum, 0); // last day of month
    const toDateStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;
    const prevMonth = monthNum === 1 ? `${year - 1}-12` : `${year}-${String(monthNum - 1).padStart(2, "0")}`;
    const prevFromDate = prevMonth + "-01";
    const prevToDate = new Date(monthNum === 1 ? year - 1 : year, monthNum === 1 ? 12 : monthNum - 1, 0);
    const prevToDateStr = `${prevToDate.getFullYear()}-${String(prevToDate.getMonth() + 1).padStart(2, "0")}-${String(prevToDate.getDate()).padStart(2, "0")}`;

    // 2. Fetch data
    const [plResp, budgetResp, contactsResp, invoicesResp, agedRecResp, prevPlResp, itemsResp] = await Promise.all([
      listXeroProfitAndLoss(fromDate, toDateStr, 1, "MONTH", true),
      listXeroBudgetSummary(fromDate, 1, "MONTH"),
      listXeroContacts(),
      listXeroInvoices(1), // TODO: handle pagination for full month
      listXeroAgedReceivables(undefined, toDateStr),
      listXeroProfitAndLoss(prevFromDate, prevToDateStr, 1, "MONTH", true),
      listXeroItems(1),
    ]);

    if (plResp.isError || budgetResp.isError || contactsResp.isError || invoicesResp.isError || agedRecResp.isError || prevPlResp.isError || itemsResp.isError) {
      return { content: [{ type: "text", text: `Error fetching data: ${plResp.error || budgetResp.error || contactsResp.error || invoicesResp.error || agedRecResp.error || prevPlResp.error || itemsResp.error}` }] };
    }

    const pl = plResp.result;
    const budget = budgetResp.result?.[0];
    const contacts = contactsResp.result;
    const invoices = invoicesResp.result;
    const agedRec = agedRecResp.result;
    const prevPL = prevPlResp.result;
    const items = itemsResp.result;

    // 3. Compute metrics
    const revenue = parsePLMetric(pl, "Revenue");
    const expenses = parsePLMetric(pl, "Expenses");
    const costOfSales = parsePLMetric(pl, "Cost of Sales");
    const netIncome = parsePLMetric(pl, "Net Profit");
    const grossProfit = revenue !== null && costOfSales !== null ? revenue - costOfSales : null;
    const prevNetIncome = parsePLMetric(prevPL, "Net Profit");
    const prevRevenue = parsePLMetric(prevPL, "Revenue");
    const budgetGrossProfit = parseBudgetMetric(budget, "Gross Profit");
    const arDays = getARdays(agedRec, revenue);
    const prevARDays = getARdays(agedRec, prevRevenue);
    const expenseToRevenueRatio = revenue && expenses && revenue > 0 ? (expenses / revenue) * 100 : null;
    const expenseBreakdown = getExpenseBreakdown(pl);

    // Client analytics
    const newClients = getNewClients(contacts, month);
    const prevNewClients = getNewClients(contacts, prevMonth);
    const clientMix = getClientMix(invoices);
    const serviceUsage = getServiceUsage(invoices);
    const conversionRate = null;
    const clientAcquisitionCost = null;

    // 4. Assemble report
    const report = {
      basisOfPreparation: `Data sourced from Xero for period ${fromDate} to ${toDateStr}. Assumptions: All data is as per Xero records.`,
      notesToManagement: "[AI-generated summary placeholder]",
      keyFinancialMetrics: {
        netIncome,
        netIncomeVarianceFromLastMonth: netIncome !== null && prevNetIncome !== null && prevNetIncome !== 0 ? ((netIncome - prevNetIncome) / Math.abs(prevNetIncome)) * 100 : null,
        grossProfit,
        grossProfitVarianceWrtBudget: grossProfit !== null && budgetGrossProfit !== null && budgetGrossProfit !== 0 ? ((grossProfit - budgetGrossProfit) / Math.abs(budgetGrossProfit)) * 100 : null,
        arDays,
        arDaysVarianceWrtTarget: arDays !== null && prevARDays !== null && prevARDays !== 0 ? ((arDays - prevARDays) / Math.abs(prevARDays)) * 100 : null,
      },
      clientAnalysis: {
        newClients,
        newClientsVarianceFromLastMonth: prevNewClients !== 0 ? ((newClients - prevNewClients) / Math.abs(prevNewClients)) * 100 : null,
        conversionRate, // Placeholder
        clientAcquisitionCost, // Placeholder
        revenueVsClientGrowth: null, // Placeholder
        clientMix,
        serviceUsageMost: Object.entries(serviceUsage).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      },
      revenueAndExpenses: {
        revenue,
        totalExpenses: expenses,
        totalCostOfSales: costOfSales,
        expensesBreakdown: expenseBreakdown,
        expenseToRevenueRatio,
      },
      profitAndLoss: {
        actual: pl,
        budgeted: budget,
      },
    };

    return {
      content: [
        { type: "text", text: JSON.stringify(report, null, 2) }
      ]
    };
  }
);

export default GenerateBusinessInsightReportTool; 
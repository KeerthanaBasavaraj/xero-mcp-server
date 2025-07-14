import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { listXeroBudgetSummary } from "../../handlers/list-xero-budget-summary.handler.js";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
// TODO: Import or implement handlers for client metrics, AR days, etc.

/**
 * Generates a comprehensive business insights report for a selected tenant and month.
 * Sections: Basis of Preparation, Notes to Management, Key Financial Metrics, Client Analysis, Charts, Profit and Loss Table.
 */
const GenerateBusinessInsightReportTool = CreateXeroTool(
  "generate-business-insight-report",
  "Generates a comprehensive business insights report for a selected tenant and month, covering financial and client metrics, charts, and tables.",
  {
    tenantId: z
      .string()
      .describe("The Xero tenant/org ID to generate the report for."),
    month: z.string().describe("The month to report on, in YYYY-MM format."),
  },
  async (args) => {
    const { month } = args;
    // Parse month boundaries
    const [year, m] = month.split("-").map(Number);
    const fromDate = `${year}-${String(m).padStart(2, "0")}-01`;
    const toDate = new Date(year, m, 0); // last day of month
    const toDateStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;

    // === Data Fetching ===
    // Profit & Loss (actuals)
    const actualsResp = await listXeroProfitAndLoss(
      fromDate,
      toDateStr,
      undefined,
      "MONTH",
      true,
    );
    // Budget
    const budgetResp = await listXeroBudgetSummary(fromDate, 1, "MONTH");
    // TODO: Fetch client metrics, AR days, etc.

    // === Section: Basis of Preparation ===
    const basisOfPreparation = `This report is prepared using data from Xero for the period ${fromDate} to ${toDateStr}. All figures are based on current records. Assumptions: All transactions are recorded, and client data is up to date.`;

    // === Section: Notes to Management ===
    // TODO: Use AI or rules to generate narrative summary from data
    const notesToManagement =
      "Key insights and trends will be summarized here.";

    // === Section: Key Financial Metrics ===
    // Calculate Net Income, Gross Profit, AR Days
    let netIncome = null;
    let grossProfit = null;
    let accountsReceivableDays = null;
    if (actualsResp.result) {
      const report = actualsResp.result;
      // Find Revenue, COGS, Expenses, Net Profit
      const findSection = (name: string) =>
        report.rows?.find(
          (row: any) =>
            row.rowType === "SECTION" &&
            row.title?.toLowerCase().includes(name),
        );
      const revenueSection = findSection("revenue");
      const cogsSection = findSection("cost of goods sold");
      const expensesSection = findSection("expenses");
      const netProfitSection = findSection("net profit");
      const getTotal = (section: any) =>
        section?.cells?.[0]?.value ? Number(section.cells[0].value) : null;
      const revenue = getTotal(revenueSection);
      const cogs = getTotal(cogsSection);
      const expenses = getTotal(expensesSection);
      const netProfit = getTotal(netProfitSection);
      if (revenue !== null && expenses !== null) netIncome = revenue - expenses;
      if (revenue !== null && cogs !== null) grossProfit = revenue - cogs;
      if (netProfit !== null) netIncome = netProfit;
    }
    // Accounts Receivable Days (simple estimate: (Receivables / Revenue) * Days in Period)
    try {
      const agedResp = await listXeroAgedReceivables(undefined, toDateStr);
      if (!agedResp.isError && actualsResp.result) {
        const receivables =
          agedResp.result?.rows?.reduce(
            (sum: number, row: any) => sum + (row["Overdue Amount"] || 0),
            0,
          ) || 0;
        const report = actualsResp.result;
        const revenueSection = report.rows?.find(
          (row: any) =>
            row.rowType === "SECTION" &&
            row.title?.toLowerCase().includes("revenue"),
        );
        const revenue = revenueSection?.cells?.[0]?.value
          ? Number(revenueSection.cells[0].value)
          : null;
        if (revenue && revenue > 0) {
          const daysInMonth = new Date(year, m, 0).getDate();
          accountsReceivableDays = Math.round(
            (receivables / revenue) * daysInMonth,
          );
        }
      }
    } catch {}
    const keyFinancialMetrics = {
      netIncome,
      grossProfit,
      accountsReceivableDays,
    };

    // === Section: Client Analysis ===
    // Calculate new clients, conversion rate, acquisition cost
    let newClients = null;
    let conversionRate = null;
    let clientAcquisitionCost = null;
    try {
      // Fetch all contacts (clients)
      const contactsResp = await listXeroContacts();
      if (!contactsResp.isError && contactsResp.result) {
        // Estimate new clients: contacts created in the selected month
        // Xero Contact does not always have a created date, so fallback to updatedDateUTC or similar if available
        const contacts = contactsResp.result;
        const monthStart = new Date(fromDate);
        const monthEnd = new Date(toDateStr);
        newClients = contacts.filter((c: any) => {
          const created = c.createdDateUTC
            ? new Date(c.createdDateUTC)
            : c.updatedDateUTC
              ? new Date(c.updatedDateUTC)
              : null;
          return created && created >= monthStart && created <= monthEnd;
        }).length;
      }
      // Conversion rate and acquisition cost require leads and marketing spend, which are not in Xero by default
      // Set as null or placeholder
      conversionRate = null; // Not available in Xero
      clientAcquisitionCost = null; // Not available in Xero
    } catch {}
    const clientAnalysis = {
      newClients,
      conversionRate,
      clientAcquisitionCost,
    };

    // === Section: Charts ===
    // Prepare chart data/configs for Revenue vs Client Growth, Revenue vs Expenses, Client Mix
    let revenueVsClientGrowth = null;
    let revenueVsExpenses = null;
    let clientMix = null;
    try {
      // Revenue vs Client Growth (monthly from Jan to selected month)
      // Get monthly revenue and new clients for each month YTD
      const months = [];
      for (let i = 1; i <= m; i++) {
        months.push({
          from: `${year}-${String(i).padStart(2, "0")}-01`,
          to: `${year}-${String(i).padStart(2, "0")}-${String(new Date(year, i, 0).getDate()).padStart(2, "0")}`,
        });
      }
      // Fetch all contacts once for client growth
      const contactsResp = await listXeroContacts();
      const contacts =
        !contactsResp.isError && contactsResp.result ? contactsResp.result : [];
      const monthlyData = [];
      for (const monthObj of months) {
        // Revenue for month
        const plResp = await listXeroProfitAndLoss(
          monthObj.from,
          monthObj.to,
          undefined,
          "MONTH",
          true,
        );
        let revenue = null;
        if (!plResp.isError && plResp.result) {
          const revenueSection = plResp.result.rows?.find(
            (row: any) =>
              row.rowType === "SECTION" &&
              row.title?.toLowerCase().includes("revenue"),
          );
          revenue = revenueSection?.cells?.[0]?.value
            ? Number(revenueSection.cells[0].value)
            : null;
        }
        // New clients for month
        const monthStart = new Date(monthObj.from);
        const monthEnd = new Date(monthObj.to);
        const newClients = contacts.filter((c: any) => {
          const created = c.createdDateUTC
            ? new Date(c.createdDateUTC)
            : c.updatedDateUTC
              ? new Date(c.updatedDateUTC)
              : null;
          return created && created >= monthStart && created <= monthEnd;
        }).length;
        monthlyData.push({
          month: monthObj.from.substring(0, 7),
          revenue,
          newClients,
        });
      }
      revenueVsClientGrowth = {
        type: "line",
        labels: monthlyData.map((d) => d.month),
        datasets: [
          { label: "Revenue", data: monthlyData.map((d) => d.revenue) },
          { label: "New Clients", data: monthlyData.map((d) => d.newClients) },
        ],
      };
      // Revenue vs Expenses (monthly YTD)
      const revExpData = [];
      for (const monthObj of months) {
        const plResp = await listXeroProfitAndLoss(
          monthObj.from,
          monthObj.to,
          undefined,
          "MONTH",
          true,
        );
        let revenue = null,
          expenses = null;
        if (!plResp.isError && plResp.result) {
          const revenueSection = plResp.result.rows?.find(
            (row: any) =>
              row.rowType === "SECTION" &&
              row.title?.toLowerCase().includes("revenue"),
          );
          revenue = revenueSection?.cells?.[0]?.value
            ? Number(revenueSection.cells[0].value)
            : null;
          const expensesSection = plResp.result.rows?.find(
            (row: any) =>
              row.rowType === "SECTION" &&
              row.title?.toLowerCase().includes("expenses"),
          );
          expenses = expensesSection?.cells?.[0]?.value
            ? Number(expensesSection.cells[0].value)
            : null;
        }
        revExpData.push({
          month: monthObj.from.substring(0, 7),
          revenue,
          expenses,
        });
      }
      revenueVsExpenses = {
        type: "bar",
        labels: revExpData.map((d) => d.month),
        datasets: [
          { label: "Revenue", data: revExpData.map((d) => d.revenue) },
          { label: "Expenses", data: revExpData.map((d) => d.expenses) },
        ],
      };
      // Client Mix (e.g., % new vs existing)
      const totalClients = contacts.length;
      const newClientsYTD = contacts.filter((c: any) => {
        const created = c.createdDateUTC
          ? new Date(c.createdDateUTC)
          : c.updatedDateUTC
            ? new Date(c.updatedDateUTC)
            : null;
        return (
          created &&
          created >= new Date(`${year}-01-01`) &&
          created <= new Date(toDateStr)
        );
      }).length;
      clientMix = {
        type: "pie",
        labels: ["New Clients", "Existing Clients"],
        datasets: [{ data: [newClientsYTD, totalClients - newClientsYTD] }],
      };
    } catch {}
    const charts = {
      revenueVsClientGrowth,
      revenueVsExpenses,
      clientMix,
    };

    // === Section: Profit and Loss Table ===
    // Build table comparing actual vs budget, with variance
    let profitAndLossTable: {
      table?: Array<{
        category: string;
        actual: number | null;
        budget: number | null;
        variance: number | null;
        variancePct: number | null;
      }>;
      ytd?: string;
      actual?: any;
      budget?: any;
      variance?: null;
    } = {
      actual: actualsResp.result,
      budget: budgetResp.result?.[0],
      variance: null,
    };
    try {
      if (actualsResp.result && budgetResp.result?.[0]) {
        const actualRows = actualsResp.result.rows || [];
        const budgetRows = budgetResp.result[0].rows || [];
        // Helper to find section by title
        const findSection = (rows: any[], name: string) =>
          rows.find(
            (row: any) =>
              row.rowType === "SECTION" &&
              row.title?.toLowerCase().includes(name),
          );
        // Categories to compare
        const categories = [
          { key: "revenue", label: "Revenue" },
          { key: "cost of goods sold", label: "COGS" },
          { key: "expenses", label: "Expenses" },
          { key: "net profit", label: "Net Profit" },
        ];
        const table: Array<{
          category: string;
          actual: number | null;
          budget: number | null;
          variance: number | null;
          variancePct: number | null;
        }> = [];
        for (const cat of categories) {
          const actualSec = findSection(actualRows, cat.key);
          const budgetSec = findSection(budgetRows, cat.key);
          const actualVal = actualSec?.cells?.[0]?.value
            ? Number(actualSec.cells[0].value)
            : null;
          const budgetVal = budgetSec?.cells?.[0]?.value
            ? Number(budgetSec.cells[0].value)
            : null;
          const variance =
            actualVal !== null && budgetVal !== null
              ? actualVal - budgetVal
              : null;
          const variancePct =
            actualVal !== null &&
            budgetVal !== null &&
            budgetVal !== 0 &&
            variance !== null
              ? (variance / budgetVal) * 100
              : null;
          table.push({
            category: cat.label,
            actual: actualVal,
            budget: budgetVal,
            variance,
            variancePct,
          });
        }
        profitAndLossTable = {
          table,
          ytd: fromDate.substring(0, 4),
        };
      }
    } catch {
      // ignore errors
    }

    // Output as text for compatibility
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              basisOfPreparation,
              notesToManagement,
              keyFinancialMetrics,
              clientAnalysis,
              charts,
              profitAndLossTable,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

export default GenerateBusinessInsightReportTool;

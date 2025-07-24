import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

// Define a custom structure for rows
type PaidInvoiceRow = {
  invoiceNumber: string;
  contactName: string;
  invoiceDate: string;
  paidDate: string;
  totalAmount: number;
  currency: string;
};

type PaidInvoiceReport = {
  reportName: string;
  reportDate: string;
  rows: PaidInvoiceRow[];
};

export async function listXeroPaidInvoices(
  fromDate?: string,
  toDate?: string,
): Promise<XeroClientResponse<PaidInvoiceReport>> {
  await xeroClient.authenticate();

  try {
    const allInvoices: any[] = [];
    let page = 1;
    let fetched = 0;

    const dateFilterParts = [];
    if (fromDate) dateFilterParts.push(`Date >= DateTime("${fromDate}")`);
    if (toDate) dateFilterParts.push(`Date <= DateTime("${toDate}")`);

    const baseFilter = `Status == "PAID" AND Type == "ACCREC"`;
    const whereClause = [baseFilter, ...dateFilterParts].join(" AND ");

    do {
      const result = await xeroClient.accountingApi.getInvoices(
        xeroClient.tenantId,
        undefined,
        whereClause,
        "Date DESC",
        undefined,
        undefined,
        undefined,
        undefined,
        page,
      );

      const invoices = result.body.invoices ?? [];
      fetched = invoices.length;
      allInvoices.push(...invoices);
      page++;
    } while (fetched === 100);

    const rows: PaidInvoiceRow[] = allInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber ?? "",
      contactName: inv.contact?.name ?? "Unknown",
      invoiceDate: inv.date ?? "",
      paidDate: inv.updatedDateUTC ?? "",
      totalAmount: inv.total ?? 0,
      currency: inv.currencyCode ?? "N/A",
    }));

    return {
      result: {
        reportName: "Paid Sales Invoices",
        reportDate: new Date().toISOString().split("T")[0],
        rows,
      },
      isError: false,
      error: null,
    };
  } catch (error) {
    console.error("Error listing paid invoices:", error);
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}

import { listXeroReceipts } from "../../handlers/list-xero-receipts.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { z } from "zod";

const ListXeroInvoicesByStatusTool = CreateXeroTool(
  "list-xero-invoices-by-status",
  "List invoices in Xero filtered by status. This tool can fetch invoices with any status (PAID, AUTHORISED, DRAFT, SUBMITTED, VOIDED, DELETED) and any type (ACCREC for sales invoices, ACCPAY for purchase invoices/bills). Use this tool when the user wants to see invoices with a specific status like 'show me draft invoices', 'list paid invoices', 'show me submitted bills', etc. Show invoice number, contact name, date, total, amount due, and status. Do not include internal IDs unless explicitly requested. If there are more than 10 then show user and ask if there are more do you want to see more?",
  {
    page: z.number().optional().describe("Optional page number for pagination. If not provided, the first page will be returned. If 100 invoices are returned, call this tool again with the next page number."),
    type: z.enum(["all", "ACCREC", "ACCPAY"]).optional().describe("Filter by invoice type: 'all' for both sales and purchase invoices (default), 'ACCREC' for sales invoices only, 'ACCPAY' for purchase invoices/bills only."),
    status: z.enum(["PAID", "AUTHORISED", "DRAFT", "SUBMITTED", "VOIDED", "DELETED"]).optional().describe("Filter by invoice status. If not provided, shows invoices with PAID status (default)."),
  },
  async (params) => {
    const { page, type = "all", status = "PAID" } = params;
    const response = await listXeroReceipts(page, type, status);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing invoices: ${response.error}`,
          },
        ],
      };
    }

    const invoices = response.result || [];
    const typeDescription = type === "all" ? "invoices" : type === "ACCREC" ? "sales invoices" : "purchase invoices/bills";
    const statusDescription = status ? ` with status ${status}` : "";
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${invoices.length} ${typeDescription}${statusDescription}${page ? ` (page ${page})` : ''}:`,
        },
        ...invoices.map((inv) => ({
          type: "text" as const,
          text: [
            `Invoice Number: ${inv.invoiceNumber}`,
            inv.contact?.name ? `Contact: ${inv.contact.name}` : null,
            inv.date ? `Date: ${inv.date}` : null,
            inv.total ? `Total Amount: ${inv.total}` : null,
            inv.amountDue ? `Amount Due: ${inv.amountDue}` : null,
            inv.amountPaid ? `Amount Paid: ${inv.amountPaid}` : null,
            `Status: ${inv.status}`,
            `Type: ${inv.type}`,
          ].filter(Boolean).join("\n"),
        })),
      ],
    };
  },
);

export default ListXeroInvoicesByStatusTool;

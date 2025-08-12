import { listXeroReceipts } from "../../handlers/list-xero-receipts.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { z } from "zod";

const ListXeroReceiptsTool = CreateXeroTool(
  "list-xero-receipts",
  "List all receipts in Xero. A receipt is any paid invoice. Use this tool if the user asks to 'show me receipts', 'list paid invoices', 'show sales receipts', or similar. By default shows both paid sales invoices (ACCREC) and paid purchase invoices (ACCPAY). For specific types, use 'list-xero-receivables' for sales invoices only or 'list-xero-bills' for purchase invoices only. Show invoice number, contact name, date, total, amount due, and status. Do not include internal IDs unless explicitly requested. If there are more than 10 then show user and ask there are more do you want to see more?",
  {
    page: z.number().optional().describe("Optional page number for pagination. If not provided, the first page will be returned. If 100 receipts are returned, call this tool again with the next page number."),
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
            text: `Error listing receipts: ${response.error}`,
          },
        ],
      };
    }

    const receipts = response.result || [];
    const typeDescription = type === "all" ? "receipts" : type === "ACCREC" ? "sales invoices" : "purchase invoices/bills";
    const statusDescription = status ? ` with status ${status}` : "";
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${receipts.length} ${typeDescription}${statusDescription}${page ? ` (page ${page})` : ''}:`,
        },
        ...receipts.map((inv) => ({
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

export default ListXeroReceiptsTool;

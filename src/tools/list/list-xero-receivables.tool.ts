import { listXeroReceipts } from "../../handlers/list-xero-receipts.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { z } from "zod";

const ListXeroReceivablesTool = CreateXeroTool(
  "list-xero-receivables",
  "List receivables in Xero. A receivable is any sales invoice (Type=ACCREC). Use this tool if the user asks to 'show me receivables', 'list sales invoices', 'show customer invoices', or similar. You can filter by status: PAID, AUTHORISED (awaiting payment), DRAFT, etc. Show invoice number, contact name, date, total, amount due, and status. Do not include internal IDs unless explicitly requested. If there are more than 10 then show user and ask there are more do you want to see more?",
  {
    page: z.number().optional().describe("Optional page number for pagination. If not provided, the first page will be returned. If 100 receivables are returned, call this tool again with the next page number."),
    status: z.enum(["PAID", "AUTHORISED", "DRAFT", "SUBMITTED", "VOIDED", "DELETED"]).optional().describe("Filter by invoice status. If not provided, shows receivables with any status."),
  },
  async (params) => {
    const { page, status } = params;
    
    // If status is specified, we need to filter by both type and status
    const typeFilter = "ACCREC" as const;
    const statusFilter = status;
    
    const response = await listXeroReceipts(page, typeFilter, statusFilter);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing receivables: ${response.error}`,
          },
        ],
      };
    }

    const receivables = response.result || [];
    const statusDescription = status ? ` with status ${status}` : "";
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${receivables.length} receivables${statusDescription}${page ? ` (page ${page})` : ''}:`,
        },
        ...receivables.map((inv) => ({
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

export default ListXeroReceivablesTool;

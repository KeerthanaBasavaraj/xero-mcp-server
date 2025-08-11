import { listXeroReceipts } from "../../handlers/list-xero-receipts.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { z } from "zod";

const ListXeroPaidBillsTool = CreateXeroTool(
  "list-xero-paid-bills",
  "List all paid bills in Xero. A bill is any purchase invoice (Type=ACCPAY) that is PAID. Use this tool if the user asks to 'show me paid bills', 'list paid purchase invoices', 'show supplier receipts', or similar. Show invoice number, contact name, date, total, paid amount, and status. Do not include internal IDs unless explicitly requested. If there are more than 10 then show user and ask there are more do you want to see more?",
  {
    page: z.number().optional().describe("Optional page number for pagination. If not provided, the first page will be returned. If 100 bills are returned, call this tool again with the next page number."),
  },
  async (params) => {
    const { page } = params;
    const response = await listXeroReceipts(page, "ACCPAY");

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing paid bills: ${response.error}`,
          },
        ],
      };
    }

    const bills = response.result || [];
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${bills.length} paid bills${page ? ` (page ${page})` : ''}:`,
        },
        ...bills.map((inv) => ({
          type: "text" as const,
          text: [
            `Invoice Number: ${inv.invoiceNumber}`,
            inv.contact?.name ? `Contact: ${inv.contact.name}` : null,
            inv.date ? `Date: ${inv.date}` : null,
            inv.total ? `Total Amount: ${inv.total}` : null,
            inv.amountPaid ? `Paid Amount: ${inv.amountPaid}` : null,
            `Status: ${inv.status}`,
            `Type: ${inv.type}`,
          ].filter(Boolean).join("\n"),
        })),
      ],
    };
  },
);

export default ListXeroPaidBillsTool;

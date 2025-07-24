import { z } from "zod";
import { listXeroPaidInvoices } from "../../handlers/list-paid-invoices.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const ListPaidInvoices = CreateXeroTool(
  "list-paid-invoices",
  `Lists all PAID sales invoices (ACCREC type) from Xero.
  These invoices are considered receipts, as they are fully settled.`,
  {
    fromDate: z
      .string()
      .optional()
      .describe("Optional start date (YYYY-MM-DD) to filter paid invoices."),
    toDate: z
      .string()
      .optional()
      .describe("Optional end date (YYYY-MM-DD) to filter paid invoices."),
  },
  async ({ fromDate, toDate }) => {
    const response = await listXeroPaidInvoices(fromDate, toDate);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing paid invoices: ${response.error}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Paid Invoices Report`,
        },
        {
          type: "text" as const,
          text: JSON.stringify(response.result?.rows, null, 2),
        },
      ],
    };
  },
);

export default ListPaidInvoices;

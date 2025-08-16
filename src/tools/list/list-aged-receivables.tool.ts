import { z } from "zod";
import { listXeroAgedReceivables } from "../../handlers/list-aged-receivables.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { formatAgedReportFilter } from "../../helpers/format-aged-report-filter.js";

const ListAgedReceivables = CreateXeroTool(
  "list-aged-receivables",
  `Lists all aged receivables in Xero.
  This shows overdue invoices across all contacts up to a report date OR for a certain contact up to a report date.
  
  **CRITICAL: Before proceeding, you MUST ask the user to explicitly choose one of these options:**
  1. "all contacts" - to show aged receivables for all contacts
  2. "specific contact" - to show aged receivables for a specific contact (contactId required)
  
  **DO NOT PROCEED** if the user provides ambiguous responses like "yes", "no", "go ahead", or doesn't clearly specify their choice.
  **DO NOT PROCEED** if the user keeps asking without making a clear selection from the options provided.
  
  **You must wait for a clear, explicit choice before executing this tool.**`,
  {
    contactId: z
      .string()
      .optional()
      .describe(
        "Optional contact ID to filter the aged receivables report. If not provided, it will show all contacts and contact ID will be undefined.",
      ),
    reportDate: z
      .string()
      .optional()
      .describe(
        "Optional date to retrieve aged receivables in YYYY-MM-DD format.**FIRST ASK USER FOR DATE** If none is provided, defaults to end of the current month. and also show choosen date in the report.",
      ),
    invoicesFromDate: z
      .string()
      .optional()
      .describe(
        "Optional from date in YYYY-MM-DD format. If provided, will only show payable invoices after this date.",
      ),
    invoicesToDate: z
      .string()
      .optional()
      .describe(
        "Optional to date in YYYY-MM-DD format. If provided, will only show payable invoices before this date.",
      ),
  },
  async ({ contactId, reportDate, invoicesFromDate, invoicesToDate }) => {
    const response = await listXeroAgedReceivables(
      contactId,
      reportDate,
      invoicesFromDate,
      invoicesToDate,
    );

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing aged receivables: ${response.error}`,
          },
        ],
      };
    }

    const agedReceivablesReport = response.result;
    const filter = formatAgedReportFilter(invoicesFromDate, invoicesToDate);

    return {
      content: [
        {
          type: "text" as const,
          text: `Report Name: ${agedReceivablesReport.reportName || "Not specified"}`,
        },
        {
          type: "text" as const,
          text: `Report Date: ${agedReceivablesReport.reportDate || "Not specified"}`,
        },
        {
          type: "text" as const,
          text: filter ?? "Showing all relevant invoices",
        },
        {
          type: "text" as const,
          text: JSON.stringify(agedReceivablesReport.rows, null, 2),
        },
      ],
    };
  },
);

export default ListAgedReceivables;

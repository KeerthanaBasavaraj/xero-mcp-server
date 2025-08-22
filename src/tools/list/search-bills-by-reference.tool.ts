import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { searchXeroBillsByReference } from "../../handlers/search-xero-bills-by-reference.handler.js";

const SearchBillsByReferenceTool = CreateXeroTool(
  "search-bills-by-reference",
  "Search for bills (ACCPAY invoices) by their invoice reference. This tool helps you find bills when you know the reference but not the invoice number.\n\nRequired arguments:\n- invoiceReference: The invoice reference to search for (e.g., 'RPT', 'INV-001').\n\nThis tool will:\n1. Search for all bills with the given invoice reference\n2. Display detailed information about each matching bill\n3. Show bill IDs that can be used with the download-bill-attachment tool\n\nNote: Invoice references are not unique in Xero, so multiple bills may have the same reference. This tool will show all matches.",
  {
    invoiceReference: z
      .string()
      .describe("The invoice reference to search for (e.g., 'RPT', 'INV-001'). This is the reference field, not the invoice number."),
    page: z
      .number()
      .optional()
      .describe("Optional page number for pagination. Default is 1."),
    pageSize: z
      .number()
      .optional()
      .default(10)
      .describe("Number of bills to retrieve per page. Default is 10."),
  },
  async ({ invoiceReference, page = 1, pageSize = 10 }) => {
    const searchResult = await searchXeroBillsByReference(invoiceReference, page, pageSize);
    
    if (searchResult.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error searching for bills: ${searchResult.error}`,
          },
        ],
      };
    }

    const bills = searchResult.result?.bills || [];
    const pagination = searchResult.result?.pagination;
    
    if (bills.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No bills found with invoice reference "${invoiceReference}". Please check the reference and try again.`,
          },
        ],
      };
    }

    const billDetails = bills.map((bill, index) => {
      const lineItems = bill.lineItems?.map(item => 
        `    • ${item.description}: ${item.quantity} x ${item.unitAmount} = ${item.lineAmount}`
      ).join('\n') || '    • No line items';
      
      return `${index + 1}. **Bill ID:** ${bill.invoiceID}
   **Contact:** ${bill.contact?.name}
   **Date:** ${bill.date}
   **Due Date:** ${bill.dueDate}
   **Total:** ${bill.total}
   **Status:** ${bill.status}
   **Reference:** ${bill.reference}
   **Line Items:**
${lineItems}`;
    }).join('\n\n');

    const paginationInfo = pagination ? 
      `\n\n**Pagination:** Page ${pagination.pageNumber} of ${pagination.pageCount} (${pagination.recordCount} total records)` : '';

    const usageInfo = bills.length > 1 ? 
      `\n\n**Next Steps:** To download an attachment from a specific bill, use the 'download-bill-attachment' tool with the selectedBillId parameter set to the desired bill ID.` : '';

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${bills.length} bill(s) with invoice reference "${invoiceReference}":\n\n${billDetails}${paginationInfo}${usageInfo}`,
        },
      ],
    };
  },
);

export default SearchBillsByReferenceTool;

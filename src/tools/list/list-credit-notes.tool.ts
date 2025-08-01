import { z } from "zod";
import { listXeroCreditNotes } from "../../handlers/list-xero-credit-notes.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { formatPaginationInfo } from "../../helpers/format-pagination.js";

const ListCreditNotesTool = CreateXeroTool(
  "list-credit-notes",
  `List credit notes in Xero. 
  Ask the user if they want to see credit notes for a specific contact,
  or to see all credit notes before running. 
  Ask the user if they want the next page of credit notes after running this tool 
  if 10 credit notes are returned. 
  If they want the next page, call this tool again with the next page number 
  and the contact if one was provided in the previous call.`,
  {
    page: z.number(),
    contactId: z.string().optional(),
    pageSize: z.number().optional().default(10).describe("Number of credit notes to retrieve per page. Default is 10."),
  },
  async ({ page, contactId, pageSize }) => {
    const response = await listXeroCreditNotes(page, contactId, pageSize);
    if (response.error !== null) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing credit notes: ${response.error}`,
          },
        ],
      };
    }

    const result = response.result;
    const creditNotes = result?.creditNotes || [];
    const pagination = result?.pagination;

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${creditNotes?.length || 0} credit notes:`,
        },
        ...(creditNotes?.map((creditNote) => ({
          type: "text" as const,
          text: [
            `Credit Note ID: ${creditNote.creditNoteID}`,
            `Credit Note Number: ${creditNote.creditNoteNumber}`,
            creditNote.reference ? `Reference: ${creditNote.reference}` : null,
            `Type: ${creditNote.type || "Unknown"}`,
            `Status: ${creditNote.status || "Unknown"}`,
            creditNote.contact
              ? `Contact: ${creditNote.contact.name} (${creditNote.contact.contactID})`
              : null,
            creditNote.date ? `Date: ${creditNote.date}` : null,
            creditNote.lineAmountTypes
              ? `Line Amount Types: ${creditNote.lineAmountTypes}`
              : null,
            creditNote.subTotal ? `Sub Total: ${creditNote.subTotal}` : null,
            creditNote.totalTax ? `Total Tax: ${creditNote.totalTax}` : null,
            `Total: ${creditNote.total || 0}`,
            creditNote.currencyCode
              ? `Currency: ${creditNote.currencyCode}`
              : null,
            creditNote.currencyRate
              ? `Currency Rate: ${creditNote.currencyRate}`
              : null,
            creditNote.updatedDateUTC
              ? `Last Updated: ${creditNote.updatedDateUTC}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
        })) || []),
        // Add pagination information if available
        ...(pagination ? [{
          type: "text" as const,
          text: formatPaginationInfo(pagination, page)
        }] : []),
      ],
    };
  },
);

export default ListCreditNotesTool;

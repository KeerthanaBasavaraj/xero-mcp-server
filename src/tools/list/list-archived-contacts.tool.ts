import { listXeroArchivedContacts } from "../../handlers/list-xero-archived-contacts.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { formatPaginationInfo } from "../../helpers/format-pagination.js";
import { z } from "zod";

const ListArchivedContactsTool = CreateXeroTool(
  "list-archived-contacts",
  "List all archived contacts in Xero. Use this tool when user asks for 'deleted contacts' or 'archived contacts'. This shows only contacts that have been archived (deleted) in Xero.",
  {
    page: z.number().optional().describe("Optional page number to retrieve for pagination. \
      If not provided, the first page will be returned."),
    pageSize: z.number().optional().default(10).describe("Number of archived contacts to retrieve per page. Default is 10."),
  },
  async (params) => {
    const { page, pageSize } = params;
    const response = await listXeroArchivedContacts(page, pageSize);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing archived contacts: ${response.error}`,
          },
        ],
      };
    }

    const result = response.result;
    const allContacts = result?.contacts || [];
    const pagination = result?.pagination;

    // Filter to show only archived contacts
    const archivedContacts = allContacts.filter(contact => contact.contactStatus === 'ARCHIVED' as any);

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${archivedContacts.length} archived contacts${page ? ` (page ${page})` : ''}:`,
        },
        ...(archivedContacts.map((contact) => ({
          type: "text" as const,
          text: [
            `Contact: ${contact.name}`,
            `ID: ${contact.contactID}`,
            contact.firstName ? `First Name: ${contact.firstName}` : null,
            contact.lastName ? `Last Name: ${contact.lastName}` : null,
            contact.emailAddress
              ? `Email: ${contact.emailAddress}`
              : "No email",
            contact.accountsReceivableTaxType
              ? `AR Tax Type: ${contact.accountsReceivableTaxType}`
              : null,
            contact.accountsPayableTaxType
              ? `AP Tax Type: ${contact.accountsPayableTaxType}`
              : null,
            `Type: ${
              [
                contact.isCustomer ? "Customer" : null,
                contact.isSupplier ? "Supplier" : null,
              ]
                .filter(Boolean)
                .join(", ") || "Unknown"
            }`,
            contact.defaultCurrency
              ? `Default Currency: ${contact.defaultCurrency}`
              : null,
            contact.updatedDateUTC
              ? `Last Updated: ${contact.updatedDateUTC}`
              : null,
            `Status: ${contact.contactStatus || "Unknown"}`,
            contact.contactGroups?.length
              ? `Groups: ${contact.contactGroups.map((g) => g.name).join(", ")}`
              : null,
            contact.hasAttachments ? "Has Attachments: Yes" : null,
            contact.hasValidationErrors ? "Has Validation Errors: Yes" : null,
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

export default ListArchivedContactsTool;

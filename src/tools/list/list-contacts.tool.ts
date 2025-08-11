import { listXeroContacts } from "../../handlers/list-xero-contacts.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { formatPaginationInfo } from "../../helpers/format-pagination.js";
import { z } from "zod";

const ListContactsTool = CreateXeroTool(
  "list-contacts",
  "List all contacts in Xero. This includes Suppliers and Customers.\
   When displaying contact data: Show the **contact name** and relevant info (email, status, etc.) , Do **not** include **contact_id** unless the user explicitly asks",
  {
    page: z.number().optional().describe("Optional page number to retrieve for pagination. \
      If not provided, the first page will be returned. If 100 contacts are returned, \
      call this tool again with the next page number."),
    pageSize: z.number().optional().default(10).describe("Number of contacts to retrieve per page. Default is 10."),
    searchTerm: z.string().optional().describe("Optional search term to filter contacts by name or email address. \
      This parameter allows you to search for specific contacts by entering part of their name or email. \
      For example: 'john' will find contacts with 'john' in their name or email, 'john.doe@example.com' will find \
      contacts with that email address, 'cafe' will find contacts with 'cafe' in their name. \
      The search is case-insensitive and will match partial strings. Leave empty to retrieve all contacts."),
    phoneFilter: z.string().optional().describe("Optional phone number filter to find contacts with specific phone numbers. \
      This parameter allows you to search for contacts by their phone number. \
      For example: '555' will find contacts with '555' in their phone number, '+1-555-1234' will find contacts with that exact phone number. \
      The search is case-insensitive and will match partial strings. Leave empty to retrieve all contacts."),
    addressFilter: z.string().optional().describe("Optional address filter to find contacts with specific address information. \
      This parameter allows you to search for contacts by their address components (street, city, state, postal code, country). \
      For example: 'New York' will find contacts with 'New York' in their address, '123 Main St' will find contacts with that street address. \
      The search is case-insensitive and will match partial strings. Leave empty to retrieve all contacts."),
  },
  async (params) => {
    const { page, pageSize, searchTerm, phoneFilter, addressFilter } = params;
    const response = await listXeroContacts(page, pageSize, searchTerm, phoneFilter, addressFilter);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing contacts: ${response.error}`,
          },
        ],
      };
    }

    const result = response.result;
    const contacts = result?.contacts || [];
    const pagination = result?.pagination;

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${contacts?.length || 0} contacts${page ? ` (page ${page})` : ''}${searchTerm ? ` matching "${searchTerm}"` : ''}${phoneFilter ? ` with phone "${phoneFilter}"` : ''}${addressFilter ? ` with address "${addressFilter}"` : ''}:`,
        },
        ...(contacts?.map((contact) => ({
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

export default ListContactsTool;

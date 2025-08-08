import { listXeroArchivedContacts } from "../../handlers/list-xero-archived-contacts.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { z } from "zod";

const ListArchivedContactsTool = CreateXeroTool(
  "list-archived-contacts",
  "List all archived contacts in Xero. Use this tool when user asks for 'deleted contacts' or 'archived contacts' OR similar queries. This shows only contacts that have been archived (deleted) in Xero.",
  {},
  async () => {
    const response = await listXeroArchivedContacts();

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
    const archivedContacts = result?.contacts || [];

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${archivedContacts.length} archived contacts:`,
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
      ],
    };
  },
);

export default ListArchivedContactsTool;

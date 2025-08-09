import { createXeroContact, createXeroContacts } from "../../handlers/create-xero-contact.handler.js";
import { z } from "zod";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { ensureError } from "../../helpers/ensure-error.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const contactSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const CreateContactTool = CreateXeroTool(
  "create-contact",
  "Create one or multiple contacts in Xero. \
  For single contact, provide name, email, and phone. \
  For multiple contacts, provide an array of contacts with each having name, email, and phone. \
  When contacts are created, deep links to the contacts in Xero are returned. \
  These links can be used to view the contacts in Xero directly and should be displayed to the user. \
  For large batches, contacts are processed in groups of 5 to ensure reliable creation.",
  {
    // Support both single contact and multiple contacts
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    contacts: z.array(contactSchema).optional(),
  },
  async ({ name, email, phone, contacts }) => {
    try {
      // Determine if this is single or batch creation
      const isBatchMode = contacts && contacts.length > 0;
      
      if (isBatchMode) {
        // Batch creation mode
        const response = await createXeroContacts(contacts);
        
        if (response.isError) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error creating contacts: ${response.error}`,
              },
            ],
          };
        }

        const createdContacts = response.result;
        const totalCreated = createdContacts.length;
        const totalRequested = contacts.length;

        // Generate deep links for all created contacts
        const contactDetails = await Promise.all(
          createdContacts.map(async (contact) => {
            const deepLink = contact.contactID
              ? await getDeepLink(DeepLinkType.CONTACT, contact.contactID)
              : null;
            
            return [
              `• ${contact.name} (ID: ${contact.contactID})`,
              deepLink ? `  Link: ${deepLink}` : null,
            ].filter(Boolean).join("\n");
          })
        );

        const summary = totalCreated === totalRequested
          ? `✅ Successfully created all ${totalCreated} contacts:`
          : `⚠️ Created ${totalCreated} out of ${totalRequested} requested contacts:`;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                summary,
                "",
                ...contactDetails,
              ].join("\n"),
            },
          ],
        };
      } else {
        // Single contact creation mode
        if (!name) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Either provide 'name' for single contact creation or 'contacts' array for batch creation.",
              },
            ],
          };
        }

        const response = await createXeroContact(name, email, phone);
        if (response.isError) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error creating contact: ${response.error}`,
              },
            ],
          };
        }

        const contact = response.result;

        const deepLink = contact.contactID
          ? await getDeepLink(DeepLinkType.CONTACT, contact.contactID)
          : null;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Contact created: ${contact.name} (ID: ${contact.contactID})`,
                deepLink ? `Link to view: ${deepLink}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      }
    } catch (error) {
      const err = ensureError(error);

      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating contact(s): ${err.message}`,
          },
        ],
      };
    }
  },
);

export default CreateContactTool;

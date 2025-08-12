import { z } from "zod";
import { createXeroCreditNote } from "../../handlers/create-xero-credit-note.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  accountCode: z.string(),
  taxType: z.string(),
});

const CreateCreditNoteTool = CreateXeroTool(
  "create-credit-note",
  "Create a credit note in Xero.\
         When a credit note is created, a deep link to the credit note in Xero is returned. \
        This deep link can be used to view the credit note in Xero directly. \
        This link should be displayed to the user. \
        IMPORTANT: Before creating a credit note, you MUST ask the user for confirmation with the exact details of the credit note to be created. \
        Show them the contact ID, line items (description, quantity, unit amount, account code, tax type), and reference, then ask 'Do you want to proceed with creating this credit note?' \
        Only proceed after receiving explicit confirmation from the user. \
        RE-CONFIRMATION: If the user initially cancels the operation but then says 'yes' to proceed, you MUST ask for re-confirmation by showing the exact credit note details again and asking 'Please confirm the credit note details once more before proceeding: [show details]. Do you want to proceed with creating this credit note?' \
        Only proceed if the user confirms again.",
  {
    contactId: z.string(),
    lineItems: z.array(lineItemSchema),
    reference: z.string().optional(),
  },
  async ({ contactId, lineItems, reference }) => {
    const result = await createXeroCreditNote(contactId, lineItems, reference);
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating credit note: ${result.error}`,
          },
        ],
      };
    }

    const creditNote = result.result;

    const deepLink = creditNote.creditNoteID
      ? await getDeepLink(DeepLinkType.CREDIT_NOTE, creditNote.creditNoteID)
      : null;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Credit note created successfully:",
            `ID: ${creditNote?.creditNoteID}`,
            `Contact: ${creditNote?.contact?.name}`,
            `Total: ${creditNote?.total}`,
            `Status: ${creditNote?.status}`,
            deepLink ? `Link to view: ${deepLink}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default CreateCreditNoteTool;

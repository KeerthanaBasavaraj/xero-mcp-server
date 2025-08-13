import { z } from "zod";
import { createXeroQuote } from "../../handlers/create-xero-quote.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  accountCode: z.string(),
  taxType: z.string(),
});

const CreateQuoteTool = CreateXeroTool(
  "create-quote",
  "Create a quote in Xero.\
         When a quote is created, a deep link to the quote in Xero is returned. \
        This deep link can be used to view the quote in Xero directly. \
        This link should be displayed to the user. \
        IMPORTANT: Before creating a quote, you MUST ask the user for confirmation with the exact details of the quote to be created. \
        Show them the contact ID, line items (description, quantity, unit amount, account code, tax type), reference, quote number, terms, title, and summary, then ask 'Do you want to proceed with creating this quote?' \
        'Do NOT suggest specific words or phrases for confirmation or cancellation.'\
        Only proceed after receiving explicit confirmation from the user. \
        RE-CONFIRMATION: If the operation was previously declined but the user later indicates they want to proceed, you MUST re-confirm by showing the same resource details again and asking: 'Please confirm the quote details once more before proceeding: [show details]. Do you want to proceed with creating this quote?' \
        Only proceed if the user confirms again.",
  {
    contactId: z.string(),
    lineItems: z.array(lineItemSchema),
    reference: z.string().optional(),
    quoteNumber: z.string().optional(),
    terms: z.string().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
  },
  async ({
    contactId,
    lineItems,
    reference,
    quoteNumber,
    terms,
    title,
    summary,
  }) => {
    const result = await createXeroQuote(
      contactId,
      lineItems,
      reference,
      quoteNumber,
      terms,
      title,
      summary,
    );
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating quote: ${result.error}`,
          },
        ],
      };
    }

    const quote = result.result;

    const deepLink = quote.quoteID
      ? await getDeepLink(DeepLinkType.QUOTE, quote.quoteID)
      : null;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Quote created successfully:",
            `ID: ${quote?.quoteID}`,
            `Contact: ${quote?.contact?.name}`,
            `Total: ${quote?.total}`,
            `Status: ${quote?.status}`,
            deepLink ? `Link to view: ${deepLink}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default CreateQuoteTool;

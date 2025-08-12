import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { updateXeroBankTransaction } from "../../handlers/update-xero-bank-transaction.handler.js";
import { bankTransactionDeepLink } from "../../consts/deeplinks.js";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  accountCode: z.string(),
  taxType: z.string(),
});

const UpdateBankTransactionTool = CreateXeroTool(
  "update-bank-transaction",
  `Update a bank transaction in Xero.
          When a bank transaction is updated, a deep link to the bank transaction in Xero is returned.
        This deep link can be used to view the bank transaction in Xero directly.
        This link should be displayed to the user.
        IMPORTANT: Before updating a bank transaction, you MUST ask the user for confirmation with the exact details of the changes to be made. \
        Show them the bank transaction ID, type, contact ID, line items, reference, and date changes, then ask 'Do you want to proceed with updating this bank transaction?' \
        Only proceed after receiving explicit confirmation from the user. \
        RE-CONFIRMATION: If the user initially cancels the operation but then says 'yes' to proceed, you MUST ask for re-confirmation by showing the exact changes again and asking 'Please confirm the bank transaction changes once more before proceeding: [show changes]. Do you want to proceed with updating this bank transaction?' \
        Only proceed if the user confirms again.`,
  {
    bankTransactionId: z.string(),
    type: z.enum(["RECEIVE", "SPEND"]).optional(),
    contactId: z.string().optional(),
    lineItems: z.array(lineItemSchema).optional().describe(
      "All line items must be provided. Any line items not provided will be removed. Including existing line items. \
      Do not modify line items that have not been specified by the user",
    ),
    reference: z.string().optional(),
    date: z.string().optional()
  },
  async (
    {
      bankTransactionId,
      type,
      contactId,
      lineItems,
      reference,
      date
    }
  ) => {
    const result = await updateXeroBankTransaction(bankTransactionId, type, contactId, lineItems, reference, date);

    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error updating bank transaction: ${result.error}`,
          },
        ],
      };
    }

    const bankTransaction = result.result;

    const deepLink = bankTransaction.bankAccount.accountID && bankTransaction.bankTransactionID
      ? bankTransactionDeepLink(bankTransaction.bankAccount.accountID, bankTransaction.bankTransactionID)
      : null;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Bank transaction updated successfully:",
            `ID: ${bankTransaction?.bankTransactionID}`,
            `Date: ${bankTransaction?.date}`,
            `Contact: ${bankTransaction?.contact?.name}`,
            `Total: ${bankTransaction?.total}`,
            `Status: ${bankTransaction?.status}`,
            deepLink ? `Link to view: ${deepLink}` : null
          ].filter(Boolean).join("\n"),
        },
      ],
    };
  }
);

export default UpdateBankTransactionTool;
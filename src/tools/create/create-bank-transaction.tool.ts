import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { createXeroBankTransaction } from "../../handlers/create-xero-bank-transaction.handler.js";
import { bankTransactionDeepLink } from "../../consts/deeplinks.js";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitAmount: z.number(),
  accountCode: z.string(),
  taxType: z.string(),
});

const CreateBankTransactionTool = CreateXeroTool(
  "create-bank-transaction",
  `Create a bank transaction in Xero.
  When a bank transaction is created, a deep link to the bank transaction in Xero is returned.
  This deep link can be used to view the bank transaction in Xero directly.
  This link should be displayed to the user.
  IMPORTANT: Before creating a bank transaction, you MUST ask the user for confirmation with the exact details of the transaction to be created. \
  Show them the type (RECEIVE/SPEND), bank account ID, contact ID, line items (description, quantity, unit amount, account code, tax type), reference, and date, then ask 'Do you want to proceed with creating this bank transaction?' \
  Only proceed after receiving explicit confirmation from the user.`,
  {
    type: z.enum(["RECEIVE", "SPEND"]),
    bankAccountId: z.string(),
    contactId: z.string(),
    lineItems: z.array(lineItemSchema),
    reference: z.string().optional(),
    date: z.string()
      .optional()
      .describe("If no date is provided, the date will default to today's date")
  },
  async ({ type, bankAccountId, contactId, lineItems, reference, date }) => {
    const result = await createXeroBankTransaction(type, bankAccountId, contactId, lineItems, reference, date);

    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating bank transaction: ${result.error}`
          }
        ]
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
            "Bank transaction successfully:",
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

export default CreateBankTransactionTool;
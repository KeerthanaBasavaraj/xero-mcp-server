import { z } from "zod";
import { createXeroInvoice } from "../../handlers/create-xero-invoice.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { Invoice } from "xero-node";

const trackingSchema = z.object({
  name: z.string().describe("The name of the tracking category. Can be obtained from the list-tracking-categories tool"),
  option: z.string().describe("The name of the tracking option. Can be obtained from the list-tracking-categories tool"),
  trackingCategoryID: z.string().describe("The ID of the tracking category. \
    Can be obtained from the list-tracking-categories tool"),
});

const lineItemSchema = z.object({
  description: z.string().describe("The description of the line item"),
  quantity: z.number().describe("The quantity of the line item"),
  unitAmount: z.number().describe("The price per unit of the line item"),
  accountCode: z.string().describe("The account code of the line item - can be obtained from the list-accounts tool"),
  taxType: z.string().describe("The tax type of the line item - can be obtained from the list-tax-rates tool"),
  itemCode: z.string().describe("The item code of the line item - can be obtained from the list-items tool \
    If the item is not listed, add without an item code and ask the user if they would like to add an item code.").optional(),
  tracking: z.array(trackingSchema).describe("Up to 2 tracking categories and options can be added to the line item. \
    Can be obtained from the list-tracking-categories tool. \
    Only use if prompted by the user.").optional(),
});

const CreateInvoiceTool = CreateXeroTool(
  "create-invoice",
  "Create an invoice in Xero. This tool supports creating invoices with line items that can either use existing items or be created with descriptions only.\
         \
         WORKFLOW:\
         1. Ask user how they want to create the invoice:\
            - Using line items (existing items or create new ones)\
            OR\
            -Using description only (provide description, quantity, price, etc.)\
         \
         2. For line items approach:\
            - Ask if they want to use existing items or create new ones ( if directly specify item name , check if it exists in the list-items tool , if don't then ask if they want to create a new item and use that created item)\
            - If existing: use list-items tool to show available items and then ask for the item code and use that to create the invoice\
            - If new: Use create-item tool to create the item first where item code is required\
            - After creating new item: Ask user 'Do you want to use this item and create invoice?'\
            - If user wants changes: Allow them to modify the item details and update accordingly\
            - If user proceeds: Use the created/updated item code to create the invoice\
            - IMPORTANT: When asking for confirmation, ask directly without saying 'Let me ask for your confirmation' or similar phrases. Just ask the question directly.\
         \
         3. For description approach:\
            - Collect description, quantity, unit amount etc\
         \
         4. Show complete invoice details and ask for confirmation before creating the invoice\
         \
         When an invoice is created, a deep link to the invoice in Xero is returned. \
        This deep link can be used to view the invoice in Xero directly. \
        This link should be displayed to the user. \
        IMPORTANT: Before creating ** EVERY ** invoice, you MUST ask the user for confirmation with the exact details of the invoice to be created. \
        Show them the contact ID, line items (description, quantity, unit amount, account code, tax type), invoice type, reference, date, and due date, then ask 'Do you want to proceed with creating this invoice?' \
        'Do NOT suggest specific words or phrases for confirmation or cancellation.'\
        Only proceed after receiving explicit confirmation from the user. \
        RE-CONFIRMATION: If the operation was previously declined but the user later indicates they want to proceed, you MUST re-confirm by showing the same resource details again and asking: 'Please confirm the invoice details once more before proceeding: [show details]. Do you want to proceed with creating this invoice?' \
        Only proceed if the user confirms again.",
  {
    contactId: z.string().describe("The ID of the contact to create the invoice for. \
      Can be obtained from the list-contacts tool. Fetch details but do not show them complete details to the user, just say let user know you found the contact"),
    lineItems: z.array(lineItemSchema).describe("Array of line items for the invoice. \
      Each line item should include description, quantity, unit amount, account code, and tax type. \
      If using existing items, include the itemCode. If creating with description only, omit itemCode."),
    type: z.enum(["ACCREC", "ACCPAY"]).describe("The type of invoice to create. \
      ACCREC is for sales invoices, Accounts Receivable, or customer invoices. \
      ACCPAY is for purchase invoices, Accounts Payable invoices, supplier invoices, or bills. \
      If the type is not specified, the default is ACCREC."),
    reference: z.string().describe("A reference number for the invoice.").optional(),
    date: z.string().describe("The date the invoice was created (YYYY-MM-DD format).").optional(),
    dueDate: z.string().describe("The due date for the invoice (YYYY-MM-DD format).").optional(),
    confirmation: z.boolean().describe("MUST be set to true to confirm that the user has reviewed all invoice details and wants to proceed with creating the invoice. \
      This parameter enforces that confirmation is required before any invoice is created. \
      Set to false if user has not confirmed or if you need to show details for confirmation first."),
  },
  async ({ contactId, lineItems, type, reference, date, dueDate, confirmation }) => {
    // Check if user has confirmed
    if (!confirmation) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Invoice creation requires explicit confirmation. Please review the invoice details and confirm before proceeding.",
          },
        ],
      };
    }

    const xeroInvoiceType = type === "ACCREC" ? Invoice.TypeEnum.ACCREC : Invoice.TypeEnum.ACCPAY;
    const result = await createXeroInvoice(contactId, lineItems, xeroInvoiceType, reference, date, dueDate);
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating invoice: ${result.error}`,
          },
        ],
      };
    }

    const invoice = result.result;

    const deepLink = invoice.invoiceID
      ? await getDeepLink(
          invoice.type === Invoice.TypeEnum.ACCREC ? DeepLinkType.INVOICE : DeepLinkType.BILL,
          invoice.invoiceID,
        )
      : null;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Invoice created successfully:",
            `ID: ${invoice?.invoiceID}`,
            `Contact: ${invoice?.contact?.name}`,
            `Type: ${invoice?.type}`,
            `Date: ${invoice?.date}`,
            `Due Date: ${invoice?.dueDate}`,
            `Total: ${invoice?.total}`,
            `Status: ${invoice?.status}`,
            deepLink ? `Link to view: ${deepLink}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default CreateInvoiceTool;

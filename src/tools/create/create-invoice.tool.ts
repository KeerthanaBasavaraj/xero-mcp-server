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
  "Create an invoice in Xero.\
         When an invoice is created, a deep link to the invoice in Xero is returned. \
        This deep link can be used to view the invoice in Xero directly. \
        This link should be displayed to the user. \
        IMPORTANT: Before creating an invoice, you MUST ask the user for confirmation with the exact details of the invoice to be created. \
        Show them the contact ID, line items (description, quantity, unit amount, account code, tax type), invoice type, reference, date, and due date, then ask 'Do you want to proceed with creating this invoice?' \
        Only proceed after receiving explicit confirmation from the user. \
        RE-CONFIRMATION: If the user initially cancels the operation but then says 'yes' to proceed, you MUST ask for re-confirmation by showing the exact invoice details again and asking 'Please confirm the invoice details once more before proceeding: [show details]. Do you want to proceed with creating this invoice?' \
        Only proceed if the user confirms again.",
  {
    contactId: z.string().describe("The ID of the contact to create the invoice for. \
      Can be obtained from the list-contacts tool."),
      
    lineItems: z.array(lineItemSchema),
    type: z.enum(["ACCREC", "ACCPAY"]).describe("The type of invoice to create. \
      ACCREC is for sales invoices, Accounts Receivable, or customer invoices. \
      ACCPAY is for purchase invoices, Accounts Payable invoices, supplier invoices, or bills. \
      If the type is not specified, the default is ACCREC."),
    reference: z.string().describe("A reference number for the invoice.").optional(),
    date: z.string().describe("The date the invoice was created (YYYY-MM-DD format).").optional(),
    dueDate: z.string().describe("The due date for the invoice (YYYY-MM-DD format).").optional(),
  },
  async ({ contactId, lineItems, type, reference, date ,dueDate }) => {
    const xeroInvoiceType = type === "ACCREC" ? Invoice.TypeEnum.ACCREC : Invoice.TypeEnum.ACCPAY;
    const result = await createXeroInvoice(contactId, lineItems, xeroInvoiceType, reference, date ,dueDate);
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

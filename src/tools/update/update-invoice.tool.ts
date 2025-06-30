import { z } from "zod";
import { updateXeroInvoice } from "../../handlers/update-xero-invoice.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const trackingSchema = z.object({
  name: z
    .string()
    .describe(
      "The name of the tracking category. Can be obtained from the list-tracking-categories tool",
    ),
  option: z
    .string()
    .describe(
      "The name of the tracking option. Can be obtained from the list-tracking-categories tool",
    ),
  trackingCategoryID: z.string().describe(
    "The ID of the tracking category. \
    Can be obtained from the list-tracking-categories tool",
  ),
});

const lineItemSchema = z.object({
  description: z.string().describe("The description of the line item"),
  quantity: z.number().describe("The quantity of the line item"),
  unitAmount: z.number().describe("The price per unit of the line item"),
  accountCode: z
    .string()
    .describe(
      "The account code of the line item - can be obtained from the list-accounts tool",
    ),
  taxType: z
    .string()
    .describe(
      "The tax type of the line item - can be obtained from the list-tax-rates tool",
    ),
  itemCode: z
    .string()
    .describe(
      "The item code of the line item - can be obtained from the list-items tool \
    If the item was not populated in the original invoice, \
    add without an item code unless the user has told you to add an item code.",
    )
    .optional(),
  tracking: z
    .array(trackingSchema)
    .describe(
      "Up to 2 tracking categories and options can be added to the line item. \
    Can be obtained from the list-tracking-categories tool. \
    Only use if prompted by the user.",
    )
    .optional(),
});

const UpdateInvoiceTool = CreateXeroTool(
  "update-invoice",
  "Update an invoice in Xero. Only works on draft invoices.\
  All line items must be provided. Any line items not provided will be removed. Including existing line items.\
  Do not modify line items that have not been specified by the user.\
  When an invoice is updated, a deep link to the invoice in Xero is returned.\
  This deep link can be used to view the contact in Xero directly.\
  This link should be displayed to the user.\
  To delete or void an invoice, set the status to DELETED or VOIDED. Deletion is only allowed for DRAFT or SUBMITTED invoices. Voiding is only allowed for AUTHORISED invoices. The tool will prompt for confirmation before performing these actions.",
  {
    invoiceId: z.string().describe("The ID of the invoice to update."),
    lineItems: z
      .array(lineItemSchema)
      .optional()
      .describe(
        "All line items must be provided. Any line items not provided will be removed. Including existing line items. \\n      Do not modify line items that have not been specified by the user",
      ),
    reference: z
      .string()
      .optional()
      .describe("A reference number for the invoice."),
    dueDate: z.string().optional().describe("The due date of the invoice."),
    date: z.string().optional().describe("The date of the invoice."),
    contactId: z
      .string()
      .optional()
      .describe(
        "The ID of the contact to update the invoice for. \\n      Can be obtained from the list-contacts tool.",
      ),
    status: z
      .enum(["DRAFT", "SUBMITTED", "AUTHORISED", "DELETED", "VOIDED"])
      .optional()
      .describe(
        "Set the status of the invoice. Use DELETED to delete a DRAFT or SUBMITTED invoice, VOIDED to void an AUTHORISED invoice. The tool will prompt for confirmation before performing these actions.",
      ),
    confirm: z
      .boolean()
      .optional()
      .describe(
        "Set to true to confirm the delete or void action after being prompted with the current status.",
      ),
  },
  async ({
    invoiceId,
    lineItems,
    reference,
    dueDate,
    date,
    contactId,
    status,
    confirm,
  }: {
    invoiceId: string;
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitAmount: number;
      accountCode: string;
      taxType: string;
    }>;
    reference?: string;
    dueDate?: string;
    date?: string;
    contactId?: string;
    status?: "DRAFT" | "SUBMITTED" | "AUTHORISED" | "DELETED" | "VOIDED";
    confirm?: boolean;
  }) => {
    // If status is DELETED or VOIDED and not confirmed, fetch and show current status, ask for confirmation
    if ((status === "DELETED" || status === "VOIDED") && !confirm) {
      // Dynamically import the handler to avoid circular deps
      const { getInvoice } = await import(
        "../../handlers/update-xero-invoice.handler.js"
      );
      const invoice = await getInvoice(invoiceId);
      if (!invoice) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invoice not found for ID: ${invoiceId}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Invoice ID: ${invoice.invoiceID}`,
              `Current Status: ${invoice.status}`,
              status === "DELETED"
                ? "Are you sure you want to DELETE this invoice? Only DRAFT or SUBMITTED invoices can be deleted. Please confirm by setting 'confirm' to true."
                : "Are you sure you want to VOID this invoice? Only AUTHORISED invoices can be voided. Please confirm by setting 'confirm' to true.",
            ].join("\n"),
          },
        ],
      };
    }

    // Proceed with update or delete/void
    const result = await updateXeroInvoice(
      invoiceId,
      lineItems,
      reference,
      dueDate,
      date,
      contactId,
      status,
    );
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error updating invoice: ${result.error}`,
          },
        ],
      };
    }

    const invoice = result.result;
    const deepLink = invoice.invoiceID
      ? await getDeepLink(DeepLinkType.INVOICE, invoice.invoiceID)
      : null;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            status === "DELETED"
              ? "Invoice deleted successfully:"
              : status === "VOIDED"
                ? "Invoice voided successfully:"
                : "Invoice updated successfully:",
            `ID: ${invoice?.invoiceID}`,
            `Contact: ${invoice?.contact?.name}`,
            `Type: ${invoice?.type}`,
            `Total: ${invoice?.total}`,
            `Status: ${invoice?.status}`,
            deepLink ? `Link to view: ${deepLink}` : null,
          ].join("\n"),
        },
      ],
    };
  },
);

export default UpdateInvoiceTool;

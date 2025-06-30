import { z } from "zod";
import { deleteOrVoidXeroInvoice } from "../../handlers/delete-or-void-xero-invoice.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

/**
 * Tool to delete or void an invoice based on its current status and user confirmation.
 * - DRAFT or SUBMITTED: Can be deleted (status set to DELETED)
 * - AUTHORISED: Cannot be deleted, but can be voided (status set to VOIDED)
 *
 * This tool will:
 * 1. Fetch the current status of the invoice.
 * 2. Ask the user for confirmation based on the status and allowed action.
 * 3. Proceed to update the status if confirmed.
 */
const DeleteOrVoidInvoiceTool = CreateXeroTool(
  "delete-or-void-invoice",
  "Delete or void an invoice in Xero. Only DRAFT or SUBMITTED invoices can be deleted (status set to DELETED). AUTHORISED invoices can only be voided (status set to VOIDED). This tool will fetch the current status, ask for user confirmation, and then proceed.",
  {
    invoiceId: z.string().describe("The ID of the invoice to delete or void."),
    confirm: z
      .boolean()
      .optional()
      .describe("Set to true to confirm the action after being prompted."),
  },
  async ({ invoiceId, confirm }) => {
    // Step 1: Fetch status and determine allowed action
    const result = await deleteOrVoidXeroInvoice(invoiceId, confirm);
    if (result.askConfirmation) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              result.confirmationPrompt ?? "Are you sure you want to proceed?",
          },
        ],
        requiresConfirmation: true,
      };
    }
    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${result.error ?? "Unknown error"}`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text:
            result.successMessage ?? "Invoice deleted or voided successfully.",
        },
      ],
    };
  },
);

export default DeleteOrVoidInvoiceTool;

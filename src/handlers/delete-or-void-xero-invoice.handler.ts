import { Invoice } from "xero-node";
import { xeroClient } from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";

/**
 * Handler to delete or void an invoice based on its status and user confirmation.
 * - DRAFT or SUBMITTED: Can be deleted (status set to DELETED)
 * - AUTHORISED: Can only be voided (status set to VOIDED)
 *
 * If confirmation is not provided, returns a prompt for confirmation.
 */
export async function deleteOrVoidXeroInvoice(
  invoiceId: string,
  confirm?: boolean,
): Promise<{
  isError: boolean;
  error?: string;
  askConfirmation?: boolean;
  confirmationPrompt?: string;
  successMessage?: string;
}> {
  try {
    await xeroClient.authenticate();
    const response = await xeroClient.accountingApi.getInvoice(
      xeroClient.tenantId,
      invoiceId,
      undefined,
      getClientHeaders(),
    );
    const invoice = response.body.invoices?.[0];
    if (!invoice) {
      return { isError: true, error: "Invoice not found." };
    }
    const status = invoice.status;
    let allowedAction: "DELETE" | "VOID" | null = null;
    let confirmationPrompt = "";
    if (
      status === Invoice.StatusEnum.DRAFT ||
      status === Invoice.StatusEnum.SUBMITTED
    ) {
      allowedAction = "DELETE";
      confirmationPrompt = `Invoice is in status ${status}. Do you want to DELETE this invoice? This will set its status to DELETED.`;
    } else if (status === Invoice.StatusEnum.AUTHORISED) {
      allowedAction = "VOID";
      confirmationPrompt = `Invoice is AUTHORISED and cannot be deleted, but can be VOIDED. Do you want to VOID this invoice? This will set its status to VOIDED.`;
    } else {
      return {
        isError: true,
        error: `Invoice cannot be deleted or voided in its current status: ${status}`,
      };
    }
    if (!confirm) {
      return { isError: false, askConfirmation: true, confirmationPrompt };
    }
    // Proceed with update
    const updateStatus =
      allowedAction === "DELETE"
        ? Invoice.StatusEnum.DELETED
        : Invoice.StatusEnum.VOIDED;
    const updateResponse = await xeroClient.accountingApi.updateInvoice(
      xeroClient.tenantId,
      invoiceId,
      { invoices: [{ status: updateStatus }] },
      undefined,
      undefined,
      getClientHeaders(),
    );
    const updated = updateResponse.body.invoices?.[0];
    if (!updated) {
      return { isError: true, error: "Failed to update invoice status." };
    }
    return {
      isError: false,
      successMessage: `Invoice ${invoiceId} status updated to ${updateStatus}.`,
    };
  } catch (error) {
    return { isError: true, error: formatError(error) };
  }
}

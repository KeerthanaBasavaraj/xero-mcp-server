import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Invoice, LineItemTracking } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode: string;
  taxType: string;
  itemCode?: string;
  tracking?: LineItemTracking[];
}

export async function getInvoice(invoiceId: string): Promise<Invoice | undefined> {
  await xeroClient.authenticate();

  // First, get the current invoice to check its status
  const response = await xeroClient.accountingApi.getInvoice(
    xeroClient.tenantId,
    invoiceId, // invoiceId
    undefined, // unitdp
    getClientHeaders(), // options
  );

  return response.body.invoices?.[0];
}

async function updateInvoice(
  invoiceId: string,
  lineItems?: InvoiceLineItem[],
  reference?: string,
  dueDate?: string,
  date?: string,
  contactId?: string,
  status?: string,
): Promise<Invoice | undefined> {
  const invoice: Invoice = {
    lineItems: lineItems,
    reference: reference,
    dueDate: dueDate,
    date: date,
    contact: contactId ? { contactID: contactId } : undefined,
    status: status as Invoice.StatusEnum | undefined,
  };

  const response = await xeroClient.accountingApi.updateInvoice(
    xeroClient.tenantId,
    invoiceId, // invoiceId
    {
      invoices: [invoice],
    }, // invoices
    undefined, // unitdp
    undefined, // idempotencyKey
    getClientHeaders(), // options
  );

  return response.body.invoices?.[0];
}

/**
 * Update an existing invoice in Xero
 */
export async function updateXeroInvoice(
  invoiceId: string,
  lineItems?: InvoiceLineItem[],
  reference?: string,
  dueDate?: string,
  date?: string,
  contactId?: string,
  status?: string,
): Promise<XeroClientResponse<Invoice>> {
  try {
    const existingInvoice = await getInvoice(invoiceId);
    const invoiceStatus = existingInvoice?.status;

    // Handle status update (delete/void)
    if (status === "DELETED") {
      if (
        invoiceStatus === Invoice.StatusEnum.DRAFT ||
        invoiceStatus === Invoice.StatusEnum.SUBMITTED
      ) {
        // Allow deletion
      } else {
        return {
          result: null,
          isError: true,
          error: `Invoice cannot be deleted. Only DRAFT or SUBMITTED invoices can be deleted. Current status: ${invoiceStatus}`,
        };
      }
    } else if (status === "VOIDED") {
      if (invoiceStatus === Invoice.StatusEnum.AUTHORISED) {
        // Allow voiding
      } else {
        return {
          result: null,
          isError: true,
          error: `Invoice cannot be voided. Only AUTHORISED invoices can be voided. Current status: ${invoiceStatus}`,
        };
      }
    } else if (status) {
      // Forbid setting status to DELETED/VOIDED in other cases
      return {
        result: null,
        isError: true,
        error: `Status update not allowed. Only DELETED (for DRAFT/SUBMITTED) or VOIDED (for AUTHORISED) are supported for status changes.`,
      };
    } else {
      // Only allow updates to DRAFT invoices
      if (invoiceStatus !== Invoice.StatusEnum.DRAFT) {
        return {
          result: null,
          isError: true,
          error: `Cannot update invoice because it is not a draft. Current status: ${invoiceStatus}`,
        };
      }
    }

    const updatedInvoice = await updateInvoice(
      invoiceId,
      lineItems,
      reference,
      dueDate,
      date,
      contactId,
      status,
    );

    if (!updatedInvoice) {
      throw new Error("Invoice update failed.");
    }

    return {
      result: updatedInvoice,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}

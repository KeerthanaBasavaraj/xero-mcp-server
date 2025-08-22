import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Attachment } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getBillAttachments(
  billId: string,
): Promise<Attachment[]> {
  await xeroClient.authenticate();

  const response = await xeroClient.accountingApi.getInvoiceAttachments(
    xeroClient.tenantId,
    billId,
    getClientHeaders(),
  );

  return response.body.attachments || [];
}

/**
 * List all attachments for a specific bill (invoice)
 */
export async function listXeroBillAttachments(
  billId: string,
): Promise<XeroClientResponse<Attachment[]>> {
  try {
    const attachments = await getBillAttachments(billId);

    return {
      result: attachments,
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

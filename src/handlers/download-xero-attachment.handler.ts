import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Attachment } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function downloadAttachment(
  entityType: string,
  entityId: string,
  fileName: string,
  contentType: string = "application/octet-stream",
): Promise<{ attachment: Attachment; fileBuffer: Buffer }> {
  await xeroClient.authenticate();

  let response;

  switch (entityType.toLowerCase()) {
    case "invoices":
      response = await xeroClient.accountingApi.getInvoiceAttachmentByFileName(
        xeroClient.tenantId,
        entityId,
        fileName,
        contentType,
        getClientHeaders(),
      );
      break;
    case "contacts":
      response = await xeroClient.accountingApi.getContactAttachmentByFileName(
        xeroClient.tenantId,
        entityId,
        fileName,
        contentType,
        getClientHeaders(),
      );
      break;
    case "creditnotes":
      response = await xeroClient.accountingApi.getCreditNoteAttachmentByFileName(
        xeroClient.tenantId,
        entityId,
        fileName,
        contentType,
        getClientHeaders(),
      );
      break;
    case "banktransactions":
      response = await xeroClient.accountingApi.getBankTransactionAttachmentByFileName(
        xeroClient.tenantId,
        entityId,
        fileName,
        contentType,
        getClientHeaders(),
      );
      break;
    case "manualjournals":
      response = await xeroClient.accountingApi.getManualJournalAttachmentByFileName(
        xeroClient.tenantId,
        entityId,
        fileName,
        contentType,
        getClientHeaders(),
      );
      break;
    case "receipts":
      response = await xeroClient.accountingApi.getReceiptAttachmentByFileName(
        xeroClient.tenantId,
        entityId,
        fileName,
        contentType,
        getClientHeaders(),
      );
      break;
    case "accounts":
      response = await xeroClient.accountingApi.getAccountAttachmentByFileName(
        xeroClient.tenantId,
        entityId,
        fileName,
        contentType,
        getClientHeaders(),
      );
      break;
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }

  // Check if the response is valid
  if (!response || !response.body) {
    throw new Error(`Attachment not found: ${fileName}`);
  }

  // For download operations, the response body contains the file data directly
  // The Xero API returns the file content as a Buffer or string
  let fileBuffer: Buffer;
  
  if (Buffer.isBuffer(response.body)) {
    fileBuffer = response.body;
  } else if (typeof response.body === 'string') {
    fileBuffer = Buffer.from(response.body, 'binary');
  } else if (response.body && typeof response.body === 'object' && 'byteLength' in response.body) {
    // Handle ArrayBuffer-like objects
    fileBuffer = Buffer.from(response.body as ArrayBuffer);
  } else {
    // If response.body is an object, try to extract the data
    const responseData = response.body as Record<string, unknown>;
    if (responseData.data && (Buffer.isBuffer(responseData.data) || typeof responseData.data === 'string')) {
      fileBuffer = Buffer.isBuffer(responseData.data) ? responseData.data : Buffer.from(responseData.data as string, 'binary');
    } else {
      throw new Error(`Unexpected response format for attachment: ${fileName}`);
    }
  }

  // Create a basic attachment object for metadata
  const attachment: Attachment = {
    attachmentID: "",
    fileName: fileName,
    mimeType: "application/octet-stream",
    contentLength: fileBuffer.length,
  };

  return { attachment, fileBuffer };
}

/**
 * Download a specific attachment from a Xero entity
 */
export async function downloadXeroAttachment(
  entityType: string,
  entityId: string,
  fileName: string,
  contentType: string = "application/octet-stream",
): Promise<XeroClientResponse<{ attachment: Attachment; fileBuffer: Buffer }>> {
  try {
    const result = await downloadAttachment(entityType, entityId, fileName, contentType);

    return {
      result: result,
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

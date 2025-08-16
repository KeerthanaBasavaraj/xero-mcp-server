import { z } from "zod";
import { createXeroInvoice } from "../../handlers/create-xero-invoice.handler.js";
import { DeepLinkType, getDeepLink } from "../../helpers/get-deeplink.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { Invoice } from "xero-node";
import { listXeroItems } from "../../handlers/list-xero-items.handler.js";
import { createXeroItem } from "../../handlers/create-xero-item.handler.js";

const trackingSchema = z.object({
  name: z.string().describe("The name of the tracking category. Can be obtained from the list-tracking-categories tool"),
  option: z.string().describe("The name of the tracking option. Can be obtained from the list-tracking-categories tool"),
  trackingCategoryID: z.string().describe("The ID of the tracking category. \
    Can be obtained from the list-tracking-categories tool"),
});

const lineItemSchema = z.object({
  description: z.string().describe("The description of the line item. \
    Use this field ONLY when additional details beyond the item name are provided (e.g., 'custom-made', 'gift-wrapped'). \
    If the user provides only an item name, leave this field empty or use a minimal description."),
  quantity: z.number().describe("The quantity of the line item"),
  unitAmount: z.number().describe("The price per unit of the line item"),
  accountCode: z.string().describe("The account code of the line item - can be obtained from the list-accounts tool"),
  taxType: z.string().describe("The tax type of the line item - can be obtained from the list-tax-rates tool"),
  itemCode: z.string().describe("The item code or name of the line item. \
    This should be populated with the item name when the user provides one (e.g., 'clothing'). \
    Can be obtained from the list-items tool for existing items. \
    If the item is not listed, use the item name provided by the user."),
  tracking: z.array(trackingSchema).describe("Up to 2 tracking categories and options can be added to the line item. \
    Can be obtained from the list-tracking-categories tool. \
    Only use if prompted by the user.").optional(),
});

const CreateInvoiceTool = CreateXeroTool(
  "create-invoice",
  "Create an invoice in Xero.\
         ALWAYS ASK FOR CONFIRMATION BEFORE CREATING AN INVOICE. \
         When an invoice is created, a deep link to the invoice in Xero is returned. \
        This deep link can be used to view the invoice in Xero directly. \
        This link should be displayed to the user. \
        IMPORTANT: Before creating ** EVERY ** invoice, you MUST ask the user for confirmation with the exact details of the invoice to be created. \
        Show them the contact ID, line items (description, quantity, unit amount, account code, tax type, item code), invoice type, reference, date, and due date, then ask 'Do you want to proceed with creating this invoice?' \
        'Do NOT suggest specific words or phrases for confirmation or cancellation.'\
        Only proceed after receiving explicit confirmation from the user. \
        RE-CONFIRMATION: If the operation was previously declined but the user later indicates they want to proceed, you MUST re-confirm by showing the same resource details again and asking: 'Please confirm the invoice details once more before proceeding: [show details]. Do you want to proceed with creating this invoice?' \
        Only proceed if the user confirms again. \
        ITEM MAPPING: When a user provides an item name (e.g., 'clothing'), the system will:\
        1. Check if an item with that name exists in Xero\
        2. If it exists, use it as the itemCode\
        3. If it doesn't exist, ask the user if they want to create a new item with that name\
        4. If the user agrees, create the item and use it as itemCode\
        5. If the user declines, use the item name as the description field instead\
        The description field should only be used for additional details beyond the item name when an existing item is used.",
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
    // Process line items to handle item names that don't exist
    const processedLineItems = [];
    
    for (const lineItem of lineItems) {
      if (lineItem.itemCode && lineItem.itemCode.trim()) {
        // Check if the item exists in Xero
        const itemsResponse = await listXeroItems(1);
        let itemExists = false;
        let existingItem = null;
        
        if (!itemsResponse.isError && itemsResponse.result) {
          // Search through items to find a match
          for (const item of itemsResponse.result) {
            if (item.name && item.name.toLowerCase() === lineItem.itemCode.toLowerCase()) {
              itemExists = true;
              existingItem = item;
              break;
            }
          }
        }
        
        if (!itemExists) {
          // Item doesn't exist, ask user if they want to create it
          const shouldCreateItem = await askUserToCreateItem();
          
          if (shouldCreateItem) {
            // Create the item
            const createItemResponse = await createXeroItem({
              code: lineItem.itemCode.toLowerCase().replace(/\s+/g, '-'),
              name: lineItem.itemCode,
              description: `Item created for invoice`,
              salesDetails: {
                unitPrice: lineItem.unitAmount,
                accountCode: lineItem.accountCode,
                taxType: lineItem.taxType,
              },
            });
            
            if (createItemResponse.isError) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Error creating item '${lineItem.itemCode}': ${createItemResponse.error}. Please try again or use the item name as description instead.`,
                  },
                ],
              };
            }
            
            // Use the created item
            processedLineItems.push({
              ...lineItem,
              itemCode: createItemResponse.result?.code || lineItem.itemCode,
            });
          } else {
            // User doesn't want to create item, use name as description
            processedLineItems.push({
              ...lineItem,
              description: lineItem.itemCode,
              itemCode: undefined, // Remove itemCode since we're using description
            });
          }
        } else {
          // Item exists, use it
          processedLineItems.push({
            ...lineItem,
            itemCode: existingItem?.code || lineItem.itemCode,
          });
        }
      } else {
        // No itemCode provided, use as is
        processedLineItems.push(lineItem);
      }
    }

    const xeroInvoiceType = type === "ACCREC" ? Invoice.TypeEnum.ACCREC : Invoice.TypeEnum.ACCPAY;
    const result = await createXeroInvoice(contactId, processedLineItems, xeroInvoiceType, reference, date ,dueDate);
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

// Helper function to ask user if they want to create an item
// In a real chatbot implementation, this function should:
// 1. Ask the user: "The item '{itemName}' doesn't exist in Xero. Would you like me to create it as a new line item, or should I use '{itemName}' as the description instead?"
// 2. Wait for user response
// 3. Return true if user wants to create the item, false if they want to use as description
// For now, this is a placeholder that defaults to using the item name as description
async function askUserToCreateItem(): Promise<boolean> {
  // TODO: Implement user interaction logic in chatbot interface
  // This should ask: "The item '{itemName}' doesn't exist in Xero. Would you like me to create it as a new line item, or should I use '{itemName}' as the description instead?"
  return false; // Default to using item name as description
}

export default CreateInvoiceTool;

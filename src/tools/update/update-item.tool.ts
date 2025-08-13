import { z } from "zod";
import { updateXeroItem } from "../../handlers/update-xero-item.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const purchaseDetailsSchema = z.object({
  unitPrice: z.number().optional(),
  taxType: z.string().optional(),
  accountCode: z.string().optional(),
});

const salesDetailsSchema = z.object({
  unitPrice: z.number().optional(),
  taxType: z.string().optional(),
  accountCode: z.string().optional(),
});

        const UpdateItemTool = CreateXeroTool(
          "update-item",
          "Update an item in Xero.\
          IMPORTANT: Before updating an item, you MUST ask the user for confirmation with the exact details of the changes to be made. \
          Show them the item ID, code, name, description, purchase description, purchase details, sales details, is tracked as inventory, and inventory asset account code changes, then ask 'Do you want to proceed with updating this item?' \
          'Do NOT suggest specific words or phrases for confirmation or cancellation.'\
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the operation was previously declined but the user later indicates they want to proceed, you MUST re-confirm by showing the same resource details again and asking: 'Please confirm the item changes once more before proceeding: [show changes]. Do you want to proceed with updating this item?' \
          Only proceed if the user confirms again.",
  {
    itemId: z.string(),
    code: z.string(),
    name: z.string(),
    description: z.string().optional(),
    purchaseDescription: z.string().optional(),
    purchaseDetails: purchaseDetailsSchema.optional(),
    salesDetails: salesDetailsSchema.optional(),
    isTrackedAsInventory: z.boolean().optional(),
    inventoryAssetAccountCode: z.string().optional(),
  },
  async ({
    itemId,
    code,
    name,
    description,
    purchaseDescription,
    purchaseDetails,
    salesDetails,
    isTrackedAsInventory,
    inventoryAssetAccountCode,
  }) => {
    const result = await updateXeroItem(
      itemId,
      {
        code,
        name,
        description,
        purchaseDescription,
        purchaseDetails,
        salesDetails,
        isTrackedAsInventory,
        inventoryAssetAccountCode,
      }
    );

    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error updating item: ${result.error}`,
          },
        ],
      };
    }

    const item = result.result;

    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Item updated successfully:",
            `ID: ${item?.itemID}`,
            `Code: ${item?.code}`,
            `Name: ${item?.name}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  },
);

export default UpdateItemTool; 
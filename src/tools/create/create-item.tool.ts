import { z } from "zod";
import { createXeroItem } from "../../handlers/create-xero-item.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const purchaseDetailsSchema = z.object({
  unitPrice: z.number(),
  taxType: z.string().optional(),
  accountCode: z.string().optional(),
});

const salesDetailsSchema = z.object({
  unitPrice: z.number(),
  taxType: z.string().optional(),
  accountCode: z.string().optional(),
});

        const CreateItemTool = CreateXeroTool(
          "create-item",
          "Create an item in Xero.\
          IMPORTANT: Before creating an item, you MUST ask the user for confirmation with the exact details of the item to be created. \
          Show them the code, name, description, purchase description, purchase details, sales details, is tracked as inventory, and inventory asset account code, then ask 'Do you want to proceed with creating this item?' \
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the user initially cancels the operation but then says 'yes' to proceed, you MUST ask for re-confirmation by showing the exact item details again and asking 'Please confirm the item details once more before proceeding: [show details]. Do you want to proceed with creating this item?' \
          Only proceed if the user confirms again.",
  {
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
    code,
    name,
    description,
    purchaseDescription,
    purchaseDetails,
    salesDetails,
    isTrackedAsInventory,
    inventoryAssetAccountCode,
  }) => {
    const result = await createXeroItem({
      code,
      name,
      description,
      purchaseDescription,
      purchaseDetails,
      salesDetails,
      isTrackedAsInventory,
      inventoryAssetAccountCode,
    });

    if (result.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating item: ${result.error}`,
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
            "Item created successfully:",
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

export default CreateItemTool; 
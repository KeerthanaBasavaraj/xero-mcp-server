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
  'Do NOT suggest specific words or phrases for confirmation or cancellation.'\
  Only proceed after receiving explicit confirmation from the user. \
  RE-CONFIRMATION: If the operation was previously declined but the user later indicates they want to proceed, you MUST re-confirm by showing the same resource details again and asking: 'Please confirm the item details once more before proceeding: [show details]. Do you want to proceed with creating this item?' \
  Only proceed if the user confirms again. \
  IMPORTANT: When asking for confirmation, ask directly without saying 'Let me ask for your confirmation' or similar phrases. Just ask the question directly.",
  {
    code: z.string().describe("The unique code for the item"),
    name: z.string().describe("The name of the item"),
    description: z.string().describe("The description of the item").optional(),
    purchaseDescription: z.string().describe("The purchase description of the item").optional(),
    purchaseDetails: purchaseDetailsSchema.optional(),
    salesDetails: salesDetailsSchema.optional(),
    isTrackedAsInventory: z.boolean().describe("Whether the item is tracked as inventory").optional(),
    inventoryAssetAccountCode: z.string().describe("The inventory asset account code").optional(),
    confirmation: z.boolean().describe("MUST be set to true to confirm that the user has reviewed all item details and wants to proceed with creating the item. \
      This parameter enforces that confirmation is required before any item is created. \
      Set to false if user has not confirmed or if you need to show details for confirmation first."),
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
    confirmation,
  }) => {
    // Check if user has confirmed
    if (!confirmation) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Item creation requires explicit confirmation. Please review the item details and confirm before proceeding.",
          },
        ],
      };
    }

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
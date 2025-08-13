import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { updateXeroTrackingCategory } from "../../handlers/update-xero-tracking-category.handler.js";

        const UpdateTrackingCategoryTool = CreateXeroTool(
          "update-tracking-category",
          `Updates an existing tracking category in Xero.\
          IMPORTANT: Before updating a tracking category, you MUST ask the user for confirmation with the exact details of the changes to be made. \
          Show them the tracking category ID, name, and status changes, then ask 'Do you want to proceed with updating this tracking category?' \
          'Do NOT suggest specific words or phrases for confirmation or cancellation.'\
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the operation was previously declined but the user later indicates they want to proceed, you MUST re-confirm by showing the same resource details again and asking: 'Please confirm the tracking category changes once more before proceeding: [show changes]. Do you want to proceed with updating this tracking category?' \
          Only proceed if the user confirms again.`,
  {
    trackingCategoryId: z.string(),
    name: z.string().optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional()
  },
  async ({ trackingCategoryId, name, status }) => {
    const response = await updateXeroTrackingCategory(trackingCategoryId, name, status);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error while updating tracking category: ${response.error}`
          }
        ]
      };
    }

    const trackingCategory = response.result;
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Updated the tracking category "${trackingCategory.name}" (${trackingCategory.trackingCategoryID}).`
        },
      ]
    };
  }
);

export default UpdateTrackingCategoryTool;
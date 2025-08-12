import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { updateXeroTrackingCategory } from "../../handlers/update-xero-tracking-category.handler.js";

const UpdateTrackingCategoryTool = CreateXeroTool(
  "update-tracking-category",
  `Updates an existing tracking category in Xero.\
  IMPORTANT: Before updating a tracking category, you MUST ask the user for confirmation with the exact details of the changes to be made. \
  Show them the tracking category ID, name, and status changes, then ask 'Do you want to proceed with updating this tracking category?' \
  Only proceed after receiving explicit confirmation from the user.`,
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
import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { createXeroTrackingCategory } from "../../handlers/create-xero-tracking-category.handler.js";

        const CreateTrackingCategoryTool = CreateXeroTool(
          "create-tracking-category",
          `Create a tracking category in Xero.\
          IMPORTANT: Before creating a tracking category, you MUST ask the user for confirmation with the exact details of the tracking category to be created. \
          Show them the name, then ask 'Do you want to proceed with creating this tracking category?' \
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the user initially cancels the operation but then says 'yes' to proceed, you MUST ask for re-confirmation by showing the exact tracking category details again and asking 'Please confirm the tracking category details once more before proceeding: [show details]. Do you want to proceed with creating this tracking category?' \
          Only proceed if the user confirms again.`,
  {
    name: z.string()
  },
  async ({ name }) => {
    const response = await createXeroTrackingCategory(name);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error while creating tracking category: ${response.error}`
          }
        ]
      };
    }

    const trackingCategory = response.result;
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Created the tracking category "${trackingCategory.name}" (${trackingCategory.trackingCategoryID}).`
        },
      ]
    };
  }
);

export default CreateTrackingCategoryTool;
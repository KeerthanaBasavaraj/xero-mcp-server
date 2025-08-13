import { z } from "zod";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";
import { formatTrackingOption } from "../../helpers/format-tracking-option.js";
import { createXeroTrackingOptions } from "../../handlers/create-xero-tracking-option.handler.js";

        const CreateTrackingOptionsTool = CreateXeroTool(
          "create-tracking-options",
          `Create tracking options for a tracking category in Xero.\
          IMPORTANT: Before creating tracking options, you MUST ask the user for confirmation with the exact details of the tracking options to be created. \
          Show them the tracking category ID and option names, then ask 'Do you want to proceed with creating these tracking options?' \
          'Do NOT suggest specific words or phrases for confirmation or cancellation.'\
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the operation was previously declined but the user later indicates they want to proceed, you MUST re-confirm by showing the same resource details again and asking:
          'Please confirm the tracking options details once more before proceeding: [show details]. Do you want to proceed with creating these tracking options?' \
          Only proceed if the user confirms again.`,
  {
    trackingCategoryId: z.string(),
    optionNames: z.array(z.string()).max(10)
  },
  async ({ trackingCategoryId, optionNames }) => {
    const response = await createXeroTrackingOptions(trackingCategoryId, optionNames);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error while creating tracking options: ${response.error}`
          }
        ]
      };
    }

    const trackingOptions = response.result;
    
    return {
      content: [
        {
          type: "text" as const,
          text: `${trackingOptions.length || 0} out of ${optionNames.length} tracking options created:\n${trackingOptions.map(formatTrackingOption)}`
        },
      ]
    };
  }
);

export default CreateTrackingOptionsTool;
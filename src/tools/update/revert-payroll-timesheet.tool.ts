import { z } from "zod";

import {
  revertXeroPayrollTimesheet,
} from "../../handlers/revert-xero-payroll-timesheet.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

        const RevertPayrollTimesheetTool = CreateXeroTool(
          "revert-timesheet",
          `Revert a payroll timesheet to draft in Xero by its ID.\
          IMPORTANT: Before reverting a payroll timesheet, you MUST ask the user for confirmation with the exact details of the timesheet to be reverted. \
          Show them the timesheet ID, then ask 'Do you want to proceed with reverting this payroll timesheet to draft?' \
          'Do NOT suggest specific words or phrases for confirmation or cancellation.'\
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the operation was previously declined but the user later indicates they want to proceed, you MUST re-confirm by showing the same resource details again and asking: 'Please confirm the timesheet revert once more before proceeding: [show details]. Do you want to proceed with reverting this payroll timesheet to draft?' \
          Only proceed if the user confirms again.`,
  {
    timesheetID: z.string().describe("The ID of the timesheet to revert."),
  },
  async (params: { timesheetID: string }) => {
    const { timesheetID } = params;
    const response = await revertXeroPayrollTimesheet(timesheetID);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error reverting timesheet: ${response.error}`,
          },
        ],
      };
    }

    const timesheet = response.result;

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully reverted timesheet with ID: ${timesheet?.timesheetID} to draft.`,
        },
      ],
    };
  },
);

export default RevertPayrollTimesheetTool;
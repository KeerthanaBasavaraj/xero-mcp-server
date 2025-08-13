import { z } from "zod";

import {
  deleteXeroPayrollTimesheet,
} from "../../handlers/delete-xero-payroll-timesheet.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

        const DeletePayrollTimesheetTool = CreateXeroTool(
          "delete-timesheet",
          `Delete an existing payroll timesheet in Xero by its ID.\
          IMPORTANT: Before deleting a payroll timesheet, you MUST ask the user for confirmation with the exact details of the timesheet to be deleted. \
          Show them the timesheet ID, then ask 'Do you want to proceed with deleting this payroll timesheet?' \
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the operation was previously declined but the user later indicates they want to proceed, you MUST re-confirm by showing the same resource details again and asking: 'Please confirm the timesheet deletion once more before proceeding: [show details]. Do you want to proceed with deleting this payroll timesheet?' \
          Only proceed if the user confirms again.`,
  {
    timesheetID: z.string().describe("The ID of the timesheet to delete."),
  },
  async (params: { timesheetID: string }) => {
    const { timesheetID } = params;
    const response = await deleteXeroPayrollTimesheet(timesheetID);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error deleting timesheet: ${response.error}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully deleted timesheet with ID: ${timesheetID}`,
        },
      ],
    };
  },
);

export default DeletePayrollTimesheetTool;
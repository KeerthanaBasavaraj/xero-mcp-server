import { z } from "zod";

import {
  approveXeroPayrollTimesheet,
} from "../../handlers/approve-xero-payroll-timesheet.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

        const ApprovePayrollTimesheetTool = CreateXeroTool(
          "approve-timesheet",
          `Approve a payroll timesheet in Xero by its ID.\
          IMPORTANT: Before approving a payroll timesheet, you MUST ask the user for confirmation with the exact details of the timesheet to be approved. \
          Show them the timesheet ID, then ask 'Do you want to proceed with approving this payroll timesheet?' \
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the user initially cancels the operation but then says 'yes' to proceed, you MUST ask for re-confirmation by showing the exact timesheet details again and asking 'Please confirm the timesheet approval once more before proceeding: [show details]. Do you want to proceed with approving this payroll timesheet?' \
          Only proceed if the user confirms again.`,
  {
    timesheetID: z.string().describe("The ID of the timesheet to approve."),
  },
  async (params: { timesheetID: string }) => {
    const { timesheetID } = params;
    const response = await approveXeroPayrollTimesheet(timesheetID);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error approving timesheet: ${response.error}`,
          },
        ],
      };
    }

    const timesheet = response.result;

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully approved timesheet with ID: ${timesheet?.timesheetID}`,
        },
      ],
    };
  },
);

export default ApprovePayrollTimesheetTool;
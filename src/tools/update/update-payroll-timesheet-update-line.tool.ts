import {
  TimesheetLine,
} from "xero-node/dist/gen/model/payroll-nz/timesheetLine.js";
import { z } from "zod";

import {
  updateXeroPayrollTimesheetUpdateLine,
} from "../../handlers/update-xero-payroll-timesheet-update-line.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const UpdatePayrollTimesheetLineTool = CreateXeroTool(
  "update-timesheet-line",
  `Update an existing timesheet line in a payroll timesheet in Xero.\
  IMPORTANT: Before updating a timesheet line, you MUST ask the user for confirmation with the exact details of the changes to be made. \
  Show them the timesheet ID, timesheet line ID, and timesheet line details (earnings rate ID, number of units, date), then ask 'Do you want to proceed with updating this timesheet line?' \
  Only proceed after receiving explicit confirmation from the user.`,
  {
    timesheetID: z.string().describe("The ID of the timesheet to update."),
    timesheetLineID: z.string().describe("The ID of the timesheet line to update."),
    timesheetLine: z.object({
      earningsRateID: z.string().describe("The ID of the earnings rate."),
      numberOfUnits: z.number().describe("The number of units for the timesheet line."),
      date: z.string().describe("The date for the timesheet line (YYYY-MM-DD)."),
    }).describe("The details of the timesheet line to update."),
  },
  async (params: { timesheetID: string; timesheetLineID: string; timesheetLine: TimesheetLine }) => {
    const { timesheetID, timesheetLineID, timesheetLine } = params;
    const response = await updateXeroPayrollTimesheetUpdateLine(timesheetID, timesheetLineID, timesheetLine);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error updating timesheet line: ${response.error}`,
          },
        ],
      };
    }

    const updatedLine = response.result;

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully updated timesheet line with date: ${updatedLine?.date}`,
        },
      ],
    };
  },
);

export default UpdatePayrollTimesheetLineTool;
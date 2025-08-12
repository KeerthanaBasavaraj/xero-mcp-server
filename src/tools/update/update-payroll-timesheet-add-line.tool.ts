import {
  TimesheetLine,
} from "xero-node/dist/gen/model/payroll-nz/timesheetLine.js";
import { z } from "zod";

import {
  updateXeroPayrollTimesheetAddLine,
} from "../../handlers/update-xero-payroll-timesheet-add-line.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

        const AddTimesheetLineTool = CreateXeroTool(
          "add-timesheet-line",
          `Add a new timesheet line to an existing payroll timesheet in Xero.\
          IMPORTANT: Before adding a timesheet line, you MUST ask the user for confirmation with the exact details of the timesheet line to be added. \
          Show them the timesheet ID and timesheet line details (earnings rate ID, number of units, date), then ask 'Do you want to proceed with adding this timesheet line?' \
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the user initially cancels the operation but then says 'yes' to proceed, you MUST ask for re-confirmation by showing the exact timesheet line details again and asking 'Please confirm the timesheet line details once more before proceeding: [show details]. Do you want to proceed with adding this timesheet line?' \
          Only proceed if the user confirms again.`,
  {
    timesheetID: z.string().describe("The ID of the timesheet to update."),
    timesheetLine: z.object({
      earningsRateID: z.string().describe("The ID of the earnings rate."),
      numberOfUnits: z.number().describe("The number of units for the timesheet line."),
      date: z.string().describe("The date for the timesheet line (YYYY-MM-DD)."),
    }).describe("The details of the timesheet line to add."),
  },
  async (params: { timesheetID: string; timesheetLine: TimesheetLine }) => {
    const { timesheetID, timesheetLine } = params;
    const response = await updateXeroPayrollTimesheetAddLine(timesheetID, timesheetLine);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error adding timesheet line: ${response.error}`,
          },
        ],
      };
    }

    const newLine = response.result;

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully added timesheet line with date: ${newLine?.date}`,
        },
      ],
    };
  },
);

export default AddTimesheetLineTool;
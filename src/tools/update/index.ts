import ApprovePayrollTimesheetTool from "./approve-payroll-timesheet.tool.js";
import RevertPayrollTimesheetTool from "./revert-payroll-timesheet.tool.js";
import UpdateBankTransactionTool from "./update-bank-transaction.tool.js";
import UpdateContactTool from "./update-contact.tool.js";
import UpdateCreditNoteTool from "./update-credit-note.tool.js";
import UpdateInvoiceTool from "./update-invoice.tool.js";
import UpdateItemTool from "./update-item.tool.js";
import AddTimesheetLineTool from "./update-payroll-timesheet-add-line.tool.js";
import UpdatePayrollTimesheetLineTool
  from "./update-payroll-timesheet-update-line.tool.js";
import UpdateManualJournalTool from "./update-manual-journal-tool.js";
import UpdateQuoteTool from "./update-quote.tool.js";
import UpdateTrackingCategoryTool from "./update-tracking-category.tool.js";
import UpdateTrackingOptionsTool from "./update-tracking-options.tool.js";
import UpdatePayrollEmployeeTool from "./update-payroll-employee.tool.js";

export const UpdateTools = [
  UpdateContactTool,
  UpdateCreditNoteTool,
  UpdateInvoiceTool,
  UpdateManualJournalTool,
  UpdateQuoteTool,
  UpdateItemTool,
  UpdateBankTransactionTool,
  ApprovePayrollTimesheetTool,
  AddTimesheetLineTool,
  UpdatePayrollTimesheetLineTool,
  RevertPayrollTimesheetTool,
  UpdateTrackingCategoryTool,
  UpdateTrackingOptionsTool,
  UpdatePayrollEmployeeTool
];

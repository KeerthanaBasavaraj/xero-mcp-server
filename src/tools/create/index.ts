import CreateBankTransactionTool from "./create-bank-transaction.tool.js";
import CreateContactTool from "./create-contact.tool.js";
import CreateInvoiceTool from "./create-invoice.tool.js";
import CreateItemTool from "./create-item.tool.js";
import CreatePaymentTool from "./create-payment.tool.js";
import CreatePayrollTimesheetTool from "./create-payroll-timesheet.tool.js";
import CreateQuoteTool from "./create-quote.tool.js";
import CheckAttachmentDuplicatesTool from "./create-attachment.tool.js";
import CreatePayrollEmployeeTool from "./create-payroll-employee.tool.js";
import UploadAttachmentTool from "./upload-attachment.tool.js";

export const CreateTools = [
  CreateContactTool,
  CreateInvoiceTool,
  CreateQuoteTool,
  CreatePaymentTool,
  CreateItemTool,
  CreateBankTransactionTool,
  CreatePayrollTimesheetTool,
  CheckAttachmentDuplicatesTool,
  CreatePayrollEmployeeTool,
  UploadAttachmentTool,
];

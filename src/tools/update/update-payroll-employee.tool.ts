import { z } from "zod";
import { updateXeroPayrollEmployee } from "../../handlers/update-xero-payroll-employee.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const UpdatePayrollEmployeeTool = CreateXeroTool(
  "update-payroll-employee",
  "Update a payroll employee in Xero Payroll AU. Only employeeID is required. All other fields are optional and will only be updated if provided.",
  {
    employeeID: z.string().describe("The Xero employee ID to update (required)."),
    firstName: z.string().optional().describe("First name of the employee (optional)."),
    lastName: z.string().optional().describe("Last name of the employee (optional)."),
    email: z.string().email().optional().describe("Employee's email address (optional)."),
    dateOfBirth: z.string().optional().describe("Date of birth (YYYY-MM-DD, optional)."),
    gender: z.enum(["M", "F"]).optional().describe("Gender: M or F (optional)."),
    startDate: z.string().optional().describe("Start date (YYYY-MM-DD, optional)."),
    title: z.string().optional().describe("Job title or honorific (optional)."),
    middleNames: z.string().optional().describe("Middle names (optional)."),
    addressLine1: z.string().optional().describe("Address line 1 (optional)."),
    addressLine2: z.string().optional().describe("Address line 2 (optional)."),
    city: z.string().optional().describe("City (optional)."),
    region: z.string().optional().describe("Region/State (optional)."),
    postalCode: z.string().optional().describe("Postal code (optional)."),
    country: z.string().optional().describe("Country (optional)."),
    phoneNumber: z.string().optional().describe("Phone number (optional)."),
    jobTitle: z.string().optional().describe("Job title (optional)."),
  },
  async (params) => {
    const response = await updateXeroPayrollEmployee(params);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to update employee: ${response.error}`,
          },
        ],
      };
    }

    const employee = response.result;
    return {
      content: [
        {
          type: "text" as const,
          text: [
            "Employee updated successfully:",
            `ID: ${employee?.employeeID}`,
            `Name: ${employee?.firstName} ${employee?.lastName}`,
            employee?.email ? `Email: ${employee.email}` : null,
            // engagementType removed (not present in AU model)
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  }
);

export default UpdatePayrollEmployeeTool; 
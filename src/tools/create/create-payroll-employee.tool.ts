import { z } from "zod";
import { createXeroPayrollEmployee } from "../../handlers/create-xero-payroll-employee.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

        const CreatePayrollEmployeeTool = CreateXeroTool(
          "create-payroll-employee",
          "Create a payroll employee in Xero Payroll AU. First name, last name, email, date of birth, and complete home address (address line 1, city, region, postal code) are required. All other fields are optional.\
          IMPORTANT: Before creating a payroll employee, you MUST ask the user for confirmation with the exact details of the employee to be created. \
          Show them the first name, last name, email, date of birth, gender, start date, title, middle names, address details, phone number, and job title, then ask 'Do you want to proceed with creating this payroll employee?' \
          Only proceed after receiving explicit confirmation from the user. \
          RE-CONFIRMATION: If the user initially cancels the operation but then says 'yes' to proceed, you MUST ask for re-confirmation by showing the exact employee details again and asking 'Please confirm the payroll employee details once more before proceeding: [show details]. Do you want to proceed with creating this payroll employee?' \
          Only proceed if the user confirms again.",
  {
    firstName: z.string().describe("First name of the employee (required)."),
    lastName: z.string().describe("Last name of the employee (required)."),
    email: z.string().email().describe("Employee's email address (required)."),
    dateOfBirth: z.string().describe("Date of birth (YYYY-MM-DD, required)."),
    gender: z.enum(["M", "F"]).optional().describe("Gender: M or F (optional)."),
    startDate: z.string().optional().describe("Start date (YYYY-MM-DD, optional)."),
    title: z.string().optional().describe("Job title or honorific (optional)."),
    middleNames: z.string().optional().describe("Middle names (optional)."),
    addressLine1: z.string().describe("Address line 1 (required)."),
    addressLine2: z.string().optional().describe("Address line 2 (optional)."),
    city: z.string().describe("City (required)."),
    region: z.string().describe("Region/State (required)."),
    postalCode: z.string().describe("Postal code (required)."),
    country: z.string().optional().describe("Country (optional)."),
    phoneNumber: z.string().optional().describe("Phone number (optional)."),
    jobTitle: z.string().optional().describe("Job title (optional)."),
  },
  async (params) => {
    const response = await createXeroPayrollEmployee(params);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to create employee: ${response.error}`,
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
            "Employee created successfully:",
            `ID: ${employee?.employeeID}`,
            `Name: ${employee?.firstName} ${employee?.lastName}`,
            employee?.email ? `Email: ${employee.email}` : null,
            employee?.dateOfBirth ? `Date of Birth: ${employee.dateOfBirth}` : null,
            employee?.homeAddress ? `Address: ${employee.homeAddress.addressLine1}, ${employee.homeAddress.city}, ${employee.homeAddress.region}, ${employee.homeAddress.postalCode}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    };
  }
);

export default CreatePayrollEmployeeTool; 
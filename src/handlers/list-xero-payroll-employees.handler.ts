import { xeroClient } from "../clients/xero-client.js";
import { Employee } from "xero-node/dist/gen/model/payroll-au/employee.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

async function getPayrollEmployees(): Promise<Employee[]> {
  await xeroClient.authenticate();

  // Call the Employees endpoint from the PayrollAUApi
  const employees = await xeroClient.payrollAUApi.getEmployees(
    xeroClient.tenantId,
    undefined, // page
    undefined, // pageSize
  );

  return employees.body.employees ?? [];
}

/**
 * List all payroll employees from Xero Payroll AU
 */
export async function listXeroPayrollEmployees(): Promise<
  XeroClientResponse<Employee[]>
> {
  try {
    const employees = await getPayrollEmployees();

    return {
      result: employees,
      isError: false,
      error: null,
    };
  } catch (error) {
    return {
      result: null,
      isError: true,
      error: formatError(error),
    };
  }
}

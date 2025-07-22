import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Employee } from "xero-node/dist/gen/model/payroll-au/employee.js";
import { State } from "xero-node/dist/gen/model/payroll-au/state.js";

export interface UpdatePayrollEmployeeInput {
  employeeID: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: "M" | "F";
  startDate?: string;
  title?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  phoneNumber?: string;
  jobTitle?: string;
}

function mapRegion(region?: string): State | undefined {
  if (!region) return undefined;
  if (Object.values(State).includes(region as unknown as State)) {
    return region as unknown as State;
  }
  return undefined;
}

async function updatePayrollEmployee(
  input: UpdatePayrollEmployeeInput
): Promise<Employee | null> {
  await xeroClient.authenticate();

  // Build Employee object only with defined fields
  const employee: Partial<Employee> = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender ? (input.gender === "M" ? Employee.GenderEnum.M : Employee.GenderEnum.F) : undefined,
    startDate: input.startDate,
    title: input.title,
    homeAddress: input.addressLine1 || input.city || input.region || input.postalCode || input.country ? {
      addressLine1: input.addressLine1 || '',
      addressLine2: input.addressLine2,
      city: input.city,
      region: mapRegion(input.region),
      postalCode: input.postalCode,
      country: input.country,
    } : undefined,
    jobTitle: input.jobTitle,
    phone: input.phoneNumber,
  };

  // Remove undefined fields
  Object.keys(employee).forEach(
    (key) => employee[key as keyof Employee] === undefined && delete employee[key as keyof Employee]
  );

  const response = await xeroClient.payrollAUApi.updateEmployee(
    xeroClient.tenantId,
    input.employeeID,
    [employee as Employee] // Cast to Employee for SDK
  );
  return response.body.employees?.[0] ?? null;
}

export async function updateXeroPayrollEmployee(
  employeeDetails: UpdatePayrollEmployeeInput
): Promise<XeroClientResponse<Employee | null>> {
  try {
    const employee = await updatePayrollEmployee(employeeDetails);
    return {
      result: employee,
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
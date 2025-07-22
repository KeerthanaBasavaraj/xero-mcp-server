import { xeroClient } from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Employee } from "xero-node/dist/gen/model/payroll-au/employee.js";
import { HomeAddress } from "xero-node/dist/gen/model/payroll-au/homeAddress.js";
import { State } from "xero-node/dist/gen/model/payroll-au/state.js";

export interface CreatePayrollEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string; 
  gender?: "M" | "F";
  startDate?: string;
  title?: string;
  middleNames?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string; 
  region: string;
  postalCode: string;
  country?: string;
  phoneNumber?: string;
  mobile?: string;
  jobTitle?: string;
}

function mapGender(gender?: "M" | "F"): Employee.GenderEnum | undefined {
  if (gender === "M") return Employee.GenderEnum.M;
  if (gender === "F") return Employee.GenderEnum.F;
  return undefined;
}

function mapRegion(region?: string): State | undefined {
  if (!region) return undefined;
  if (Object.values(State).includes(region as unknown as State)) {
    return region as unknown as State;
  }
  return undefined;
}

function buildHomeAddress(input: CreatePayrollEmployeeInput): HomeAddress {
  const addr: HomeAddress = {
    addressLine1: input.addressLine1,
    city: input.city,
    postalCode: input.postalCode,
  };
  if (input.addressLine2) addr.addressLine2 = input.addressLine2;
  if (input.region) addr.region = mapRegion(input.region);
  if (input.country) addr.country = input.country;
  return addr;
}

async function createPayrollEmployee(
  employeeDetails: CreatePayrollEmployeeInput
) {
  await xeroClient.authenticate();

  // Build Employee object with required fields
  const employee: Partial<Employee> = {
    firstName: employeeDetails.firstName,
    lastName: employeeDetails.lastName,
    email: employeeDetails.email,
    dateOfBirth: employeeDetails.dateOfBirth,
    gender: mapGender(employeeDetails.gender),
    startDate: employeeDetails.startDate,
    title: employeeDetails.title,
    phone: employeeDetails.phoneNumber,
    jobTitle: employeeDetails.jobTitle,
    homeAddress: buildHomeAddress(employeeDetails),
  };

  // Remove undefined fields
  Object.keys(employee).forEach(
    (k) => employee[k as keyof Employee] === undefined && delete employee[k as keyof Employee]
  );

  const response = await xeroClient.payrollAUApi.createEmployee(
    xeroClient.tenantId,
    [employee as Employee] 
  );

  return response.body.employees?.[0] ?? null;
}

export async function createXeroPayrollEmployee(
  employeeDetails: CreatePayrollEmployeeInput
): Promise<XeroClientResponse<Employee | null>> {
  try {
    const employee = await createPayrollEmployee(employeeDetails);
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
import { xeroClient } from "../clients/xero-client.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { formatError } from "../helpers/format-error.js";
import { XeroClientResponse } from "../types/tool-response.js";

/**
 * Compare actual revenue and budgeted revenue from Xero
 * @param fromDate Start date (YYYY-MM-DD)
 * @param toDate End date (YYYY-MM-DD)
 */
interface AccountingApi {
  getReportProfitAndLoss: (...args: any[]) => Promise<any>;
  getReportBudgetSummary: (...args: any[]) => Promise<any>;
}

export async function compareXeroRevenue(
  fromDate: string,
  toDate: string
): Promise<XeroClientResponse<any>> {
  try {
    await xeroClient.authenticate();

    // Type guard to ensure accountingApi exists and is of correct type
    if (
      !('accountingApi' in xeroClient) ||
      typeof (xeroClient as any).accountingApi !== "object"
    ) {
      throw new Error("xeroClient does not support accountingApi");
    }

    const accountingApi = (xeroClient as { accountingApi: AccountingApi }).accountingApi;

    // Fetch actual revenue from Profit and Loss report
    const plResponse = await accountingApi.getReportProfitAndLoss(
      xeroClient.tenantId,
      fromDate,
      toDate,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true, // standardLayout
      false, // paymentsOnly
      getClientHeaders()
    );
    const plReport = plResponse.body.reports?.[0];
    const actualRevenue = plReport?.rows?.find(
      (row: any) => row.rowType === "SECTION" && row.title === "Revenue"
    )?.rows?.reduce((sum: number, r: any) => sum + (parseFloat(r.cells?.[1]?.value) || 0), 0) || 0;

    // Calculate periods (number of months) between fromDate and toDate
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const periods = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;

    // Fetch budgeted revenue from Budget Summary report
    const budgetResponse = await accountingApi.getReportBudgetSummary(
      xeroClient.tenantId,
      fromDate,
      periods,
      undefined,
      getClientHeaders()
    );
    const budgetReport = budgetResponse.body.reports?.[0];
    const budgetRevenue = budgetReport?.rows?.find(
      (row: any) => row.rowType === "SECTION" && row.title === "Revenue"
    )?.rows?.reduce((sum: number, r: any) => sum + (parseFloat(r.cells?.[1]?.value) || 0), 0) || 0;

    // Calculate difference and variance
    const difference = actualRevenue - budgetRevenue;
    const variance = budgetRevenue !== 0 ? (difference / budgetRevenue) * 100 : null;

    return {
      result: {
        actualRevenue,
        budgetRevenue,
        difference,
        variancePercentage: variance,
      },
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

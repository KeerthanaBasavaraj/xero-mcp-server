import { XeroClientResponse } from "../types/tool-response.js";

/**
 * Fetches all pages from a paginated Xero handler and returns a flat array of all items.
 * @param handler The paginated handler function (must accept page as first argument)
 * @param args Any additional arguments to pass to the handler after page
 * @returns Promise<T[]>
 */
export async function fetchAllPages<T>(
  handler: (page: number, ...args: any[]) => Promise<XeroClientResponse<T[]>>,
  ...args: any[]
): Promise<T[]> {
  let page = 1;
  let allItems: T[] = [];
  while (true) {
    const response = await handler(page, ...args);
    if (response.isError) {
      throw new Error(response.error || "Unknown error fetching paginated data");
    }
    const items = response.result || [];
    allItems = allItems.concat(items);
    if (items.length === 0) break;
    page++;
  }
  return allItems;
} 
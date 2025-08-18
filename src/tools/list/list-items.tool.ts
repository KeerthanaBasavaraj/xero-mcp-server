import { z } from "zod";
import { listXeroItems } from "../../handlers/list-xero-items.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const ListItemsTool = CreateXeroTool(
  "list-items",
  "Lists items in Xero with pagination. Shows 10 items per page. Use this tool to get item codes and descriptions for creating invoices. \
  If there are more than 10 items, the tool will indicate if more pages are available and ask the user if they want to see more items. \
  Use this tool when users need to see available items to choose from for invoice creation.",
  {
    page: z.number().describe("The page number to fetch. Start with 1 for the first page."),
  },
  async ({ page }) => {
    const response = await listXeroItems(page);

    if (response.isError) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing items: ${response.error}`,
          },
        ],
      };
    }

    const items = response.result;
    const itemsPerPage = 10;
    const hasMoreItems = items && items.length === itemsPerPage;

    let resultText = `Page ${page} - Showing ${items?.length || 0} items:`;
    
    if (items && items.length > 0) {
      resultText += "\n\n";
      items.forEach((item, index) => {
        const itemNumber = (page - 1) * itemsPerPage + index + 1;
        resultText += `${itemNumber}. Item: ${item.name || "Unnamed"}\n`;
        resultText += `   ID: ${item.itemID}\n`;
        resultText += `   Code: ${item.code}\n`;
        if (item.description) resultText += `   Description: ${item.description}\n`;
        if (item.purchaseDescription) resultText += `   Purchase Description: ${item.purchaseDescription}\n`;
        if (item.salesDetails?.unitPrice !== undefined) resultText += `   Sales Price: ${item.salesDetails.unitPrice}\n`;
        if (item.purchaseDetails?.unitPrice !== undefined) resultText += `   Purchase Price: ${item.purchaseDetails.unitPrice}\n`;
        if (item.salesDetails?.accountCode) resultText += `   Sales Account: ${item.salesDetails.accountCode}\n`;
        if (item.purchaseDetails?.accountCode) resultText += `   Purchase Account: ${item.purchaseDetails.accountCode}\n`;
        if (item.isTrackedAsInventory !== undefined) resultText += `   Tracked as Inventory: ${item.isTrackedAsInventory ? 'Yes' : 'No'}\n`;
        if (item.isSold !== undefined) resultText += `   Is Sold: ${item.isSold ? 'Yes' : 'No'}\n`;
        if (item.isPurchased !== undefined) resultText += `   Is Purchased: ${item.isPurchased ? 'Yes' : 'No'}\n`;
        if (item.updatedDateUTC) resultText += `   Last Updated: ${item.updatedDateUTC}\n`;
        if (item.validationErrors?.length) resultText += `   Validation Errors: ${item.validationErrors.map(e => e.message).join(", ")}\n`;
        resultText += "\n";
      });
    } else {
      resultText += "\nNo items found on this page.";
    }

    // Add pagination information
    if (hasMoreItems) {
      resultText += `\nThere are more items available. To see the next page, use this tool again with page ${page + 1}.`;
    } else if (page > 1) {
      resultText += `\nThis appears to be the last page. To go back to previous pages, use this tool with page numbers less than ${page}.`;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: resultText,
        },
      ],
    };
  },
);

export default ListItemsTool; 
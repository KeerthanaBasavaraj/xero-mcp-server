/**
 * Format pagination information for tool responses
 */
export function formatPaginationInfo(pagination: any, currentPage?: number): string {
  if (!pagination) return '';
  
  const page = pagination.page || currentPage || 'N/A';
  const pageSize = pagination.pageSize || 'N/A';
  const pageCount = pagination.pageCount || 'N/A';
  const itemCount = pagination.itemCount || 'N/A';
  
  const lines = [
    "\n📄 Pagination Information:",
    `Page: ${page}`,
    `Page Size: ${pageSize}`,
    `Page Count: ${pageCount}`,
    `Total Items: ${itemCount}`
  ];
  
  // Add tip for next page if available
  if (pageCount && page && page < pageCount) {
    lines.push(`\n💡 Tip: There are more pages available. Use page ${(page || 1) + 1} to get the next set of items.`);
  }
  
  return lines.join("\n");
} 
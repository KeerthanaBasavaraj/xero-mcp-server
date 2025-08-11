import { xeroClient } from "../clients/xero-client.js";
import { Contact } from "xero-node";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getContacts(
  page?: number, 
  pageSize?: number, 
  searchTerm?: string,
  phoneFilter?: string,
  addressFilter?: string
): Promise<{ contacts: Contact[], pagination?: { page: number; pageSize: number; pageCount: number; itemCount: number } | undefined }> {
  await xeroClient.authenticate();

  // Strategy: Use Xero's searchTerm for name/email, then apply additional filters
  const effectiveSearchTerm = searchTerm;
  
  // If we have phone or address filters but no search term, we need to get all contacts
  // and filter client-side since Xero API doesn't support phone/address in searchTerm
  const needsClientSideFiltering = (phoneFilter || addressFilter) && !searchTerm;
  
  // If we have both searchTerm and filters, use searchTerm first, then filter results
  const useSearchTermFirst = searchTerm && (phoneFilter || addressFilter);

  // For client-side filtering, we need to get all contacts (no pagination)
  const shouldGetAllContacts = needsClientSideFiltering || useSearchTermFirst;
  
  const contacts = await xeroClient.accountingApi.getContacts(
    xeroClient.tenantId,
    undefined, // ifModifiedSince
    undefined, // where - not using where clause for now
    undefined, // order
    undefined, // iDs
    shouldGetAllContacts ? undefined : page, // page - use undefined if we need all contacts
    undefined, // includeArchived
    shouldGetAllContacts ? false : true, // summaryOnly - false if we need full contact details for filtering
    effectiveSearchTerm, // searchTerm
    shouldGetAllContacts ? undefined : pageSize, // pageSize - use undefined if we need all contacts
    getClientHeaders(),
  );

  let filteredContacts = contacts.body.contacts ?? [];

  // Apply client-side filtering for phone numbers
  if (phoneFilter && filteredContacts.length > 0) {
    filteredContacts = filteredContacts.filter(contact => {
      if (!contact.phones || contact.phones.length === 0) return false;
      return contact.phones.some(phone => 
        phone.phoneNumber?.toLowerCase().includes(phoneFilter.toLowerCase())
      );
    });
  }

  // Apply client-side filtering for addresses
  if (addressFilter && filteredContacts.length > 0) {
    filteredContacts = filteredContacts.filter(contact => {
      if (!contact.addresses || contact.addresses.length === 0) return false;
      return contact.addresses.some(address => {
        const addressText = [
          address.addressLine1,
          address.addressLine2,
          address.city,
          address.region,
          address.postalCode,
          address.country
        ].filter(Boolean).join(' ').toLowerCase();
        return addressText.includes(addressFilter.toLowerCase());
      });
    });
  }

  // If we got all contacts for filtering, we need to handle pagination manually
  let pagination: { page: number; pageSize: number; pageCount: number; itemCount: number } | undefined = contacts.body.pagination ? {
    page: contacts.body.pagination.page || 1,
    pageSize: contacts.body.pagination.pageSize || 10,
    pageCount: contacts.body.pagination.pageCount || 1,
    itemCount: contacts.body.pagination.itemCount || 0
  } : undefined;
  
  if (shouldGetAllContacts && page && pageSize) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const totalItems = filteredContacts.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Apply pagination to filtered results
    filteredContacts = filteredContacts.slice(startIndex, endIndex);
    
    // Create custom pagination info
    pagination = {
      page: page,
      pageSize: pageSize,
      pageCount: totalPages,
      itemCount: totalItems
    };
  }

  return {
    contacts: filteredContacts,
    pagination: pagination
  };
}

/**
 * List all contacts from Xero
 */
export async function listXeroContacts(
  page?: number, 
  pageSize?: number, 
  searchTerm?: string,
  phoneFilter?: string,
  addressFilter?: string
): Promise<XeroClientResponse<{ contacts: Contact[], pagination?: { page: number; pageSize: number; pageCount: number; itemCount: number } | undefined }>> {
  try {
    // If we have filters but no page, don't use pagination (get all contacts for filtering)
    const hasFilters = phoneFilter || addressFilter;
    const finalPage = (hasFilters && !page) ? undefined : page;
    const finalPageSize = (hasFilters && !page) ? undefined : pageSize;
    
    const result = await getContacts(finalPage, finalPageSize, searchTerm, phoneFilter, addressFilter);

    return {
      result: result,
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

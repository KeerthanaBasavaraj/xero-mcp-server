import { z } from "zod";
import { listXeroInvoices } from "../../handlers/list-xero-invoices.handler.js";
import { CreateXeroTool } from "../../helpers/create-xero-tool.js";

const ListClientServicesTool = CreateXeroTool(
  "list-client-services",
  "Analyzes invoices to extract services used by clients. This provides insights into which services are most popular and which clients use which services.",
  {
    fromDate: z
      .string()
      .optional()
      .describe("Optional start date in YYYY-MM-DD format to filter invoices"),
    toDate: z
      .string()
      .optional()
      .describe("Optional end date in YYYY-MM-DD format to filter invoices"),
    contactId: z
      .string()
      .optional()
      .describe("Optional contact ID to filter for a specific client"),
  },
  async ({ fromDate, toDate, contactId }) => {
    try {
      // Get invoices with line items
      const response = await listXeroInvoices(1, contactId ? [contactId] : undefined, undefined);
      
      if (response.error !== null) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error listing invoices: ${response.error}`,
            },
          ],
        };
      }

      const invoices = response.result || [];
      
      // Filter by date range if provided
      let filteredInvoices = invoices;
      if (fromDate || toDate) {
        filteredInvoices = invoices.filter(invoice => {
          if (!invoice.date) return false;
          const invoiceDate = new Date(invoice.date);
          const from = fromDate ? new Date(fromDate) : null;
          const to = toDate ? new Date(toDate) : null;
          
          if (from && invoiceDate < from) return false;
          if (to && invoiceDate > to) return false;
          return true;
        });
      }

      // Extract services from line items
      const clientServices: Record<string, Record<string, { count: number; total: number }>> = {};
      
      filteredInvoices.forEach(invoice => {
        const clientName = invoice.contact?.name || 'Unknown Client';
        const clientId = invoice.contact?.contactID || 'unknown';
        
        if (!clientServices[clientId]) {
          clientServices[clientId] = {};
        }
        
        invoice.lineItems?.forEach(lineItem => {
          const serviceName = lineItem.description || 'Unnamed Service';
          const amount = parseFloat(String(lineItem.lineAmount || '0'));
          
          if (!clientServices[clientId][serviceName]) {
            clientServices[clientId][serviceName] = { count: 0, total: 0 };
          }
          
          clientServices[clientId][serviceName].count += 1;
          clientServices[clientId][serviceName].total += amount;
        });
      });

      // Calculate summary statistics
      const serviceSummary: Record<string, { count: number; total: number; clients: number }> = {};
      const clientSummary: Record<string, { services: number; total: number }> = {};
      
      Object.entries(clientServices).forEach(([clientId, services]) => {
        const clientName = filteredInvoices.find(inv => inv.contact?.contactID === clientId)?.contact?.name || 'Unknown';
        let clientTotal = 0;
        let serviceCount = 0;
        
        Object.entries(services).forEach(([serviceName, data]) => {
          if (!serviceSummary[serviceName]) {
            serviceSummary[serviceName] = { count: 0, total: 0, clients: 0 };
          }
          
          serviceSummary[serviceName].count += data.count;
          serviceSummary[serviceName].total += data.total;
          serviceSummary[serviceName].clients += 1;
          
          clientTotal += data.total;
          serviceCount += data.count;
        });
        
        clientSummary[clientName] = { services: serviceCount, total: clientTotal };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Client Services Analysis${fromDate || toDate ? ` (${fromDate || 'Start'} to ${toDate || 'End'})` : ''}`,
          },
          {
            type: "text" as const,
            text: `Analyzed ${filteredInvoices.length} invoices`,
          },
          {
            type: "text" as const,
            text: "Service Summary (by popularity):",
          },
          {
            type: "text" as const,
            text: JSON.stringify(
              Object.entries(serviceSummary)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([service, data]) => ({
                  service,
                  totalRevenue: data.total,
                  usageCount: data.count,
                  uniqueClients: data.clients
                })),
              null,
              2
            ),
          },
          {
            type: "text" as const,
            text: "Client Summary:",
          },
          {
            type: "text" as const,
            text: JSON.stringify(
              Object.entries(clientSummary)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([client, data]) => ({
                  client,
                  totalSpent: data.total,
                  servicesUsed: data.services
                })),
              null,
              2
            ),
          },
          {
            type: "text" as const,
            text: "Detailed Client Services:",
          },
          {
            type: "text" as const,
            text: JSON.stringify(clientServices, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error analyzing client services: ${error}`,
          },
        ],
      };
    }
  },
);

export default ListClientServicesTool; 
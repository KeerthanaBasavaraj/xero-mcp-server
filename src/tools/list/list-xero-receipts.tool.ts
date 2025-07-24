import { listXeroReceipts } from "../../handlers/list-xero-receipts.handler.js";

const ListXeroReceiptsTool = {
  name: "list_xero_receipts",
  description: "List all receipts (paid ACCREC invoices) in Xero.",
  async run({ page }: { page?: number }) {
    return await listXeroReceipts({ page });
  },
};

export default ListXeroReceiptsTool;

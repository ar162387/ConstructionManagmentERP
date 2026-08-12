import { api } from "./api";

export interface ApiConsumableRunningBillRow {
  id: string;
  itemName: string;
  rate: number;
  quantity: number;
  previousQuantity: number;
  totalQuantity: number;
  thisBill: number;
  previousBill: number;
  totalAmount: number;
}

export interface ApiConsumableRunningBill {
  vendorName: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  rows: ApiConsumableRunningBillRow[];
  summary: {
    quantity: number;
    previousQuantity: number;
    totalQuantity: number;
    thisBill: number;
    previousBill: number;
    totalAmount: number;
    thisBillAdvance: number;
    previousBillAdvance: number;
  };
}

export async function getConsumableRunningBill(params: {
  projectId: string;
  vendorId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<ApiConsumableRunningBill> {
  return api<ApiConsumableRunningBill>(`/api/consumable-items/running-bill?${new URLSearchParams(params)}`);
}

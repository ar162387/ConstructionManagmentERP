import { api } from './api';
import type {
  VendorInvoice,
  VendorInvoiceLineItem,
  VendorInvoicePayment,
} from '@/types';

export interface VendorInvoiceFromApi {
  id: string;
  vendorId: string;
  vendor?: { id: string; name: string } | null;
  vehicleNumber: string | null;
  biltyNumber: string | null;
  invoiceDate: string;
  invoiceNumber: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  lineItems?: Array<{
    id: string;
    consumableItemId: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
    consumableItem?: { id: string; name: string; unit?: { id: string; name: string; symbol: string | null } } | null;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    date: string;
    paymentMode: string | null;
    reference: string | null;
    createdBy?: { id: string; name: string } | null;
    createdAt: string;
  }>;
}

function toVendorInvoice(inv: VendorInvoiceFromApi): VendorInvoice {
  return {
    id: inv.id,
    vendorId: inv.vendorId,
    vehicleNumber: inv.vehicleNumber ?? '',
    biltyNumber: inv.biltyNumber ?? '',
    invoiceDate: new Date(inv.invoiceDate),
    totalAmount: inv.totalAmount,
    paidAmount: inv.paidAmount,
    remainingAmount: inv.remainingAmount,
    createdBy: typeof inv.createdBy === 'object' && inv.createdBy ? inv.createdBy.id : (inv as unknown as { createdBy: string }).createdBy ?? '',
    createdAt: new Date(inv.createdAt),
    invoiceNumber: inv.invoiceNumber ?? undefined,
  };
}

export function mapInvoiceWithDetails(inv: VendorInvoiceFromApi): VendorInvoice & {
  lineItems?: VendorInvoiceLineItem[];
  payments?: VendorInvoicePayment[];
} {
  const base = toVendorInvoice(inv);
  const lineItems: VendorInvoiceLineItem[] | undefined = inv.lineItems?.map((li) => ({
    id: li.id,
    invoiceId: inv.id,
    consumableItemId: li.consumableItemId,
    quantity: li.quantity,
    unitCost: li.unitCost,
    lineTotal: li.lineTotal,
  }));
  const payments: VendorInvoicePayment[] | undefined = inv.payments?.map((p) => ({
    id: p.id,
    invoiceId: inv.id,
    amount: p.amount,
    date: new Date(p.date),
    paymentMode: (p.paymentMode as VendorInvoicePayment['paymentMode']) ?? 'bank_transfer',
    reference: p.reference ?? undefined,
    createdBy: typeof p.createdBy === 'object' && p.createdBy ? p.createdBy.id : '',
  }));
  return { ...base, lineItems, payments };
}

export async function getVendorInvoices(vendorId?: string): Promise<VendorInvoice[]> {
  const params = vendorId ? { vendor_id: vendorId } : {};
  const { data } = await api.get<{ data: VendorInvoiceFromApi[] }>('/vendor-invoices', {
    params,
  });
  return data.data.map(toVendorInvoice);
}

export async function getVendorInvoice(id: string): Promise<
  VendorInvoice & {
    lineItems?: VendorInvoiceLineItem[];
    payments?: VendorInvoicePayment[];
  }
> {
  const { data } = await api.get<{ data: VendorInvoiceFromApi }>(
    `/vendor-invoices/${id}`
  );
  return mapInvoiceWithDetails(data.data);
}

export interface CreateVendorInvoicePayload {
  vendorId: string;
  vehicleNumber?: string;
  biltyNumber?: string;
  invoiceDate: string;
  invoiceNumber?: string;
  lineItems: Array<{
    consumableItemId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export async function createVendorInvoice(
  payload: CreateVendorInvoicePayload
): Promise<VendorInvoice & { lineItems?: VendorInvoiceLineItem[]; payments?: VendorInvoicePayment[] }> {
  const { data } = await api.post<{ data: VendorInvoiceFromApi }>(
    '/vendor-invoices',
    {
      vendor_id: payload.vendorId,
      vehicle_number: payload.vehicleNumber ?? null,
      bilty_number: payload.biltyNumber ?? null,
      invoice_date: payload.invoiceDate,
      invoice_number: payload.invoiceNumber ?? null,
      line_items: payload.lineItems.map((l) => ({
        consumable_item_id: l.consumableItemId,
        quantity: l.quantity,
        unit_cost: l.unitCost,
      })),
    }
  );
  return mapInvoiceWithDetails(data.data);
}

export interface UpdateVendorInvoicePayload {
  vehicleNumber?: string;
  biltyNumber?: string;
  invoiceDate?: string;
  invoiceNumber?: string;
  lineItems: Array<{
    consumableItemId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export async function updateVendorInvoice(
  id: string,
  payload: UpdateVendorInvoicePayload
): Promise<VendorInvoice & { lineItems?: VendorInvoiceLineItem[]; payments?: VendorInvoicePayment[] }> {
  const { data } = await api.put<{ data: VendorInvoiceFromApi }>(`/vendor-invoices/${id}`, {
    vehicle_number: payload.vehicleNumber ?? null,
    bilty_number: payload.biltyNumber ?? null,
    invoice_date: payload.invoiceDate ?? undefined,
    invoice_number: payload.invoiceNumber ?? null,
    line_items: payload.lineItems.map((l) => ({
      consumable_item_id: l.consumableItemId,
      quantity: l.quantity,
      unit_cost: l.unitCost,
    })),
  });
  return mapInvoiceWithDetails(data.data);
}

export async function deleteVendorInvoice(id: string): Promise<void> {
  await api.delete(`/vendor-invoices/${id}`);
}

export interface RecordPaymentPayload {
  amount: number;
  date: string;
  paymentMode: string;
  reference?: string;
}

export async function recordPayment(
  invoiceId: string,
  payload: RecordPaymentPayload
): Promise<{ payment: { id: string }; invoice: { id: string; paidAmount: number; remainingAmount: number } }> {
  const { data } = await api.post<{
    data: {
      payment: {
        id: string;
        vendorInvoiceId: string;
        amount: number;
        date: string;
        paymentMode: string | null;
        reference: string | null;
        createdBy: { id: string; name: string } | null;
        createdAt: string;
      };
      invoice: {
        id: string;
        paidAmount: number;
        remainingAmount: number;
      };
    };
  }>(`/vendor-invoices/${invoiceId}/payments`, {
    amount: payload.amount,
    date: payload.date,
    payment_mode: payload.paymentMode,
    reference: payload.reference ?? null,
  });
  return {
    payment: { id: data.data.payment.id },
    invoice: data.data.invoice,
  };
}

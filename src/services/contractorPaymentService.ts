import { api } from './api';
import type { ContractorPayment } from '@/types';

export interface RecordPaymentPayload {
  amount: number;
  paymentDate: string;
  paymentMode?: string;
  reference?: string;
}

export async function recordPayment(
  contractorId: string,
  payload: RecordPaymentPayload
): Promise<ContractorPayment> {
  const { data } = await api.post<{ data: ContractorPayment }>(
    `/contractors/${contractorId}/payments`,
    {
      amount: payload.amount,
      payment_date: payload.paymentDate,
      payment_mode: payload.paymentMode ?? null,
      reference: payload.reference ?? null,
    }
  );
  return data.data;
}

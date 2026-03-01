/**
 * Project Ledger API service
 */

import { api } from "./api";

export type ProjectLedgerRowType = "bank_outflow" | "manual_adjustment";

export interface ProjectLedgerRow {
  type: ProjectLedgerRowType;
  id: string;
  date: string;
  amount: number;
  source?: string;
  destination?: string;
  referenceId?: string;
  remarks?: string;
}

export interface GetProjectLedgerResult {
  rows: ProjectLedgerRow[];
  total: number;
  balance: number;
  projectName?: string;
}

export interface CreateProjectBalanceAdjustmentInput {
  date: string;
  amount: number;
  remarks?: string;
}

export interface UpdateProjectBalanceAdjustmentInput {
  date?: string;
  amount?: number;
  remarks?: string;
}

export async function getProjectLedger(
  projectId: string,
  params?: { page?: number; pageSize?: number }
): Promise<GetProjectLedgerResult> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set("page", String(params.page));
  if (params?.pageSize != null) searchParams.set("pageSize", String(params.pageSize));
  const q = searchParams.toString();
  return api<GetProjectLedgerResult>(`/api/projects/${projectId}/ledger${q ? `?${q}` : ""}`);
}

export async function createProjectBalanceAdjustment(
  projectId: string,
  input: CreateProjectBalanceAdjustmentInput
): Promise<{ id: string; date: string; amount: number; remarks?: string }> {
  return api<{ id: string; date: string; amount: number; remarks?: string }>(
    `/api/projects/${projectId}/ledger/balance-adjustments`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function updateProjectBalanceAdjustment(
  projectId: string,
  adjustmentId: string,
  input: UpdateProjectBalanceAdjustmentInput
): Promise<{ id: string; date: string; amount: number; remarks?: string }> {
  return api<{ id: string; date: string; amount: number; remarks?: string }>(
    `/api/projects/${projectId}/ledger/balance-adjustments/${adjustmentId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

export async function deleteProjectBalanceAdjustment(
  projectId: string,
  adjustmentId: string
): Promise<void> {
  return api<void>(`/api/projects/${projectId}/ledger/balance-adjustments/${adjustmentId}`, {
    method: "DELETE",
  });
}

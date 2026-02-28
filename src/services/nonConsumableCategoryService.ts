import { api } from "./api";

export interface ApiNonConsumableCategory {
  id: string;
  name: string;
}

export interface CreateNonConsumableCategoryInput {
  name: string;
}

export async function listNonConsumableCategories(): Promise<ApiNonConsumableCategory[]> {
  return api<ApiNonConsumableCategory[]>("/api/non-consumable-categories");
}

export async function createNonConsumableCategory(
  input: CreateNonConsumableCategoryInput
): Promise<ApiNonConsumableCategory> {
  return api<ApiNonConsumableCategory>("/api/non-consumable-categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

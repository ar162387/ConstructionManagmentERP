import { NonConsumableCategory } from "../models/NonConsumableCategory.js";

export interface NonConsumableCategoryPayload {
  id: string;
  name: string;
}

export async function listNonConsumableCategories(): Promise<NonConsumableCategoryPayload[]> {
  const docs = await NonConsumableCategory.find().sort({ name: 1 }).lean();
  return docs.map((d) => ({
    id: d._id.toString(),
    name: d.name,
  }));
}

export interface CreateNonConsumableCategoryInput {
  name: string;
}

export async function createNonConsumableCategory(
  input: CreateNonConsumableCategoryInput
): Promise<NonConsumableCategoryPayload> {
  const name = (input.name || "").trim();
  if (!name) throw new Error("Category name is required");

  const existing = await NonConsumableCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } }).lean();
  if (existing) throw new Error(`Category "${name}" already exists`);

  const doc = await NonConsumableCategory.create({ name });
  return {
    id: doc._id.toString(),
    name: doc.name,
  };
}

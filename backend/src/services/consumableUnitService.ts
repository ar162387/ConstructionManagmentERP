import { ConsumableUnit } from "../models/ConsumableUnit.js";
import { ConsumableItem } from "../models/ConsumableItem.js";

export async function listConsumableUnits() {
  const [docs, legacyUnits] = await Promise.all([
    ConsumableUnit.find().sort({ name: 1 }).lean(),
    ConsumableItem.distinct("unit"),
  ]);
  const known = new Map(docs.map((doc) => [doc.name.toLowerCase(), { id: doc._id.toString(), name: doc.name }]));
  for (const name of legacyUnits.map((unit) => unit.trim()).filter(Boolean)) {
    if (!known.has(name.toLowerCase())) known.set(name.toLowerCase(), { id: `legacy:${name}`, name });
  }
  return [...known.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createConsumableUnit(input: { name: string }) {
  const name = input.name?.trim();
  if (!name) throw new Error("Unit name is required");
  const existing = await ConsumableUnit.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } }).lean();
  if (existing) throw new Error(`Unit "${name}" already exists`);
  const doc = await ConsumableUnit.create({ name });
  return { id: doc._id.toString(), name: doc.name };
}

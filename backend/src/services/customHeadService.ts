import { CustomHead } from "../models/CustomHead.js";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
export interface CustomHeadPayload { id: string; name: string }
export async function listCustomHeads(): Promise<CustomHeadPayload[]> {
  return (await CustomHead.find().sort({ name: 1 }).lean()).map((head) => ({ id: head._id.toString(), name: head.name }));
}
export async function findOrCreateCustomHead(name: string): Promise<CustomHeadPayload> {
  const cleaned = name?.trim();
  if (!cleaned) throw new Error("Head is required");
  const normalizedName = normalize(cleaned);
  const head = await CustomHead.findOneAndUpdate({ normalizedName }, { $setOnInsert: { name: cleaned, normalizedName } }, { new: true, upsert: true, setDefaultsOnInsert: true });
  return { id: head._id.toString(), name: head.name };
}

import mongoose from "mongoose";
import { ConsumableItem } from "../models/ConsumableItem.js";
import { ItemLedgerEntry } from "../models/ItemLedgerEntry.js";
import { Vendor } from "../models/Vendor.js";
import { VendorPayment } from "../models/VendorPayment.js";
import { User } from "../models/User.js";

export interface ConsumableRunningBillRow {
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

export interface ConsumableRunningBillResult {
  vendorName: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  rows: ConsumableRunningBillRow[];
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function resolveProjectId(actor: { userId: string; role: string }, requested?: string) {
  if (actor.role !== "site_manager") return requested;
  const user = await User.findById(actor.userId).select("assignedProjectId").lean();
  return user?.assignedProjectId?.toString();
}

export async function getConsumableRunningBill(
  actor: { userId: string; role: string },
  input: { projectId?: string; vendorId: string; periodStart: string; periodEnd: string }
): Promise<ConsumableRunningBillResult> {
  if (!DATE_RE.test(input.periodStart) || !DATE_RE.test(input.periodEnd)) throw new Error("Dates must be YYYY-MM-DD");
  if (input.periodStart > input.periodEnd) throw new Error("Start date must be on or before end date");
  const projectId = await resolveProjectId(actor, input.projectId);
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) throw new Error("Project is required");
  if (!mongoose.Types.ObjectId.isValid(input.vendorId)) throw new Error("Vendor is required");

  const vendor = await Vendor.findOne({ _id: input.vendorId, projectId }).select("name").lean();
  if (!vendor) throw new Error("Vendor not found for this project");
  const purchases = await ItemLedgerEntry.find({
    projectId,
    vendorId: input.vendorId,
    date: { $lte: input.periodEnd },
  }).lean();
  const itemIds = [...new Set(purchases.map((entry) => entry.itemId.toString()))];
  const items = await ConsumableItem.find({ _id: { $in: itemIds } }).select("name").lean();
  const nameById = new Map(items.map((item) => [item._id.toString(), item.name]));

  type Bucket = { id: string; itemName: string; rate: number; quantity: number; previousQuantity: number; thisBill: number; previousBill: number };
  const grouped = new Map<string, Bucket>();
  for (const entry of purchases) {
    const itemId = entry.itemId.toString();
    const rate = entry.unitPrice;
    const id = `${itemId}:${rate}`;
    const bucket = grouped.get(id) ?? {
      id,
      itemName: nameById.get(itemId) ?? "Unknown item",
      rate,
      quantity: 0,
      previousQuantity: 0,
      thisBill: 0,
      previousBill: 0,
    };
    if (entry.date < input.periodStart) {
      bucket.previousQuantity += entry.quantity;
      bucket.previousBill += entry.totalPrice;
    } else {
      bucket.quantity += entry.quantity;
      bucket.thisBill += entry.totalPrice;
    }
    grouped.set(id, bucket);
  }

  const rows = [...grouped.values()]
    .map((row) => ({
      ...row,
      totalQuantity: row.quantity + row.previousQuantity,
      totalAmount: row.thisBill + row.previousBill,
    }))
    .sort((a, b) => a.itemName.localeCompare(b.itemName) || a.rate - b.rate);

  const payments = await VendorPayment.find({ vendorId: input.vendorId, date: { $lte: input.periodEnd } }).lean();
  let previousBillAdvance = 0;
  let thisBillAdvance = 0;
  for (const payment of payments) {
    if (payment.date < input.periodStart) previousBillAdvance += payment.amount;
    else thisBillAdvance += payment.amount;
  }
  const summary = rows.reduce(
    (total, row) => ({
      quantity: total.quantity + row.quantity,
      previousQuantity: total.previousQuantity + row.previousQuantity,
      totalQuantity: total.totalQuantity + row.totalQuantity,
      thisBill: total.thisBill + row.thisBill,
      previousBill: total.previousBill + row.previousBill,
      totalAmount: total.totalAmount + row.totalAmount,
      thisBillAdvance,
      previousBillAdvance,
    }),
    { quantity: 0, previousQuantity: 0, totalQuantity: 0, thisBill: 0, previousBill: 0, totalAmount: 0, thisBillAdvance, previousBillAdvance }
  );
  return { vendorName: vendor.name, projectId, periodStart: input.periodStart, periodEnd: input.periodEnd, rows, summary };
}

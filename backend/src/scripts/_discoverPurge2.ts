import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/builderp";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const projects = await db.collection("projects").find({ name: { $in: ["Green Corridor", "Rasool Pump"] } }).toArray();

  for (const p of projects) {
    console.log(`\n########## ${p.name} (${p._id}) ##########`);
    const tx = await db.collection("banktransactions").find({ projectId: p._id }).toArray();
    for (const t of tx) {
      const acc = await db.collection("bankaccounts").findOne({ _id: t.accountId });
      console.log(` [${t.date}] ${t.type.toUpperCase()} ${t.amount} via "${acc?.name}" | ${t.source} -> ${t.destination} | mode=${t.mode} | ref=${t.referenceId ?? ""} | remarks=${t.remarks ?? ""}`);
    }
  }

  console.log("\n\n=== All bank accounts (company-wide) ===");
  const accs = await db.collection("bankaccounts").find({}).toArray();
  for (const a of accs) console.log(` "${a.name}" (${a._id}) currentBalance=${a.currentBalance} totalInflow=${a.totalInflow} totalOutflow=${a.totalOutflow}`);

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });

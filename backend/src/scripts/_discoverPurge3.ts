import "dotenv/config";
import mongoose from "mongoose";
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/builderp";
async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const projects = await db.collection("projects").find({ name: { $in: ["Green Corridor", "Rasool Pump"] } }).toArray();
  const ids = projects.map((p) => p._id);
  for (const coll of ["contractors", "employees", "machines", "vendors", "consumableitems"]) {
    console.log(`\n--- ${coll} ---`);
    const docs = await db.collection(coll).find({ projectId: { $in: ids } }).toArray();
    for (const d of docs) {
      const proj = projects.find((p) => p._id.toString() === d.projectId.toString());
      console.log(` ${d.name} (project: ${proj?.name})`);
    }
  }
  console.log("\n--- projectbalanceadjustments ---");
  const adj = await db.collection("projectbalanceadjustments").find({ projectId: { $in: ids } }).toArray();
  for (const a of adj) console.log(a);
  console.log("\n--- auditlogs referencing target projects ---");
  const idStrs = ids.map(i=>i.toString());
  const logs = await db.collection("auditlogs").find({ projectId: { $in: idStrs } }).toArray();
  for (const l of logs) console.log(` [${l.createdAt}] ${l.userName} ${l.action} ${l.module}: ${l.description}`);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });

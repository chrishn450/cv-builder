import fs from "node:fs";
import { parse } from "node:csv-parse/sync";

const [,, endpoint, secret, csvPath] = process.argv;
if (!endpoint || !secret || !csvPath) {
  console.error("Usage: node seed_from_csv.mjs <seed_endpoint_url> <seed_secret> <codes.csv>");
  process.exit(1);
}

const csv = fs.readFileSync(csvPath, "utf8");
const records = parse(csv, { columns: true, skip_empty_lines: true });
const codes = records.map(r => String(r.code).trim()).filter(Boolean);

const BATCH = 500;
for (let i = 0; i < codes.length; i += BATCH) {
  const batch = codes.slice(i, i + BATCH);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, codes: batch }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    console.error("Seed failed at batch", i/BATCH, "status", res.status, data);
    process.exit(1);
  }
  console.log(`Seeded ${Math.min(i+BATCH, codes.length)}/${codes.length}`);
}
console.log("Done.");

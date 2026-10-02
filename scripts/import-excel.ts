/** Command-line version of Settings > Import old Excel:  npm run import:excel -- <file.xlsx> */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { importWorkbook } from "../src/lib/excel-import";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run import:excel -- <file.xlsx>");
  process.exit(1);
}
const db = new PrismaClient();
importWorkbook(db, readFileSync(file))
  .then(({ imported, skipped }) => console.log(`Imported ${imported} orders, skipped ${skipped} already imported.`))
  .finally(() => db.$disconnect());

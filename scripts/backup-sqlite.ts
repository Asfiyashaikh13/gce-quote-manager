import fs from "fs";
import path from "path";

async function main() {
  let dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
  if (!fs.existsSync(dbPath)) {
    dbPath = path.resolve(process.cwd(), "dev.db");
  }
  const backupDir = path.resolve(process.cwd(), "backups");

  if (!fs.existsSync(dbPath)) {
    console.error("Error: SQLite database file (dev.db) does not exist.");
    process.exit(1);
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "_");

  const backupPath = path.join(backupDir, `dev_${timestamp}.db`);

  fs.copyFileSync(dbPath, backupPath);

  const stats = fs.statSync(backupPath);
  console.log(`✓ SQLite backup created successfully!`);
  console.log(`  File: ${backupPath}`);
  console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`  Timestamp: ${now.toLocaleString()}`);
}

main().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});

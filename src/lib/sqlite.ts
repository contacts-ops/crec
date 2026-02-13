import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const dbPath = path.join(process.cwd(), "database", "auth.db");
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin'
  );
`);

export function getUserByIdentifier(identifier: string) {
  const stmt = db.prepare("SELECT id, identifier, password_hash as passwordHash, role FROM users WHERE identifier = ?");
  return stmt.get(identifier) as { id: number; identifier: string; passwordHash: string; role: string } | undefined;
}

export function createUser(identifier: string, plainPassword: string, role: string = "admin") {
  const hash = bcrypt.hashSync(plainPassword, 10);
  const stmt = db.prepare("INSERT INTO users (identifier, password_hash, role) VALUES (?, ?, ?)");
  const info = stmt.run(identifier, hash, role);
  return info.lastInsertRowid;
}



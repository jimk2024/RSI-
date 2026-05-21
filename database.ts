import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbPath = path.join(process.cwd(), 'data');
try {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
  fs.accessSync(dbPath, fs.constants.W_OK);
} catch (e) {
  dbPath = '/tmp/data';
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }
}

const db = new Database(path.join(dbPath, 'app.db'));

// Initialize database schema for users and licenses
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    membership_expiry DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS used_licenses (
    code TEXT PRIMARY KEY,
    days INTEGER NOT NULL,
    used_by INTEGER,
    used_at DATETIME,
    FOREIGN KEY(used_by) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS transactions (
    tx_hash TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

// Import crypto for hashing
import crypto from 'crypto';

// Removed license pre-generation as we use algorithm-based licenses now.
export default db;

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;
const customDbPath = process.env.DATABASE_PATH;

if (customDbPath) {
  const absoluteDbPath = path.isAbsolute(customDbPath) 
    ? customDbPath 
    : path.join(process.cwd(), customDbPath);
  
  const dbDir = path.dirname(absoluteDbPath);
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(absoluteDbPath);
  } catch (e) {
    console.error(`Failed to initialize database at specified DATABASE_PATH (${absoluteDbPath}):`, e);
    // Fallback if custom path fails
    let fallbackPath = '/tmp/data';
    if (!fs.existsSync(fallbackPath)) {
      fs.mkdirSync(fallbackPath, { recursive: true });
    }
    db = new Database(path.join(fallbackPath, 'app.db'));
  }
} else {
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
  db = new Database(path.join(dbPath, 'app.db'));
}

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

// Add last_login_at column if it does not exist
try {
  db.exec("ALTER TABLE users ADD COLUMN last_login_at DATETIME;");
} catch (e: any) {
  // Ignore error if column already exists (duplicate column name)
  if (!e.message.includes("duplicate column name")) {
    console.error("Error altering users table:", e);
  }
}

// Import crypto for hashing
import crypto from 'crypto';

// Removed license pre-generation as we use algorithm-based licenses now.
export default db;

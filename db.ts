import { Database } from "jsr:@db/sqlite@0.12";

export function initDb(db: Database) {
  db.prepare(
    `
	CREATE TABLE IF NOT EXISTS user (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  username TEXT,
	  password TEXT
	);
  `,
  ).run();

  db.prepare(
    `
	CREATE TABLE IF NOT EXISTS session (
	  id TEXT NOT NULL PRIMARY KEY,
    long_lived INT DEFAULT FALSE,
    user_id INTEGER NOT NULL REFERENCES user(id),
	  expiry_timestamp TEXT NOT NULL
	);
  `,
  ).run();

  db.prepare(
    `
	CREATE TABLE IF NOT EXISTS config (
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
	  key TEXT UNIQUE,
	  value TEXT
	);
  `,
  ).run();
}

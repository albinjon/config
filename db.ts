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
	  id INTEGER PRIMARY KEY AUTOINCREMENT,
    long_lived INT DEFAULT FALSE,
	  token TEXT,
	  expiry_timestamp DATETIME DEFAULT (datetime('now', '+30 minutes'))
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

  db.prepare("INSERT INTO user (username, password) VALUES (?, ?)").run(
    "albin",
    "testar",
  );
}

import { Database } from "@db/sqlite";
import { initDb } from "./db.ts";
import { ConfigPair } from "./config.ts";

export class Dao {
  private db: Database;
  constructor() {
    this.db = new Database("config.db");
    initDb(this.db);
  }

  public getSessionExpiry(token: string) {
    return this.db
      .prepare("SELECT expiry_timestamp FROM session WHERE token = ?")
      .get<{ timestamp: number }>(token);
  }

  public getSessions() {
    const result = this.db.prepare("SELECT * FROM session").all();
    return result;
  }

  public deleteExpiredSessions() {
    return this.db
      .prepare("DELETE FROM session WHERE expiry_timestamp < CURRENT_TIMESTAMP")
      .run();
  }

  public createSession(sessionToken: string, expiryTimestamp: number) {
    return this.db
      .prepare("INSERT INTO session (token, expiry_timestamp) VALUES (?, ?, ?)")
      .run(sessionToken, expiryTimestamp);
  }

  public updateSessionToken(token: string) {
    return this.db
      .prepare("UPDATE SET token = (token) FROM sessions (?)")
      .run(token);
  }

  public createUser(username: string, passwordHash: string) {
    return this.db
      .prepare("INSERT INTO user (username, password) VALUES (?, ?)")
      .run(username, passwordHash);
  }

  public getUser(username: string) {
    return this.db
      .prepare("SELECT id, password FROM user WHERE username = ?")
      .get(username);
  }

  public setConfig(key: string, value: string) {
    this.db
      .prepare(
        `INSERT INTO config(key, value)
       VALUES(?, ?)
       ON CONFLICT(key)
       DO UPDATE SET value = excluded.value`,
      )
      .run(key, value);
  }

  public getConfig(key: string) {
    const pair = this.db
      .prepare("SELECT value FROM config WHERE key = ?")
      .get<ConfigPair>(key);
    return pair ? [pair] : [];
  }

  public getFullConfig() {
    const rows = this.db
      .prepare("SELECT key, value FROM config")
      .all<ConfigPair>();
    return rows;
  }

  public close() {
    this.db.close();
  }
}

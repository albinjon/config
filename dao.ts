import { Database } from "@db/sqlite";
import { initDb } from "./db.ts";
import { ConfigPair } from "./config.ts";
import { Session, User } from "./auth.ts";

export class Dao {
  private db: Database;
  constructor() {
    this.db = new Database("./config.db");
    initDb(this.db);
  }

  public getSession(
    sessionId: string,
  ): { user: User; session: Session } | undefined {
    const result = this.db
      .prepare(
        "SELECT session.id AS session_id, session.user_id, session.expiry_timestamp, session.long_lived, user.id, user.username FROM session INNER JOIN user ON user.id = session.user_id WHERE session.id = ?",
      )
      .get<{
        session_id: string;
        user_id: number;
        long_lived: boolean;
        expiry_timestamp: string;
        username: string;
      }>(sessionId);
    if (!result) return;
    const user: User = {
      id: result.user_id,
      username: result.username,
    };
    const session: Session = {
      id: result.session_id,
      // INFO: The SQLite client library has problems with > 32bit integers,
      // which effectively overflows the INTEGER, even though it's supposed
      // to be able to handle 64bit ints. Instead it's now saved as text.
      expiryTimestamp: Number(result.expiry_timestamp as unknown as string),
      longLived: Boolean(result.long_lived),
      userId: result.user_id,
    };
    return { user, session };
  }

  public getSessions() {
    const result = this.db.prepare("SELECT * FROM session").all();
    return result;
  }

  public createSession(
    userId: number,
    sessionId: string,
    expiryTimestamp: number,
  ) {
    return this.db
      .prepare(
        "INSERT INTO session (user_id, id, expiry_timestamp) VALUES (?, ?, ?)",
      )
      .run(userId, sessionId, expiryTimestamp.toString());
  }

  public updateSessionToken(sessionId: string, expiryTimestamp: number) {
    return this.db
      .prepare("UPDATE session SET expiry_timestamp = ? WHERE id = ?")
      .run(expiryTimestamp.toString(), sessionId);
  }

  public createUser(username: string, passwordHash: string) {
    return this.db
      .prepare("INSERT INTO user (username, password) VALUES (?, ?)")
      .run(username, passwordHash);
  }

  public getUser(username: string) {
    return this.db
      .prepare("SELECT id, password FROM user WHERE username = ?")
      .get<{
        id: number;
        password: string;
      }>(username);
  }

  public getUsers() {
    return this.db.prepare("SELECT id, username FROM user").all();
  }

  public deleteUser(username: string) {
    return this.db.prepare(`DELETE FROM user WHERE username = ?`).run(username);
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

  public deleteConfig(key: string) {
    return this.db.prepare(`DELETE FROM config WHERE key = ?`).run(key);
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

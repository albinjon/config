import { Database } from "jsr:@db/sqlite@0.12";
import { initDb } from "./db.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

export interface Credentials {
  username: string;
  password: string;
}

// INFO: For long lived access tokens, the expiry time is three months,
// if they are used, then they will be refreshed, otherwise one will have
// to create new ones.
const ONE_MONTH_IN_MS = 604_800_000 * 4;
const LONG_LIVED_AT_EXPIRATION_TIME = ONE_MONTH_IN_MS * 3;

export class AuthDao {
  private db: Database;
  constructor() {
    this.db = new Database("config.db");
    initDb(this.db);
  }

  public validate(token: string) {
    const expiry = this.db
      .prepare("SELECT expiry_timestamp FROM session WHERE token = ?")
      .get<{ timestamp: number }>(token);
    if (!expiry) return false;
    const hasExpired = Date.now() > expiry?.timestamp;
    if (hasExpired) return false;
    if (expiry.timestamp < Date.now() + ONE_MONTH_IN_MS) {
      console.log("updating");

      this.db
        .prepare("UPDATE SET token = (token) FROM sessions (?)")
        .run(token);
    }
    return true;
  }

  public getSessions() {
    const result = this.db.prepare("SELECT * FROM session").all();

    return result;
  }

  private createSession(longLived?: boolean) {
    const expiryTime = longLived
      ? LONG_LIVED_AT_EXPIRATION_TIME
      : ONE_MONTH_IN_MS;
    const timestamp = Date.now();
    const sessionToken = crypto.randomUUID();
    // INFO: This will clean up expired sessions.
    this.db
      .prepare("DELETE FROM session WHERE expiry_timestamp < CURRENT_TIMESTAMP")
      .run(timestamp);
    this.db
      .prepare("INSERT INTO session (token, expiry_timestamp) VALUES (?, ?, ?)")
      .run(sessionToken, timestamp + expiryTime);
    return sessionToken;
  }

  public async createUser(credentials: Credentials) {
    const { username, password } = credentials;
    const hash = await bcrypt.hash(password);
    this.db
      .prepare("INSERT INTO user (username, password) VALUES (?, ?)")
      .run(username, hash);
  }

  public authenticate(credentials: Credentials) {
    const { username, password } = credentials;
    console.log("getting user");
    const result = this.db
      .prepare("SELECT id, password FROM user WHERE username = ?")
      .get(username);
    console.log(result);
    if (!result) {
      return false;
    }
    // const matches = await bcrypt.compare(password, result.password);
    // if (!matches) {
    //   return false;
    // }
    return this.createSession();
  }

  public close() {
    this.db.close();
  }
}

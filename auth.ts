import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { Dao } from "./dao.ts";

export interface Credentials {
  username: string;
  password: string;
}

// INFO: For long lived access tokens, the expiry time is three months,
// if they are used, then they will be refreshed, otherwise one will have
// to create new ones.
const ONE_MONTH_IN_MS = 604_800_000 * 4;
const LONG_LIVED_AT_EXPIRATION_TIME = ONE_MONTH_IN_MS * 3;

export class Auth {
  private dao: Dao;
  constructor(dao: Dao) {
    this.dao = dao;
  }

  public validate(token: string) {
    const expiry = this.dao.getSessionExpiry(token);
    if (!expiry) return false;
    const hasExpired = Date.now() > expiry?.timestamp;
    if (hasExpired) return false;
    if (expiry.timestamp < Date.now() + ONE_MONTH_IN_MS) {
      console.log("updating token");
      this.dao.updateSessionToken(token);
    }
    return true;
  }

  public getSessions() {
    return this.dao.getSessions();
  }

  private createSession(longLived?: boolean) {
    const expiryTime = longLived
      ? LONG_LIVED_AT_EXPIRATION_TIME
      : ONE_MONTH_IN_MS;
    const timestamp = Date.now();
    const expiryTimestamp = timestamp + expiryTime;
    const sessionToken = crypto.randomUUID();
    this.dao.deleteExpiredSessions();
    this.dao.createSession(sessionToken, expiryTimestamp);
    return sessionToken;
  }

  public async createUser(credentials: Credentials) {
    const { username, password } = credentials;
    const hash = await bcrypt.hash(password);
    this.dao.createUser(username, hash);
  }

  public authenticate(credentials: Credentials) {
    const { username, password } = credentials;
    console.log("getting user");
    const result = this.dao.getUser(username);
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
}

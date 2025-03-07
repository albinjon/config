import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { Dao } from "./dao.ts";

export interface Credentials {
  username: string;
  password: string;
}

export interface Session {
  id: string;
  userId: number;
  expiryTimestamp: number;
  longLived: boolean;
}

export interface User {
  id: number;
  username: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

export interface TokenResponse {
  token: string;
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

  public async authenticate(
    credentials: Credentials,
  ): Promise<TokenResponse | undefined> {
    const { username, password } = credentials;
    const result = this.dao.getUser(username);
    if (!result) {
      return;
    }
    const matches = await bcrypt.compare(password, result.password);
    if (!matches) {
      return;
    }
    const token = await this.createSession(result.id);
    return { token };
  }

  public async createLongLivedToken(
    requesterUserId: number,
  ): Promise<TokenResponse> {
    const token = await this.createSession(requesterUserId, true);
    return { token };
  }

  public async getUserSession(
    token: string,
  ): Promise<AuthResponse | undefined> {
    const hashedToken = await this.hashSessionToken(token);
    const row = this.dao.getSession(hashedToken);
    if (!row) {
      console.error("Could not find session in table.");
      return;
    }
    return row;
  }

  public async validate(token: string): Promise<AuthResponse | undefined> {
    const result = await this.getUserSession(token);
    if (!result) return;
    const { user, session } = result;
    const hasExpired = Date.now() > session.expiryTimestamp;
    if (hasExpired) {
      console.error("Session has expired.");
      return;
    }
    if (session.expiryTimestamp - Date.now() < ONE_MONTH_IN_MS / 2) {
      const updatedExpiry = Date.now() + ONE_MONTH_IN_MS;
      this.dao.updateSessionToken(token, updatedExpiry);
      console.log("Updated session.");
    }
    return { user, session };
  }

  public async getUserId(token: string): Promise<number | undefined> {
    const result = await this.getUserSession(token);
    if (!result) return;
    const { user } = result;
    return user.id;
  }

  private async createSession(userId: number, longLived?: boolean) {
    const expiryTime = longLived
      ? LONG_LIVED_AT_EXPIRATION_TIME
      : ONE_MONTH_IN_MS;
    const timestamp = Date.now();
    const expiryTimestamp = timestamp + expiryTime;
    const sessionToken = crypto.randomUUID();
    const sessionId = await this.hashSessionToken(sessionToken);
    this.dao.createSession(userId, sessionId, expiryTimestamp);
    return sessionToken;
  }

  private async hashSessionToken(sessionToken: string) {
    const buffer = new TextEncoder().encode(sessionToken);
    const hashBuffer = await crypto.subtle.digest({ name: "sha-256" }, buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  public async createUser(credentials: Credentials) {
    const { username, password } = credentials;
    const hash = await bcrypt.hash(password);
    this.dao.createUser(username, hash);
  }

  public getUsers() {
    return this.dao.getUsers();
  }

  public async deleteUser(username: string, token: string) {
    const isValid = await this.validate(token);
    if (!isValid) throw new Error("Invalid user or token.");
    return this.dao.deleteUser(username);
  }
}

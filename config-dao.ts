import { Database } from "jsr:@db/sqlite@0.12";
import { initDb } from "./db.ts";

export interface ConfigPair {
  key: string;
  value: string;
}

export class ConfigDao {
  private db: Database;
  constructor() {
    this.db = new Database("config.db");
    initDb(this.db);
  }

  public getConfig(key?: string) {
    if (!key) {
      const rows = this.db
        .prepare("SELECT key, value FROM config")
        .all<ConfigPair>()
        .filter((it) => it !== undefined);
      return rows;
    }
    const pair = this.db
      .prepare("SELECT value FROM config WHERE key = ?")
      .get<ConfigPair>(key);
    return pair ? [pair] : [];
  }

  public setConfig(pair: ConfigPair) {
    this.db
      .prepare("INSERT INTO config (key, value) VALUES (?, ?)")
      .run(pair.key, pair.value);
  }

  public close() {
    this.db.close();
  }
}

import { Dao } from "./dao.ts";

export interface ConfigPair {
  key: string;
  value: string;
}

export class Config {
  private dao: Dao;
  constructor(dao: Dao) {
    this.dao = dao;
  }

  public getConfig(key?: string) {
    if (!key) {
      return this.dao.getFullConfig();
    }
    return this.dao.getConfig(key);
  }

  public deleteConfig(key: string) {
    return this.dao.deleteConfig(key);
  }

  public setConfig(pair: ConfigPair) {
    this.dao.setConfig(pair.key, pair.value);
  }
}

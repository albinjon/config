import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { ConfigDao, ConfigPair } from "./config-dao.ts";
import { AuthDao } from "./auth-dao.ts";
import { Credentials } from "./auth-dao.ts";

const app = new Hono();
const config = new ConfigDao();
const auth = new AuthDao();

app.post("/api/auth", async (c) => {
  const body = await c.req.json();
  const credentials: Credentials = {
    username: body.username as string,
    password: body.password as string,
  };
  const result = auth.authenticate(credentials);
  console.log(result);
  return c.status(201);
});

app.get("/api/sessions", (c) => {
  const res = auth.getSessions();
  return c.json(res);
});

app.use(
  "/api/config/*",
  basicAuth({
    invalidUserMessage: "YOU SHALL NOT PASS",
    verifyUser: (_, __, c) => {
      const token = c.req.header("Authorization");
      if (!token) return false;
      return auth.validate(token);
    },
  }),
);

app.get("/api/config/all", (c) => {
  const pairs = config.getConfig();
  return c.json(pairs);
});

app.get("/api/config/:key", (c) => {
  const pair = config.getConfig(c.req.param("key")).at(0);
  if (!pair) {
    throw new Error(`No value found for config key: ${c.req.param("key")}`);
  }

  return c.text(pair.value);
});

// TODO: Make sure this is protected
app.post("/api/config", async (c) => {
  const body = await c.req.json();
  const configPair: ConfigPair = {
    key: body.key as string,
    value: body.value as string,
  };
  config.setConfig(configPair);
  return c.status(201);
});

Deno.serve({ port: 3232 }, app.fetch);

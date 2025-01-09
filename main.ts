import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { cors } from "hono/cors";
import { Config, ConfigPair } from "./config.ts";
import { Auth } from "./auth.ts";
import { Credentials } from "./auth.ts";
import { Dao } from "./dao.ts";

const app = new Hono();
const dao = new Dao();
const config = new Config(dao);
const auth = new Auth(dao);

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:8081"],
  }),
);
app.post("/api/auth", async (c) => {
  const body = await c.req.json();
  const credentials: Credentials = {
    username: body.username as string,
    password: body.password as string,
  };
  const result = await auth.authenticate(credentials);
  return c.json({ token: result });
});

app.post("/api/create-user", async (c) => {
  const body = await c.req.json();
  const credentials: Credentials = {
    username: body.username as string,
    password: body.password as string,
  };
  await auth.createUser(credentials);
  return c.text("OK");
});

app.get("/api/sessions", (c) => {
  const res = auth.getSessions();
  return c.json(res);
});

app.get("/api/validate/:sessionId", async (c) => {
  const id = c.req.param("sessionId");
  const res = await auth.validate(id);
  return c.json(res);
});

// app.use(
//   "/api/config/*",
//   basicAuth({
//     invalidUserMessage: "YOU SHALL NOT PASS",
//     verifyUser: (_, __, c) => {
//       const token = c.req.header("Authorization");
//       if (!token) return false;
//       return auth.validate(token);
//     },
//   }),
// );

app.get("/api/config/all", (c) => {
  const pairs = config.getConfig();
  console.log(pairs);
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
  c.status(201);
  const pairs = config.getConfig();
  return c.json(pairs);
});

Deno.serve({ port: 3232 }, app.fetch);

globalThis.addEventListener("unload", () => {
  dao.close();
});

Deno.addSignalListener("SIGINT", () => {
  Deno.exit();
});

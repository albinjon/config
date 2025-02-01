import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { Config, ConfigPair } from "./config.ts";
import { Auth } from "./auth.ts";
import { Credentials } from "./auth.ts";
import { Dao } from "./dao.ts";
import { HTTPException } from "hono/http-exception";

const app = new Hono();
const dao = new Dao();
const config = new Config(dao);
const auth = new Auth(dao);

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5556"],
  }),
);

app.use(
  "/api/config/*",
  bearerAuth({
    verifyToken: async (token, _) => {
      const result = await auth.validate(token);
      return Boolean(result);
    },
  }),
);

app.use(
  "/*",
  csrf({
    origin: ["http://localhost:5556"],
  }),
);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.notFound();
});

app.post("/api/auth", async (c) => {
  const body = await c.req.json();
  const credentials: Credentials = {
    username: body.username as string,
    password: body.password as string,
  };
  const res = await auth.authenticate(credentials);
  console.log(res);
  return c.json(res);
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

app.post("/api/delete-user", async (c) => {
  const body = await c.req.json();
  const credentials: Credentials = {
    username: body.username as string,
    password: body.password as string,
  };
  await auth.deleteUser(credentials);
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

app.delete("/api/config", async (c) => {
  const body = await c.req.json();
  console.log(body);
  config.deleteConfig(body.key as string);

  c.status(200);
  return c.text("OK");
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
  return c.text("OK");
});

Deno.serve({ port: 3232 }, app.fetch);

globalThis.addEventListener("unload", () => {
  dao.close();
});

Deno.addSignalListener("SIGINT", () => {
  Deno.exit();
});

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
    origin: [
      "https://configura-sleek.onrender.com",
      "https://config.jonfelt.se",
      "http://localhost:5556",
    ],
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
    origin: [
      "https://configura-sleek.onrender.com",
      "https://config.jonfelt.se",
      "http://localhost:5556",
    ],
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
  return c.json(res);
});

app.get("/api/auth/generate-token", async (c) => {
  const requestToken = c.req.header("Authorization")?.split(" ").at(-1);
  const requesterUserId = await auth.getUserId(requestToken!);
  if (!requesterUserId) throw new Error("No user for token.");
  const { token } = await auth.createLongLivedToken(requesterUserId);
  return c.json({ token });
});

app.post("/api/auth/create-user", async (c) => {
  const body = await c.req.json();
  const credentials: Credentials = {
    username: body.username as string,
    password: body.password as string,
  };
  await auth.createUser(credentials);
  return c.text("OK");
});

app.get("/api/config/users", (c) => {
  return c.json(auth.getUsers());
});

app.post("/api/auth/delete-user", async (c) => {
  const body = await c.req.json();
  await auth.deleteUser(body.username as string, body.token as string);
  return c.text("OK");
});

app.get("/api/validate/:sessionId", async (c) => {
  const id = c.req.param("sessionId");
  const res = await auth.validate(id);
  if (!res) {
    c.status(403);
  } else {
    c.status(200);
  }
  return c.json(res);
});

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

app.delete("/api/config", async (c) => {
  const body = await c.req.json();
  config.deleteConfig(body.key as string);

  c.status(200);
  return c.text("OK");
});

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

import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";

// Load environment variables for local/node execution
const cwd = process.cwd();
for (const envFile of [".env.local", ".env"]) {
  const envPath = path.resolve(cwd, envFile);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)?\s*$/);
      if (match && match[1] && match[2] !== undefined) {
        let val = match[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[match[1]]) {
          process.env[match[1]] = val;
        }
      }
    }
  }
}

const app = new Hono();

async function getEndpointHandler() {
  try {
    const mod = await import("./endpoints/newsletter/subscribe_POST.js");
    return mod.handle;
  } catch {
    const mod = await import("./endpoints/newsletter/subscribe_POST.ts");
    return mod.handle;
  }
}

app.post("/_api/newsletter/subscribe", async (c) => {
  try {
    const handle = await getEndpointHandler();
    const request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response)) {
      return c.text(
        "Invalid response format. handle should always return a Response object.",
        500,
      );
    }
    return response;
  } catch (e) {
    console.error("Error executing newsletter endpoint:", e);
    return c.json(
      {
        success: false,
        message: "We couldn’t complete your signup right now. Please try again.",
      },
      500,
    );
  }
});

// Fallback for requests without leading slash
app.post("_api/newsletter/subscribe", async (c) => {
  try {
    const handle = await getEndpointHandler();
    const request = c.req.raw;
    return await handle(request);
  } catch (e) {
    console.error("Error executing newsletter endpoint:", e);
    return c.json(
      {
        success: false,
        message: "We couldn’t complete your signup right now. Please try again.",
      },
      500,
    );
  }
});

app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", async (c, next) => {
  const p = c.req.path;
  if (p.startsWith("/_api") || p.startsWith("_api")) {
    return next();
  }
  return serveStatic({ path: "./dist/index.html" })(c, next);
});

serve({ fetch: app.fetch, port: 3344 });
console.log("Running at http://localhost:3344");
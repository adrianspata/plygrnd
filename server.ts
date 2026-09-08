import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";

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
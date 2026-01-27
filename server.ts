import "./loadEnv.js";
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { serve } from '@hono/node-server';

const app = new Hono();

app.post('_api/newsletter/subscribe',async c => {
  try {
    const { handle } = await import("./endpoints/newsletter/subscribe_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response)) {
      return c.text("Invalid response format. handle should always return a Response object.", 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return c.text("Error loading endpoint code: " + errorMessage, 500)
  }
})
app.use('/*', serveStatic({ root: './dist' }))
app.get("*", async (c, next) => {
  const p = c.req.path;
  if (p.startsWith("/_api")) {
    return next();
  }
  return serveStatic({ path: "./dist/index.html" })(c, next);
});
serve({ fetch: app.fetch, port: 3344 });
console.log("Running at http://localhost:3344")
      
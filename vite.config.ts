import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { nodePolyfills } from "vite-plugin-node-polyfills";

function apiDevPlugin(): Plugin {
  return {
    name: "api-dev-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/_api/newsletter/subscribe" || url === "/_api/newsletter/subscribe/") {
          try {
            const env = loadEnv(server.config.mode || "development", process.cwd(), "");
            if (env.MAILERLITE_API_TOKEN) {
              process.env.MAILERLITE_API_TOKEN = env.MAILERLITE_API_TOKEN;
            }
            if (env.MAILERLITE_GROUP_ID) {
              process.env.MAILERLITE_GROUP_ID = env.MAILERLITE_GROUP_ID;
            }

            const { handle } = await server.ssrLoadModule(
              "/endpoints/newsletter/subscribe_POST.ts",
            );
            const chunks: Buffer[] = [];
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", async () => {
              const body = Buffer.concat(chunks).toString("utf-8");
              const headers = new Headers();
              for (const [key, value] of Object.entries(req.headers)) {
                if (typeof value === "string") headers.set(key, value);
                else if (Array.isArray(value)) headers.set(key, value.join(", "));
              }
              const fullUrl = `http://${req.headers.host || "localhost"}${req.url}`;
              const request = new Request(fullUrl, {
                method: req.method,
                headers,
                body:
                  req.method !== "GET" && req.method !== "HEAD"
                    ? body
                    : undefined,
              });
              const response = await handle(request);
              res.statusCode = response.status;
              response.headers.forEach((val: string, key: string) => {
                res.setHeader(key, val);
              });
              const resBody = await response.text();
              res.end(resBody);
            });
            return;
          } catch (err) {
            console.error("Dev API middleware error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: false,
                message:
                  "We couldn’t complete your signup right now. Please try again.",
              }),
            );
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => ({
  plugins: [
    nodePolyfills({
      include: ["stream", "crypto", "process"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    react(),
    apiDevPlugin(),
  ],
  build: {
    assetsDir: "_assets",
  },
}));

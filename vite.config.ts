import { defineConfig, loadEnv } from "vite";
import type { ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

/**
 * Local API adapter.
 *
 * Vercel runs each file under /api as a serverless function. In `vite dev` there
 * is no such runtime, so this plugin bridges the gap: it maps an incoming
 * `/api/<route>` request to the real handler file (`api/<route>.ts`), loads it
 * through Vite's SSR pipeline, and invokes its default export with thin
 * Vercel-compatible req/res shims.
 *
 * The upshot: localhost exercises the SAME handler code as production instead of
 * hand-written mocks that drift out of sync.
 */
function localApiPlugin(env: Record<string, string>) {
  // Handler modules read secrets from process.env; make the .env values visible.
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  const apiRoot = path.resolve(__dirname, "api");

  const resolveHandler = (routePath: string): string | null => {
    // Guard against path traversal, then try `<route>.ts` and `<route>/index.ts`.
    const safe = path
      .normalize(routePath)
      .replace(/^(\.\.(\/|\\|$))+/, "")
      .replace(/^[/\\]+/, "");
    const candidates = [
      path.join(apiRoot, `${safe}.ts`),
      path.join(apiRoot, safe, "index.ts"),
    ];
    for (const file of candidates) {
      if (file.startsWith(apiRoot) && fs.existsSync(file)) return file;
    }
    return null;
  };

  const readBody = (req: IncomingMessage): Promise<unknown> =>
    new Promise((resolve) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw) return resolve(undefined);
        const type = req.headers["content-type"] || "";
        if (type.includes("application/json")) {
          try {
            return resolve(JSON.parse(raw));
          } catch {
            return resolve(raw);
          }
        }
        resolve(raw);
      });
      req.on("error", () => resolve(undefined));
    });

  return {
    name: "local-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        async (
          req: IncomingMessage,
          res: ServerResponse,
          next: () => void
        ) => {
          if (!req.url || !req.url.startsWith("/api/")) return next();

          const url = new URL(req.url, "http://localhost");
          const routePath = url.pathname.replace(/^\/api\//, "");
          const file = resolveHandler(routePath);
          if (!file) return next();

          try {
            const mod = await server.ssrLoadModule(file);
            const handler = mod.default;
            if (typeof handler !== "function") return next();

            const body =
              req.method && req.method !== "GET" && req.method !== "HEAD"
                ? await readBody(req)
                : undefined;

            const vReq = {
              method: req.method,
              url: req.url,
              headers: req.headers,
              query: Object.fromEntries(url.searchParams),
              body,
            };

            let statusCode = 200;
            const vRes = {
              status(code: number) {
                statusCode = code;
                return this;
              },
              setHeader(key: string, value: string) {
                res.setHeader(key, value);
                return this;
              },
              json(obj: unknown) {
                res.statusCode = statusCode;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(obj));
                return this;
              },
              send(data: unknown) {
                res.statusCode = statusCode;
                res.end(typeof data === "string" ? data : JSON.stringify(data));
                return this;
              },
              end(data?: unknown) {
                res.statusCode = statusCode;
                res.end(data as string | undefined);
                return this;
              },
            };

            await handler(vReq, vRes);
          } catch (error) {
            console.error(`[local-api] ${routePath} failed:`, error);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error:
                    error instanceof Error ? error.message : "Local API error",
                })
              );
            }
          }
        }
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), localApiPlugin(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

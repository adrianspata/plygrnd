import { handle } from "../../endpoints/newsletter/subscribe_POST";

export default async function handler(req: any, res?: any) {
  // If invoked with Web Standard Request (Edge / Web API)
  if (req instanceof Request) {
    return handle(req);
  }

  // If invoked with Node.js Serverless Function (req: IncomingMessage, res: ServerResponse)
  try {
    const protocol =
      req.headers?.["x-forwarded-proto"] || "https";
    const host =
      req.headers?.["x-forwarded-host"] || req.headers?.host || "localhost";
    const fullUrl = `${protocol}://${host}${req.url || "/_api/newsletter/subscribe"}`;

    let bodyStr: string | undefined;
    if (req.body !== undefined && req.body !== null) {
      bodyStr =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const headers = new Headers();
    if (req.headers) {
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(", "));
      }
    }

    const webRequest = new Request(fullUrl, {
      method: req.method || "POST",
      headers,
      body:
        req.method !== "GET" && req.method !== "HEAD" ? bodyStr : undefined,
    });

    const webResponse = await handle(webRequest);

    if (res && typeof res.status === "function") {
      res.status(webResponse.status);
      webResponse.headers.forEach((val: string, key: string) => {
        res.setHeader(key, val);
      });
      const responseData = await webResponse.text();
      return res.send(responseData);
    }

    return webResponse;
  } catch (error) {
    console.error("Vercel API handler error:", error);
    if (res && typeof res.status === "function") {
      return res.status(500).json({
        success: false,
        message:
          "We couldn’t complete your signup right now. Please try again.",
      });
    }
    return new Response(
      JSON.stringify({
        success: false,
        message:
          "We couldn’t complete your signup right now. Please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export { handler as POST };

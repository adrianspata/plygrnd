import {
  InputSchema,
  formatInterests,
  normalizeInstagramHandle,
} from "./subscribe_POST.schema";

// In-memory rate limiting (basic/development protection)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  entry.count += 1;
  return false;
}

// Clean up stale rate-limit entries periodically
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, RATE_LIMIT_WINDOW_MS * 2);
  if (typeof timer === "object" && timer && "unref" in timer) {
    (timer as { unref: () => void }).unref();
  }
}

export async function handle(request: Request): Promise<Response> {
  // 1. Enforce POST method
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          Allow: "POST",
        },
      },
    );
  }

  // 2. Client IP rate limiting
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Too many subscription attempts. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }

  // 3. Parse and validate payload
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Invalid request payload",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const parseResult = InputSchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0]?.message || "Invalid form data";
    return new Response(
      JSON.stringify({
        success: false,
        message: firstError,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const data = parseResult.data;

  // 4. Honeypot spam check (silent success response)
  if (data.honeypot && data.honeypot.trim().length > 0) {
    return new Response(
      JSON.stringify({
        success: true,
        message: "You’re in. Keep an eye on your inbox for a welcome from PLYGRND.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // 5. Verify MailerLite server-side environment variables
  const mailerliteToken = process.env.MAILERLITE_API_TOKEN;
  const mailerliteGroupId = process.env.MAILERLITE_GROUP_ID;

  if (!mailerliteToken || !mailerliteGroupId) {
    // Sanitized server log (no PII, no token)
    console.error(
      "MailerLite configuration error: MAILERLITE_API_TOKEN or MAILERLITE_GROUP_ID is missing.",
    );
    return new Response(
      JSON.stringify({
        success: false,
        message: "We couldn’t complete your signup right now. Please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // 6. Format MailerLite subscriber payload
  const formattedInterests = formatInterests(data.interests);
  const normalizedIg = normalizeInstagramHandle(data.instagram_handle) || "";

  const mailerlitePayload = {
    email: data.email,
    fields: {
      name: data.name,
      phone: data.phone,
      instagram_handle: normalizedIg,
      interests: formattedInterests,
    },
    groups: [mailerliteGroupId],
  };

  // 7. Execute request to MailerLite API with AbortController timeout (9s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const mlResponse = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mailerliteToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(mailerlitePayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (mlResponse.status === 200 || mlResponse.status === 201) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "You’re in. Keep an eye on your inbox for a welcome from PLYGRND.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Sanitized error logging (no PII, no body)
    console.error(
      `MailerLite API returned unexpected status: ${mlResponse.status}`,
    );

    const clientStatusCode = mlResponse.status >= 500 ? 502 : 400;
    return new Response(
      JSON.stringify({
        success: false,
        message: "We couldn’t complete your signup right now. Please try again.",
      }),
      {
        status: clientStatusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.error("MailerLite request timed out.");
    } else {
      console.error("MailerLite network/connection error occurred.");
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "We couldn’t complete your signup right now. Please try again.",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

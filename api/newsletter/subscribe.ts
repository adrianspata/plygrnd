import {
  InputSchema,
  formatInterests,
  normalizeInstagramHandle,
} from "../../endpoints/newsletter/subscribe_POST.schema";

export default async function handler(req: any, res: any) {
  // CORS headers
  if (typeof res?.setHeader === "function") {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
    );
  }

  if (req.method === "OPTIONS") {
    if (typeof res?.status === "function") {
      return res.status(200).end();
    }
    return new Response(null, { status: 200 });
  }

  // Enforce POST
  if (req.method !== "POST") {
    if (typeof res?.status === "function") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
      });
    }
    return new Response(
      JSON.stringify({ success: false, message: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", Allow: "POST" },
      },
    );
  }

  try {
    // 1. Extract payload
    let rawBody = req.body;
    if (typeof rawBody === "string") {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        // Keep as string if parsing fails
      }
    } else if (!rawBody && typeof req.text === "function") {
      const text = await req.text();
      rawBody = JSON.parse(text);
    }

    const parseResult = InputSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstError =
        parseResult.error.errors[0]?.message || "Invalid form data";
      if (typeof res?.status === "function") {
        return res.status(400).json({ success: false, message: firstError });
      }
      return new Response(
        JSON.stringify({ success: false, message: firstError }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = parseResult.data;

    // 2. Honeypot check
    if (data.honeypot && data.honeypot.trim().length > 0) {
      const successPayload = {
        success: true,
        message:
          "You’re in. Keep an eye on your inbox for a welcome from PLYGRND.",
      };
      if (typeof res?.status === "function") {
        return res.status(200).json(successPayload);
      }
      return new Response(JSON.stringify(successPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. MailerLite credentials
    const mailerliteToken =
      process.env.MAILERLITE_API_TOKEN || process.env.VITE_MAILERLITE_API_TOKEN;
    const mailerliteGroupId =
      process.env.MAILERLITE_GROUP_ID || process.env.VITE_MAILERLITE_GROUP_ID;

    if (!mailerliteToken || !mailerliteGroupId) {
      console.error(
        "MailerLite configuration error: MAILERLITE_API_TOKEN or MAILERLITE_GROUP_ID is missing.",
      );
      const errPayload = {
        success: false,
        message:
          "We couldn’t complete your signup right now. Please try again.",
      };
      if (typeof res?.status === "function") {
        return res.status(500).json(errPayload);
      }
      return new Response(JSON.stringify(errPayload), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Send to MailerLite
    const formattedInterests = formatInterests(data.interests);
    const normalizedIg = normalizeInstagramHandle(data.instagram_handle) || "";

    const mailerlitePayload = {
      email: data.email,
      status: "active",
      resubscribe: true,
      fields: {
        name: data.name,
        phone: data.phone,
        instagram_handle: normalizedIg,
        interests: formattedInterests,
      },
      groups: [mailerliteGroupId],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const mlResponse = await fetch(
      "https://connect.mailerlite.com/api/subscribers",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mailerliteToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(mailerlitePayload),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (mlResponse.status === 200 || mlResponse.status === 201) {
      const successPayload = {
        success: true,
        message:
          "You’re in. Keep an eye on your inbox for a welcome from PLYGRND.",
      };
      if (typeof res?.status === "function") {
        return res.status(200).json(successPayload);
      }
      return new Response(JSON.stringify(successPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse MailerLite error message
    let errorMessage =
      "We couldn’t complete your signup right now. Please try again.";
    try {
      const mlErr = (await mlResponse.json()) as any;
      if (mlErr && typeof mlErr.message === "string" && mlErr.message.trim()) {
        errorMessage = mlErr.message;
        if (mlErr.errors && typeof mlErr.errors === "object") {
          const firstErrList = Object.values(mlErr.errors)[0];
          if (
            Array.isArray(firstErrList) &&
            typeof firstErrList[0] === "string"
          ) {
            errorMessage = firstErrList[0];
          }
        }
      }
    } catch {}

    console.error(
      `MailerLite API returned status: ${mlResponse.status} - ${errorMessage}`,
    );

    const clientStatusCode = mlResponse.status >= 500 ? 502 : 400;
    const errorPayload = { success: false, message: errorMessage };

    if (typeof res?.status === "function") {
      return res.status(clientStatusCode).json(errorPayload);
    }
    return new Response(JSON.stringify(errorPayload), {
      status: clientStatusCode,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Newsletter submission error:", error);
    const errPayload = {
      success: false,
      message:
        "We couldn’t complete your signup right now. Please try again.",
    };
    if (typeof res?.status === "function") {
      return res.status(500).json(errPayload);
    }
    return new Response(JSON.stringify(errPayload), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

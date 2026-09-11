import { z } from "zod";

const ALLOWED_INTERESTS = [
  "Sports",
  "Music",
  "Fashion",
  "Design",
] as const;

function normalizeInstagramHandle(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (
    trimmed.includes("http://") ||
    trimmed.includes("https://") ||
    trimmed.includes("instagram.com") ||
    trimmed.includes("/")
  ) {
    return undefined;
  }
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1).trim() : trimmed;
  if (!withoutAt) return undefined;
  const validUsernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
  if (!validUsernameRegex.test(withoutAt)) {
    return undefined;
  }
  return withoutAt;
}

function formatInterests(selected: string[]): string {
  if (!Array.isArray(selected)) return "";
  return ALLOWED_INTERESTS.filter((interest) =>
    selected.includes(interest),
  ).join(", ");
}

const PhoneSchema = z
  .string({ required_error: "Phone number is required" })
  .trim()
  .min(1, "Phone number is required")
  .refine(
    (val) => {
      const digitCount = (val.match(/\d/g) || []).length;
      const validCharsRegex = /^[+]?[\d\s\-().]{7,30}$/;
      return digitCount >= 6 && validCharsRegex.test(val);
    },
    {
      message: "Please enter a valid phone number (e.g. +46 70 123 4567)",
    },
  );

const InstagramHandleSchema = z
  .string()
  .trim()
  .max(60, "Instagram handle is too long")
  .optional()
  .refine(
    (val) => {
      if (!val || val.trim() === "") return true;
      return normalizeInstagramHandle(val) !== undefined;
    },
    {
      message:
        "Please enter a valid Instagram username (without URL, e.g. @username)",
    },
  );

const InputSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  phone: PhoneSchema,
  email: z
    .string({ required_error: "Email address is required" })
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(255, "Email address is too long"),
  instagram_handle: InstagramHandleSchema,
  interests: z
    .array(
      z.enum(ALLOWED_INTERESTS, {
        errorMap: () => ({ message: "Please select valid interests" }),
      }),
    )
    .min(1, "Please choose at least one interest"),
  consent: z.literal(true, {
    errorMap: () => ({
      message: "You must agree to receive emails to subscribe",
    }),
  }),
  honeypot: z.string().optional(),
});

export default async function handler(req: any, res: any) {
  // Set CORS headers
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
    // Extract raw payload
    let rawBody = req.body;
    if (typeof rawBody === "string") {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {}
    } else if (!rawBody && typeof req.text === "function") {
      const text = await req.text();
      try {
        rawBody = JSON.parse(text);
      } catch {}
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

    // Honeypot check
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

    // Read MailerLite credentials
    const mailerliteToken = (
      process.env.MAILERLITE_API_TOKEN ||
      process.env.VITE_MAILERLITE_API_TOKEN ||
      ""
    ).trim();
    const mailerliteGroupId = (
      process.env.MAILERLITE_GROUP_ID ||
      process.env.VITE_MAILERLITE_GROUP_ID ||
      ""
    ).trim();

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
      },
    );

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

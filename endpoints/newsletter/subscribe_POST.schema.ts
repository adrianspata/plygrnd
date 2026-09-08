import { z } from "zod";

export const ALLOWED_INTERESTS = [
  "Sports",
  "Music",
  "Fashion",
  "Design",
] as const;

export type Interest = (typeof ALLOWED_INTERESTS)[number];

/**
 * Normalizes an Instagram handle by trimming whitespace and stripping a leading '@'.
 * Rejects full URLs and invalid characters.
 */
export function normalizeInstagramHandle(
  raw?: string | null,
): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Reject full URLs
  if (
    trimmed.includes("http://") ||
    trimmed.includes("https://") ||
    trimmed.includes("instagram.com") ||
    trimmed.includes("/")
  ) {
    return undefined;
  }

  // Remove leading @ if present
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1).trim() : trimmed;
  if (!withoutAt) return undefined;

  // Instagram username rules: 1-30 chars, letters, numbers, periods, underscores
  const validUsernameRegex = /^[a-zA-Z0-9._]{1,30}$/;
  if (!validUsernameRegex.test(withoutAt)) {
    return undefined;
  }

  return withoutAt;
}

/**
 * Formats a list of selected interests into a canonical comma-separated string
 * preserving the predefined order: Sports, Music, Fashion, Design
 */
export function formatInterests(selected: string[]): string {
  if (!Array.isArray(selected)) return "";
  return ALLOWED_INTERESTS.filter((interest) =>
    selected.includes(interest),
  ).join(", ");
}

/**
 * Phone number schema - currently required, structured for easy conversion to optional.
 */
export const PhoneSchema = z
  .string({ required_error: "Phone number is required" })
  .trim()
  .min(1, "Phone number is required")
  .refine(
    (val) => {
      // Must have between 7 and 30 characters, contain at least 6 digits, allow +, (), -, spaces, dots
      const digitCount = (val.match(/\d/g) || []).length;
      const validCharsRegex = /^[+]?[\d\s\-().]{7,30}$/;
      return digitCount >= 6 && validCharsRegex.test(val);
    },
    {
      message: "Please enter a valid phone number (e.g. +46 70 123 4567)",
    },
  );

/**
 * Instagram handle schema - optional, accepts with or without @, rejects URLs
 */
export const InstagramHandleSchema = z
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

/**
 * Input validation schema for newsletter subscription
 */
export const InputSchema = z.object({
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
    .array(z.enum(ALLOWED_INTERESTS, {
      errorMap: () => ({ message: "Please select valid interests" }),
    }))
    .min(1, "Please choose at least one interest"),
  consent: z.literal(true, {
    errorMap: () => ({
      message:
        "You must agree to receive emails to subscribe",
    }),
  }),
  honeypot: z.string().optional(),
});

export type InputType = z.infer<typeof InputSchema>;

export const OutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type OutputType = z.infer<typeof OutputSchema>;

/**
 * Posts newsletter subscription data to the server endpoint
 */
export async function postNewsletterSubscribe(
  data: InputType,
): Promise<OutputType> {
  const response = await fetch("/_api/newsletter/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "We couldn’t complete your signup right now. Please try again.",
    );
  }

  if (!response.ok) {
    const parsedErr = OutputSchema.safeParse(result);
    if (parsedErr.success && parsedErr.data.message) {
      throw new Error(parsedErr.data.message);
    }
    throw new Error(
      "We couldn’t complete your signup right now. Please try again.",
    );
  }

  return OutputSchema.parse(result);
}

import { z } from "zod";

export const InputSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type InputType = z.infer<typeof InputSchema>;

export const OutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type OutputType = z.infer<typeof OutputSchema>;

/**
 * Posts newsletter subscription data to the server
 */
export async function postNewsletterSubscribe(
  data: InputType,
): Promise<OutputType> {
  const response = await fetch("/_api/newsletter/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.statusText}`);
  }

  const result = await response.json();
  return OutputSchema.parse(result);
}

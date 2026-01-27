import { db } from "../../src/components/db";
import { InputSchema } from "./subscribe_POST.schema";

export async function handle(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const data = InputSchema.parse(body);

    // Insert into database
    await db
      .insertInto("newsletterSubscribers")
      .values({
        email: data.email,
      })
      .execute();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Successfully subscribed to the newsletter",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to subscribe to the newsletter",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

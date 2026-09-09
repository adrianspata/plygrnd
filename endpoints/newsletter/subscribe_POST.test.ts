import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  InputSchema,
  formatInterests,
  normalizeInstagramHandle,
} from "./subscribe_POST.schema.ts";
import { handle } from "./subscribe_POST.ts";

describe("Newsletter Subscription - Schema Validation", () => {
  it("validates valid submission with all fields", () => {
    const validData = {
      name: "Adrian Spata",
      phone: "+46 70 123 4567",
      email: "User@Example.COM ",
      instagram_handle: "@adrian_spata",
      interests: ["Design", "Sports"],
      consent: true,
    };

    const result = InputSchema.safeParse(validData);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.name, "Adrian Spata");
      assert.equal(result.data.email, "user@example.com");
      assert.equal(result.data.phone, "+46 70 123 4567");
      assert.equal(result.data.consent, true);
    }
  });

  it("normalizes Instagram handle by stripping leading @ and rejecting URLs", () => {
    assert.equal(normalizeInstagramHandle("@plygrnd"), "plygrnd");
    assert.equal(normalizeInstagramHandle("plygrnd"), "plygrnd");
    assert.equal(normalizeInstagramHandle("  @cool.user_123  "), "cool.user_123");
    assert.equal(normalizeInstagramHandle(""), undefined);
    assert.equal(normalizeInstagramHandle(undefined), undefined);
    assert.equal(
      normalizeInstagramHandle("https://instagram.com/plygrnd"),
      undefined,
    );
    assert.equal(
      normalizeInstagramHandle("instagram.com/plygrnd"),
      undefined,
    );
  });

  it("preserves canonical interest ordering: Sports, Music, Fashion, Design", () => {
    // User selects in reverse order
    const selectedReverse = ["Design", "Fashion", "Music", "Sports"];
    assert.equal(
      formatInterests(selectedReverse),
      "Sports, Music, Fashion, Design",
    );

    // User selects arbitrary subset
    const selectedSubset = ["Design", "Sports"];
    assert.equal(formatInterests(selectedSubset), "Sports, Design");

    const selectedMusic = ["Music"];
    assert.equal(formatInterests(selectedMusic), "Music");
  });

  it("rejects submission without consent", () => {
    const dataWithoutConsent = {
      name: "Adrian Spata",
      phone: "+46 70 123 4567",
      email: "user@example.com",
      interests: ["Sports"],
      consent: false,
    };
    const result = InputSchema.safeParse(dataWithoutConsent);
    assert.equal(result.success, false);
  });

  it("rejects submission without interests", () => {
    const dataWithoutInterests = {
      name: "Adrian Spata",
      phone: "+46 70 123 4567",
      email: "user@example.com",
      interests: [],
      consent: true,
    };
    const result = InputSchema.safeParse(dataWithoutInterests);
    assert.equal(result.success, false);
  });

  it("rejects invalid email addresses", () => {
    const dataInvalidEmail = {
      name: "Adrian Spata",
      phone: "+46 70 123 4567",
      email: "not-an-email",
      interests: ["Sports"],
      consent: true,
    };
    const result = InputSchema.safeParse(dataInvalidEmail);
    assert.equal(result.success, false);
  });

  it("accepts valid international phone number formats and rejects invalid strings", () => {
    const validPhones = [
      "+46 70 123 4567",
      "+1 (555) 123-4567",
      "0701234567",
      "+44 20 7946 0991",
    ];
    for (const phone of validPhones) {
      const result = InputSchema.safeParse({
        name: "Adrian",
        phone,
        email: "test@example.com",
        interests: ["Music"],
        consent: true,
      });
      assert.equal(result.success, true, `Phone should be valid: ${phone}`);
    }

    const invalidPhones = ["123", "abc", "phone number", ""];
    for (const phone of invalidPhones) {
      const result = InputSchema.safeParse({
        name: "Adrian",
        phone,
        email: "test@example.com",
        interests: ["Music"],
        consent: true,
      });
      assert.equal(result.success, false, `Phone should be invalid: ${phone}`);
    }
  });
});

describe("Newsletter Subscription - Endpoint Handler & MailerLite Integration", () => {
  it("rejects non-POST HTTP methods with 405", async () => {
    const req = new Request("http://localhost/_api/newsletter/subscribe", {
      method: "GET",
    });
    const res = await handle(req);
    assert.equal(res.status, 405);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it("returns 200 silent success when honeypot field is filled", async () => {
    const req = new Request("http://localhost/_api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Spam Bot",
        phone: "+1234567890",
        email: "bot@spam.com",
        interests: ["Sports"],
        consent: true,
        honeypot: "http://spam.link",
      }),
    });
    const res = await handle(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  it("returns sanitized 500 if MAILERLITE_API_TOKEN or MAILERLITE_GROUP_ID is missing", async () => {
    const prevToken = process.env.MAILERLITE_API_TOKEN;
    const prevGroup = process.env.MAILERLITE_GROUP_ID;
    delete process.env.MAILERLITE_API_TOKEN;
    delete process.env.MAILERLITE_GROUP_ID;

    const req = new Request("http://localhost/_api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Adrian Spata",
        phone: "+46 70 123 4567",
        email: "user@example.com",
        interests: ["Sports"],
        consent: true,
      }),
    });

    const res = await handle(req);
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(
      body.message,
      "We couldn’t complete your signup right now. Please try again.",
    );

    // Restore env vars if previously set
    if (prevToken) process.env.MAILERLITE_API_TOKEN = prevToken;
    if (prevGroup) process.env.MAILERLITE_GROUP_ID = prevGroup;
  });

  it("sends valid payload with group ID, without resubscribe flag, and handles successful MailerLite response", async () => {
    process.env.MAILERLITE_API_TOKEN = "ml_test_token_xyz";
    process.env.MAILERLITE_GROUP_ID = "99887766";

    let interceptedUrl: string | undefined;
    let interceptedHeaders: HeadersInit | undefined;
    let interceptedBody: any;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      interceptedUrl = String(input);
      interceptedHeaders = init?.headers;
      interceptedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ data: { id: "sub_123", status: "active" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const req = new Request("http://localhost/_api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jane Doe",
          phone: "+46 70 987 6543",
          email: "jane.doe@example.com",
          instagram_handle: "@janedoe",
          interests: ["Fashion", "Sports"],
          consent: true,
        }),
      });

      const res = await handle(req);
      assert.equal(res.status, 200);
      const resBody = await res.json();
      assert.equal(resBody.success, true);
      assert.equal(
        resBody.message,
        "You’re in. Keep an eye on your inbox for a welcome from PLYGRND.",
      );

      // Verify MailerLite request specifics
      assert.equal(interceptedUrl, "https://connect.mailerlite.com/api/subscribers");
      assert.equal((interceptedHeaders as any)?.Authorization, "Bearer ml_test_token_xyz");

      // Verify that subscriber joins the group immediately
      assert.deepEqual(interceptedBody.groups, ["99887766"]);

      // Verify that resubscribe: true is NEVER passed (prevents forced reactivation of unsubscribed contacts)
      assert.equal(interceptedBody.resubscribe, undefined);

      // Verify fields & canonical interest ordering
      assert.equal(interceptedBody.email, "jane.doe@example.com");
      assert.equal(interceptedBody.fields.name, "Jane Doe");
      assert.equal(interceptedBody.fields.phone, "+46 70 987 6543");
      assert.equal(interceptedBody.fields.instagram_handle, "janedoe");
      assert.equal(interceptedBody.fields.interests, "Sports, Fashion");
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.MAILERLITE_API_TOKEN;
      delete process.env.MAILERLITE_GROUP_ID;
    }
  });

  it("returns privacy-safe error without exposing internal details when MailerLite returns an error", async () => {
    process.env.MAILERLITE_API_TOKEN = "ml_test_token_xyz";
    process.env.MAILERLITE_GROUP_ID = "99887766";

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ message: "The given data was invalid." }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    };

    try {
      const req = new Request("http://localhost/_api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "John Smith",
          phone: "+46 70 111 2233",
          email: "john@example.com",
          interests: ["Music"],
          consent: true,
        }),
      });

      const res = await handle(req);
      assert.equal(res.status, 400);
      const resBody = await res.json();
      assert.equal(resBody.success, false);
      assert.equal(
        resBody.message,
        "The given data was invalid.",
      );
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.MAILERLITE_API_TOKEN;
      delete process.env.MAILERLITE_GROUP_ID;
    }
  });
});

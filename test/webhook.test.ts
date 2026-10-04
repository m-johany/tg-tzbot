import { describe, it, expect } from "vitest";
import worker from "../src/index";

describe("Worker Webhook Handler", () => {
  const dummyCtx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
    props: {},
  } as unknown as ExecutionContext;

  it("handles GET /health with 200 OK", async () => {
    const req = new Request("https://example.com/health", { method: "GET" });
    const res = await worker.fetch(req, { TELEGRAM_BOT_TOKEN: "mock" }, dummyCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", service: "tg-tzbot" });
  });

  it("rejects non-POST non-GET requests with 405", async () => {
    const req = new Request("https://example.com/webhook", { method: "DELETE" });
    const res = await worker.fetch(req, { TELEGRAM_BOT_TOKEN: "mock" }, dummyCtx);
    expect(res.status).toBe(405);
  });

  it("verifies X-Telegram-Bot-Api-Secret-Token when configured", async () => {
    // Missing header
    const req1 = new Request("https://example.com/", { method: "POST", body: "{}" });
    const res1 = await worker.fetch(
      req1,
      { TELEGRAM_BOT_TOKEN: "mock", TELEGRAM_SECRET_TOKEN: "secret123" },
      dummyCtx
    );
    expect(res1.status).toBe(401);

    // Wrong header
    const req2 = new Request("https://example.com/", {
      method: "POST",
      body: "{}",
      headers: { "X-Telegram-Bot-Api-Secret-Token": "wrong-secret" },
    });
    const res2 = await worker.fetch(
      req2,
      { TELEGRAM_BOT_TOKEN: "mock", TELEGRAM_SECRET_TOKEN: "secret123" },
      dummyCtx
    );
    expect(res2.status).toBe(401);

    // Correct header with invalid telegram payload returns 200 (error handled gracefully)
    const req3 = new Request("https://example.com/", {
      method: "POST",
      body: "{}",
      headers: {
        "X-Telegram-Bot-Api-Secret-Token": "secret123",
        "Content-Type": "application/json",
      },
    });
    const res3 = await worker.fetch(
      req3,
      { TELEGRAM_BOT_TOKEN: "mock", TELEGRAM_SECRET_TOKEN: "secret123" },
      dummyCtx
    );
    expect(res3.status).toBe(200);
  });
});

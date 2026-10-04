import { webhookCallback } from "grammy";
import { createBot } from "./bot";

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_SECRET_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return new Response(JSON.stringify({ status: "ok", service: "tg-tzbot" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!env.TELEGRAM_BOT_TOKEN) {
      return new Response("Configuration Error: Missing TELEGRAM_BOT_TOKEN", { status: 500 });
    }

    // Verify Telegram secret token header if configured
    if (env.TELEGRAM_SECRET_TOKEN) {
      const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (secretHeader !== env.TELEGRAM_SECRET_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    try {
      const bot = createBot(env.TELEGRAM_BOT_TOKEN);
      const callback = webhookCallback(bot, "cloudflare-mod");
      return await callback(request);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Error processing update:", errorMsg);
      // Return 200 to prevent Telegram from infinitely retrying broken updates
      return new Response("Error processed", { status: 200 });
    }
  },
};

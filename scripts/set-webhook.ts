import crypto from "node:crypto";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.argv[2];
  const workerUrl = process.env.WORKER_URL || process.argv[3];
  const secret = process.env.TELEGRAM_SECRET_TOKEN || process.argv[4] || crypto.randomUUID().replace(/-/g, "");

  if (!token) {
    console.error("❌ Error: Missing Telegram bot token.");
    console.error("Usage: npm run set-webhook <TELEGRAM_BOT_TOKEN> <WORKER_URL> [SECRET_TOKEN]");
    process.exit(1);
  }

  if (!workerUrl) {
    console.error("❌ Error: Missing Cloudflare Worker URL.");
    console.error("Usage: npm run set-webhook <TELEGRAM_BOT_TOKEN> <WORKER_URL> [SECRET_TOKEN]");
    process.exit(1);
  }

  console.log(`Setting webhook for bot to ${workerUrl}...`);

  const payload: Record<string, unknown> = {
    url: workerUrl,
    allowed_updates: ["message", "inline_query"],
    secret_token: secret,
    drop_pending_updates: false,
  };

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as { ok: boolean; [key: string]: unknown };
  if (data.ok) {
    console.log("✅ Webhook successfully set!");
    console.log(`📡 URL: ${workerUrl}`);
    console.log(`🔒 Secret Token: ${secret}`);
    console.log("");
    console.log("Remember to set this secret token in Cloudflare:");
    console.log(`  npx wrangler secret put TELEGRAM_SECRET_TOKEN`);
  } else {
    console.error("❌ Failed to set webhook:", data);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

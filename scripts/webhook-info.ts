async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.argv[2];

  if (!token) {
    console.error("❌ Error: Missing Telegram bot token.");
    console.error("Usage: npm run webhook-info <TELEGRAM_BOT_TOKEN>");
    process.exit(1);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await res.json();

  console.log("📡 Telegram Webhook Info:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

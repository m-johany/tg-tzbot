# Telegram Timezone Converter Bot (`tg-tzbot`)

A lightweight, serverless Telegram bot built with TypeScript and deployed on **Cloudflare Workers**. It converts any given city or timezone into core team hubs: **London (UK)**, **Tunisia**, and **Dhaka (Bangladesh)**.

Bot handle: **[@slg_tzbot](https://t.me/slg_tzbot)**

---

## Features

- **Default Multi-Hub Conversion**: Automatically converts any recognized time to:
  - 🇬🇧 **London (UK)** (`Europe/London`)
  - 🇹🇳 **Tunisia** (`Africa/Tunis`)
  - 🇧🇩 **Dhaka (BD)** (`Asia/Dhaka`)
- **Flexible Invocations**:
  - **Group Mentions**: `@slg_tzbot 11am chicago` or `@slg_tzbot convert 11am chicago`
  - **Commands**: `/convert 3:30pm tokyo`
  - **Inline Mode**: Type `@slg_tzbot 10am NY` in *any* chat or DM to preview and send converted times.
- **Natural Time Parsing**:
  - 12-hour formats: `11am`, `11:30 am`, `3pm`, `12:45pm`
  - 24-hour formats: `14:00`, `09:30`, `23:15`
- **Comprehensive City & Timezone Support**:
  - Recognizes global major cities (`Chicago`, `Tokyo`, `Berlin`, `Sydney`, etc.).
  - Recognizes airport & city abbreviations (`NY`, `NYC`, `SF`, `LA`, `CHI`, `LDN`, `DXB`, etc.).
  - Recognizes timezone codes (`EST`, `EDT`, `PST`, `UTC`, `CET`, `JST`, `UTC+5`, etc.).
- **Automatic Day Rollover**: Clear `(+1 day)` or `(-1 day)` badges when midnight is crossed.
- **Edge Performance**: Sub-50ms latency running on Cloudflare Workers edge network with zero external geocoding API rate limits or latency.

---

## Output Example

```text
🕒 11:00 AM Chicago (CDT)

🇬🇧 05:00 PM London (UK)
🇹🇳 05:00 PM Tunisia
🇧🇩 10:00 PM Dhaka (BD)
```

*(When crossing midnight)*:
```text
🕒 09:00 PM Chicago (CDT)

🇬🇧 03:00 AM London (UK) (+1 day)
🇹🇳 03:00 AM Tunisia (+1 day)
🇧🇩 08:00 AM Dhaka (BD) (+1 day)
```

---

## Setup & Deployment

### 1. Prerequisites
- Node.js 20+
- Cloudflare account with Wrangler CLI configured (`npx wrangler whoami`)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)

### 2. Local Testing
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run type checking
npm run typecheck

# Start local worker
npx wrangler dev
```

### 3. Deploying to Cloudflare Workers

1. Deploy the worker:
   ```bash
   npx wrangler deploy
   ```

2. Set the bot token secret:
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   # Paste your bot token when prompted
   ```

3. (Optional but recommended) Set a secret webhook token:
   ```bash
   npx wrangler secret put TELEGRAM_SECRET_TOKEN
   ```

4. Register the webhook with Telegram:
   ```bash
   npm run set-webhook <TELEGRAM_BOT_TOKEN> <YOUR_WORKER_URL> [SECRET_TOKEN]
   ```

5. Verify webhook status:
   ```bash
   npm run webhook-info <TELEGRAM_BOT_TOKEN>
   ```

---

## CI/CD Deployment

The repository includes a GitHub Actions workflow in `.github/workflows/deploy.yml`.

To enable automatic deployment on push to `main`:
1. Add `CLOUDFLARE_API_TOKEN` to your GitHub Repository Secrets (`Settings -> Secrets and variables -> Actions`).
2. Every push to `main` will automatically run typecheck, unit tests, and deploy to Cloudflare Workers.

---

## Enabling Telegram Inline Mode

To allow team members to type `@slg_tzbot 11am chicago` in any external chat:
1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/setinline`.
3. Select `@slg_tzbot`.
4. Enter placeholder text, e.g.: `Convert time (e.g. 11am chicago)`

---

## License

MIT

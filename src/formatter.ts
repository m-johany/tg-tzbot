import type { ConversionResult } from "./tz";

/**
 * Formats a ConversionResult into the approved clean Telegram message layout.
 */
export function formatConversionCard(result: ConversionResult): string {
  const lines: string[] = [];

  // Header line: Source time & city with timezone abbreviation
  lines.push(`🕒 ${result.sourceTimeString} ${result.sourceCity} (${result.sourceZoneAbbr})`);
  lines.push(""); // empty spacer line

  // Hub conversion lines
  for (const conv of result.conversions) {
    let daySuffix = "";
    if (conv.dayDiff > 0) {
      daySuffix = ` (+${conv.dayDiff} day${conv.dayDiff > 1 ? "s" : ""})`;
    } else if (conv.dayDiff < 0) {
      daySuffix = ` (${conv.dayDiff} day${conv.dayDiff < -1 ? "s" : ""})`;
    }

    lines.push(
      `${conv.flag} ${conv.timeString} ${conv.hubName}${daySuffix}`
    );
  }

  return lines.join("\n");
}

/**
 * Returns standard 1-line syntax help.
 */
export function getUsageHelp(): string {
  return "⚠️ Usage: @slg_tzbot [convert] <time> <city> (e.g. @slg_tzbot 11am chicago or /convert 3pm tokyo)";
}

/**
 * Returns full /help text.
 */
export function getHelpMessage(): string {
  return [
    "🌍 *TZ Convert Bot* (@slg_tzbot)",
    "",
    "Instantly converts any city or timezone to our core hubs:",
    "🇬🇧 London (UK)",
    "🇹🇳 Tunisia",
    "🇧🇩 Dhaka (Bangladesh)",
    "",
    "📌 *How to use:*",
    "• In groups: `@slg_tzbot 11am chicago`",
    "• With command: `/convert 3:30pm tokyo`",
    "• In any chat (Inline): type `@slg_tzbot 10am NY`",
    "",
    "Supports 12-hour (`11am`, `3:30pm`) and 24-hour (`15:00`) formats, global cities, and shortcuts like `NY`, `SF`, `LA`, `EST`, `PST`.",
  ].join("\n");
}

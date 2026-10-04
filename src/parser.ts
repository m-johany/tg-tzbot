import { resolveLocation, type ParsedTime } from "./tz";
import type { CityInfo } from "./tz-data";

export interface ParseResult {
  success: boolean;
  parsedTime?: ParsedTime;
  city?: CityInfo;
  error?: string;
  rawInput: string;
}

/**
 * Normalizes input by removing bot mentions, slash commands, and common conversational prefixes.
 */
export function cleanInputText(text: string): string {
  let cleaned = text
    .replace(/@\w+\b/gi, " ") // strip any bot mentions @bot
    .replace(/^\/(?:convert|tz|time|calc)(?:@\w+)?\s*/i, "") // strip slash commands like /convert or /convert@bot
    .trim();

  cleaned = cleaned
    .replace(/^(?:please\s+)?(?:convert\s+time|convert)\s+/i, "") // strip leading "convert"
    .replace(/^(?:what\s+time\s+is\s+it\s+(?:in|at)\s+)/i, "")
    .trim();

  return cleaned.replace(/\s+/g, " ");
}

/**
 * Extracts the time and city from a user query.
 */
export function parseQuery(rawText: string): ParseResult {
  const cleaned = cleanInputText(rawText);
  if (!cleaned) {
    return {
      success: false,
      rawInput: rawText,
      error: "Empty query",
    };
  }

  let hour: number | null = null;
  let minute = 0;
  let timeMatchString = "";
  let remainder = cleaned;

  // 1. Try matching 12-hour format: e.g. "11am", "11:30am", "11:30 am", "3pm", "12 pm"
  const twelveHourRegex = /(?:^|\s)(?:at\s+)?(\b(?:0?[1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)\b)(?:\s+|$)/i;
  const match12 = cleaned.match(twelveHourRegex);

  if (match12) {
    timeMatchString = match12[1].trim();
    const parts = match12[1].trim().toLowerCase();
    const isPm = parts.endsWith("pm");
    const numPart = parts.replace(/(am|pm)/, "").trim();

    if (numPart.includes(":")) {
      const [hStr, mStr] = numPart.split(":");
      const rawH = parseInt(hStr, 10);
      minute = parseInt(mStr, 10);
      hour = rawH % 12 + (isPm ? 12 : 0);
    } else {
      const rawH = parseInt(numPart, 10);
      hour = rawH % 12 + (isPm ? 12 : 0);
    }

    remainder = cleaned.replace(match12[0], " ").trim();
  } else {
    // 2. Try matching 24-hour format: e.g. "14:00", "09:30", "23:15"
    const twentyFourHourRegex = /(?:^|\s)(?:at\s+)?(\b([01]?\d|2[0-3]):([0-5]\d)\b)(?:\s+|$)/i;
    const match24 = cleaned.match(twentyFourHourRegex);

    if (match24) {
      timeMatchString = match24[1].trim();
      hour = parseInt(match24[2], 10);
      minute = parseInt(match24[3], 10);
      remainder = cleaned.replace(match24[0], " ").trim();
    }
  }

  if (hour === null) {
    return {
      success: false,
      rawInput: rawText,
      error: "Could not parse time. Example: 11am chicago or 15:30 tokyo",
    };
  }

  // Clean remainder to isolate city/timezone
  let locationQuery = remainder
    .replace(/^(?:in|at|for|from)\s+/i, "")
    .replace(/\s+(?:to\s+.*)$/i, "") // ignore trailing 'to ...' for now
    .replace(/\s+time$/i, "") // strip trailing "time" (e.g. "NY time", "Chicago time")
    .replace(/\s+(?:today|tomorrow|yesterday)$/i, "")
    .replace(/^(?:today|tomorrow|yesterday)\s+/i, "")
    .trim();

  if (!locationQuery) {
    return {
      success: false,
      rawInput: rawText,
      error: "Missing city or timezone. Example: 11am chicago",
    };
  }

  const city = resolveLocation(locationQuery);
  if (!city) {
    return {
      success: false,
      rawInput: rawText,
      error: `Could not recognize city or timezone "${locationQuery}". Try a major city like Chicago, London, Tokyo, or an abbreviation like NY, SF, EST.`,
    };
  }

  return {
    success: true,
    parsedTime: {
      hour,
      minute,
      originalString: timeMatchString,
    },
    city,
    rawInput: rawText,
  };
}

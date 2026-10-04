import { CITY_TIMEZONES, TARGET_HUBS, type CityInfo } from "./tz-data";

export interface ParsedTime {
  hour: number; // 0-23
  minute: number; // 0-59
  originalString: string;
}

export interface TargetConversion {
  hubName: string;
  shortName: string;
  flag: string;
  timeString: string;
  timeZoneAbbr: string;
  dayDiff: number; // 0 for same day, +1 for tomorrow, -1 for yesterday
}

export interface ConversionResult {
  sourceCity: string;
  sourceTimeString: string;
  sourceZoneAbbr: string;
  conversions: TargetConversion[];
}

/**
 * Resolves a location or timezone string to a CityInfo entry.
 */
export function resolveLocation(input: string): CityInfo | null {
  const clean = input
    .toLowerCase()
    .trim()
    .replace(/[,\.]/g, " ")
    .replace(/\s+/g, " ");

  if (!clean) return null;

  // Direct lookup
  if (CITY_TIMEZONES[clean]) {
    return CITY_TIMEZONES[clean];
  }

  // Handle explicit UTC/GMT offset: e.g. utc+6, gmt-4, utc+5:30, gmt+0
  const offsetMatch = clean.match(/^(?:utc|gmt)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (offsetMatch) {
    const sign = offsetMatch[1];
    const hours = parseInt(offsetMatch[2], 10);
    const mins = offsetMatch[3] ? parseInt(offsetMatch[3], 10) : 0;
    if (hours >= 0 && hours <= 14 && mins >= 0 && mins <= 59) {
      // Note: Etc/GMT in IANA has inverted signs: Etc/GMT-6 is actually UTC+6.
      // So Etc/GMT-H represents +H offset.
      // We will handle UTC offsets by mapping directly or generating a clean label.
      const formattedOffset = `${sign}${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      // For standard whole hour offsets, we can map to standard Etc/GMT or specific cities
      const tzName = `UTC${sign}${hours}`;
      return {
        name: `UTC${formattedOffset}`,
        country: "",
        timeZone: `UTC${sign}${hours}`, // Handled in conversion calculation
      };
    }
  }

  // Partial match: check if clean string starts with a city key or matches key words
  for (const [key, value] of Object.entries(CITY_TIMEZONES)) {
    if (clean === key || clean.startsWith(key + " ") || clean.endsWith(" " + key)) {
      return value;
    }
  }

  return null;
}

/**
 * Accurately finds the UTC Date for a given local date & time in an IANA timezone
 * using native Intl.DateTimeFormat (no external timezone libraries needed).
 */
export function localTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number, // 0-23
  minute: number,
  timeZone: string
): Date {
  // If timezone is a synthetic UTC offset like UTC+5 or UTC-4
  const utcOffsetMatch = timeZone.match(/^UTC([+-])(\d{1,2})$/);
  if (utcOffsetMatch) {
    const sign = utcOffsetMatch[1] === "+" ? 1 : -1;
    const offsetHours = parseInt(utcOffsetMatch[2], 10);
    const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - sign * offsetHours * 3600 * 1000;
    return new Date(utcMillis);
  }

  // Initial estimate assuming UTC
  let estimateUtcMillis = Date.UTC(year, month - 1, day, hour, minute);

  // Refine guess by calculating the offset difference in the target timezone
  // (2 iterations is sufficient to resolve any DST offset shifts)
  for (let i = 0; i < 3; i++) {
    const date = new Date(estimateUtcMillis);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== "literal") {
        partMap[p.type] = parseInt(p.value, 10);
      }
    }

    // Handle 24 hour wrap if formatted as 24
    let formattedHour = partMap.hour ?? 0;
    if (formattedHour === 24) formattedHour = 0;

    const formattedUtc = Date.UTC(
      partMap.year,
      (partMap.month ?? 1) - 1,
      partMap.day,
      formattedHour,
      partMap.minute ?? 0,
      partMap.second ?? 0
    );

    const diff = formattedUtc - Date.UTC(year, month - 1, day, hour, minute, 0);
    if (diff === 0) {
      break;
    }
    estimateUtcMillis -= diff;
  }

  return new Date(estimateUtcMillis);
}

/**
 * Gets parts for a given Date in a specific timezone.
 */
function getPartsInTimeZone(date: Date, timeZone: string) {
  // Handle synthetic UTC offset
  const utcOffsetMatch = timeZone.match(/^UTC([+-])(\d{1,2})$/);
  if (utcOffsetMatch) {
    const sign = utcOffsetMatch[1] === "+" ? 1 : -1;
    const offsetHours = parseInt(utcOffsetMatch[2], 10);
    const adjustedDate = new Date(date.getTime() + sign * offsetHours * 3600 * 1000);
    const year = adjustedDate.getUTCFullYear();
    const month = adjustedDate.getUTCMonth() + 1;
    const day = adjustedDate.getUTCDate();
    const hours = adjustedDate.getUTCHours();
    const minutes = adjustedDate.getUTCMinutes();
    const isPm = hours >= 12;
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    const timeString = `${h12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${isPm ? "PM" : "AM"}`;
    return {
      year,
      month,
      day,
      timeString,
      timeZoneAbbr: timeZone,
    };
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  const parts = formatter.formatToParts(date);
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = "";
  let minute = "";
  let dayPeriod = "";
  let timeZoneAbbr = "";

  for (const p of parts) {
    if (p.type === "year") year = parseInt(p.value, 10);
    if (p.type === "month") month = parseInt(p.value, 10);
    if (p.type === "day") day = parseInt(p.value, 10);
    if (p.type === "hour") hour = p.value;
    if (p.type === "minute") minute = p.value;
    if (p.type === "dayPeriod") dayPeriod = p.value.toUpperCase();
    if (p.type === "timeZoneName") timeZoneAbbr = p.value;
  }

  const timeString = `${hour}:${minute} ${dayPeriod}`.trim();
  return { year, month, day, timeString, timeZoneAbbr };
}

/**
 * Calculates day difference between two calendar dates (YYYY-MM-DD).
 */
function calculateDayDiff(
  target: { year: number; month: number; day: number },
  source: { year: number; month: number; day: number }
): number {
  const dTarget = Date.UTC(target.year, target.month - 1, target.day);
  const dSource = Date.UTC(source.year, source.month - 1, source.day);
  return Math.round((dTarget - dSource) / (24 * 3600 * 1000));
}

/**
 * Main conversion method: converts a local time in source city to London, Tunisia, and Dhaka.
 */
export function convertCityTime(
  parsedTime: ParsedTime,
  city: CityInfo,
  referenceDate = new Date()
): ConversionResult {
  // Use referenceDate's current year/month/day in the source timezone as base
  const nowParts = getPartsInTimeZone(referenceDate, city.timeZone);
  const utcDate = localTimeToUtc(
    nowParts.year,
    nowParts.month,
    nowParts.day,
    parsedTime.hour,
    parsedTime.minute,
    city.timeZone
  );

  const sourceParts = getPartsInTimeZone(utcDate, city.timeZone);

  const conversions: TargetConversion[] = TARGET_HUBS.map((hub) => {
    const targetParts = getPartsInTimeZone(utcDate, hub.timeZone);
    const dayDiff = calculateDayDiff(targetParts, sourceParts);

    return {
      hubName: hub.name,
      shortName: hub.shortName,
      flag: hub.flag,
      timeString: targetParts.timeString,
      timeZoneAbbr: targetParts.timeZoneAbbr,
      dayDiff,
    };
  });

  return {
    sourceCity: city.name,
    sourceTimeString: sourceParts.timeString,
    sourceZoneAbbr: sourceParts.timeZoneAbbr,
    conversions,
  };
}

import { describe, it, expect } from "vitest";
import { parseQuery, cleanInputText } from "../src/parser";
import { resolveLocation, convertCityTime } from "../src/tz";
import { formatConversionCard } from "../src/formatter";

describe("Timezone Parser & Conversion Engine", () => {
  describe("cleanInputText", () => {
    it("strips bot mentions and slash commands", () => {
      expect(cleanInputText("@slg_tzbot 11am chicago")).toBe("11am chicago");
      expect(cleanInputText("@slg_tzbot convert 11am chicago")).toBe("11am chicago");
      expect(cleanInputText("/convert 3:30pm tokyo")).toBe("3:30pm tokyo");
      expect(cleanInputText("/convert@slg_tzbot 14:00 paris")).toBe("14:00 paris");
    });
  });

  describe("resolveLocation", () => {
    it("resolves cities and common abbreviations", () => {
      expect(resolveLocation("chicago")?.timeZone).toBe("America/Chicago");
      expect(resolveLocation("new york")?.timeZone).toBe("America/New_York");
      expect(resolveLocation("ny")?.timeZone).toBe("America/New_York");
      expect(resolveLocation("sf")?.timeZone).toBe("America/Los_Angeles");
      expect(resolveLocation("tokyo")?.timeZone).toBe("Asia/Tokyo");
      expect(resolveLocation("london")?.timeZone).toBe("Europe/London");
      expect(resolveLocation("tunis")?.timeZone).toBe("Africa/Tunis");
      expect(resolveLocation("dhaka")?.timeZone).toBe("Asia/Dhaka");
      expect(resolveLocation("est")?.timeZone).toBe("America/New_York");
    });

    it("resolves Cambridge prominence and Cambridge MA", () => {
      expect(resolveLocation("cambridge")?.timeZone).toBe("Europe/London");
      expect(resolveLocation("cambridge ma")?.timeZone).toBe("America/New_York");
    });
  });

  describe("parseQuery", () => {
    it("parses 12h time with city", () => {
      const res = parseQuery("11am chicago");
      expect(res.success).toBe(true);
      expect(res.parsedTime?.hour).toBe(11);
      expect(res.parsedTime?.minute).toBe(0);
      expect(res.city?.name).toBe("Chicago");
    });

    it("parses 12h time with minutes and PM", () => {
      const res = parseQuery("@slg_tzbot 3:30 pm tokyo");
      expect(res.success).toBe(true);
      expect(res.parsedTime?.hour).toBe(15);
      expect(res.parsedTime?.minute).toBe(30);
      expect(res.city?.name).toBe("Tokyo");
    });

    it("parses 24h format", () => {
      const res = parseQuery("/convert 14:15 paris");
      expect(res.success).toBe(true);
      expect(res.parsedTime?.hour).toBe(14);
      expect(res.parsedTime?.minute).toBe(15);
      expect(res.city?.name).toBe("Paris");
    });

    it("fails gracefully on missing city or invalid input", () => {
      const res1 = parseQuery("@slg_tzbot hello");
      expect(res1.success).toBe(false);
      expect(res1.error).toContain("Could not parse time");

      const res2 = parseQuery("11am");
      expect(res2.success).toBe(false);
      expect(res2.error).toContain("Missing city or timezone");
    });
  });

  describe("convertCityTime & formatConversionCard", () => {
    it("converts 11:00 AM Chicago correctly to London, Tunisia, and Dhaka", () => {
      const parseRes = parseQuery("11am chicago");
      expect(parseRes.success).toBe(true);

      // Reference date: Oct 5, 2025 (Chicago CDT = UTC-5, London BST = UTC+1, Tunis CET = UTC+1, Dhaka BST = UTC+6)
      // When 11am in CDT:
      // CDT (UTC-5) -> 16:00 UTC
      // London BST (UTC+1): 17:00 (5:00 PM)
      // Tunisia CET (UTC+1): 17:00 (5:00 PM)
      // Dhaka (UTC+6): 22:00 (10:00 PM)
      const refDate = new Date("2025-10-05T12:00:00Z");
      const conversion = convertCityTime(parseRes.parsedTime!, parseRes.city!, refDate);

      expect(conversion.sourceCity).toBe("Chicago");
      expect(conversion.conversions).toHaveLength(3);

      const london = conversion.conversions.find((c) => c.shortName === "London");
      const tunisia = conversion.conversions.find((c) => c.shortName === "Tunisia");
      const dhaka = conversion.conversions.find((c) => c.shortName === "Dhaka");

      expect(london?.timeString).toContain("05:00 PM");
      expect(london?.dayDiff).toBe(0);

      expect(tunisia?.timeString).toContain("05:00 PM");
      expect(tunisia?.dayDiff).toBe(0);

      expect(dhaka?.timeString).toContain("10:00 PM");
      expect(dhaka?.dayDiff).toBe(0);

      const card = formatConversionCard(conversion);
      expect(card).toContain("🕒 11:00 AM Chicago");
      expect(card).toContain("🇬🇧 05:00 PM London (UK)");
      expect(card).toContain("🇹🇳 05:00 PM Tunisia");
      expect(card).toContain("🇧🇩 10:00 PM Dhaka (BD)");
    });

    it("handles midnight rollover (+1 day)", () => {
      // 9:00 PM in Chicago is 21:00 CDT (02:00 UTC next day)
      // London BST: 03:00 AM (+1 day)
      // Tunisia CET: 03:00 AM (+1 day)
      // Dhaka: 08:00 AM (+1 day)
      const parseRes = parseQuery("9pm chicago");
      expect(parseRes.success).toBe(true);

      const refDate = new Date("2025-10-05T12:00:00Z");
      const conversion = convertCityTime(parseRes.parsedTime!, parseRes.city!, refDate);

      const card = formatConversionCard(conversion);
      expect(card).toContain("🇬🇧 03:00 AM London (UK) (+1 day)");
      expect(card).toContain("🇹🇳 03:00 AM Tunisia (+1 day)");
      expect(card).toContain("🇧🇩 08:00 AM Dhaka (BD) (+1 day)");
    });

    it("handles negative day rollover (-1 day)", () => {
      // 2:00 AM in Tokyo (JST = UTC+9) -> 17:00 UTC previous day
      // London BST (UTC+1): 18:00 (6:00 PM) previous day (-1 day)
      const parseRes = parseQuery("2am tokyo");
      expect(parseRes.success).toBe(true);

      const refDate = new Date("2025-10-05T12:00:00Z");
      const conversion = convertCityTime(parseRes.parsedTime!, parseRes.city!, refDate);

      const card = formatConversionCard(conversion);
      expect(card).toContain("(-1 day)");
    });
  });
});

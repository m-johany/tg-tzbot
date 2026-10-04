import { Bot } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { parseQuery } from "./parser";
import { convertCityTime } from "./tz";
import { formatConversionCard, getHelpMessage, getUsageHelp } from "./formatter";

export const BOT_INFO: UserFromGetMe = {
  id: 8974983694,
  is_bot: true,
  first_name: "TZ Convert",
  username: "slg_tzbot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: true,
  supports_guest_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  can_manage_bots: false,
  supports_join_request_queries: false,
};

export function createBot(token: string) {
  const bot = new Bot(token, { botInfo: BOT_INFO });

  // 1. /start command
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "👋 Hello! I am your Timezone Converter Bot.\n\n" +
      "Mention me with any city and time to convert it to London (UK), Tunisia, and Dhaka (BD).\n\n" +
      "👉 Example: `@slg_tzbot 11am chicago` or `/convert 3:30pm tokyo`\n\n" +
      "You can also use me in any chat via inline mode: `@slg_tzbot 11am chicago`",
      { parse_mode: "Markdown" }
    );
  });

  // 2. /help command
  bot.command("help", async (ctx) => {
    await ctx.reply(getHelpMessage(), { parse_mode: "Markdown" });
  });

  // 3. /convert command
  bot.command("convert", async (ctx) => {
    const text = ctx.match?.trim();
    const replyParams = ctx.message ? { reply_parameters: { message_id: ctx.message.message_id } } : {};

    if (!text) {
      await ctx.reply(getUsageHelp(), replyParams);
      return;
    }

    const parseRes = parseQuery(text);
    if (!parseRes.success || !parseRes.parsedTime || !parseRes.city) {
      await ctx.reply(parseRes.error || getUsageHelp(), replyParams);
      return;
    }

    const result = convertCityTime(parseRes.parsedTime, parseRes.city);
    const card = formatConversionCard(result);
    await ctx.reply(card, replyParams);
  });

  // 4. Mention in group chat or regular message in private DM
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    const isPrivate = ctx.chat.type === "private";
    const replyParams = { reply_parameters: { message_id: ctx.message.message_id } };

    // In groups, process if the bot is mentioned or replied to
    const lowerText = text.toLowerCase();
    const isMentioned =
      lowerText.includes("@slg_tzbot") ||
      Boolean(
        ctx.message.entities?.some(
          (e) =>
            e.type === "mention" &&
            text.substring(e.offset, e.offset + e.length).toLowerCase() === "@slg_tzbot"
        )
      ) ||
      ctx.message.reply_to_message?.from?.id === BOT_INFO.id;

    if (!isPrivate && !isMentioned) {
      return;
    }

    const parseRes = parseQuery(text);
    if (!parseRes.success || !parseRes.parsedTime || !parseRes.city) {
      // In groups, if explicitly mentioned, provide a helpful usage hint
      if (isMentioned || isPrivate) {
        await ctx.reply(parseRes.error || getUsageHelp(), replyParams);
      }
      return;
    }

    const result = convertCityTime(parseRes.parsedTime, parseRes.city);
    const card = formatConversionCard(result);
    await ctx.reply(card, replyParams);
  });

  // 5. Telegram Inline Query: typing @slg_tzbot 11am chicago in any chat
  bot.on("inline_query", async (ctx) => {
    const query = ctx.inlineQuery.query.trim();

    if (!query) {
      await ctx.answerInlineQuery([
        {
          type: "article",
          id: "help",
          title: "Type a time and city to convert",
          description: "Example: 11am chicago or 15:30 tokyo",
          input_message_content: {
            message_text: getHelpMessage(),
            parse_mode: "Markdown",
          },
        },
      ]);
      return;
    }

    const parseRes = parseQuery(query);
    if (!parseRes.success || !parseRes.parsedTime || !parseRes.city) {
      await ctx.answerInlineQuery([
        {
          type: "article",
          id: "invalid",
          title: "⚠️ Unrecognized format",
          description: parseRes.error || "Example: 11am chicago",
          input_message_content: {
            message_text: getUsageHelp(),
          },
        },
      ]);
      return;
    }

    const result = convertCityTime(parseRes.parsedTime, parseRes.city);
    const card = formatConversionCard(result);

    // Summary description for inline preview card
    const summary = result.conversions
      .map((c) => `${c.flag} ${c.timeString} ${c.shortName}`)
      .join(" • ");

    await ctx.answerInlineQuery(
      [
        {
          type: "article",
          id: `conv_${Date.now()}`,
          title: `🕒 ${result.sourceTimeString} ${result.sourceCity}`,
          description: summary,
          input_message_content: {
            message_text: card,
          },
        },
      ],
      {
        cache_time: 10,
      }
    );
  });

  return bot;
}

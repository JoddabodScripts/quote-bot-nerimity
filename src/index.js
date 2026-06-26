import { Client, Events } from "@nerimity/nerimity.js";
import dotenv from "dotenv";
import { generateQuoteImage } from "./canvasGenerator.js";
import FormData from "form-data";
import fetch from "node-fetch";

dotenv.config();

const client = new Client();
const TOKEN = process.env.TOKEN;

async function uploadToCatbox(buffer) {
  const formData = new FormData();
  formData.append("reqtype", "fileupload");
  formData.append("fileToUpload", Buffer.from(buffer), "quote.png");

  const res = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: formData,
    headers: { ...formData.getHeaders(), "User-Agent": "Mozilla/5.0" },
  });
  const url = await res.text();
  if (!url.startsWith("https://")) throw new Error(url);
  return url.trim();
}

function getMentionUsername(user) {
  return user?.username || user?.user?.username || user?.createdBy?.username || null;
}

function getMentionId(user) {
  return user?.id || user?.user?.id || user?.createdBy?.id || null;
}

async function resolveUserMentions(content, mentions = []) {
  const mentionMap = new Map();

  for (const user of mentions) {
    const id = getMentionId(user);
    const username = getMentionUsername(user);
    if (id && username) mentionMap.set(String(id), username);
  }

  const mentionIds = [...new Set(
    [...content.matchAll(/\[@:([^\]]+)\]/g)].map((m) => m[1]),
  )];

  for (const userId of mentionIds) {
    if (!mentionMap.has(userId)) {
      const cachedUser = client.users?.cache?.get(userId);
      if (cachedUser?.username) mentionMap.set(userId, cachedUser.username);
    }

    if (!mentionMap.has(userId) && userId === client.user?.id) {
      mentionMap.set(userId, client.user.username);
    }
  }

  return content.replace(/\[@:([^\]]+)\]/g, (match, userId) => {
    const username = mentionMap.get(userId);
    return username ? `@${username}` : match;
  });
}

async function resolveQuoteFromId(channelId, messageId) {
  try {
    const res = await fetch(
      `https://nerimity.com/api/channels/${channelId}/messages/${messageId}`,
      { headers: { Authorization: TOKEN } },
    );
    const data = await res.json();
    if (!data.content) return null;

    return {
      content: data.content,
      username: data.createdBy?.username || "User",
      avatar: data.createdBy?.avatar,
      userTag: data.createdBy?.tag,
      mentions: data.mentions || [],
    };
  } catch (e) {
    console.log("Failed to fetch quoted message:", e.message);
    return null;
  }
}

function resolveQuoteFromReply(rawMsg) {
  const reply = rawMsg?.replyMessages?.[0]?.replyToMessage;
  if (!reply?.content) return null;

  return {
    content: reply.content,
    username: reply.createdBy?.username || "User",
    avatar: reply.createdBy?.avatar,
    userTag: reply.createdBy?.tag,
    mentions: reply.mentions || [],
  };
}

async function resolveQuoteFromFallback(message, excludeUserId) {
  try {
    const msgs = await message.channel?.messages?.fetch({ limit: 20 });
    if (!msgs) return null;

    const msgList = [...msgs.values()].reverse();
    for (const m of msgList) {
      if (m.user?.bot || !m.content) continue;
      if (m.id === message.id || m.user?.id === excludeUserId) continue;

      return {
        content: m.content,
        username: m.user?.username || "User",
        avatar: m.raw?.createdBy?.avatar,
        userTag: m.user?.tag || m.raw?.createdBy?.tag,
        mentions: m.mentions || m.raw?.mentions || [],
      };
    }
  } catch {
    // Channel fetch failed — silently fall through
  }
  return null;
}

const PRESENCE_INTERVAL_MS = 10_000;
let activityIndex = 0;

function updatePresence() {
  try {
    const serverCount = client.servers?.cache?.size ?? 0;
    const activities = [
      { action: "Quoting", name: `in ${serverCount} servers!`, startedAt: Date.now() },
      { action: "Kindly requesting you to:", name: "invite me to your servers", startedAt: Date.now() },
    ];
    const activity = activities[activityIndex % activities.length];
    activityIndex += 1;
    client.user?.setActivity(activity);
  } catch (e) {
    console.error("Failed to update presence:", e.message);
  }
}

let ready = false;

client.on(Events.Ready, () => {
  ready = true;
  console.log(`Connected as ${client.user?.username}! (ID: ${client.user?.id})`);
  updatePresence();
  setInterval(updatePresence, PRESENCE_INTERVAL_MS);
});

let isProcessing = false;

client.on(Events.MessageCreate, async (msg) => {
  if (!ready || !msg.user || msg.user.id === client.user?.id) return;
  if (isProcessing) return;

  const content = msg.content || "";
  const botId = client.user?.id;
  const quoteMatch = content.match(/\[q:(\d+)\]/);
  const isPing = content.match(/\[@:(\d+)\]/)?.[1] === botId;
  if (!quoteMatch && !isPing) return;

  isProcessing = true;
  try {
    const quote =
      (quoteMatch && await resolveQuoteFromId(msg.channel?.id, quoteMatch[1])) ||
      resolveQuoteFromReply(msg.raw) ||
      (await resolveQuoteFromFallback(msg, msg.user?.id));

    if (!quote?.content) return;

    quote.content = await resolveUserMentions(quote.content, quote.mentions);

    const avatarUrl = quote.avatar
      ? `https://cdn.nerimity.com/${quote.avatar}`
      : null;

    const imageBuffer = await generateQuoteImage(
      quote.content.slice(0, 500),
      quote.username,
      client.user?.username || "Quote Bot",
      avatarUrl,
      quote.userTag,
    );

    const url = await uploadToCatbox(imageBuffer);
    await msg.reply(url);
  } catch (e) {
    console.error("Error:", e.message, e.stack);
  } finally {
    isProcessing = false;
  }
});

client.login(TOKEN);

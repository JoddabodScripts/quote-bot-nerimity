import { Client, Events } from "@nerimity/nerimity.js";
import dotenv from "dotenv";
import { generateQuoteImage } from "./canvasGenerator.js";
import FormData from "form-data";
import fetch from "node-fetch";

dotenv.config();

const client = new Client();
const TOKEN = process.env.TOKEN;
const userToken = process.env.USER_TOKEN;

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

async function getUsername(userId) {
  if (!userToken) return null;
  try {
    const res = await fetch(`https://nerimity.com/api/users/${userId}`, {
      headers: { Authorization: userToken }
    });
    const data = await res.json();
    return data.user?.username || null;
  } catch (e) {
    return null;
  }
}

let botId = null;
let isProcessing = false;

client.on(Events.Ready, () => {
  botId = client.user?.id;
  console.log(`Connected as ${client.user?.username}! (ID: ${botId})`);
});

client.on(Events.MessageCreate, async (msg) => {
  try {
    const message = msg;
    if (!botId || !message.user || message.user.id === botId) return;
    if (isProcessing) return;
    isProcessing = true;

    const content = message.content || "";
    // Check for either quote [q:msgId] or ping [@:botId]
    const quoteMatch = content.match(/\[q:(\d+)\]/);
    const pingMatch = content.match(/\[@:(\d+)\]/);
    const isQuote = quoteMatch || (pingMatch && pingMatch[1] === botId);
    if (!isQuote) {
      isProcessing = false;
      return;
    }

    let targetContent = null;
    let targetUsername = null;
    let targetAvatar = null;
    let targetUserId = null;

    // Check for built-in quote format [q:messageId]
    if (quoteMatch) {
      const quotedMsgId = quoteMatch[1];
      try {
        const msgRes = await fetch(`https://nerimity.com/api/channels/${message.channel?.id}/messages/${quotedMsgId}`, {
          headers: { Authorization: process.env.TOKEN }
        });
        const msgData = await res.json();
        if (msgData.content) {
          targetContent = msgData.content;
          targetUsername = msgData.createdBy?.username || "User";
          targetAvatar = msgData.createdBy?.avatar;
          targetUserId = msgData.createdBy?.id;
        }
      } catch (e) {
        console.log("Failed to fetch quoted message:", e.message);
      }
    }

    const rawMsg = message.raw;
    if (rawMsg?.replyMessages?.length > 0) {
      const replyData = rawMsg.replyMessages[0];
      if (replyData?.replyToMessage) {
        targetContent = replyData.replyToMessage.content;
        targetUsername = replyData.replyToMessage.createdBy?.username || "User";
        targetAvatar = replyData.replyToMessage.createdBy?.avatar;
        targetUserId = replyData.replyToMessage.createdBy?.id;
      }
    }

    if (!targetContent) {
      const pingerId = message.user?.id;
      const msgs = await message.channel?.messages?.fetch({ limit: 20 });
      const msgList = [...(msgs?.values() || [])].reverse();
      for (const m of msgList) {
        if (!m.user?.bot && m.content && m.id !== message.id && m.user?.id !== pingerId) {
          targetContent = m.content;
          targetUsername = m.user?.username || "User";
          targetAvatar = m.raw?.createdBy?.avatar;
          targetUserId = m.user?.id;
          break;
        }
      }
    }

    if (!targetContent || !targetUsername) {
      isProcessing = false;
      return;
    }

    // Replace ping references [@:userid] with actual usernames
    const pingMatches = targetContent.match(/\[@:(\d+)\]/g);
    if (pingMatches) {
      for (const match of pingMatches) {
        const userId = match.match(/\[@:(\d+)\]/)[1];
        const username = await getUsername(userId);
        if (username) {
          targetContent = targetContent.replace(match, `@${username}`);
        }
      }
    }

    let avatarUrl = null;
    if (targetAvatar) {
      avatarUrl = `https://cdn.nerimity.com/${targetAvatar}`;
    }

    const imageBuffer = await generateQuoteImage(
      targetContent.slice(0, 500),
      targetUsername,
      client.user?.username || "Quote Bot",
      avatarUrl
    );

    const url = await uploadToCatbox(imageBuffer);
    await message.reply(url);
    
  } catch (e) {
    console.error("Error:", e.message, e.stack);
  } finally {
    isProcessing = false;
  }
});

client.login(process.env.TOKEN);

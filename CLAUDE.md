# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quote Bot for Nerimity — a Discord-like chat bot that generates quote images from user messages. When a user mentions the bot or sends `[q:messageId]`, it fetches the quoted message, generates a stylized quote image with the user's avatar, and uploads it to Catbox. The image URL is then posted back to the channel.

## Architecture

### Core Components

**src/index.js** — Main bot entry point. Listens for two trigger types:
- `[q:<messageId>]` — fetches a specific message by ID from the Nerimity API
- `[@:botId]` — ping-mentions the bot directly

The flow for `[q:<messageId>]`:
1. Match the quote ID in the message content
2. Fetch the message via `fetch(https://nerimity.com/api/channels/{channelId}/messages/{messageId})` using `process.env.TOKEN`
3. Extract: `content`, `createdBy.username`, `createdBy.avatar`, `createdBy.id`, `createdBy.tag`, `mentions`
4. Replace any `[@:userId]` pings in the quoted text with actual usernames via `resolveUserMentions()` (uses the `mentions` array, the client cache, the bot's own name, and finally the user API with `USER_TOKEN`)
5. Generate the image with `generateQuoteImage()`
6. Upload to Catbox via `uploadToCatbox()`
7. Post the resulting URL back to the channel with `message.reply(url)`

Additional target-resolution paths (used when no `[q:...]` match is present):
- **Reply** — if `message.raw.replyMessages` has entries, the target is `replyMessages[0].replyToMessage`
- **Fallback** — fetches the last 20 channel messages and picks the first non-bot message that wasn't sent by the pinger

**src/canvasGenerator.js** — Image generation module. Produces a **1200×675px** image with:
- User avatar on the left (`avatarWidth = 570`), cover-scaled to fill the height at a 1.08× multiplier and grayscaled + slightly dimmed via `sharp`
- A dark overlay (`rgba(0,0,0,0.22)`) plus a left-to-right side shade over the avatar
- A black fade gradient spanning x=260 → x=650 so the avatar blends into black
- A solid black panel from x=650 to the right edge
- Quote text centered (≈x=831) in white bold Arial, auto-fit from 60px down to ~38px, capped at **4 lines** with ellipsis truncation
- Username rendered as `- {name}` (italic, white) below the quote
- Handle rendered as `@{name}:{tag}` (or `@{name}` when no tag) in gray below the username
- Bot name right-aligned in the bottom-right corner

### Dependencies

| Package | Purpose |
|---------|--------|
| @nerimity/nerimity.js | Chat client library for connecting to Nerimity |
| canvas | 2D canvas API for drawing text and gradients |
| sharp | Grayscales/dims avatars and converts WebP → PNG before drawing |
| node-fetch | Fetch API for API calls (Catbox, Nerimity) |
| form-data | POSTing image data to Catbox |
| dotenv | Loads TOKEN, USER_TOKEN from environment |

### Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| TOKEN | Yes | Nerimity bot token (also used for the message fetch API calls) |
| USER_TOKEN | Optional | Nerimity user token for username lookup via the user API |

`.env.example` ships only `TOKEN`. (`.env` may contain `SETUP_PASSWORD`, but it is not referenced anywhere in the code.)

## Commands

| Command | Description |
|--------|-------------|
| `npm start` | Start the bot (single run) |
| `npm run dev` | Alias for `bash start.sh` — **note: `start.sh` is currently missing from the repo, so this fails. `npm start` is the working entry point.** |

## Development Notes

- Concurrency is guarded by a single global `isProcessing` flag (`src/index.js`). While one quote is being generated, **every** incoming message from any user is dropped. There is no per-user or per-channel queue.
- Avatar URLs are transformed to `https://cdn.nerimity.com/{avatarId}` format
- Content is truncated to 500 characters (`targetContent.slice(0, 500)`) before image generation
- The quoted-message fetch (`src/index.js`) uses `process.env.TOKEN`, while username lookup (`getUsername`) uses `USER_TOKEN`
- `ReplyMessages` in the API response must be accessed as `message.raw.replyMessages` — the `raw` property is on the message object, not on `msg` directly
- If `USER_TOKEN` is missing, `getUsername()` returns `null` but the bot continues without failing
- Avatar loading errors are caught silently — if it fails, a plain gradient box is drawn instead
- `wrapText()` itself does not limit line count; line capping happens in `fitQuoteLines()` via the `maxLines` argument (4 in `generateQuoteImage`), with ellipsis truncation on the final line
- `fitQuoteLines()` decrements `fontSize` by 4 from 60 down toward 38, but the loop's last visited value is **40** (38 is never reached), so the `fontSize === 38` fallback branch is unreachable. A quote that still doesn't fit at 40px causes the function to fall through and return `undefined`; the resulting `TypeError` is caught by the outer handler, so the bot survives but silently produces no quote.
- `client.login(process.env.TOKEN)` is called at the end of `src/index.js`; there is no startup check that `TOKEN` is present.

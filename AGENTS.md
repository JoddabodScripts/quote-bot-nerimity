# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quote Bot for Nerimity — a Discord-like chat bot that generates quote images from user messages. When a user mentions the bot or sends `[q:messageId]`, it fetches the quoted message, generates a stylized quote image with the user's avatar, and uploads it to Catbox. The image is then posted back to the channel.

## Architecture

### Core Components

**src/index.js** — Main bot entry point. Listens for two message types:
- `[q:<messageId>]` — fetches a specific message by ID from the Nerimity API
- `[@:botId]` — ping-mentions the bot directly

The flow for `[q:<messageId>]`:
1. Match the quote ID in the message content
2. Fetch the message via `fetch(https://nerimity.com/api/channels/{channelId}/messages/{messageId})` using `TOKEN`
3. Extract: `content`, `createdBy.username`, `createdBy.avatar`, `createdBy.id`
4. Replace any `[@:userId]` pings in the quoted text with actual usernames using `USER_TOKEN`
5. Generate the image with `generateQuoteImage()`
6. Upload to Catbox via `uploadToCatbox()`
7. Post the image URL back to the channel

**src/canvasGenerator.js** — Image generation module. Produces an 800x500px image with:
- User avatar on the left, scaled to fill height with 5% overflow for edge blending
- Black panel on the right starting at x=300 (no gap to avatar)
- 80px linear gradient fade from black into the avatar area
- Quote text centered in white, username below in Georgia, bot name in bottom-right corner
- Text wrapping limited to 5 lines max

### Dependencies

| Package | Purpose |
|---------|--------|
| @nerimity/nerimity.js | Chat client library for connecting to Nerimity |
| canvas | 2D canvas API for drawing text and gradients |
| sharp | Converts WebP avatars to PNG before drawing |
| node-fetch | Fetch API for API calls (Catbox, Nerimity) |
| form-data | POSTing image data to Catbox |
| dotenv | Loads TOKEN, USER_TOKEN from environment |

### Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| TOKEN | Yes | Nerimity bot token |
| USER_TOKEN | Optional | Nerimity user token for username lookup |
| SETUP_PASSWORD | Optional | Unknown usage (currently in .env but not referenced) |

## Commands

| Command | Description |
|--------|-------------|
| `npm start` | Start the bot (single run) |
| `bash start.sh` | Dev mode with auto-restart on crash |
| `bash ascii_art.sh` | Display ASCII banner |
| `npm run dev` | Alias for `bash start.sh` |

## Development Notes

- The bot uses `isProcessing` flag to prevent double-processing during image generation
- Avatar URLs are transformed to `https://cdn.nerimity.com/{avatarId}` format
- Content is truncated to 500 characters to prevent oversized images
- ReplyMessages path in the API response must be accessed as `raw.replyMessages` — the `raw` property is present on the message object, not directly on `msg`
- The API call in line 75 uses `process.env.TOKEN` (not `userToken`)
- If `USER_TOKEN` is missing, `getUsername()` returns `null` but the bot continues without failing
- Avatar loading errors are caught silently — if it fails, a plain colored box is drawn instead
- `wrapText()` limits output to 5 lines to avoid overflow
- The final `ctx.fillText(botName, ...)` call at line 158 is a duplicate of line 152 — both write the same text at the same position

import { createCanvas, loadImage } from 'canvas';
import fetch from 'node-fetch';
import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 675;

function drawCoverImage(ctx, image, x, y, width, height, scaleMultiplier = 1) {
  const scale = Math.max(width / image.width, height / image.height) * scaleMultiplier;
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const drawX = x + (width - drawW) / 2;
  const drawY = y + (height - drawH) / 2;
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
}

function wrapText(ctx, text, maxWidth) {
  const paragraphs = String(text || '').trim().split(/\n+/);
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.replace(/\s+/g, ' ').split(' ').filter(Boolean);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
  }

  return lines.length ? lines : [''];
}

function fitQuoteLines(ctx, quoteText, maxWidth, maxLines) {
  for (let fontSize = 60; fontSize >= 38; fontSize -= 4) {
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    const wrappedLines = wrapText(ctx, quoteText, maxWidth);
    const fits = wrappedLines.length <= maxLines;

    if (fits || fontSize === 38) {
      const lines = wrappedLines.slice(0, maxLines);
      if (!fits) {
        let lastLine = lines[maxLines - 1];
        while (lastLine.length > 1 && ctx.measureText(`${lastLine}…`).width > maxWidth) {
          lastLine = lastLine.slice(0, -1).trimEnd();
        }
        lines[maxLines - 1] = `${lastLine}…`;
      }

      return { fontSize, lines };
    }
  }
}

async function generateQuoteImage(quoteText, username, botName, avatarUrl = null, userTag = null) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const avatarWidth = 570;
  let avatarLoaded = false;

  if (avatarUrl) {
    try {
      const res = await fetch(avatarUrl);
      const imageBuffer = Buffer.from(await res.arrayBuffer());
      const pngBuffer = await sharp(imageBuffer)
        .grayscale()
        .modulate({ brightness: 0.95 })
        .png()
        .toBuffer();
      const avatarImg = await loadImage(pngBuffer);

      drawCoverImage(ctx, avatarImg, 0, 0, avatarWidth, HEIGHT, 1.08);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, avatarWidth, HEIGHT);
      avatarLoaded = true;
    } catch (e) {
      console.log("Avatar load failed:", e.message);
    }
  }

  if (!avatarLoaded) {
    const fallback = ctx.createLinearGradient(0, 0, avatarWidth, HEIGHT);
    fallback.addColorStop(0, '#4b4b4b');
    fallback.addColorStop(1, '#171717');
    ctx.fillStyle = fallback;
    ctx.fillRect(0, 0, avatarWidth, HEIGHT);
  }

  const sideShade = ctx.createLinearGradient(0, 0, avatarWidth, 0);
  sideShade.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
  sideShade.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)');
  sideShade.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
  ctx.fillStyle = sideShade;
  ctx.fillRect(0, 0, avatarWidth, HEIGHT);

  const fade = ctx.createLinearGradient(260, 0, 650, 0);
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  fade.addColorStop(0.5, 'rgba(0, 0, 0, 0.72)');
  fade.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.fillStyle = fade;
  ctx.fillRect(260, 0, 390, HEIGHT);

  ctx.fillStyle = '#000000';
  ctx.fillRect(650, 0, WIDTH - 650, HEIGHT);

  const textStart = 540;
  const textWidth = WIDTH - textStart - 78;
  const centerX = textStart + textWidth / 2;
  const maxQuoteLines = 4;
  const { fontSize, lines } = fitQuoteLines(ctx, quoteText, textWidth, maxQuoteLines);
  const lineHeight = fontSize * 1.24;
  const quoteHeight = lines.length * lineHeight;
  const metaGap = 28;
  const displayNameSize = 28;
  const handleSize = 20;
  const groupHeight = quoteHeight + metaGap + displayNameSize + 8 + handleSize;
  let y = (HEIGHT - groupHeight) / 2 + lineHeight * 0.85;

  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  for (const line of lines) {
    ctx.fillText(line, centerX, y);
    y += lineHeight;
  }

  y += metaGap;
  ctx.font = `italic ${displayNameSize}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`- ${username}`, centerX, y);

  y += displayNameSize + 8;
  ctx.font = `${handleSize}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = '#9a9a9a';
  const handle = userTag ? `@${username}:${userTag}` : `@${username}`;
  ctx.fillText(handle, centerX, y);

  ctx.font = '22px Arial, Helvetica, sans-serif';
  ctx.fillStyle = '#9a9a9a';
  ctx.textAlign = 'right';
  ctx.fillText(botName, WIDTH - 30, HEIGHT - 36);

  return canvas.toBuffer();
}

export { generateQuoteImage };

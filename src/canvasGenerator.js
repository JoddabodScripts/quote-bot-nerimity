import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';

const WIDTH = 700;
const HEIGHT = 450;

async function convertWebpToPng(buffer) {
  return await sharp(buffer).png().toBuffer();
}

function wrapText(text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.55));

  for (const word of words) {
    if (currentLine.length + word.length + 1 > charsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 5);
}

async function generateQuoteImage(quoteText, username, botName, avatarUrl = null) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // FULL CANVAS - white background first
  const imageData = ctx.createImageData(WIDTH, HEIGHT);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = 255; imageData.data[i+1] = 255; imageData.data[i+2] = 255; imageData.data[i+3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  // Avatar on left - fills full height with slight overflow for edge overlap
  const avatarWidth = 450;
  let avatarLoaded = false;
  if (avatarUrl) {
    try {
      let imageBuffer;
      const res = await fetch(avatarUrl);
      const arrayBuffer = await res.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      if (avatarUrl.includes('.webp')) {
        imageBuffer = await convertWebpToPng(imageBuffer);
      }
      const avatarImg = await loadImage(imageBuffer);

      // Scale to fill full height exactly, then add 15% overflow for edge effect
      const scaleX = avatarWidth / avatarImg.width;
      const scaleY = HEIGHT / avatarImg.height; // Full height
      const baseScale = scaleX < scaleY ? scaleX : scaleY; // Fit within width
      const overflowScale = baseScale * 1.15; // 15% overflow
      const drawW = avatarImg.width * overflowScale;
      const drawH = avatarImg.height * overflowScale;

      // Position centered horizontally, centered vertically
      const avatarX = (avatarWidth - drawW) / 2;
      const avatarY = (HEIGHT - drawH) / 2; // Center vertically
      ctx.drawImage(avatarImg, avatarX, avatarY, drawW, drawH);

      // Greyscale filter with soft radial gradient (darker edges, lighter center)
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const gradient = ctx.createRadialGradient(
        avatarX + drawW / 2,
        avatarY + drawH / 2,
        drawW / 2 * 0.35,
        avatarX + drawW / 2,
        avatarY + drawH / 2,
        drawW / 2
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.6, '#808080');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(avatarX, avatarY, drawW, drawH);
      ctx.restore();
      avatarLoaded = true;
    } catch (e) {
      console.log("Avatar load failed:", e.message);
    }
  }

  if (!avatarLoaded) {
    const avatarBg = ctx.createImageData(avatarWidth, HEIGHT);
    for (let i = 0; i < avatarBg.data.length; i += 4) {
      avatarBg.data[i] = 99; avatarBg.data[i+1] = 102; avatarBg.data[i+2] = 229; avatarBg.data[i+3] = 255;
    }
    ctx.putImageData(avatarBg, 0, 0);
  }

  // RIGHT SIDE - black starting at x=300 (original position)
  const rightStart = 300;  // Original position - no gap between avatar and black
  const rightWidth = WIDTH - rightStart;

  ctx.fillStyle = 'black';
  ctx.fillRect(rightStart, 0, rightWidth, HEIGHT);

  // TEXT LAYOUT - quote with username below
  const quoteFontSize = 48;
  const tagLineFont = 'italic 20px Arial, sans-serif';
  const botTagFont = '16px Arial, sans-serif';

  // Quote text centered in the middle of right side
  const quote = `"${quoteText}"`;
  const textLines = wrapText(quote, rightWidth - 80, quoteFontSize);

  ctx.font = `bold ${quoteFontSize}px Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';

  // Center vertically in available space
  const centerX = rightStart + rightWidth / 2;
  const centerY = HEIGHT / 2 - ((textLines.length * 65) / 2) + 80;

  let currentY = centerY - ((textLines.length * 65) / 2);
  for (const line of textLines) {
    ctx.fillText(line, centerX, currentY);
    currentY += 65;
  }

  // Username tag below the quote
  const tagLine = `— ${username}`;
  ctx.font = tagLineFont;
  ctx.fillStyle = '#aaaaaa';
  ctx.textAlign = 'center';
  ctx.fillText(tagLine, centerX, currentY + 60);

  // Bot's display name at bottom right corner
  ctx.font = botTagFont;
  ctx.fillStyle = '#777777';
  ctx.textAlign = 'right';
  ctx.fillText(botName, WIDTH - 20, HEIGHT - 45);

  return canvas.toBuffer();
}

export { generateQuoteImage };
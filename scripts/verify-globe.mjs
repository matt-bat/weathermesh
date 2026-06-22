import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.env.GLOBE_URL ?? 'http://localhost:3000/globe.html';
const screenshotDir = process.env.GLOBE_SCREENSHOT_DIR ?? '/tmp/aggregate-weather-globe';
const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForFunction(() => {
      const status = document.querySelector('#status')?.textContent ?? '';
      return !status.toLowerCase().includes('loading');
    }, { timeout: 30000 });

    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const status = document.querySelector('#status')?.textContent ?? '';
      const level = document.querySelector('#levelLabel')?.textContent ?? '';
      const selected = document.querySelector('#selectedLabel')?.textContent ?? '';
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(4 * 25);
      let nonBlack = 0;

      if (context) {
        for (let index = 0; index < 25; index += 1) {
          const x = Math.floor(width * ((index % 5) + 0.5) / 5);
          const y = Math.floor(height * (Math.floor(index / 5) + 0.5) / 5);
          context.readPixels(x, y, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixels.subarray(index * 4, index * 4 + 4));
        }
        for (let index = 0; index < pixels.length; index += 4) {
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          const a = pixels[index + 3];
          if (a > 0 && (r + g + b) > 20) nonBlack += 1;
        }
      }

      return {
        status,
        level,
        selected,
        canvasWidth: width,
        canvasHeight: height,
        hasContext: Boolean(context),
        nonBlack,
      };
    });

    if (errors.length > 0) {
      throw new Error(`${viewport.name} console/page errors: ${errors.join(' | ')}`);
    }
    if (!result.hasContext) {
      throw new Error(`${viewport.name} globe did not expose a WebGL context.`);
    }
    if (result.nonBlack < 4) {
      throw new Error(`${viewport.name} globe canvas appears blank: ${JSON.stringify(result)}`);
    }
    if (!result.status || result.status.toLowerCase().includes('failed')) {
      throw new Error(`${viewport.name} map status is invalid: ${result.status}`);
    }

    const screenshotPath = `${screenshotDir}/globe-${viewport.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`${viewport.name}: ok ${result.canvasWidth}x${result.canvasHeight}, nonBlack=${result.nonBlack}, level=${result.level}, screenshot=${screenshotPath}`);
    await page.close();
  }
} finally {
  await browser.close();
}

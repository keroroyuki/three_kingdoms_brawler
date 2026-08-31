/* 三国战纪 · 性能探测 */
'use strict';
const { chromium } = require('C:/Users/14512/.workbuddy/binaries/node/versions/22.22.2-2/node_modules/playwright-core');
const CHROME = process.env.CHROME_BIN || 'C:/Users/14512/.agent-browser/browsers/chrome-152.0.7977.64/chrome.exe';
const URL = process.env.GAME_URL || 'http://127.0.0.1:8787/index.html';

(async () => {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
    const page = await browser.newPage({ viewport: { width: 900, height: 720 } });

    // 测量加载时间
    const t0 = Date.now();
    await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction('window.GAME && window.GAME.frames > 5', {}, { timeout: 3000 });
    const loadMs = Date.now() - t0;

    // 进入战斗后采样帧率
    await page.waitForTimeout(1200); // title
    await page.keyboard.press('Enter'); await page.waitForTimeout(400); // select
    await page.keyboard.press('Enter'); await page.waitForTimeout(600); // intro
    await page.keyboard.press('Enter'); await page.waitForTimeout(500); // play

    const fps = await page.evaluate(async () => {
        const g = window.GAME;
        const f0 = g.frames;
        const t0 = performance.now();
        await new Promise(r => setTimeout(r, 2000));
        const f1 = g.frames;
        const t1 = performance.now();
        return { fps: ((f1 - f0) * 1000 / (t1 - t0)).toFixed(1), frames: f1 };
    });

    console.log('加载时间 (ms):', loadMs);
    console.log('平均 FPS (战斗):', fps.fps, '总帧数:', fps.frames);

    // 内存粗略估计：canvas 像素数
    const mem = await page.evaluate(() => {
        let px = 0;
        for (const c of document.querySelectorAll('canvas')) px += c.width * c.height;
        const offscreen = window.__offscreenPixels || 0;
        return { domPixels: px, offscreenPixels: offscreen };
    });
    console.log('DOM canvas 像素:', mem.domPixels, '(约', (mem.domPixels * 4 / 1024 / 1024).toFixed(2), 'MB)');

    await browser.close();
})();

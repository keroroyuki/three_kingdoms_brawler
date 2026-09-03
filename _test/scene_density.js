/* 三国战纪 · 场景密度体检
 * 统计各关卡中景 / 前景离屏画布上「有内容」的像素覆盖率，
 * 并分段采样，确认装饰元素铺满整幅画布而非堆在左端。
 */
'use strict';
const { chromium } = require('C:/Users/14512/.workbuddy/binaries/node/versions/22.22.2-2/node_modules/playwright-core');
const CHROME = process.env.CHROME_BIN || 'C:/Users/14512/.agent-browser/browsers/chrome-152.0.7977.64/chrome.exe';
const URL = process.env.GAME_URL || 'file:///D:/tmp/work/three_kingdoms_brawler/index.html';

(async () => {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
    const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
    await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction('window.GAME && window.GAME.frames > 5', {}, { timeout: 5000 });

    const out = await page.evaluate(() => {
        /** 统计某张离屏画布上 alpha>8 的像素覆盖率，并分 8 段给出分段覆盖率 */
        function scan(cv, y0, y1) {
            const c = cv.getContext('2d');
            const H = Math.min(cv.height, y1) - y0;
            const d = c.getImageData(0, y0, cv.width, H).data;
            const SEG = 8, segW = cv.width / SEG;
            const hit = new Array(SEG).fill(0), tot = new Array(SEG).fill(0);
            let all = 0, allTot = 0;
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < cv.width; x++) {
                    const a = d[(y * cv.width + x) * 4 + 3];
                    const s = Math.min(SEG - 1, Math.floor(x / segW));
                    tot[s]++; allTot++;
                    if (a > 8) { hit[s]++; all++; }
                }
            }
            return {
                w: cv.width, h: cv.height,
                cover: +(all / allTot * 100).toFixed(2),
                seg: hit.map((v, i) => +(v / tot[i] * 100).toFixed(2))
            };
        }
        /** 横贯型曲线（如坡地）的首尾闭合检查：首尾同高才不会在平铺处出现台阶 */
        function seam(sc) {
            if (typeof sc._slopeY !== 'function') return 0;
            return +Math.abs(sc._slopeY(0) - sc._slopeY(sc.width)).toFixed(3);
        }
        const res = {};
        for (const theme of ['plains', 'fire', 'palace']) {
            const sc = makeScene(theme);
            res[theme] = {
                mid: scan(sc.mid, 110, 150),
                fore: scan(sc.fore, 0, sc.fore.height),
                seam: seam(sc)
            };
        }
        return res;
    });

    for (const [theme, r] of Object.entries(out)) {
        const name = { plains: '第一关 涿郡', fire: '第二关 博望坡', palace: '第三关 洛阳' }[theme];
        console.log(`\n${name}  中景 ${r.mid.w}x${r.mid.h}`);
        console.log(`  中景轮廓带覆盖率 ${r.mid.cover}%   分段: ${r.mid.seg.join(' | ')}`);
        console.log(`  前景覆盖率 ${r.fore.cover}%   分段: ${r.fore.seg.join(' | ')}`);
        const bad = [];
        if (r.seam > 0.01) bad.push(`横贯曲线首尾高差 ${r.seam}px`);
        const segs = r.mid.seg;
        if (Math.max(...segs) - Math.min(...segs) > 22) bad.push(`中景分段不匀 ${Math.min(...segs)}~${Math.max(...segs)}%`);
        console.log(`  首尾闭合高差 ${r.seam}px  ${bad.length ? '⚠ ' + bad.join('，') : '✅'}`);
    }

    await browser.close();
})();

/* 三国战纪 · 美术自检
 * 把每个角色（全身）与每种兵器（特写）画到离屏画布，统计非透明像素与包围盒，
 * 用于发现「兵器没画出来 / 画飞出画面 / 绘制抛异常」这类问题。
 */
'use strict';
const { chromium } = require('C:/Users/14512/.workbuddy/binaries/node/versions/22.22.2-2/node_modules/playwright-core');
const CHROME = process.env.CHROME_BIN || 'C:/Users/14512/.agent-browser/browsers/chrome-152.0.7977.64/chrome.exe';
const URL = process.env.GAME_URL || 'file:///D:/tmp/work/three_kingdoms_brawler/index.html';

(async () => {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
    const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction('window.GAME && window.GAME.frames > 5', {}, { timeout: 5000 });

    const r = await page.evaluate(() => {
        function stat(cv, thr) {
            const c = cv.getContext('2d');
            const t = thr == null ? 8 : thr;
            const d = c.getImageData(0, 0, cv.width, cv.height).data;
            let n = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
            for (let y = 0; y < cv.height; y++) {
                for (let x = 0; x < cv.width; x++) {
                    if (d[(y * cv.width + x) * 4 + 3] > t) {
                        n++;
                        if (x < x0) x0 = x; if (x > x1) x1 = x;
                        if (y < y0) y0 = y; if (y > y1) y1 = y;
                    }
                }
            }
            if (!n) return { n: 0 };
            return { n, w: x1 - x0 + 1, h: y1 - y0 + 1, x0, x1, y0, y1 };
        }

        const out = { figures: [], weapons: [], items: [], breakables: [], errors: [] };

        // —— 掉落道具 / 可破坏物：对齐到画布中心的临时变换 ——
        const cvI = document.createElement('canvas');
        cvI.width = 140; cvI.height = 110;
        const ci = cvI.getContext('2d');
        const refX = VIEW.W / 2, refY = screenY(1.5);
        const paintEntity = (make, label, bucket) => {
            ci.setTransform(1, 0, 0, 1, 0, 0);
            ci.clearRect(0, 0, 140, 110);
            try {
                ci.translate(70 - refX, 58 - refY);
                make();
            } catch (e) { out.errors.push(`${label}: ${e.message}`); return; }
            ci.setTransform(1, 0, 0, 1, 0, 0);
            // 阈值 200：道具外有一层径向发光，会把包围盒统一撑成光晕大小，
            // 只统计不透明像素才能量到图标本体
            out[bucket].push({ key: label, ...stat(cvI, 200) });
        };
        for (const key of Object.keys(ITEM_KINDS)) {
            paintEntity(() => {
                const it = new Item(window.GAME, { kind: key, x: window.GAME.cam.x, z: 1.5, y: 0 });
                it.grounded = true; it.t = 0; it.life = 0;
                it.draw(ci);
            }, key, 'items');
        }
        for (const key of ['crate', 'urn']) {
            paintEntity(() => {
                const b = new Breakable(window.GAME, { kind: key, x: window.GAME.cam.x, z: 1.5 });
                b.draw(ci);
            }, key, 'breakables');
        }

        // —— 全身立绘 ——
        const cvF = document.createElement('canvas');
        cvF.width = 320; cvF.height = 300;
        const cf = cvF.getContext('2d');
        for (const key of Object.keys(LOOKS)) {
            cf.clearRect(0, 0, 320, 300);
            try {
                const s = Fig.solve(Fig.idle(0.4));
                cf.save(); cf.translate(160, 285); cf.scale(74, 74);
                Fig.draw(cf, LOOKS[key], s, { time: 0.4, facing: 1 });
                cf.restore();
            } catch (e) { out.errors.push(`${key}: ${e.message}`); continue; }
            const st = stat(cvF);
            out.figures.push({ key, ...st });
        }

        // —— 兵器特写：单独调用武器分支 ——
        const cvW = document.createElement('canvas');
        cvW.width = 420; cvW.height = 200;
        const cw = cvW.getContext('2d');
        const seen = new Set(Object.values(LOOKS).map(l => l.weapon).filter(Boolean));
        for (const wp of seen) {
            cw.clearRect(0, 0, 420, 200);
            const look = Object.assign({}, LOOKS.guanyu, { weapon: wp });
            try {
                const s = Fig.solve(Fig.idle(0.4));
                cw.save(); cw.translate(120, 100); cw.scale(78, 78);
                Fig.draw(cw, look, s, { time: 0.4, facing: 1 });
                cw.restore();
            } catch (e) { out.errors.push(`weapon ${wp}: ${e.message}`); continue; }
            const st = stat(cvW);
            out.weapons.push({ wp, ...st });
        }
        return out;
    });

    let bad = 0;
    console.log('\n=== 兵器特写（实占像素 / 包围盒）===');
    for (const w of r.weapons) {
        if (!w.n) { console.log(`  ✗ ${w.wp}: 未绘制`); bad++; continue; }
        // 兵器应向右伸出：包围盒右缘应明显越过躯干中心 (x=120)
        const reach = w.x1 - 120;
        const flag = reach < 60 ? '⚠ 偏短' : (w.x1 >= 419 ? '⚠ 触右边界' : '✅');
        if (flag !== '✅') bad++;
        console.log(`  ${flag === '✅' ? '·' : '!'} ${w.wp.padEnd(10)} 像素 ${String(w.n).padStart(6)}  包围盒 ${w.w}x${w.h}  右伸 ${reach}px  ${flag}`);
    }

    console.log('\n=== 全身立绘 ===');
    for (const f of r.figures) {
        if (!f.n) { console.log(`  ✗ ${f.key}: 未绘制`); bad++; continue; }
        const flag = (f.x0 <= 0 || f.x1 >= 319 || f.y0 <= 0) ? '⚠ 出画' : '✅';
        if (flag !== '✅') bad++;
        console.log(`  ${flag === '✅' ? '·' : '!'} ${f.key.padEnd(11)} 像素 ${String(f.n).padStart(6)}  包围盒 ${f.w}x${f.h} @(${f.x0},${f.y0})  ${flag}`);
    }

    const check = (title, list, minW) => {
        console.log(`\n=== ${title} ===`);
        for (const o of list) {
            if (!o.n) { console.log(`  ✗ ${o.key}: 未绘制`); bad++; continue; }
            const over = o.x0 <= 0 || o.x1 >= 139 || o.y0 <= 0 || o.y1 >= 109;
            const flag = over ? '⚠ 出画' : (o.w < minW ? '⚠ 过小' : '✅');
            if (flag !== '✅') bad++;
            console.log(`  ${flag === '✅' ? '·' : '!'} ${o.key.padEnd(10)} 像素 ${String(o.n).padStart(5)}  包围盒 ${o.w}x${o.h} @(${o.x0},${o.y0})  ${flag}`);
        }
    };
    check('掉落道具', r.items, 17);
    check('可破坏物', r.breakables, 26);

    if (r.errors.length) { bad += r.errors.length; console.log('\n绘制异常:'); r.errors.forEach(e => console.log('  ' + e)); }
    console.log(`\n${bad === 0 && errs.length === 0 ? '美术自检通过 ✅' : '存在问题 ⚠ 共 ' + (bad + errs.length) + ' 处'}`);
    if (errs.length) errs.forEach(e => console.log('  pageerror: ' + e));

    await browser.close();
    process.exit(bad === 0 && errs.length === 0 ? 0 : 1);
})();

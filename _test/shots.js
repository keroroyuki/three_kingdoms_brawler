/* 美术验证截图：一次会话内抓取全部关键画面
 * 用法: node _test/shots.js [name]   name 省略则全抓
 */
'use strict';
const { chromium } = require('./pw');
const CHROME = process.env.CHROME_BIN || 'C:/Users/14512/.agent-browser/browsers/chrome-152.0.7977.64/chrome.exe';
const URL = process.env.GAME_URL || 'file:///D:/tmp/work/three_kingdoms_brawler/index.html';
const OUT = 'D:/tmp/work/three_kingdoms_brawler/_shots';
const only = process.argv[2];

(async () => {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--mute-audio'] });
    const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
    await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction('window.GAME && window.GAME.frames > 5', {}, { timeout: 5000 });
    const shot = async (n) => { await page.screenshot({ path: OUT + '/' + n + '.png' }); console.log('  · ' + n); };

    const want = (n) => !only || only === n;

    /* ---------- 标题 ---------- */
    if (want('01_title')) { await page.waitForTimeout(1200); await shot('01_title'); }

    /* ---------- 选人 ---------- */
    if (want('03_select')) {
        await page.evaluate('window.GAME.state="select"; window.GAME.input.flush()');
        await page.waitForTimeout(900); await shot('03_select');
    }

    /* ---------- 三关战斗 + BOSS ---------- */
    for (const lv of [0, 1, 2]) {
        const tag = ['06_lv1', '07_lv2', '08_lv3'][lv];
        if (!want(tag)) continue;
        // 走游戏自己的闸门逻辑触发 BOSS 入场，别再手动 new Boss
        await page.evaluate(`(() => {
            const g = window.GAME;
            g.loadLevel(${lv}); g.state = 'play'; g.input.flush();
            const b = g.level.boss;
            g.gateIndex = g.level.waves.length;
            g.waveState = 'open';
            g.arena = { min: b.at - 7, max: b.at + 7 };   // 先放开竞技场，否则主角会被钳在上一波的位置
            g.player.x = b.at + 0.4; g.player.z = 1.9; g.player.facing = 1;
            g.cam.x = b.at + 0.4;
            g.actors.length = 0; g.spawnQueue.length = 0;
        })()`);
        await page.waitForTimeout(500);
        // 摆几个敌人做构图
        await page.evaluate(`(() => {
            const g = window.GAME;
            const types = ["soldier","soldier","shield","archer","cavalry","elite"];
            types.forEach((tp, i) => {
                const a = new Enemy(g, { look: tp, x: 11 + i * 0.9, z: 1.1 + (i % 3) * 0.75 });
                g.actors.push(a);
            });
        })()`);
        await page.waitForTimeout(420);
        await shot(tag);
    }

    /* ---------- BOSS 战（逐个） ---------- */
    for (let lv = 0; lv < 3; lv++) {
        const tag = ['09_boss1', '10_boss2', '11_boss3'][lv];
        if (!want(tag)) continue;
        await page.evaluate(`(() => {
            const g = window.GAME; g.loadLevel(${lv}); g.state = "play"; g.input.flush();
            g.cam.x = 8; g.player.x = 8; g.player.z = 1.9; g.player.facing = 1;
            g.player.think = function () {};          // 冻结玩家 AI
            // 直接实例化 BOSS（绕开 startBoss 的入场动画与战场位移逻辑）
            const key = ["zhangjue", "zhangbao", "tianmo"][${lv}];
            const b = new Boss(g, { look: key, x: 11.4, z: 1.9, facing: -1 });
            b.entering = false; b.enterT = 99; b.invuln = 99; b.current = null;
            b.state = "idle"; b.stateT = 0; b.actionCd = 99;
            b.hp = b.maxHp;
            g.boss = b; g.bossActive = true; g.waveState = "boss";
            g.actors.push(b);
            g.projectiles.length = 0; g.spawnQueue.length = 0;
        })()`);
        await page.waitForTimeout(2600);
        await shot(tag);
    }

    /* ---------- 玩家技能特效 ---------- */
    if (want('12_skill')) {
        await page.evaluate(`(() => {
            const g = window.GAME; g.loadLevel(0); g.state = "play"; g.input.flush();
            g.actors.length = 0; g.projectiles.length = 0;
            g.player.useSkill && g.player.useSkill();
        })()`);
        await page.waitForTimeout(260);
        await shot('12_skill');
    }

    /* ---------- 胜利 ---------- */
    if (want('16_victory')) {
        await page.evaluate('(() => { const g=window.GAME; g.state="victory"; g.resultT=1.6; })()');
        await page.waitForTimeout(700); await shot('16_victory');
    }

    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    console.log(errs.length ? '  页内异常: ' + errs.join(' | ') : '  页内无异常 ✅');
    await browser.close();
})();

/* 战区边界回归（空气墙）
 *
 * 检查：波次战斗中，所有已入场敌人必须留在玩家够得到的战区内。
 * 玩家被闸门锁在 [arena.min, arena.max]，若敌人停在战区外且超过
 * 「player.reach + REACH_PAD」，就会出现"看得见、打不到"的空气墙。
 *
 * 手法：直接调用 startWave 触发真实波次 → 每 120ms 采样一次敌人位置 →
 *       把玩家按在 arena.max（模拟一路贴墙追击，远程兵最容易因此后撤到墙外）。
 * 判定：非入场状态敌人的越界量 ≤ 0.5（远小于攻击距离 1.42）。
 */
const { chromium } = require('./pw');

const CHROME = process.env.CHROME_BIN
    || 'C:/Users/14512/.agent-browser/browsers/chrome-152.0.7977.64/chrome.exe';
const URL = process.env.GAME_URL || 'file:///D:/tmp/work/three_kingdoms_brawler/index.html';

const PLAN = [
    { lv: 0, wave: 0, note: '纯近战' },
    { lv: 0, wave: 1, note: '混编弓手' },
    { lv: 1, wave: 0, note: '夜战弓手' },
    { lv: 2, wave: 2, note: '骑兵+术士' }
];

(async () => {
    const browser = await chromium.launch({
        executablePath: CHROME,
        args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio']
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.goto(URL);
    await page.waitForFunction('window.GAME && window.GAME.frames > 2', { timeout: 30000 });

    let bad = 0;

    for (const step of PLAN) {
        await page.evaluate(`(() => {
            const g = window.GAME;
            g.loadLevel(${step.lv});
            g.state = 'play';
            g.player.invuln = 9999;
            g.player.hp = g.player.maxHp;
            const gate = g.level.waves[${step.wave}];
            g.gateIndex = ${step.wave};
            g.player.x = gate.at; g.player.z = 1.6; g.player.facing = 1;
            g.cam.x = gate.at;
            g.startWave(gate);          // 走游戏自己的波次逻辑，别绕过战区设置
        })()`);

        await page.evaluate(`(() => {
            window.__samples = [];
            const g = window.GAME;
            const t0 = performance.now();
            window.__probe = setInterval(() => {
                if (!g.arena) return;
                const A = g.arena, P = g.player;
                // 模拟玩家一路贴到闸门追击：远程兵会一路后撤，最容易退到墙外
                if (g.waveState === 'fight' && !P.dead) P.x = A.max;
                const foes = g.actors.filter(a => a.team === 1 && !a.dead);
                window.__samples.push({
                    min: +A.min.toFixed(2), max: +A.max.toFixed(2),
                    foes: foes.map(f => ({ kind: f.kind, x: +f.x.toFixed(2), ent: !!f.entering, st: f.state }))
                });
            }, 120);
        })()`);

        await page.waitForTimeout(9000);
        const data = await page.evaluate(`(() => { clearInterval(window.__probe); return window.__samples; })()`);

        let maxEsc = 0, desc = '', frames = 0;
        for (const s of data) {
            if (!s.foes.length) continue;
            frames++;
            for (const f of s.foes) {
                if (f.ent) continue;                     // 入场跑位中允许在战区外
                const esc = Math.max(f.x - s.max, s.min - f.x);
                if (esc > maxEsc) { maxEsc = esc; desc = `${f.kind} @${f.x} 战区[${s.min},${s.max}] ${f.st}`; }
            }
        }
        const ok = maxEsc <= 0.5 && frames > 20;
        if (!ok) bad++;
        console.log(`[${ok ? 'PASS' : 'FAIL'}] 第${step.lv + 1}关 第${step.wave + 1}波（${step.note}）` +
            ` 采样 ${frames} 帧，战中越界 ${maxEsc.toFixed(2)}` + (ok ? '' : `  ← ${desc}`));
    }

    console.log(`\n${bad === 0 ? '全部通过' : bad + ' 项失败'}   页面异常 ${errs.length} 条`);
    if (errs.length) console.log(errs.slice(0, 3).join('\n'));
    await browser.close();
    process.exit(bad ? 1 : 0);
})();

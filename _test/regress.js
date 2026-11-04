/* 三国战纪 · 缺陷回归测试（playwright-core + Chromium）
 *
 * 针对已修复缺陷的断言，防止回退。与 smoke.js 独立：smoke 覆盖全流程，
 * 本文件覆盖「能跑通但数值/观感错误」的那类问题。
 *
 * 注意：各 js 文件是经典脚本，顶层 const/class 进入全局词法环境，
 * 只能用裸名引用（BOSS_KIT / AudioEngine / Boss / Player / Actor / LEVELS），
 * window.GAME 是显式赋值的例外。
 */
'use strict';
const { chromium } = require('./pw');

const CHROME = process.env.CHROME_BIN
    || 'C:/Users/14512/.agent-browser/browsers/chrome-152.0.7977.64/chrome.exe';
const URL = process.env.GAME_URL || 'http://127.0.0.1:8787/index.html';

let pass = 0, fail = 0;
const errors = [];
function check(name, cond, info) {
    if (cond) { pass++; console.log('  [PASS] ' + name + (info ? '   ' + info : '')); }
    else { fail++; console.log('  [FAIL] ' + name + (info ? '   ' + info : '')); }
}

(async () => {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
    const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction('window.GAME && window.GAME.frames > 5', {}, { timeout: 5000 });

    const r = await page.evaluate(() => {
        const g = window.GAME;
        const out = {};

        /* ---- H2：BOSS 血条分段。第 i 段应对应第 i 阶段，HP ∈ (phases[i+1], phases[i]] ---- */
        g.loadLevel(0);
        const perBoss = LEVELS.map(l => ({ type: l.boss.type, phases: BOSS_KIT[l.boss.type].phases.slice() }));
        out.perBoss = perBoss;
        const segsOf = (b) => b.phases.map((_, i) => {
            const hi = b.phases[i], lo = b.phases[i + 1] ?? 0;
            return { lo, hi, span: hi - lo };
        });
        out.segAllPositive = perBoss.every(b => segsOf(b).every(s => s.span > 0.001));
        out.segCoverFull = perBoss.every(b => Math.abs(segsOf(b).reduce((a, s) => a + s.span, 0) - 1) < 1e-6);
        out.lastSegReachesZero = perBoss.every(b => segsOf(b)[segsOf(b).length - 1].lo === 0);
        out.firstPhaseTopIs1 = perBoss.every(b => b.phases[0] === 1);

        /* ---- M2：刷怪队列生命周期 ---- */
        out.queueIsArray = Array.isArray(g.spawnQueue);
        g.spawnQueue.length = 0;
        g.spawnQueue.push({ type: 'soldier', x: 99, z: 1, delay: 0.1 });
        g.loadLevel(0);
        out.queueCleared = g.spawnQueue.length === 0;

        /* ---- H1：完美格挡标记必须随普通受击复位 ---- */
        const p = g.player;
        p.invuln = 0; p.dead = false; p.hp = p.maxHp;
        p.state = 'guard'; p.stateT = 0.1; p.facing = 1;
        const pg0 = p.perfectGuards;
        p.takeHit({ dmg: 10, dir: -1, src: null });
        out.perfectRegistered = p.lastBlockPerfect === true;
        out.perfectCountedOnce = p.perfectGuards === pg0 + 1;
        const pg1 = p.perfectGuards;
        p.invuln = 0; p.state = 'idle'; p.stateT = 0;
        p.takeHit({ dmg: 10, dir: 1, src: null });
        out.flagResetByNormalHit = p.lastBlockPerfect === false;
        out.normalHitNoFalsePerfect = p.perfectGuards === pg1;
        out.comboResetByNormalHit = p.combo === 0;

        /* ---- H3 / M1：音频 ---- */
        out.noiseAcceptsBus = String(AudioEngine.prototype._noise).indexOf('bus || this.sfxBus') >= 0;
        out.scheduleSuspendGuard = /state\s*!==\s*'running'/.test(String(AudioEngine.prototype._schedule));
        out.drumOnMusicBus = /_noise\([^)]*this\.musicBus\)/.test(String(AudioEngine.prototype._schedule));
        // 静态匹配挡不住参数错位（bus 被当成 q 传进去照样能匹配上正则），
        // 这里按 BGM 鼓点的真实 8 参形状实调一次，connect 失败会直接抛错。
        out.drumCallShapeOk = (() => {
            try {
                g.audio.init();
                g.audio._noise(0, 0.14, 0.22, 'lowpass', 420, 90, 0.8, g.audio.musicBus);
                g.audio._noise(0, 0.1, 0.1, 'highpass', 5200, 8000, 0.7, g.audio.musicBus);
                return true;
            } catch (e) { out.drumErr = String(e); return false; }
        })();
        // 反向验证：bus 位置传数字必须抛错，证明该校验真的敏感
        out.drumCallShapeSensitive = (() => {
            try { g.audio._noise(0, 0.14, 0.22, 'lowpass', 420, 90, 0.8, 1, g.audio.musicBus); return false; }
            catch (e) { return true; }
        })();

        /* ---- M3 / M4：BOSS 姿态 ---- */
        out.bossTakeHitSkipsDead = /if \(!this\.dead\)/.test(String(Boss.prototype.takeHit));

        /* ---- 其余小修 ---- */
        out.dieNoGameOverSound = !/audio\.play\(\s*'gameover'\s*\)/.test(String(Player.prototype.die));
        out.telegraphAlphaClamped = /Math\.abs\(Math\.sin/.test(String(Actor.prototype._syncWarn));
        out.victoryPanelCapped = /Math\.min\(VIEW\.H - 250,/.test(String(UI.prototype.drawVictory));

        return out;
    });

    console.log('=== H1 完美格挡标记复位 ===');
    check('完美格挡被正确记录', r.perfectRegistered);
    check('完美格挡只计数一次', r.perfectCountedOnce);
    check('普通受击后标记复位为 false', r.flagResetByNormalHit);
    check('普通受击不再虚增完美格挡计数（核心回归）', r.normalHitNoFalsePerfect);
    check('普通受击仍重置连击', r.comboResetByNormalHit);

    console.log('=== H2 BOSS 血条分段 ===');
    console.log('   阶段数据: ' + JSON.stringify(r.perBoss));
    check('每段宽度均 > 0（段 0 不再是永久空段）', r.segAllPositive);
    check('各段宽度之和恰好覆盖 0~1', r.segCoverFull);
    check('末段下限为 0（最终阶段不再整条空白）', r.lastSegReachesZero);
    check('phases[0] 恒为 1.0', r.firstPhaseTopIs1);

    console.log('=== M2 刷怪队列 ===');
    check('构造器已初始化 spawnQueue 为数组', r.queueIsArray);
    check('loadLevel 清空残留刷怪队列', r.queueCleared);

    console.log('=== H3 / M1 音频 ===');
    check('_noise 支持 bus 形参', r.noiseAcceptsBus);
    check('_schedule 有挂起保护（防后台积压爆音）', r.scheduleSuspendGuard);
    check('BGM 鼓点/镲走 musicBus', r.drumOnMusicBus);
    check('BGM 鼓点 8 参实调不抛错（防 bus 形参错位）', r.drumCallShapeOk, r.drumErr || '');
    check('参数错位确实会被 connect 拒绝（校验有效）', r.drumCallShapeSensitive);

    console.log('=== M3 / M4 BOSS ===');
    check('Boss.takeHit 死亡后不再改写姿态', r.bossTakeHitSkipsDead);

    console.log('=== 其余小修 ===');
    check('Player.die 不再误播 gameover', r.dieNoGameOverSound);
    check('预警环 alpha 恒非负（用 abs 而非裸 sin）', r.telegraphAlphaClamped);
    check('胜利结算底板高度已封顶', r.victoryPanelCapped);

    check('页面无未捕获异常', errors.length === 0, errors.join('; '));

    console.log('\n================ 结果 ================');
    console.log('PASS ' + pass + ' / FAIL ' + fail + (fail ? '  ❌' : '  ✅'));

    await browser.close();
    process.exit(fail ? 1 : 0);
})();

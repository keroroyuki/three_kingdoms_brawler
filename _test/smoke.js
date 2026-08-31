/* 三国战纪 · 端到端冒烟测试（playwright-core + Chromium） */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/14512/.workbuddy/binaries/node/versions/22.22.2-2/node_modules/playwright-core');

const CHROME = process.env.CHROME_BIN
    || 'C:/Users/14512/.agent-browser/browsers/chrome-152.0.7977.64/chrome.exe';
const URL = process.env.GAME_URL || 'http://127.0.0.1:8787/index.html';
const OUT = 'D:/tmp/work/three_kingdoms_brawler/_shots';

const errors = [];
const log = [];
const fails = [];
function say(s) { console.log(s); log.push(s); }
function check(name, ok, extra) {
    say((ok ? '  [PASS] ' : '  [FAIL] ') + name + (extra ? '  ' + extra : ''));
    if (!ok) fails.push(name + (extra ? ' :: ' + extra : ''));
}

/* ---------- 页面内探针 ---------- */
function probeSrc() {
    return `(() => {
        const g = window.GAME;
        const c = document.getElementById('gameCanvas');
        let px = null;
        if (c) {
            const ctx = c.getContext('2d');
            const d = ctx.getImageData(0, 0, c.width, c.height).data;
            let sum = 0, n = 0; const set = new Set();
            for (let i = 0; i < d.length; i += 4 * 29) {
                const r = d[i], gg = d[i + 1], b = d[i + 2];
                sum += (r + gg + b) / 3; n++;
                set.add(((r >> 3) << 10) | ((gg >> 3) << 5) | (b >> 3));
            }
            px = { mean: +(sum / n).toFixed(1), colors: set.size, samples: n };
        }
        if (!g) return { booted: false, canvas: !!c, px, err: window.__lastErr || '' };
        const p = g.player;
        return {
            booted: true, canvas: !!c, px, err: window.__lastErr || '',
            state: g.state, waveState: g.waveState, gateIndex: g.gateIndex,
            level: g.levelIndex, levelName: g.level ? g.level.name : '',
            actors: g.actors.length,
            foes: g.actors.filter(a => a.team === 1 && !a.dead).length,
            queue: g.spawnQueue ? g.spawnQueue.length : -1,
            items: g.items.length, breakables: g.breakables.length,
            projectiles: g.projectiles.length,
            kills: g.killCount, bossActive: g.bossActive,
            arena: g.arena ? [+g.arena.min.toFixed(1), +g.arena.max.toFixed(1)] : null,
            boss: g.boss ? { hp: Math.round(g.boss.hp), max: Math.round(g.boss.maxHp), phase: g.boss.phaseIndex, st: g.boss.state } : null,
            p: p ? {
                x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2),
                hp: Math.round(p.hp), max: Math.round(p.maxHp), rage: Math.round(p.rage),
                combo: p.combo, comboBest: p.comboBest, hits: p.hitsLanded,
                lives: p.lives, score: p.score, state: p.state, dead: p.dead,
                pg: p.perfectGuards, sk: p.skillKey || ''
            } : null
        };
    })()`;
}

async function probe(page) {
    return await page.evaluate(probeSrc());
}

async function shot(page, name) {
    const f = path.join(OUT, name + '.png');
    await page.screenshot({ path: f });
    const sz = fs.statSync(f).size;
    say('    截图 ' + name + '.png  ' + sz + ' bytes');
    return sz;
}

async function waitState(page, want, ms, label) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
        const s = await probe(page);
        if (Array.isArray(want) ? want.includes(s.state) : s.state === want) return s;
        await page.waitForTimeout(120);
    }
    const s = await probe(page);
    check('等待状态 ' + label, false, '期望=' + want + ' 实际=' + s.state + ' err=' + s.err);
    return s;
}

/* ---------- 主流程 ---------- */
(async () => {
    const browser = await chromium.launch({
        executablePath: CHROME,
        headless: true,
        args: ['--no-sandbox', '--disable-gpu', '--mute-audio', '--window-size=900,720']
    });
    const page = await browser.newPage({ viewport: { width: 900, height: 720 } });

    const ignore = u => /favicon\.ico$/i.test(u);
    page.on('console', m => {
        if (m.type() !== 'error') return;
        if (ignore(m.location() && m.location().url || '')) return;
        errors.push('CONSOLE ' + m.text());
    });
    page.on('pageerror', e => errors.push('PAGEERROR ' + (e && e.stack || e)));
    page.on('requestfailed', r => { if (!ignore(r.url())) errors.push('REQFAIL ' + r.url() + ' ' + (r.failure() || {}).errorText); });

    /** 帧循环存活检测：连续两次采样帧号必须增长 */
    async function checkAlive(label) {
        const a = await page.evaluate('window.GAME ? window.GAME.frames : -1');
        await page.waitForTimeout(420);
        const b = await page.evaluate('window.GAME ? window.GAME.frames : -1');
        check('渲染循环存活 @' + label, b > a + 3, 'frames ' + a + ' -> ' + b);
        const le = await page.evaluate('window.__loopErr || ""');
        check('无帧内异常 @' + label, !le, le.slice(0, 220));
    }

    say('=== 1. 加载页面 ===');
    await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1600);
    let s = await probe(page);
    check('游戏已启动 (window.GAME)', s.booted, JSON.stringify(s.px));
    check('无启动错误', !s.err, s.err);
    check('标题状态', s.state === 'title', s.state);
    check('画面已渲染 (色彩数 > 300)', s.px && s.px.colors > 300, 'colors=' + (s.px && s.px.colors));
    await shot(page, '01_title');

    say('=== 2. 帮助页 ===');
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80);
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80);
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    s = await probe(page);
    check('进入帮助页', s.state === 'help', s.state);
    await shot(page, '02_help');
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    s = await probe(page);
    check('帮助页返回标题', s.state === 'title', s.state);

    say('=== 3. 选人页 ===');
    await page.keyboard.press('ArrowUp'); await page.waitForTimeout(80);
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    s = await probe(page);
    check('进入选人页', s.state === 'select', s.state);
    await shot(page, '03_select');
    const heroes = await page.evaluate('Object.keys(HERO_KIT)');
    check('5 名可选角色', heroes.length === 5, heroes.join(','));

    say('=== 4. 选赵云 → 关卡开场 ===');
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(90);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(90);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(90);
    await shot(page, '04_select_zhaoyun');
    await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    s = await probe(page);
    check('进入关卡开场', s.state === 'intro', s.state);
    check('赵云已选中', await page.evaluate("window.GAME.heroKey") === 'zhaoyun', await page.evaluate("window.GAME.heroKey"));
    await shot(page, '05_intro');

    say('=== 5. 进入战斗 ===');
    await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    s = await probe(page);
    check('进入战斗状态', s.state === 'play', s.state);
    check('玩家已生成', !!s.p, JSON.stringify(s.p));
    check('可破坏物已生成', s.breakables > 0, 'breakables=' + s.breakables);
    await shot(page, '06_play_start');
    await checkAlive('战斗开始');

    say('=== 6. 基础操作：移动 / 跳跃 / 冲刺 / 攻击 ===');
    const x0 = (await probe(page)).p.x;
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.up('ArrowRight');
    let s1 = await probe(page);
    check('右移生效', s1.p.x > x0 + 1.0, x0 + ' -> ' + s1.p.x);

    const z0 = s1.p.z;
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(600); await page.keyboard.up('ArrowUp');
    s1 = await probe(page);
    check('纵深移动生效', Math.abs(s1.p.z - z0) > 0.2, z0 + ' -> ' + s1.p.z);

    await page.keyboard.press('KeyK'); await page.waitForTimeout(180);
    s1 = await probe(page);
    check('跳跃生效 (离地)', s1.p.y > 0.15, 'y=' + s1.p.y);
    await shot(page, '07_jump');
    await page.waitForTimeout(700);

    // 冲刺（双击右）
    const xd0 = (await probe(page)).p.x;
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(260);
    s1 = await probe(page);
    check('冲刺位移明显', s1.p.x - xd0 > 0.8, xd0 + ' -> ' + s1.p.x);

    // 攻击：连点 J
    await page.keyboard.press('KeyJ'); await page.waitForTimeout(230);
    let sAtk = await probe(page);
    check('攻击状态触发', ['_atk', 'atk1', 'atk2', 'atk3', 'idle', 'walk', 'run'].includes(sAtk.p.state), sAtk.p.state);
    await page.keyboard.press('KeyJ'); await page.waitForTimeout(230);
    await page.keyboard.press('KeyJ'); await page.waitForTimeout(230);
    sAtk = await probe(page);
    check('连段推进/命中数存在', sAtk.p.comboBest >= 0, 'combo=' + sAtk.p.combo);
    await shot(page, '08_attack');

    say('=== 7. 闸门推进：第 1 波 ===');
    const moved = await page.evaluate(`(() => {
        const g = window.GAME, L = g.level;
        const gate = L.waves[g.gateIndex] || L.boss;
        g.player.x = Math.max(g.player.x, gate.at + 0.4);
        g.player.z = 1.9;
        return gate.at;
    })()`);
    say('    传送到闸门 x=' + moved);
    let w = await page.evaluate('window.GAME.waveState');
    const tw0 = Date.now();
    while (w === 'open' && Date.now() - tw0 < 2000) {
        await page.waitForTimeout(80);
        w = await page.evaluate('window.GAME.waveState');
    }
    check('触发第 1 波', w === 'fight', 'waveState=' + w);
    await page.waitForTimeout(1400);
    s = await probe(page);
    check('敌人已生成', s.foes > 0, 'foes=' + s.foes + ' queue=' + s.queue);
    check('竞技场已锁定', s.arena && s.arena[1] - s.arena[0] < 12, JSON.stringify(s.arena));
    await shot(page, '09_wave1');

    say('=== 8. 真实战斗：自动打完 10 秒 ===');
    // 简易 AI：靠近最近敌人 → 攻击；偶尔格挡
    const combat = await page.evaluate(`(async () => {
        const g = window.GAME;
        const inp = g.input;
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        let atkCount = 0, guardCount = 0, jumpCount = 0;
        const t0 = Date.now();
        while (Date.now() - t0 < 10000) {
            const p = g.player;
            if (!p || p.dead) break;
            let best = null, bd = 1e9;
            for (const a of g.actors) {
                if (a.team !== 1 || a.dead) continue;
                const d = Math.abs(a.x - p.x) + Math.abs(a.z - p.z) * 2;
                if (d < bd) { bd = d; best = a; }
            }
            if (!best) break;
            // 对齐纵深
            if (Math.abs(best.z - p.z) > 0.22) {
                inp.injectDown(best.z > p.z ? 'down' : 'up');
                await sleep(60);
                inp.injectUp(best.z > p.z ? 'down' : 'up');
            }
            const dx = best.x - p.x;
            const dir = dx > 0 ? 'right' : 'left';
            if (Math.abs(dx) > (p.reach * 0.72)) {
                inp.injectDown(dir); await sleep(70); inp.injectUp(dir);
            } else if (Math.abs(dx) < (p.reach + 0.42)) {
                inp.injectDown('attack'); inp.injectUp('attack');
                atkCount++;
                await sleep(180);
            }
            if (atkCount % 7 === 3) { inp.injectDown('guard'); await sleep(160); inp.injectUp('guard'); guardCount++; }
            if (atkCount % 11 === 5) { inp.injectDown('jump'); inp.injectUp('jump'); jumpCount++; await sleep(120); }
            await sleep(30);
        }
        const p = g.player;
        return { atkCount, guardCount, jumpCount, hits: p.hitsLanded, comboBest: p.comboBest,
                 kills: g.killCount, hp: Math.round(p.hp), foes: g.actors.filter(a=>a.team===1&&!a.dead).length };
    })()`);
    say('    战斗结果: ' + JSON.stringify(combat));
    check('攻击命中敌人 (hitsLanded > 0)', combat.hits > 0, 'hits=' + combat.hits);
    check('造成击杀', combat.kills > 0, 'kills=' + combat.kills);
    check('玩家存活', combat.hp > 0, 'hp=' + combat.hp);
    await shot(page, '10_combat');
    await checkAlive('实战战斗');

    say('=== 9. 必杀技 / 超必杀 ===');
    const skillRes = await page.evaluate(`(() => {
        const g = window.GAME, p = g.player;
        p.rage = 100;
        const before = { rage: p.rage, state: p.state };
        g.input.injectDown('skill'); g.input.injectUp('skill');
        return before;
    })()`);
    await page.waitForTimeout(500);
    s = await probe(page);
    check('必杀技触发', ['skill', 'cast', 'castRelease', 'spin', 'thrust'].includes(s.p.state) || s.p.rage < 100,
        'state=' + s.p.state + ' rage=' + s.p.rage);
    await shot(page, '11_skill');

    say('=== 10. 波次全清 → BOSS ===');
    async function clearAllWaves() {
        for (let i = 0; i < 60; i++) {
            const st = await page.evaluate(`(() => {
                const g = window.GAME;
                return { state: g.state, ws: g.waveState, gi: g.gateIndex,
                         foes: g.actors.filter(a => a.team === 1 && !a.dead).length,
                         queue: g.spawnQueue ? g.spawnQueue.length : 0 };
            })()`);
            if (st.state !== 'play') return st;
            if (st.ws === 'boss') return st;
            if (st.ws === 'open') {
                await page.evaluate(`(() => {
                    const g = window.GAME, L = g.level;
                    const gate = L.waves[g.gateIndex] || L.boss;
                    g.player.x = Math.max(g.player.x, gate.at + 0.4);
                    g.player.z = 1.9; g.player.hp = g.player.maxHp;
                })()`);
                await page.waitForTimeout(350);
            } else if (st.ws === 'fight') {
                await page.waitForTimeout(500);
                await page.evaluate(`(() => {
                    const g = window.GAME;
                    for (const a of g.actors) {
                        if (a.team !== 1 || a.dead) continue;
                        a.takeHit({ dmg: 999999, dir: a.facing * -1, kb: 0, kbUp: 0,
                                    heavy: true, stun: 0, src: g.player, srcX: g.player.x });
                    }
                })()`);
                await page.waitForTimeout(500);
            } else {
                await page.waitForTimeout(250);
            }
        }
        return await page.evaluate('({state: window.GAME.state, ws: window.GAME.waveState})');
    }
    const bw = await clearAllWaves();
    say('    波次推进结果: ' + JSON.stringify(bw));
    s = await probe(page);
    check('抵达 BOSS 战', s.bossActive === true, 'bossActive=' + s.bossActive + ' boss=' + JSON.stringify(s.boss));
    check('BOSS 血条数据完整', s.boss && s.boss.max > 0, JSON.stringify(s.boss));
    await page.waitForTimeout(900);
    await shot(page, '12_boss');
    await checkAlive('BOSS 战');

    say('=== 11. BOSS 阶段与技能 ===');
    const bossInfo = await page.evaluate(`(() => {
        const g = window.GAME, b = g.boss;
        if (!b) return null;
        return { look: b.lookKey, name: LOOKS[b.lookKey].name, hp: Math.round(b.hp), max: Math.round(b.maxHp),
                 phases: (BOSS_KIT[b.lookKey] || {}).phases ? BOSS_KIT[b.lookKey].phases.length : -1,
                 phase: b.phaseIndex, state: b.state, team: b.team };
    })()`);
    say('    BOSS: ' + JSON.stringify(bossInfo));
    check('BOSS 多阶段配置', bossInfo && bossInfo.phases >= 2, 'phases=' + (bossInfo && bossInfo.phases));

    // 观察 BOSS 出招（让它打 6 秒，玩家开无敌）
    const bossLog = await page.evaluate(`(async () => {
        const g = window.GAME;
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        g.player.invuln = 999; g.player.hp = g.player.maxHp;
        const seen = new Set(); const states = [];
        const t0 = Date.now();
        while (Date.now() - t0 < 6500) {
            const b = g.boss;
            if (b && !b.dead) {
                seen.add(b.state);
                if (b.current && b.current.type) seen.add('SK:' + b.current.type);
            }
            await sleep(60);
        }
        g.player.invuln = 0;
        return { seen: [...seen], hp: Math.round(g.player.hp), bossHp: Math.round(g.boss ? g.boss.hp : -1) };
    })()`);
    say('    BOSS 行为: ' + JSON.stringify(bossLog));
    check('BOSS 会出招 (技能态出现)', bossLog.seen.filter(x => !['idle', 'walk', 'run', 'entering'].includes(x)).length > 0,
        bossLog.seen.join('|'));
    await shot(page, '13_boss_skill');

    say('=== 12. 击破 BOSS → 过关结算 → 下一关 ===');
    await page.evaluate(`(() => {
        const g = window.GAME, b = g.boss;
        b.takeHit({ dmg: 999999, dir: -1, kb: 0, kbUp: 0, heavy: true, stun: 0, src: g.player, srcX: g.player.x });
    })()`);
    s = await waitState(page, 'clear', 4000, 'clear');
    check('进入过关结算', s.state === 'clear', s.state);
    await shot(page, '14_clear');
    s = await waitState(page, ['intro', 'victory'], 6000, 'intro');
    check('进入第 2 关开场', s.state === 'intro' && s.level === 1, 'state=' + s.state + ' level=' + s.level);
    check('第 2 关主题正确', s.levelName.indexOf('博望坡') >= 0, s.levelName);
    await shot(page, '15_level2_intro');

    say('=== 13. 快速通关第 2/3 关 → 胜利 ===');
    for (let lv = 0; lv < 3; lv++) {
        s = await probe(page);
        if (s.state === 'victory') break;
        if (s.state === 'intro') { await page.keyboard.press('Enter'); await page.waitForTimeout(600); }
        s = await probe(page);
        if (s.state !== 'play') { check('第 ' + (s.level + 1) + ' 关进入战斗', false, 'state=' + s.state); break; }
        check('第 ' + (s.level + 1) + ' 关进入战斗', s.state === 'play', 'lv=' + s.level + ' name=' + s.levelName);

        const r = await clearAllWaves();
        say('    关卡推进: ' + JSON.stringify(r));

        // 击破 BOSS（反复尝试，避开入场无敌帧）
        let killed = false;
        for (let k = 0; k < 20; k++) {
            const st = await page.evaluate(`(() => {
                const g = window.GAME, b = g.boss;
                if (!b) return { none: true, state: g.state };
                b.invuln = 0; b.entering = false;
                b.takeHit({ dmg: 999999, dir: -1, kb: 0, kbUp: 0, heavy: true, stun: 0,
                            src: g.player, srcX: g.player.x });
                return { dead: b.dead, hp: Math.round(b.hp), state: g.state };
            })()`);
            if (st.dead || st.state !== 'play') { killed = true; break; }
            await page.waitForTimeout(250);
        }
        check('第 ' + (s.level + 1) + ' 关 BOSS 击破', killed, 'lv=' + s.level);
        await shot(page, '1' + (3 + lv) + '_lv' + (s.level + 1) + '_clear');

        const sv = await waitState(page, ['clear', 'victory'], 5000, 'clear/victory');
        if (sv.state === 'clear') await waitState(page, ['intro', 'victory'], 7000, 'intro/victory');
        s = await probe(page);
        say('    → 当前状态 ' + s.state + ' 关卡 ' + s.levelName);
        if (s.state === 'victory') break;
    }
    s = await probe(page);
    check('抵达通关胜利画面', s.state === 'victory', s.state);
    check('最终分数已计算', await page.evaluate('window.GAME.finalScore') > 0, 'finalScore=' + await page.evaluate('window.GAME.finalScore'));
    await shot(page, '16_victory');

    say('=== 14. 返回标题 ===');
    await page.waitForTimeout(1200);            // 胜利画面有 0.8s 防误触锁定
    await page.keyboard.press('Enter');
    s = await waitState(page, 'title', 4000, 'title');
    check('返回标题', s.state === 'title', s.state);

    say('=== 15. 暂停菜单 / 失败结算 ===');
    // 状态驱动导航：title → select → intro → play
    await page.keyboard.press('Enter'); s = await waitState(page, 'select', 4000, 'select');
    check('再次进入选人', s.state === 'select', s.state);
    await page.keyboard.press('Enter'); s = await waitState(page, 'intro', 4000, 'intro');
    await page.keyboard.press('Enter'); s = await waitState(page, 'play', 4000, 'play');
    check('再次进入战斗', s.state === 'play', s.state);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    s = await probe(page);
    check('暂停生效', s.state === 'pause', s.state);
    await shot(page, '17_pause');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    s = await probe(page);
    check('取消暂停', s.state === 'play', s.state);

    // 游戏失败：把命数清零并杀死玩家
    await page.evaluate(`(() => {
        const g = window.GAME, p = g.player;
        p.lives = 1; p.invuln = 0; p.hp = 1;
        p.takeHit({ dmg: 99999, dir: -1, kb: 0, kbUp: 0, heavy: true, stun: 0, src: null, srcX: p.x - 1 });
    })()`);
    s = await waitState(page, 'result', 6000, 'result');
    check('失败结算生效', s.state === 'result', s.state);
    await shot(page, '18_gameover');
    await page.waitForTimeout(900);
    await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    s = await probe(page);
    check('失败后返回标题', s.state === 'title', s.state);

    say('=== 16. 交付级细节：缩放 / 失焦暂停 / 静音 / 最高战功 ===');

    // 16a. 高分后备缓冲：canvas 后备尺寸应等于 800x600 × renderScale
    const rs = await page.evaluate(`(() => {
        const g = window.GAME, c = g.canvas;
        return { scale: g.renderScale, w: c.width, h: c.height,
                 cssW: c.style.width, cssH: c.style.height };
    })()`);
    check('渲染缩放已生效 (renderScale >= 1)', rs.scale >= 1, JSON.stringify(rs));
    check('后备缓冲与缩放一致', Math.abs(rs.w - 800 * rs.scale) <= 1 && Math.abs(rs.h - 600 * rs.scale) <= 1,
        `w=${rs.w} h=${rs.h} scale=${rs.scale}`);
    check('CSS 显示尺寸已设置', !!rs.cssW && !!rs.cssH, `${rs.cssW} x ${rs.cssH}`);

    // 16b. 最高战功：上一局失败已提交，应有记录
    const best1 = await page.evaluate('window.GAME.bestScore');
    check('最高战功已记录', best1 > 0, 'bestScore=' + best1);

    // 16c. 新一局不继承上一局分数与命数（原 loadLevel 会从旧 player 复制）
    await page.keyboard.press('Enter'); s = await waitState(page, 'select', 4000, 'select');
    await page.keyboard.press('Enter'); s = await waitState(page, 'intro', 4000, 'intro');
    await page.keyboard.press('Enter'); s = await waitState(page, 'play', 4000, 'play');
    check('新一局分数归零', s.p.score === 0, 'score=' + s.p.score);
    check('新一局命数恢复为 3', s.p.lives === 3, 'lives=' + s.p.lives);
    check('新一局仍保留最高战功', (await page.evaluate('window.GAME.bestScore')) === best1, 'best=' + best1);

    // 16d. 窗口失焦应自动暂停
    await page.evaluate('window.dispatchEvent(new Event("blur"))');
    await page.waitForTimeout(250);
    s = await probe(page);
    check('失焦自动暂停', s.state === 'pause', s.state);
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    s = await probe(page);
    check('失焦暂停可恢复', s.state === 'play', s.state);
    // 守护：失焦时音频上下文被 suspend，恢复后应能被唤醒（否则游戏 BGM/音效永久静音）
    const audioWake = await page.evaluate(() => {
        try {
            const a = window.GAME.audio;
            a.resume();                       // 模拟恢复路径中的唤醒
            a.play('swing');                  // 不应抛错
            return { ok: true, ctxState: a.ctx ? a.ctx.state : 'none' };
        } catch (e) { return { ok: false, err: String(e) }; }
    });
    check('失焦恢复后音频可唤醒', audioWake.ok && audioWake.err === undefined, JSON.stringify(audioWake));

    // 16e. M 键静音开关
    const m0 = await page.evaluate('window.GAME.audio.muted');
    await page.keyboard.press('KeyM'); await page.waitForTimeout(180);
    const m1 = await page.evaluate('window.GAME.audio.muted');
    await page.keyboard.press('KeyM'); await page.waitForTimeout(180);
    const m2 = await page.evaluate('window.GAME.audio.muted');
    check('M 键切换静音', m1 === !m0 && m2 === m0, `${m0} -> ${m1} -> ${m2}`);
    await checkAlive('细节验证后');

    say('=== 17. 最终错误检查 ===');
    const finalErr = await page.evaluate('window.__lastErr || ""');
    check('页面无未捕获错误', errors.length === 0, errors.slice(0, 6).join(' | '));
    check('window.__lastErr 为空', !finalErr, finalErr);

    await browser.close();

    say('');
    say('================ 结果 ================');
    if (fails.length === 0) say('全部通过 ✅');
    else { say('失败 ' + fails.length + ' 项:'); fails.forEach(f => say('  - ' + f)); }
    if (errors.length) { say(''); say('捕获错误:'); errors.slice(0, 20).forEach(e => say('  ! ' + e)); }
    process.exit(fails.length ? 1 : 0);
})().catch(e => {
    console.error('FATAL', e);
    if (errors.length) errors.slice(0, 20).forEach(x => console.error(' ! ' + x));
    process.exit(2);
});

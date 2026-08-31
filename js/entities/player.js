/* ============================================================
 * 三国战纪 · 玩家角色
 * ============================================================ */
'use strict';

const MOVE_BOOST = 1.30;   // 移速手感系数

/** 五名角色的招式参数（差异化） */
const HERO_KIT = {
    liubei: {
        moves: 'a1',
        combo: [
            { frames: Fig.atk1Frames, dur: 0.42, hitAt: 0.18, dmgMul: 1.00, reachMul: 1.00, kb: 1.5, sound: 'swing' },
            { frames: Fig.atk2Frames, dur: 0.42, hitAt: 0.16, dmgMul: 1.05, reachMul: 1.00, kb: 1.7, sound: 'swing' },
            { frames: Fig.atk3Frames, dur: 0.58, hitAt: 0.26, dmgMul: 1.70, reachMul: 1.15, kb: 3.4, kbUp: 2.2, launch: true, heavy: true, sound: 'swingHeavy' }
        ],
        skill: 'spin', skillName: '雌雄双股剑 · 乱舞'
    },
    guanyu: {
        combo: [
            { frames: Fig.atk1Frames, dur: 0.50, hitAt: 0.22, dmgMul: 1.10, reachMul: 1.20, kb: 1.9, sound: 'swingHeavy' },
            { frames: Fig.atk2Frames, dur: 0.50, hitAt: 0.20, dmgMul: 1.15, reachMul: 1.20, kb: 2.1, sound: 'swingHeavy' },
            { frames: Fig.atk3Frames, dur: 0.66, hitAt: 0.30, dmgMul: 1.95, reachMul: 1.35, kb: 3.8, kbUp: 2.4, launch: true, heavy: true, sound: 'swingHeavy' }
        ],
        skill: 'sweep', skillName: '青龙偃月 · 拖刀斩'
    },
    zhangfei: {
        combo: [
            { frames: Fig.atk1Frames, dur: 0.48, hitAt: 0.20, dmgMul: 1.15, reachMul: 1.22, kb: 2.0, sound: 'swingHeavy' },
            { frames: Fig.atk2Frames, dur: 0.48, hitAt: 0.18, dmgMul: 1.20, reachMul: 1.22, kb: 2.2, sound: 'swingHeavy' },
            { frames: Fig.atk3Frames, dur: 0.62, hitAt: 0.28, dmgMul: 2.00, reachMul: 1.30, kb: 4.0, kbUp: 2.5, launch: true, heavy: true, sound: 'swingHeavy' }
        ],
        skill: 'roar', skillName: '丈八蛇矛 · 当阳怒吼'
    },
    zhaoyun: {
        combo: [
            { frames: Fig.atk1Frames, dur: 0.36, hitAt: 0.15, dmgMul: 0.95, reachMul: 1.10, kb: 1.3, sound: 'swing' },
            { frames: Fig.atk2Frames, dur: 0.36, hitAt: 0.13, dmgMul: 1.00, reachMul: 1.10, kb: 1.5, sound: 'swing' },
            { frames: Fig.atk3Frames, dur: 0.54, hitAt: 0.24, dmgMul: 1.65, reachMul: 1.25, kb: 3.2, kbUp: 2.1, launch: true, heavy: true, sound: 'swingHeavy' }
        ],
        skill: 'thrust', skillName: '龙胆亮银枪 · 七进七出'
    },
    zhugeliang: {
        combo: [
            { frames: Fig.atk1Frames, dur: 0.40, hitAt: 0.17, dmgMul: 0.90, reachMul: 1.05, kb: 1.4, sound: 'swing' },
            { frames: Fig.atk2Frames, dur: 0.40, hitAt: 0.15, dmgMul: 0.95, reachMul: 1.05, kb: 1.6, sound: 'swing' },
            { frames: Fig.atk3Frames, dur: 0.56, hitAt: 0.25, dmgMul: 1.60, reachMul: 1.15, kb: 3.2, kbUp: 2.0, launch: true, heavy: true, sound: 'swingHeavy' }
        ],
        skill: 'meteor', skillName: '卧龙 · 八阵雷火'
    }
};

/** 跳跃 / 冲刺 / 反击 通用招式 */
const COMMON_MOVES = {
    air: { frames: Fig.atkAirFrames, dur: 0.36, hitAt: 0.15, dmgMul: 1.10, reachMul: 1.00, kb: 1.4, sound: 'swing' },
    dash: { frames: Fig.atkDashFrames, dur: 0.48, hitAt: 0.13, dmgMul: 1.50, reachMul: 1.28, kb: 3.0, heavy: true, sound: 'swingHeavy' },
    counter: { frames: Fig.atk2Frames, dur: 0.40, hitAt: 0.10, dmgMul: 1.55, reachMul: 1.10, kb: 2.6, heavy: true, sound: 'swingHeavy' }
};

/* ============================================================
 * 必杀技定义
 * hits: [{at, dmgMul, reachMul|radius, kb, kbUp, heavy, launch, multi, hue, sound}]
 * ========================================================== */
const SKILL_DEFS = {
    spin: {
        superName: '双股剑 · 乾坤乱舞',
        dur: 1.30, invulnFrom: 0.06, invulnTo: 1.18, cost: 100,
        pose: (k) => Fig.spin(k),
        move: [{ at: 0.05, vx: 1.6, dur: 0.9 }],
        hits: [
            { at: 0.14, dmgMul: 0.85, reachMul: 1.25, kb: 0.9, hue: '#BFE9FF' },
            { at: 0.30, dmgMul: 0.85, reachMul: 1.25, kb: 0.9, hue: '#BFE9FF' },
            { at: 0.46, dmgMul: 0.85, reachMul: 1.25, kb: 0.9, hue: '#BFE9FF' },
            { at: 0.62, dmgMul: 0.85, reachMul: 1.25, kb: 0.9, hue: '#BFE9FF' },
            { at: 0.84, dmgMul: 1.60, reachMul: 1.35, kb: 3.6, kbUp: 2.2, heavy: true, launch: true, hue: '#FFE9A8' }
        ],
        onEnd: (p) => { p.game.fx.wave(p.sx(p.game.cam), p.sy(p.game.cam), 120, '#BFE9FF', 0.4, 5); }
    },
    sweep: {
        superName: '青龙偃月 · 拖刀断岳',
        dur: 1.15, invulnFrom: 0.10, invulnTo: 1.00, cost: 100,
        pose: (k, p) => (k < 0.22 ? Fig.cast(p.time) : Fig.sample(Fig.atk3Frames, (k - 0.22) / 0.78 * 0.62)),
        move: [{ at: 0.26, vx: 5.2, dur: 0.42 }],
        hits: [
            { at: 0.30, dmgMul: 2.60, reachMul: 2.05, kb: 5.0, kbUp: 2.6, heavy: true, launch: true, multi: true, depthTol: 0.95, hue: '#FFD166' }
        ],
        onStart: (p) => { p.game.audio.play('skill'); },
        onHit: (p) => {
            p.game.fx.wave(p.sx(p.game.cam) + p.facing * 40, p.sy(p.game.cam), 190, '#FFD166', 0.42, 6);
            p.game.fx.addFlash(0.4, '#FFE9A8'); p.game.fx.addShake(13);
        }
    },
    thrust: {
        superName: '龙胆 · 七进七出',
        dur: 0.95, invulnFrom: 0.05, invulnTo: 0.80, cost: 100,
        pose: (k) => (k < 0.16 ? Fig.cast(0) : Fig.thrust(U.clamp((k - 0.16) / 0.5, 0, 1))),
        move: [{ at: 0.16, vx: 15.0, dur: 0.34 }],
        hits: [
            { at: 0.18, dmgMul: 1.05, reachMul: 1.5, kb: 0.6, multi: true, hue: '#BFE9FF', sound: 'hit' },
            { at: 0.28, dmgMul: 1.05, reachMul: 1.5, kb: 0.6, multi: true, hue: '#BFE9FF' },
            { at: 0.38, dmgMul: 1.05, reachMul: 1.5, kb: 0.6, multi: true, hue: '#BFE9FF' },
            { at: 0.50, dmgMul: 1.90, reachMul: 1.7, kb: 4.2, kbUp: 2.0, heavy: true, launch: true, multi: true, hue: '#FFE9A8' }
        ],
        onStart: (p) => { p.game.audio.play('skill'); }
    },
    roar: {
        superName: '当阳桥 · 万人敌',
        dur: 1.20, invulnFrom: 0.05, invulnTo: 1.05, cost: 100,
        pose: (k, p) => (k < 0.34 ? Fig.cast(p.time) : Fig.castRelease()),
        hits: [
            { at: 0.36, radius: 3.6, radiusZ: 1.5, dmgMul: 1.85, kb: 5.2, kbUp: 2.4, heavy: true, launch: true, hue: '#FF8A3C' }
        ],
        onStart: (p) => { p.game.audio.play('bossRoar'); },
        onHit: (p) => {
            const g = p.game;
            g.fx.wave(p.sx(g.cam), p.sy(g.cam), 260, '#FF8A3C', 0.5, 8);
            g.fx.addFlash(0.45, '#FFD166'); g.fx.addShake(16);
        }
    },
    meteor: {
        superName: '八阵图 · 天雷地火',
        dur: 1.45, invulnFrom: 0.05, invulnTo: 1.35, cost: 100,
        pose: (k, p) => Fig.cast(p.time),
        hits: [],
        onStart: (p) => {
            p.game.audio.play('summon');
            const g = p.game;
            const targets = g.actors.filter(e => e.team !== p.team && !e.dead);
            const list = targets.slice(0, 7);
            if (!list.length) {
                for (let i = 0; i < 5; i++) list.push({ x: p.x + p.facing * (1.6 + i * 1.5), z: U.rand(0.6, 3.0), dead: false, y: 0, team: TEAM.FOE });
            }
            p.meteorTargets = list;
            list.forEach((e, i) => {
                g.schedule(0.42 + i * 0.11, () => {
                    const sx = e.sx ? e.sx(g.cam) : (VIEW.W / 2 + (e.x - g.cam.x) * PPM);
                    const sy = screenY(e.z);
                    g.fx.beam(sx, 40, sy, '#BFE9FF', 0.4);
                    g.fx.fireBurst(sx, sy, 16, 1.1);
                    g.audio.play('thunder');
                    g.fx.addShake(5);
                    const hit = {
                        dmg: p.atk * 1.35, dir: U.sign(e.x - p.x) || p.facing,
                        kb: 2.6, kbUp: 1.6, heavy: true, src: p, srcX: p.x
                    };
                    if (e.takeHit) e.takeHit(hit);
                    // 溅射
                    for (const o of g.actors) {
                        if (o === e || o.dead || o.team === p.team) continue;
                        if (Math.abs(o.x - e.x) < 0.9 && Math.abs(o.z - e.z) < 0.7) {
                            o.takeHit(Object.assign({}, hit, { dmg: hit.dmg * 0.45, kbUp: 0, heavy: false }));
                        }
                    }
                });
            });
        }
    }
};

/* 占位（pose 回调里的静态时间） */
const p_time_placeholder = 0;

class Player extends Actor {
    constructor(game, cfg) {
        super(game, Object.assign({ team: TEAM.HERO, z: 2.0 }, cfg));
        this.kit = HERO_KIT[cfg.look] || HERO_KIT.liubei;
        this.heroKey = cfg.look;
        this.isPlayer = true;

        this.rage = 0;
        this.maxRage = 100;
        this.lives = 3;
        this.score = 0;
        this.combo = 0;
        this.comboT = 0;
        this.comboBest = 0;
        this.hitsLanded = 0;

        this.dashT = 0;
        this.dashDir = 1;
        this.airAttackUsed = false;
        this.counterWindow = 0;
        this.perfectGuards = 0;
        this.respawnT = 0;
        this.controlLock = 0;

        this.prevPose = null;
        this.trailT = 0;
    }

    get moveSpeed() { return this.spd * MOVE_BOOST; }

    /* ============================================================
     * 输入 → 意图
     * ========================================================== */
    think(dt) {
        const inp = this.game.input;
        const g = this.game;

        if (this.comboT > 0) {
            this.comboT -= dt;
            if (this.comboT <= 0) { this.combo = 0; }
        }
        if (this.counterWindow > 0) this.counterWindow -= dt;
        if (this.controlLock > 0) { this.controlLock -= dt; return; }
        this.trailT -= dt;

        /* ---- 死亡 / 复活 ---- */
        if (this.dead) {
            this.respawnT -= dt;
            if (this.respawnT <= 0 && this.lives > 0) this.respawn();
            return;
        }

        /* ---- 必杀技 ---- */
        if (this.state === 'skill') { this.tickSkill(dt); return; }

        if (inp.consume('skill')) {
            if (this.canSkill()) { this.startSkill(); return; }
        }

        /* ---- 倒地 / 起身 ---- */
        if (this.state === 'down') {
            this.downTime += dt;
            if (this.downTime > 0.85) { this.setState('getUp'); this.stateT = 0; }
            return;
        }
        if (this.state === 'getUp') {
            if (this.stateT > 0.44) { this.setState('idle'); this.invuln = Math.max(this.invuln, 0.35); }
            return;
        }
        if (this.state === 'downA') return;   // 空中受身，等落地

        /* ---- 受击硬直 ---- */
        if (this.state === 'hurt') {
            if (this.stateT >= (this.stun || 0.24)) { this.setState(this.y > 0 ? 'air' : 'idle'); }
            return;
        }
        if (this.state === 'stagger') {
            if (this.stateT >= 0.5) this.setState('idle');
            return;
        }

        /* ---- 冲刺中 ---- */
        if (this.state === 'dash') {
            this.dashT -= dt;
            const dd = COMMON_MOVES.dash;
            if (!this.atkHitDone && inp.consume('attack')) {
                this.atkDef = dd; this.stateT = 0; this.atkHitDone = false;
                this.hitList = new Set();
                this.setState('_atk');
                this.game.audio.play('swingHeavy');
                return;
            }
            if (this.dashT <= 0) { this.setState('idle'); this.atkDef = null; }
            return;
        }

        /* ---- 攻击中 ---- */
        if (this.atkDef) {
            const d = this.atkDef;
            // 命中帧
            if (!this.atkHitDone && this.stateT >= d.hitAt) this.doHitCheck();
            // 连段输入窗口
            const winStart = d.hitAt + 0.02;
            if (this.stateT >= winStart && this.stateT < d.dur && inp.consume('attack')) {
                this.comboQueued = true;
            }
            if (this.stateT >= d.dur) {
                this.atkDef = null;
                if (this.comboQueued && this.comboNext) {
                    this.comboQueued = false;
                    this.startCombo(this.comboNext);
                } else {
                    this.comboQueued = false;
                    this.comboStep = 0;
                    this.setState(this.y > 0 ? 'air' : 'idle');
                }
            }
            // 空中攻击落地中断
            if (this.y <= 0 && d === COMMON_MOVES.air && this.stateT > 0.14) {
                this.atkDef = null; this.setState('land');
            }
            return;
        }

        /* ---- 可自由行动 ---- */
        // 落地僵直短暂保持
        if (this.state === 'land' && this.stateT < 0.13) return;

        const ax = inp.axis();

        // 跳跃
        if (inp.consume('jump') && this.y <= 0) {
            this.vy = 9.4;
            this.y = 0.01;
            this.airAttackUsed = false;
            this.setState('jump');
            this.game.audio.play('jump');
            g.fx.dust(this.sx(g.cam), this.sy(g.cam), 6, '#C8B79A');
            return;
        }

        // 空中攻击
        if (this.y > 0) {
            if (inp.consume('attack') && !this.airAttackUsed) {
                this.airAttackUsed = true;
                this.atkDef = COMMON_MOVES.air;
                this.stateT = 0; this.atkHitDone = false; this.hitList = new Set();
                this.setState('_atk');
                this.game.audio.play('swing');
            }
            this.vx = ax.x * this.moveSpeed * 0.92;
            this.vz = ax.y * this.moveSpeed * 0.62;
            return;
        }

        // 冲刺
        if (inp.consume('dash')) {
            const dir = inp.dashDir || (ax.x !== 0 ? U.sign(ax.x) : this.facing);
            this.dashDir = dir;
            this.facing = dir;
            this.dashT = 0.30;
            this.setState('dash');
            this.vx = dir * this.moveSpeed * 3.4;
            this.vz = ax.y * this.moveSpeed * 0.5;
            this.invuln = Math.max(this.invuln, 0.18);
            this.game.audio.play('dash');
            return;
        }

        // 格挡
        if (inp.isDown('guard')) {
            if (this.state !== 'guard') { this.setState('guard'); this.stateT = 0; }
            this.vx *= 0.2; this.vz *= 0.2;
            return;
        }

        // 攻击
        if (inp.consume('attack')) {
            if (this.counterWindow > 0) {
                this.counterWindow = 0;
                this.atkDef = COMMON_MOVES.counter;
                this.stateT = 0; this.atkHitDone = false; this.hitList = new Set();
                this.setState('_atk');
                this.game.audio.play('swingHeavy');
                g.fx.addFlash(0.22, '#BFE9FF');
                this.faceNearest();
                return;
            }
            this.startCombo('c0');
            return;
        }

        // 移动
        if (ax.x !== 0 || ax.y !== 0) {
            const sp = this.moveSpeed;
            this.vx = ax.x * sp;
            this.vz = ax.y * sp * 0.66;
            if (ax.x !== 0) this.facing = U.sign(ax.x);
            this.setState(Math.abs(ax.y) > 0.5 && ax.x === 0 ? 'walk' : 'walk');
        } else {
            this.setState('idle');
        }
    }

    startCombo(step) {
        const idx = step === 'c0' ? 0 : ({ c1: 1, c2: 2 })[step] || 0;
        const defs = this.kit.combo;
        const d = defs[Math.min(idx, defs.length - 1)];
        this.atkDef = d;
        this.comboNext = idx < defs.length - 1 ? ('c' + (idx + 1)) : null;
        this.stateT = 0; this.atkHitDone = false;
        this.hitList = new Set();
        this.comboQueued = false;
        this.setState('_atk');
        this.comboStep = idx;

        // 出招前微冲
        const push = idx === 0 ? 1.1 : (idx === 1 ? 1.3 : 2.2);
        this.vx = this.facing * push;
        this.faceNearest(1.0);
        this.game.audio.play(d.sound || 'swing');
    }

    faceNearest(range) {
        let best = null, bd = 1e9;
        for (const e of this.game.actors) {
            if (e === this || e.dead || e.team === this.team) continue;
            const d = Math.abs(e.x - this.x) + Math.abs(e.z - this.z) * 1.6;
            if (d < bd) { bd = d; best = e; }
        }
        if (best && bd < (range || 1.9)) this.facing = U.sign(best.x - this.x) || this.facing;
    }

    /* ============================================================
     * 必杀技
     * ========================================================== */
    canSkill() {
        if (this.y > 0) return false;
        if (this.state === 'down' || this.state === 'downA' || this.state === 'hurt') return false;
        return this.rage >= 50;
    }

    startSkill() {
        const tier = this.rage >= this.maxRage ? 1 : 0;
        this.rage = 0;
        this.skillDef = SKILL_DEFS[this.kit.skill];
        this.skillTier = tier;
        this.skillFired = new Set();
        this.stateT = 0;
        this.setState('skill');
        this.atkDef = null;
        this.invuln = Math.max(this.invuln, this.skillDef.invulnTo || 0);
        this.hitList = new Set();

        const g = this.game;
        g.fx.addFlash(0.5, '#FFFFFF');
        g.fx.addShake(7);
        g.fx.stop(0.16);
        g.fx.wave(this.sx(g.cam), this.sy(g.cam), 150, '#FFD166', 0.45, 5);
        g.audio.play('skill');
        if (this.skillDef.onStart) this.skillDef.onStart(this);
        g.showSkillBanner(this.kit.skillName, tier === 1);
    }

    tickSkill(dt) {
        const d = this.skillDef;
        const t = this.stateT;
        const tierMul = this.skillTier === 1 ? 1.55 : 1.0;
        const g = this.game;

        // 位移
        for (const m of (d.move || [])) {
            if (t >= m.at && t < m.at + (m.dur || 0.3)) {
                this.vx = this.facing * m.vx;
            }
        }

        // 判定
        d.hits.forEach((h, i) => {
            if (t >= h.at && !this.skillFired.has(i)) {
                this.skillFired.add(i);
                const hh = Object.assign({}, h, {
                    dmgMul: (h.dmgMul || 1) * tierMul,
                    multi: true
                });
                this.hitList = new Set();
                let any;
                if (h.radius) {
                    any = this.hitRadial(hh);
                    g.fx.wave(this.sx(g.cam), this.sy(g.cam), 240, h.hue || '#FFD166', 0.45, 6);
                } else {
                    g.fx.slash(this.sx(g.cam) + this.facing * 30 * this.ds, this.cy(g.cam),
                        1.5 * this.ds, this.facing, h.kbUp ? 'v' : 'h', h.hue || '#FFE9A8');
                    any = this.hitArc(hh);
                }
                if (h.sound) g.audio.play(h.sound);
                if (any && d.onHit) d.onHit(this);
                if (any) g.fx.addShake(6);
            }
        });

        // 残影
        this.trailT -= dt;
        if (this.trailT <= 0) {
            this.trailT = 0.045;
            g.fx.ghost(this.sx(g.cam), this.sy(g.cam), PPM * this.ds, this.facing, this.look, this.pose, this.time);
        }

        if (t >= d.dur) {
            if (d.onEnd) d.onEnd(this);
            this.setState('idle');
            this.skillDef = null;
            this.invuln = Math.max(this.invuln, 0.22);
            this.vx = 0;
        }
    }

    animate(dt) {
        if (this.state === 'skill') {
            const d = this.skillDef;
            const k = U.clamp(this.stateT / d.dur, 0, 1);
            this.pose = d.pose(k, this);
            return;
        }
        super.animate(dt);
    }

    /* ============================================================
     * 回调
     * ========================================================== */
    addRage(v) {
        if (this.dead) return;
        this.rage = U.clamp(this.rage + v, 0, this.maxRage);
    }

    registerHit(dmg, killed) {
        this.hitsLanded++;
        this.combo++;
        this.comboT = 1.5;
        this.comboBest = Math.max(this.comboBest, this.combo);
        this.addRage(killed ? 3.2 : 1.5);
        this.score = Math.round(this.score + Math.round(dmg) * (1 + this.combo * 0.03) * 10);
        if (killed) this.score += 500;
    }

    onLaunch(h) { }

    takeHit(h) {
        const r = super.takeHit(h);
        if (!r) return r;
        if (this.lastBlockPerfect && this.hp > 0) {
            this.perfectGuards++;
            this.counterWindow = 0.55;
            this.addRage(9);
            this.score += 200;
        } else if (this.hp > 0) {
            this.addRage(4.5);
            this.combo = 0; this.comboT = 0;
        }
        return r;
    }

    die(h) {
        if (this.dead) return;
        this.lives--;
        this.game.audio.play('gameover');
        this.game.fx.addFlash(0.7, '#FF5A3C');
        this.game.fx.addShake(14);
        this.combo = 0;
        super.die(h);
        this.respawnT = 1.5;
    }

    respawn() {
        this.dead = false;
        this.hp = this.maxHp;
        this.y = 0; this.vy = 0; this.vx = 0; this.vz = 0;
        this.state = 'idle'; this.stateT = 0;
        this.invuln = 2.2;
        this.flash = 0;
        this.rage = Math.max(0, this.rage - 25);
        this.z = 2.0;
        this.x = Math.max(this.game.cam.x - 3.0, this.game.arena.min + 1);
        this.game.fx.addFlash(0.35, '#FFD166');
        this.game.audio.play('heal');
    }

    draw(ctx, cam) {
        if (this.invuln > 0 && this.state !== 'skill' && !this.dead) {
            // 无敌闪烁
            if (Math.floor(this.time * 22) % 2 === 0) {
                ctx.save(); ctx.globalAlpha = 0.45; super.draw(ctx, cam); ctx.restore();
                return;
            }
        }
        super.draw(ctx, cam);
    }
}

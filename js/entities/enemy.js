/* ============================================================
 * 三国战纪 · 敌人 AI
 * 攻击令牌系统：同屏同时进攻的敌人数受限，避免围殴
 * ============================================================ */
'use strict';

/** 各兵种的行动参数 */
const AI_KIND = {
    melee: { approach: 0.84, aggro: 1.0, windup: 0.30, recover: 0.42, keepZ: 0.14 },
    shield: { approach: 0.86, aggro: 0.75, windup: 0.36, recover: 0.55, keepZ: 0.12, guardChance: 0.55 },
    spear: { approach: 0.88, aggro: 0.9, windup: 0.38, recover: 0.50, keepZ: 0.16 },
    archer: { range: 6.5, keep: 4.2, aggro: 0.8, windup: 0.48, recover: 0.75 },
    mage: { range: 8.0, keep: 5.2, aggro: 0.85, windup: 0.62, recover: 0.85 },
    rider: { approach: 0.86, aggro: 1.15, windup: 0.42, recover: 0.5, charge: true, keepZ: 0.18 },
    elite: { approach: 0.84, aggro: 1.1, windup: 0.26, recover: 0.34, keepZ: 0.15, combo: 2 },
    heavy: { approach: 0.86, aggro: 0.9, windup: 0.45, recover: 0.6, keepZ: 0.16 }
};

const ENEMY_KIND = {
    soldier: 'melee', shield: 'shield', spear: 'spear', archer: 'archer',
    firemage: 'mage', cavalry: 'rider', elite: 'elite', ironelite: 'heavy'
};

class Enemy extends Actor {
    constructor(game, cfg) {
        super(game, Object.assign({ team: TEAM.FOE }, cfg));
        this.kind = ENEMY_KIND[cfg.look] || 'melee';
        this.ai = AI_KIND[this.kind];
        this.target = null;
        this.think_t = U.rand(0, 0.3);
        this.repathT = 0;
        this.wanderDir = U.pick([-1, 1]);
        this.hasToken = false;
        this.enterT = 0;          // 出场动画
        this.entering = cfg.entering !== false;
        this.attackCd = U.rand(0.2, 0.9);
        this.strafeDir = U.pick([-1, 1]);
        this.strafeT = 0;
        this.guardT = 0;
        this.deadTimer = 0;
        this.aggro = 0.55 + U.rand(0, 0.35);
        this.scoreValue = cfg.score || Math.round(this.maxHp * 4);
        this.dropTable = cfg.drop || null;

        if (this.entering) {
            this.invuln = 0.55;
            this.setState('walk');
        }
    }

    /* ---------------- 目标选择 ---------------- */
    acquireTarget() {
        const g = this.game;
        let best = null, bd = 1e9;
        for (const a of g.actors) {
            if (a.team !== TEAM.HERO || a.dead) continue;
            const d = Math.abs(a.x - this.x) + Math.abs(a.z - this.z) * 2.2;
            if (d < bd) { bd = d; best = a; }
        }
        this.target = best;
        return best;
    }

    /* ============================================================
     * AI 主循环
     * ========================================================== */
    think(dt) {
        if (this.dead) { this.deadTimer += dt; return; }

        if (this.entering) {
            this.enterT += dt;
            const A = this.game.arena;
            const goal = A ? U.clamp(this.x, A.min + 0.6, A.max - 0.8) : this.x;
            const d = goal - this.x;
            if (Math.abs(d) < 0.35 || this.enterT > 2.6) {
                this.entering = false; this.setState('idle');
            } else {
                this.facing = U.sign(d) || this.facing;
                this.vx = U.sign(d) * this.spd * 2.7;
                this.vz = 0;
                this.setState('run');
                return;
            }
        }

        // 硬直类状态
        if (this.state === 'down') {
            this.downTime += dt;
            if (this.downTime > 0.75) { this.forceState('getUp'); }
            return;
        }
        if (this.state === 'getUp') {
            if (this.stateT > 0.44) { this.setState('idle'); this.invuln = Math.max(this.invuln, 0.25); }
            return;
        }
        if (this.state === 'downA' || this.state === 'hurt' || this.state === 'stagger') {
            if (this.state === 'hurt' && this.stateT >= (this.stun || 0.25)) this.setState('idle');
            if (this.state === 'stagger' && this.stateT >= (this.stun || 0.6)) this.setState('idle');
            return;
        }
        if (this.state === 'guard') {
            this.guardT -= dt;
            if (this.guardT <= 0) this.setState('idle');
            this.vx *= 0.3;
            return;
        }
        if (this.state === 'charge') { this.tickCharge(dt); return; }

        // 攻击中
        if (this.atkDef) {
            const d = this.atkDef;
            if (!this.atkHitDone && this.stateT >= d.hitAt) {
                this.doHitCheck();
                if (this.atkDef.aoe) this.hitRadial(this.atkDef.aoe);
            }
            if (this.stateT >= d.dur) {
                this.atkDef = null;
                this.setState('idle');
                this.releaseToken();
                this.attackCd = d.recover != null ? d.recover : this.ai.recover;
                this.attackCd += U.rand(0.1, 0.7) * (1.4 - this.aggro);
            }
            return;
        }
        if (this.state === 'cast') {
            if (this.stateT >= (this.castDur || 0.5)) {
                this.releaseCast();
            }
            return;
        }

        if (this.attackCd > 0) this.attackCd -= dt;

        const t = this.target && !this.target.dead ? this.target : this.acquireTarget();
        if (!t) { this.setState('idle'); return; }

        const dx = t.x - this.x;
        const adx = Math.abs(dx);
        const dz = t.z - this.z;
        this.facing = U.sign(dx) || this.facing;

        const A = this.ai;
        const ranged = (this.kind === 'archer' || this.kind === 'mage');

        /* ---- 远程：保持距离 ---- */
        if (ranged) {
            if (adx < A.keep - 0.6) {
                this.move(-U.sign(dx) * this.spd * 0.9, -U.sign(dz) * this.spd * 0.35);
                this.setState('walk');
            } else if (adx > A.range) {
                this.move(U.sign(dx) * this.spd * 0.7, U.sign(dz) * this.spd * 0.3);
                this.setState('walk');
            } else {
                this.strafe(dt, t);
                if (this.attackCd <= 0 && Math.abs(dz) < 1.1 && this.tryToken()) {
                    this.beginRanged(t);
                } else {
                    this.setState('idle');
                }
            }
            return;
        }

        /* ---- 近战 ---- */
        // 靠近距离必须小于攻击判定距离，否则会站着打不到
        const atkReach = this.reach + REACH_PAD;
        const range = atkReach * (A.approach || 0.86);
        if (adx > range) {
            // 骑兵：远距离蓄力冲锋
            if (A.charge && adx > 3.4 && adx < 9 && this.attackCd <= 0 && this.tryToken()) {
                this.beginCharge(t);
                return;
            }
            const sp = this.spd * (0.55 + 0.45 * this.aggro);
            this.move(U.sign(dx) * sp, U.sign(dz) * sp * 0.75);
            this.setState('walk');
            this.releaseToken();
            return;
        }

        // 进入攻击距离
        if (Math.abs(dz) > (A.keepZ || 0.15)) {
            this.move(U.sign(dx) * this.spd * 0.35, U.sign(dz) * this.spd * 0.85);
            this.setState('walk');
            return;
        }

        if (this.attackCd <= 0) {
            // 盾兵：有概率先行格挡
            if (A.guardChance && this.hp < this.maxHp * 0.6 && U.chance(A.guardChance * 0.35)) {
                this.setState('guard'); this.guardT = U.rand(0.5, 1.0);
                this.attackCd = 0.5;
                return;
            }
            if (this.tryToken()) {
                this.beginMelee(t);
                return;
            }
        }
        // 没拿到令牌 → 绕圈等待
        this.strafe(dt, t);
    }

    strafe(dt, t) {
        this.strafeT -= dt;
        if (this.strafeT <= 0) {
            this.strafeT = U.rand(0.5, 1.4);
            this.strafeDir = U.pick([-1, 1]);
        }
        const dx = t ? (t.x - this.x) : 0;
        const push = Math.abs(dx) > (this.reach + 0.5) ? U.sign(dx) * 0.35 : 0;
        this.move(push * this.spd * 0.5, this.strafeDir * this.spd * A_STRIDE);
        this.setState('walk');
    }

    move(vx, vz) {
        this.vx = vx; this.vz = vz;
    }

    /* ---------------- 攻击令牌 ---------------- */
    tryToken() {
        if (this.hasToken) return true;
        if (this.game.requestToken(this)) { this.hasToken = true; return true; }
        return false;
    }
    releaseToken() {
        if (this.hasToken) { this.hasToken = false; this.game.releaseToken(this); }
    }

    /* ---------------- 近战起手 ---------------- */
    beginMelee(t) {
        const heavy = this.kind === 'heavy' || this.kind === 'spear';
        const combo = this.ai.combo && U.chance(0.5) ? 2 : 1;
        this.meleeQueue = combo;
        this.startMeleeSwing();
    }

    startMeleeSwing() {
        const heavy = this.kind === 'heavy' || this.kind === 'spear';
        const frames = this.meleeQueue > 1 && heavy ? Fig.atk2Frames : Fig.atk1Frames;
        const d = {
            frames,
            dur: heavy ? 0.62 : 0.48,
            hitAt: heavy ? 0.30 : 0.20,
            dmgMul: heavy ? 1.25 : 0.95,
            reachMul: this.kind === 'spear' ? 1.25 : 1.0,
            kb: heavy ? 2.4 : 1.6,
            kbUp: heavy ? 1.6 : 0,
            heavy: !!heavy,
            sound: heavy ? 'swingHeavy' : 'swing',
            recover: this.ai.recover
        };
        this.telegraph = 0.0001;
        this.atkDef = d;
        this.stateT = 0; this.atkHitDone = false;
        this.hitList = new Set();
        this.forceState('_atk');
        this.vx = this.facing * (heavy ? 1.6 : 1.0);
        this.game.audio.play(d.sound);
    }

    /* ---------------- 远程起手 ---------------- */
    beginRanged(t) {
        this.castDur = this.ai.windup + 0.18;
        this.castKind = this.kind === 'archer' ? 'arrow' : 'fire';
        this.forceState('cast');
        this.telegraph = 0.0001;
        this.vx = 0; this.vz = 0;
        this.game.audio.play(this.castKind === 'arrow' ? 'swing' : 'skill', { volume: 0.6 });
    }

    releaseCast() {
        const g = this.game;
        this.setState('idle');
        this.releaseToken();
        this.attackCd = this.ai.recover + U.rand(0.4, 1.4) * (1.4 - this.aggro);
        this.telegraph = 0;
        if (!this.target) return;
        if (this.castKind === 'arrow') {
            g.spawnProjectile({
                kind: 'arrow', team: this.team, owner: this,
                x: this.x + this.facing * 0.45, z: this.z, y: 0.95,
                vx: this.facing * 11.5,
                vz: (this.target.z - this.z) * 1.35,
                dmg: this.atk * 1.0
            });
            g.audio.play('arrow');
        } else {
            g.spawnProjectile({
                kind: 'fire', team: this.team, owner: this,
                x: this.x + this.facing * 0.5, z: this.z, y: 1.0,
                vx: this.facing * 7.0,
                vz: (this.target.z - this.z) * 0.9,
                dmg: this.atk * 1.15, homing: 0.9
            });
            g.audio.play('fire');
        }
    }

    /* ---------------- 骑兵冲锋 ---------------- */
    beginCharge(t) {
        this.forceState('charge');
        this.chargeWind = 0.55;
        this.chargeDir = U.sign(t.x - this.x) || this.facing;
        this.facing = this.chargeDir;
        this.telegraph = 0.0001;
        this.vx = 0; this.vz = 0;
        this.game.audio.play('bossRoar', { volume: 0.4 });
    }

    tickCharge(dt) {
        this.chargeWind -= dt;
        if (this.chargeWind > 0) {
            this.vx = 0; this.vz = 0;
            this.telegraph = 1;
            return;
        }
        this.telegraph = 0;
        this.vx = this.chargeDir * this.spd * 3.6;
        this.vz = 0;
        if (!this.chargeHit) {
            this.chargeHit = { t: 0 };
            this.hitList = new Set();
        }
        this.chargeHit.t += dt;
        // 冲锋持续命中（同一目标 0.4s 内只中一次）
        const g = this.game;
        for (const e of g.actors) {
            if (e.team === this.team || e.dead) continue;
            if (this.hitList.has(e)) continue;
            if (Math.abs(e.x - this.x) > 0.95) continue;
            if (Math.abs(e.z - this.z) > 0.6) continue;
            this.hitList.add(e);
            e.takeHit({
                dmg: this.atk * 1.15, dir: this.chargeDir, kb: 4.2, kbUp: 1.6,
                heavy: true, src: this, srcX: this.x
            });
        }
        g.fx.dust(this.sx(g.cam) - this.chargeDir * 20, this.sy(g.cam), 1, '#B79B72');
        this.chargeTimer = (this.chargeTimer || 0) + dt;
        if (this.chargeTimer > 0.85) {
            this.chargeTimer = 0; this.chargeHit = null;
            this.setState('idle');
            this.releaseToken();
            this.attackCd = this.ai.recover + U.rand(0.6, 1.4);
        }
    }

    /* ---------------- 受击 / 死亡 ---------------- */
    takeHit(h) {
        // 盾兵正面格挡
        if (this.kind === 'shield' && this.state === 'guard' && h.dir * this.facing < 0) {
            /* 走基类逻辑 */
        }
        const r = super.takeHit(h);
        if (r && this.hasToken && (this.state === 'hurt' || this.state === 'downA')) {
            this.releaseToken();
        }
        return r;
    }

    die(h) {
        if (this.dead) return;
        this.releaseToken();
        this.telegraph = 0;
        super.die(h);
        this.deadTimer = 0;
    }

    animate(dt) {
        if (this.state === 'cast') {
            this.pose = Fig.cast(this.time);
            this.telegraph = U.clamp(this.stateT / (this.castDur || 0.5), 0, 1);
            return;
        }
        super.animate(dt);
        // 起手预警强度
        if (this.atkDef) {
            const d = this.atkDef;
            const k = U.clamp(this.stateT / Math.max(0.01, d.hitAt), 0, 1);
            this.telegraph = this.stateT < d.hitAt ? k : 0;
        } else if (this.state === 'cast') {
            this.telegraph = U.clamp(this.stateT / (this.castDur || 0.5), 0, 1);
        } else if (this.state === 'charge') {
            this.telegraph = this.chargeWind > 0 ? 1 : 0;
        } else {
            this.telegraph = 0;
        }
    }
}

const A_STRIDE = 0.42;

/* ============================================================
 * BOSS：多阶段 + 技能组
 * ========================================================== */
const BOSS_KIT = {
    zhangjue: {
        intro: '天公将军 · 张角',
        phases: [1.0, 0.55],
        skills: {
            close: [
                { type: 'sweep', windup: 0.44, dur: 0.75, dmgMul: 1.3, reachMul: 1.7, kb: 3.2, kbUp: 1.2, heavy: true, hue: '#C77DFF' },
                { type: 'spin', windup: 0.36, dur: 1.0, dmgMul: 0.8, radius: 2.4, hits: 4, kb: 1.6, hue: '#C77DFF' }
            ],
            far: [
                { type: 'meteor', windup: 0.72, dur: 1.2, dmgMul: 1.15, count: 4, hue: '#C77DFF' },
                { type: 'summon', windup: 0.6, dur: 0.9, count: 3, minion: 'soldier' },
                { type: 'bolt', windup: 0.5, dur: 0.7, dmgMul: 1.0, count: 3, hue: '#C77DFF' }
            ],
            rush: [
                { type: 'dash', windup: 0.42, dur: 0.9, dmgMul: 1.25, kb: 3.8, kbUp: 1.4, heavy: true, hue: '#C77DFF' }
            ]
        }
    },
    zhangbao: {
        intro: '地公将军 · 张宝',
        phases: [1.0, 0.6, 0.3],
        skills: {
            close: [
                { type: 'sweep', windup: 0.38, dur: 0.72, dmgMul: 1.4, reachMul: 1.9, kb: 3.4, kbUp: 1.3, heavy: true, hue: '#FFD166' },
                { type: 'thrust', windup: 0.32, dur: 0.62, dmgMul: 1.1, reachMul: 2.0, kb: 2.6, hue: '#FFD166' },
                { type: 'spin', windup: 0.34, dur: 1.05, dmgMul: 0.85, radius: 2.6, hits: 5, kb: 1.8, hue: '#FFD166' }
            ],
            far: [
                { type: 'bolt', windup: 0.46, dur: 0.7, dmgMul: 1.0, count: 5, hue: '#FFD166' },
                { type: 'summon', windup: 0.55, dur: 0.9, count: 3, minion: 'spear' }
            ],
            rush: [
                { type: 'dash', windup: 0.36, dur: 1.0, dmgMul: 1.35, kb: 4.2, kbUp: 1.5, heavy: true, hue: '#FFD166' },
                { type: 'leap', windup: 0.5, dur: 1.1, dmgMul: 1.5, kb: 3.6, kbUp: 1.2, heavy: true, hue: '#FFD166' }
            ]
        }
    },
    tianmo: {
        intro: '天魔 · 张角',
        phases: [1.0, 0.68, 0.38],
        skills: {
            close: [
                { type: 'sweep', windup: 0.34, dur: 0.7, dmgMul: 1.5, reachMul: 2.0, kb: 3.6, kbUp: 1.4, heavy: true, hue: '#18FFFF' },
                { type: 'spin', windup: 0.30, dur: 1.1, dmgMul: 0.9, radius: 2.8, hits: 6, kb: 1.9, hue: '#18FFFF' },
                { type: 'thrust', windup: 0.28, dur: 0.6, dmgMul: 1.2, reachMul: 2.1, kb: 2.8, hue: '#18FFFF' }
            ],
            far: [
                { type: 'meteor', windup: 0.6, dur: 1.3, dmgMul: 1.25, count: 6, hue: '#18FFFF' },
                { type: 'bolt', windup: 0.42, dur: 0.66, dmgMul: 1.05, count: 7, hue: '#18FFFF' },
                { type: 'summon', windup: 0.5, dur: 0.9, count: 4, minion: 'elite' }
            ],
            rush: [
                { type: 'dash', windup: 0.32, dur: 1.0, dmgMul: 1.4, kb: 4.4, kbUp: 1.6, heavy: true, hue: '#18FFFF' },
                { type: 'leap', windup: 0.45, dur: 1.15, dmgMul: 1.6, kb: 4.0, kbUp: 1.3, heavy: true, hue: '#18FFFF' }
            ]
        }
    }
};

class Boss extends Enemy {
    constructor(game, cfg) {
        super(game, Object.assign({ team: TEAM.FOE, entering: false }, cfg));
        this.kit = BOSS_KIT[cfg.look] || BOSS_KIT.zhangjue;
        this.phase = 0;
        this.isBoss = true;
        this.superArmor = true;
        this.actionCd = 1.6;
        this.current = null;      // 当前技能
        this.entering = true;
        this.enterT = 0;
        this.invuln = 1.2;
        this.arenaLock = cfg.lockX;
        this.scaleBase = (cfg.scale || 1) * 1.06;
        this.mass = 3.2;
        this.scoreValue = 5000;
        this.hpBarPulse = 0;
    }

    get phaseIndex() {
        const r = this.hp / this.maxHp;
        let p = 0;
        for (let i = 0; i < this.kit.phases.length; i++) if (r <= this.kit.phases[i]) p = i;
        return p;
    }

    think(dt) {
        if (this.dead) { this.deadTimer += dt; return; }

        if (this.entering) {
            this.enterT += dt;
            if (this.enterT < 1.2) { this.vx = 0; this.vz = 0; this.setState('idle'); return; }
            this.entering = false;
            this.game.onBossReady(this);
        }

        if (this.state === 'down' || this.state === 'getUp') {
            // BOSS 不会被击倒，仅短暂失衡
            this.forceState('idle');
        }
        if (this.state === 'hurt' && this.stateT > 0.12) this.setState('idle');

        const pi = this.phaseIndex;
        if (pi !== this.phase) {
            this.phase = pi;
            this.onPhaseChange();
        }

        if (this.current) { this.tickSkill(dt); return; }
        if (this.state === 'cast') {
            if (this.stateT >= (this.current ? 0 : (this.windupDur || 0.5))) {
                // 由 tickSkill 接管
            }
            return;
        }
        if (this.atkDef) {
            const d = this.atkDef;
            if (!this.atkHitDone && this.stateT >= d.hitAt) this.doHitCheck();
            if (this.stateT >= d.dur) {
                this.atkDef = null; this.setState('idle');
                this.actionCd = 0.55 + U.rand(0, 0.5) - this.phase * 0.12;
            }
            return;
        }

        this.actionCd -= dt;
        const t = this.target && !this.target.dead ? this.target : this.acquireTarget();
        if (!t) { this.setState('idle'); return; }

        const adx = Math.abs(t.x - this.x);
        const dz = t.z - this.z;
        this.facing = U.sign(t.x - this.x) || this.facing;

        if (this.actionCd <= 0) {
            this.chooseSkill(t, adx);
            return;
        }

        // 走位
        const want = 1.5;
        if (adx > want + 0.4) {
            const sp = this.spd * (0.7 + this.phase * 0.16);
            this.move(U.sign(t.x - this.x) * sp, U.sign(dz) * sp * 0.7);
            this.setState('walk');
        } else if (Math.abs(dz) > 0.2) {
            this.move(U.sign(t.x - this.x) * this.spd * 0.2, U.sign(dz) * this.spd * 0.7);
            this.setState('walk');
        } else {
            this.move(0, 0);
            this.setState('idle');
        }
    }

    chooseSkill(t, adx) {
        const K = this.kit.skills;
        let pool;
        if (adx < 2.0) pool = K.close;
        else if (adx < 5.0) pool = U.chance(0.5) ? K.close : K.far;
        else pool = U.chance(0.72) ? K.rush : K.far;
        if (!pool || !pool.length) pool = K.close;
        const s = U.pick(pool);
        this.beginSkill(s, t);
    }

    beginSkill(s, t) {
        this.current = s;
        this.skillT = 0;
        this.skillFired = new Set();
        this.hitList = new Set();
        this.windupDur = s.windup * (1 - this.phase * 0.13);
        this.forceState('cast');
        this.telegraph = 0.0001;
        this.vx = 0; this.vz = 0;
        this.faceTarget = U.sign(t.x - this.x) || this.facing;
        this.facing = this.faceTarget;
        this.game.audio.play(s.type === 'meteor' || s.type === 'summon' ? 'summon' : 'skill', { volume: 0.8 });
    }

    tickSkill(dt) {
        const s = this.current;
        const g = this.game;
        this.skillT += dt;
        const t = this.skillT;
        const W = this.windupDur;

        if (t < W) {
            this.telegraph = U.clamp(t / W, 0, 1);
            this.vx = 0; this.vz = 0;
            return;
        }
        this.telegraph = 0;

        const at = t - W;
        this.hitList = this.hitList || new Set();

        switch (s.type) {
            case 'sweep': this.bossMelee(s, at, Fig.atk3Frames, 0.62, 0.28, 'v'); break;
            case 'thrust':
                if (at < 0.06) this.vx = this.facing * 9; else this.vx *= 0.86;
                this.bossMelee(s, at, Fig.atkDashFrames, 0.55, 0.14, 'thrust');
                break;
            case 'spin':
                this.bossSpin(s, at);
                break;
            case 'dash':
                if (at < 0.42) { this.vx = this.facing * this.spd * 4.2; this.bossRushHit(s); }
                else this.vx *= 0.8;
                if (at > 0.7) this.endSkill(0.8);
                break;
            case 'leap': this.bossLeap(s, at); break;
            case 'bolt': this.bossBolt(s, at); break;
            case 'meteor': this.bossMeteor(s, at); break;
            case 'summon': this.bossSummon(s, at); break;
            default: this.endSkill(0.6);
        }

        if (t > (s.dur + W + 0.4)) this.endSkill(0.6);
    }

    endSkill(cd) {
        this.current = null;
        this.setState('idle');
        this.actionCd = cd != null ? cd : 0.9;
        this.actionCd += U.rand(0, 0.5) - this.phase * 0.1;
        this.vx = 0; this.vz = 0;
    }

    bossMelee(s, at, frames, dur, hitAt, arcKind) {
        const k = U.clamp(at / dur, 0, 1);
        this.pose = Fig.sample(frames, k * dur);
        if (at >= hitAt && !this.skillFired.has('m')) {
            this.skillFired.add('m');
            const g = this.game;
            g.fx.slash(this.sx(g.cam) + this.facing * 40 * this.ds, this.cy(g.cam),
                1.9 * this.ds, this.facing, arcKind, s.hue || '#FFD166');
            this.hitList = new Set();
            this.hitArc({
                dmgMul: s.dmgMul, reachMul: s.reachMul, kb: s.kb, kbUp: s.kbUp || 0,
                heavy: !!s.heavy, depthTol: 0.95, multi: true
            });
            g.fx.addShake(8);
            g.audio.play('swingHeavy');
        }
        if (at > dur + 0.16) this.endSkill(0.7);
    }

    bossSpin(s, at) {
        const g = this.game;
        const dur = s.dur;
        const k = U.clamp(at / dur, 0, 1);
        this.pose = Fig.spin(k);
        this.vx = this.facing * 0.9;
        const n = s.hits || 4;
        for (let i = 0; i < n; i++) {
            const tt = 0.10 + i * (dur * 0.78 / n);
            if (at >= tt && !this.skillFired.has('s' + i)) {
                this.skillFired.add('s' + i);
                g.fx.slash(this.sx(g.cam), this.cy(g.cam), 1.7 * this.ds,
                    i % 2 ? this.facing : -this.facing, 'h', s.hue);
                this.hitList = new Set();
                this.hitRadial({ radius: s.radius, radiusZ: 1.1, dmgMul: s.dmgMul, kb: s.kb, heavy: i === n - 1 });
                g.audio.play('hit');
            }
        }
        if (at > dur + 0.1) this.endSkill(0.85);
    }

    bossRushHit(s) {
        const g = this.game;
        for (const e of g.actors) {
            if (e.team === this.team || e.dead) continue;
            if (this.hitList.has(e)) continue;
            if (Math.abs(e.x - this.x) > 1.05) continue;
            if (Math.abs(e.z - this.z) > 0.7) continue;
            this.hitList.add(e);
            e.takeHit({ dmg: this.atk * s.dmgMul, dir: this.facing, kb: s.kb, kbUp: s.kbUp || 0, heavy: true, src: this, srcX: this.x });
            g.fx.addShake(7);
        }
    }

    bossLeap(s, at) {
        const g = this.game;
        if (at < 0.07) {
            this.vy = 8.6;
            this.y = Math.max(this.y, 0.02);
        }
        if (at < 0.52) this.vx = this.facing * 4.6;
        else this.vx *= 0.8;

        const landed = this.y <= 0.02 && at > 0.25;
        if ((landed || at > 0.8) && !this.skillFired.has('l')) {
            this.skillFired.add('l');
            this.vx = 0;
            g.fx.wave(this.sx(g.cam), this.sy(g.cam), 210, s.hue, 0.45, 7);
            g.fx.addShake(14);
            g.audio.play('hitHeavy');
            this.hitList = new Set();
            this.hitRadial({ radius: 2.6, radiusZ: 1.2, dmgMul: s.dmgMul, kb: s.kb, kbUp: 1.2, heavy: true, launch: true });
            this.endSkill(0.9);
            return;
        }
        if (at > 1.1) this.endSkill(0.9);
    }

    bossBolt(s, at) {
        const g = this.game;
        const n = s.count || 3;
        const iv = 0.16;
        for (let i = 0; i < n; i++) {
            const tt = 0.06 + i * iv;
            if (at >= tt && !this.skillFired.has('b' + i)) {
                this.skillFired.add('b' + i);
                const tgt = this.target;
                const tz = tgt ? tgt.z + U.rand(-0.3, 0.3) : U.rand(0.6, 3.0);
                g.spawnProjectile({
                    kind: 'orb', team: this.team, owner: this,
                    x: this.x + this.facing * 0.55, z: this.z, y: 1.05,
                    vx: this.facing * 8.2, vz: (tz - this.z) * 1.1,
                    dmg: this.atk * (s.dmgMul || 1), color: s.hue
                });
                g.audio.play('fire', { volume: 0.7 });
            }
        }
        if (at > 0.06 + n * iv + 0.2) this.endSkill(0.8);
    }

    bossMeteor(s, at) {
        const g = this.game;
        const n = s.count || 4;
        if (at >= 0.1 && !this.skillFired.has('mm')) {
            this.skillFired.add('mm');
            const t = this.target;
            for (let i = 0; i < n; i++) {
                g.schedule(i * 0.16, () => {
                    const tx = (t && !t.dead ? t.x : this.x + this.facing * 3) + U.rand(-2.6, 2.6);
                    const tz = U.clamp(U.rand(0.5, 3.1), GROUND.zMin, GROUND.zPlayMax);
                    const sx = VIEW.W / 2 + (tx - g.cam.x) * PPM;
                    const sy = screenY(tz);
                    g.fx.beam(sx, 30, sy, s.hue, 0.45);
                    g.schedule(0.22, () => {
                        g.fx.fireBurst(sx, sy, 18, 1.2);
                        g.fx.wave(sx, sy, 110, s.hue, 0.4, 5);
                        g.audio.play('thunder');
                        g.fx.addShake(6);
                        for (const e of g.actors) {
                            if (e.team === this.team || e.dead) continue;
                            if (Math.abs(e.x - tx) < 0.95 && Math.abs(e.z - tz) < 0.62) {
                                e.takeHit({
                                    dmg: this.atk * (s.dmgMul || 1), dir: U.sign(e.x - tx) || 1,
                                    kb: 2.6, kbUp: 1.5, heavy: true, src: this, srcX: tx
                                });
                            }
                        }
                    });
                });
            }
        }
        if (at > 0.1 + n * 0.16 + 0.5) this.endSkill(1.0);
    }

    bossSummon(s, at) {
        const g = this.game;
        if (at >= 0.12 && !this.skillFired.has('sm')) {
            this.skillFired.add('sm');
            g.audio.play('bossRoar');
            for (let i = 0; i < (s.count || 3); i++) {
                g.schedule(i * 0.18, () => {
                    const px = this.x + (i % 2 ? 1 : -1) * U.rand(1.4, 3.0);
                    const pz = U.rand(0.5, 3.1);
                    g.fx.fireBurst(VIEW.W / 2 + (px - g.cam.x) * PPM, screenY(pz), 14, 0.9);
                    g.spawnEnemy(s.minion || 'soldier', px, pz, { entering: true });
                });
            }
        }
        if (at > 0.12 + (s.count || 3) * 0.18 + 0.4) this.endSkill(1.1);
    }

    onPhaseChange() {
        const g = this.game;
        g.fx.addFlash(0.6, '#FF5A3C');
        g.fx.addShake(16);
        g.fx.wave(this.sx(g.cam), this.sy(g.cam), 320, '#FF8A3C', 0.6, 8);
        g.audio.play('bossRoar');
        g.showBanner(`第 ${this.phase + 1} 阶段`, '#FF8A3C');
        this.invuln = Math.max(this.invuln, 0.7);
        this.actionCd = 0.5;
        this.forceState('stagger');
        this.stun = 0.6;
    }

    animate(dt) {
        if (this.current) {
            // pose 由 tickSkill 设置（部分技能）
            if (this.skillT < this.windupDur) this.pose = Fig.cast(this.time);
            return;
        }
        super.animate(dt);
    }

    takeHit(h) {
        if (this.dead) return false;
        const r = super.takeHit(h);
        // BOSS 不倒地、不进长硬直，改为短暂失衡
        if (this.state === 'downA') {
            this.vy = 0; this.y = 0;
            this.forceState('stagger');
            this.stun = 0.30;
        } else if (this.state === 'hurt') {
            this.forceState('idle');
        }
        return r;
    }
}

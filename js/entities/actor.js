/* ============================================================
 * 三国战纪 · 实体基类（3D）
 * 世界坐标：x 前进 / z 纵深 0..3.4 / y 离地高度
 * ============================================================ */
'use strict';

/** 碰撞半径 */
const RX = 0.30;   // x 方向（身宽）
const RZ = 0.235;  // z 方向（身厚）

/** 攻击距离的额外补偿（让判定比武器视觉长度略宽，手感更爽） */
const REACH_PAD = 0.42;

/* 起手预警用的地面光环贴图 */
let _warnTex = null;
function warnTexture() {
    if (_warnTex) return _warnTex;
    const n = 128;
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(n / 2, n / 2, n * 0.20, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.86, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, n, n);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.colorSpace = THREE.SRGBColorSpace;
    _warnTex = t;
    return t;
}

class Actor {
    constructor(game, cfg) {
        this.game = game;
        this.lookKey = cfg.look;
        this.look = LOOKS[cfg.look];
        this.team = cfg.team != null ? cfg.team : TEAM.FOE;
        this.isBoss = !!this.look.boss;

        const st = this.look.stats || {};
        this.scaleBase = cfg.scale || 1;
        this.maxHp = Math.round((st.hp || 50) * (cfg.hpMul || 1));
        this.hp = this.maxHp;
        this.atk = (st.atk || 10) * (cfg.atkMul || 1);
        this.spd = (st.spd || 60) / 62;   // 保持与原节奏一致：像素/秒 ÷ 62
        this.reach = st.reach || 1.0;
        this.mass = cfg.mass || (this.look.build || 1);
        this.superArmor = !!this.look.superArmor || this.isBoss;

        this.x = cfg.x || 0;
        this.z = U.clamp(cfg.z != null ? cfg.z : 1.6, GROUND.zMin, GROUND.zPlayMax);
        this.y = 0;
        this.vx = 0; this.vy = 0; this.vz = 0;
        this.facing = cfg.facing || 1;

        this.state = 'idle';
        this.stateT = 0;
        this.animT = U.rand(0, 6);
        this.time = U.rand(0, 10);

        this.dead = false;
        this.remove = false;
        this.invuln = 0;
        this.flash = 0;
        this.stun = 0;
        this.hitFlashTint = 0;

        /* 攻击相关 */
        this.atkDef = null;
        this.atkHitDone = false;
        this.comboStep = 0;
        this.comboQueued = false;
        this.hitList = null;

        /* 被击相关 */
        this.downTime = 0;
        this.hitCount = 0;

        this.shadowAlpha = 1;
        this.gravity = GRAVITY;
        this.telegraph = 0;
        this.mount = !!this.look.mount;
        this.name = this.look.name;
        this.title = this.look.title || '';
        this.maxHpCache = this.maxHp;
        this.drawScale = 1;
        this.fade = 1;

        this._deathTimer = 0;

        /* ---- 3D ---- */
        this.rigScale = this.look.bossScale || 1;
        this.rig = Chibi.create(cfg.look, this.look);
        this.rig.attach(game.stage.scene);

        this._warn = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({
                map: warnTexture(), transparent: true, opacity: 0,
                blending: THREE.AdditiveBlending, depthWrite: false, color: 0xFF6B3C
            })
        );
        this._warn.rotation.x = -Math.PI / 2;
        this._warn.visible = false;
        game.stage.scene.add(this._warn);
    }

    /* ---------------- 便捷属性 ---------------- */
    get alive() { return !this.dead; }
    get rx() { return RX * (this.look.build || 1) * this.scaleBase; }
    get rz() { return RZ * (this.look.build || 1) * this.scaleBase; }

    /** 胸口中弹点（特效锚点） */
    chest() { return { x: this.x, y: this.y + 1.20 * this.rigScale, z: this.z }; }
    /** 头顶（伤害数字锚点） */
    head() { return { x: this.x, y: this.y + 2.02 * this.rigScale, z: this.z }; }
    /** 脚底 */
    foot() { return { x: this.x, y: this.y + 0.04, z: this.z }; }

    setState(s, keepT) {
        if (this.state === s) return;
        this.state = s;
        if (!keepT) this.stateT = 0;
    }
    forceState(s) { this.state = s; this.stateT = 0; }

    /* ============================================================
     * 更新
     * ========================================================== */
    update(dt) {
        this.time += dt;
        this.stateT += dt;
        this.animT += dt * (this.state === 'run' ? 1.5 : (this.state === 'walk' ? 1.1 : 1));
        if (this.invuln > 0) this.invuln -= dt;
        if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 5.2);

        this.think(dt);
        this.physics(dt);
        this.animate(dt);
        this.rig.update(this, dt);
        this._syncWarn();
    }

    _syncWarn() {
        const w = this._warn;
        if (this.telegraph > 0.02 && !this.dead) {
            w.visible = true;
            w.position.set(this.x + this.facing * 0.55, 0.04, this.z);
            const s = 0.9 + this.telegraph * 1.5;
            w.scale.set(s, s, 1);
            w.material.opacity = 0.18 + 0.42 * Math.abs(Math.sin(this.time * 12));
            w.material.color.set(this.telegraph > 0.65 ? '#FF4A2C' : '#FFC24D');
        } else {
            w.visible = false;
        }
    }

    physics(dt) {
        this.x += this.vx * dt;
        this.z += this.vz * dt;
        this.z = U.clamp(this.z, GROUND.zMin, GROUND.zPlayMax);
        if (this.z <= GROUND.zMin || this.z >= GROUND.zPlayMax) this.vz = 0;

        if (this.y > 0 || this.vy !== 0) {
            this.vy -= this.gravity * dt;
            this.y += this.vy * dt;
            if (this.y <= 0) {
                const impact = -this.vy;
                this.y = 0; this.vy = 0;
                this.onLand(impact);
            }
        }

        if (this.y <= 0 && this.state !== 'dash' && this.state !== 'charge') {
            const f = Math.pow(0.0016, dt);
            this.vx *= f; this.vz *= f;
            if (Math.abs(this.vx) < 0.02) this.vx = 0;
            if (Math.abs(this.vz) < 0.02) this.vz = 0;
        }

        this.clampToArena();
    }

    onLand(impact) {
        const fx = this.game.fx;
        if (impact > 3) {
            if (fx) fx.dust(this.foot(), 9, '#C8B79A');
            if (this.state === 'downA') {
                this.setState('down');
                this.downTime = 0;
                this.game.audio.play('land');
            } else if (impact > 11) {
                this.setState('land');
            }
        }
    }

    clampToArena() {
        const g = this.game;
        // 玩家永远被锁在战区（arena）内。敌人只在「入场跑位」时用更宽的软边界，
        // 一旦进入战斗就必须回到战区内——否则远程兵会退到玩家够不到的地方放风筝。
        const A = this.isPlayer ? g.arena : ((this.entering && g.softArena) ? g.softArena : g.arena);
        if (!A) return;
        const pad = this.isPlayer ? 0 : 0.35;
        this.x = U.clamp(this.x, A.min - pad, A.max + pad);
    }

    think(dt) { }

    animate(dt) {
        if (this.atkDef && this.state === '_atk') {
            const d = this.atkDef;
            if (!this.atkHitDone && this.stateT >= d.hitAt) this.doHitCheck();
        }
    }

    /* ============================================================
     * 攻击
     * ========================================================== */
    startAttack(def) {
        this.atkDef = def;
        this.stateT = 0;
        this.atkHitDone = false;
        this.hitList = new Set();
        this.setState('_atk');
        if (def.sound) this.game.audio.play(def.sound);
    }

    hitArc(d) {
        const g = this.game;
        const reach = this.reach * (d.reachMul || 1) + REACH_PAD;
        const yLo = d.yLo != null ? d.yLo : -1.25;
        const yHi = d.yHi != null ? d.yHi : 1.10;
        let any = false;

        for (const e of g.actors) {
            if (e === this || e.dead || e.team === this.team) continue;
            if (this.hitList && this.hitList.has(e)) continue;
            const dx = (e.x - this.x) * this.facing;
            const dz = e.z - this.z;
            const dy = e.y - this.y;
            if (dx < -(d.backTol != null ? d.backTol : 0.45) || dx > reach) continue;
            if (Math.abs(dz) > (d.depthTol || DEPTH_EPS)) continue;
            if (dy < yLo || dy > yHi) continue;
            if (this.hitList) this.hitList.add(e);
            const ok = this._applyHit(e, d);
            any = any || ok;
            if (!d.multi) break;
            if (d.maxHits && this.hitList && this.hitList.size >= d.maxHits) break;
        }
        return any;
    }

    hitRadial(d) {
        const g = this.game;
        const R = d.radius || 2.2;
        const RZ0 = d.radiusZ != null ? d.radiusZ : R * 0.55;
        let any = false;
        for (const e of g.actors) {
            if (e === this || e.dead || e.team === this.team) continue;
            if (this.hitList && this.hitList.has(e)) continue;
            if (Math.abs(e.x - this.x) > R) continue;
            if (Math.abs(e.z - this.z) > RZ0) continue;
            if (e.y - this.y > 1.5) continue;
            if (this.hitList) this.hitList.add(e);
            const dir = U.sign(e.x - this.x) || this.facing;
            any = this._applyHit(e, d, dir) || any;
        }
        return any;
    }

    _applyHit(e, d, forceDir) {
        const dmg = this.atk * (d.dmgMul || 1);
        const ok = e.takeHit({
            dmg: dmg,
            dir: forceDir != null ? forceDir : this.facing,
            kb: (d.kb != null ? d.kb : 1.6),
            kbUp: (d.kbUp || 0),
            heavy: !!d.heavy,
            launch: !!d.launch,
            stun: d.stun || 0,
            src: this,
            srcX: this.x
        });
        if (ok && this.isPlayer) this.registerHit(dmg, e.dead);
        return ok;
    }

    doHitCheck() {
        const d = this.atkDef;
        if (!d || this.atkHitDone) return;
        this.atkHitDone = true;
        const any = this.hitArc(d);
        if (!any && this.isPlayer) this.game.tryBreak(this);
    }

    /* ============================================================
     * 受击
     * ========================================================== */
    takeHit(h) {
        if (this.dead || this.invuln > 0) return false;

        const g = this.game;
        const fx = g.fx;
        const pos = this.chest();

        /* ---- 格挡判定 ---- */
        if (this.state === 'guard' && h.dir * this.facing < 0) {
            const perfect = this.stateT < 0.17;
            this.lastBlockPerfect = perfect;
            const dmg = perfect ? 0 : Math.max(1, Math.round(h.dmg * 0.12));
            this.hp -= dmg;
            this.vx = h.dir * (perfect ? 0.35 : 1.5);
            this.stun = perfect ? 0 : 0.14;
            fx.slash({ x: pos.x + this.facing * 0.35, y: pos.y, z: pos.z }, 0.9, this.facing, 'h',
                perfect ? '#BFE9FF' : '#FFD166');
            fx.hitSpark(pos, -h.dir, perfect ? 1.5 : 0.7);
            g.audio.play(perfect ? 'perfectGuard' : 'guard');
            if (perfect) {
                fx.stop(0.14);
                fx.addFlash(0.34, '#BFE9FF');
                fx.text({ x: pos.x, y: pos.y + 0.5, z: pos.z }, '完美格挡！', '#BFE9FF', 20);
                if (h.src && h.src.alive) { h.src.stun = 0.62; h.src.forceState('stagger'); }
            }
            if (dmg > 0) fx.damage(this.head(), dmg, 'guard');
            this.clampHp();
            return true;
        }

        /* ---- 命中 ---- */
        this.lastBlockPerfect = false;
        let dmg = Math.max(1, Math.round(h.dmg));
        this.hp -= dmg;
        this.flash = 1;
        this.hitCount++;

        const armored = (this.superArmor && !h.launch && !h.heavy) ||
            (this.state === 'charge' && !h.heavy);
        const stun = h.stun || (armored ? 0 : (h.heavy ? 0.34 : 0.24));

        fx.damage(this.head(), dmg, h.heavy ? 'heavy' : 'normal');
        fx.hitSpark(pos, h.dir, h.heavy ? 1.7 : 0.9);
        const wpn = (h.src && h.src.look) ? h.src.look.weapon : 'dao';
        const kind = (wpn === 'guandao' || wpn === 'axe') ? 'h'
            : (wpn === 'spear' || wpn === 'lance' || wpn === 'ji') ? 't'
                : (wpn === 'fan' || wpn === 'staff') ? 'c' : 'h';
        if (h.heavy) {
            fx.slash(pos, 1.15, h.dir, kind, '#FFE9A8');
            fx.addShake(kind === 'h' ? 9 : 6.5);
            fx.stop(TUNE.hitStopHeavy);
        } else {
            fx.slash(pos, 0.8, h.dir, kind, '#FFD166');
            fx.addShake(2.6);
            fx.stop(TUNE.hitStop);
        }
        g.audio.play(h.heavy ? 'hitHeavy' : 'hit');

        if (!armored) {
            this.vx = h.dir * h.kb * (h.heavy ? 1 : 0.85);
            this.vz = U.rand(-0.18, 0.18) * h.kb * 0.3;
        } else {
            this.vx += h.dir * h.kb * 0.12;
        }

        if (h.kbUp > 0 || h.launch) {
            this.vy = Math.max(this.vy, h.kbUp || 3.2);
            this.y = Math.max(this.y, 0.02);
            this.forceState('downA');
            this.invuln = Math.max(this.invuln, 0.05);
            if (this.onLaunch) this.onLaunch(h);
        } else if (!armored) {
            this.facing = -h.dir;
            this.forceState('hurt');
            this.stun = stun;
        } else {
            this.stun = 0;
        }

        this.clampHp();
        if (this.hp <= 0) this.die(h);
        return true;
    }

    clampHp() {
        this.hp = U.clamp(this.hp, 0, this.maxHp);
    }

    heal(v) {
        this.hp = U.clamp(this.hp + v, 0, this.maxHp);
    }

    die(h) {
        if (this.dead) return;
        this.dead = true;
        this.state = 'downA';
        this.stateT = 0;
        this.invuln = 999;
        this.vy = Math.max(this.vy, 4.2);
        this.vx = (h && h.dir ? h.dir : -this.facing) * 2.2;
        this.y = Math.max(this.y, 0.02);
        this.game.audio.play('ko');
        this.game.onActorDead(this);
    }

    dispose() {
        this.rig.detach(this.game.stage.scene);
        this.rig.dispose();
        this.game.stage.scene.remove(this._warn);
        this._warn.geometry.dispose();
        this._warn.material.dispose();
    }
}

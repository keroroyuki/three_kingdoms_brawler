/* ============================================================
 * 三国战纪 · 实体基类
 * 世界坐标：x（前进方向，单位）/ z（纵深 0..3.4）/ y（离地高度）
 * ============================================================ */
'use strict';

/** 碰撞半径 */
const RX = 0.30;   // x 方向（身宽）
const RZ = 0.235;  // z 方向（身厚）

/** 攻击距离的额外补偿（让判定比武器视觉长度略宽，手感更爽） */
const REACH_PAD = 0.42;

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
        this.spd = (st.spd || 60) / PPM;   // 单位/秒
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
        this.pose = Fig.base();
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
        this.hitCount = 0;      // 连段中被击次数（用于递减击退）

        this.shadowAlpha = 1;
        this.gravity = GRAVITY;
        this.telegraph = 0;
        this.mount = !!this.look.mount;
        this.name = this.look.name;
        this.title = this.look.title || '';
        this.maxHpCache = this.maxHp;

        this._deathTimer = 0;
    }

    /* ---------------- 便捷属性 ---------------- */
    get alive() { return !this.dead; }
    get rx() { return RX * (this.look.build || 1) * this.scaleBase; }
    get rz() { return RZ * (this.look.build || 1) * this.scaleBase; }
    get ds() { return depthScale(this.z) * this.scaleBase; }
    /** 屏幕 x */
    sx(cam) { return VIEW.W / 2 + (this.x - cam.x) * PPM; }
    /** 脚底屏幕 y */
    sy(cam) { return screenY(this.z) - this.y * PPM * this.ds + (cam.y || 0); }
    /** 胸口屏幕 y（用于伤害数字、特效锚点） */
    cy(cam) { return this.sy(cam) - 0.95 * PPM * this.ds; }

    setState(s, keepT) {
        if (this.state === s) return;
        this.state = s;
        if (!keepT) this.stateT = 0;
    }
    /** 强制重入（重复受击时重置计时） */
    forceState(s) { this.state = s; this.stateT = 0; }

    /* ============================================================
     * 更新
     * ============================================================ */
    update(dt) {
        this.time += dt;
        this.stateT += dt;
        if (this.invuln > 0) this.invuln -= dt;
        if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 5.2);

        this.think(dt);
        this.physics(dt);
        this.animate(dt);
    }

    physics(dt) {
        // 水平 / 纵深
        this.x += this.vx * dt;
        this.z += this.vz * dt;
        this.z = U.clamp(this.z, GROUND.zMin, GROUND.zPlayMax);
        if (this.z <= GROUND.zMin || this.z >= GROUND.zPlayMax) this.vz = 0;

        // 垂直
        if (this.y > 0 || this.vy !== 0) {
            this.vy -= this.gravity * dt;
            this.y += this.vy * dt;
            if (this.y <= 0) {
                const impact = -this.vy;
                this.y = 0; this.vy = 0;
                this.onLand(impact);
            }
        }

        // 摩擦
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
            if (fx) {
                fx.dust(this.sx(this.game.cam), this.sy(this.game.cam), 8, '#C8B79A');
            }
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
        const A = (this.isPlayer && g.arena) ? g.arena : (g.softArena || g.arena);
        if (A) this.x = U.clamp(this.x, A.min, A.max);
    }

    /** 子类实现 AI / 输入 */
    think(dt) { }

    /* ============================================================
     * 动画：把状态映射为姿态
     * ============================================================ */
    animate(dt) {
        let p = null, snap = false;
        const t = this.animT;

        switch (this.state) {
            case 'idle': p = Fig.idle(t); break;
            case 'walk': p = Fig.walk(t, 9.5); break;
            case 'run': p = Fig.run(t); break;
            case 'jump':
            case 'air': p = this.vy > 0 ? Fig.jumpUp() : Fig.fall(); break;
            case 'land': p = Fig.land(); snap = this.stateT < 0.02; break;
            case 'guard': p = Fig.guard(t); break;
            case 'hurt': p = Fig.hurt(); snap = true; break;
            case 'downA': p = Fig.down(t); snap = true; break;
            case 'down': p = Fig.down(t * 0.4); snap = true; break;
            case 'getUp': p = Fig.getUp(U.clamp(this.stateT / 0.44, 0, 1)); snap = true; break;
            case 'cast': p = Fig.cast(t); break;
            case 'cheer': p = Fig.cheer(t); break;
            case 'charge': p = Fig.charge(t); break;
            default: p = Fig.idle(t);
        }

        if (this.atkDef) {
            p = Fig.sample(this.atkDef.frames, this.stateT);
            snap = true;
        }

        if (p) {
            if (snap) this.pose = p;
            else this.pose = Fig.blend(this.pose, p, U.clamp(dt * 17, 0, 1));
        }
    }

    /* ============================================================
     * 攻击
     * ============================================================ */
    startAttack(def) {
        this.atkDef = def;
        this.stateT = 0;
        this.atkHitDone = false;
        this.hitList = new Set();
        this.setState('_atk');
        if (def.sound) this.game.audio.play(def.sound);
    }

    /** 前向扇形判定 */
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

    /** 环形范围判定（以自身为中心） */
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

    /** 普攻判定执行一次 */
    doHitCheck() {
        const d = this.atkDef;
        if (!d || this.atkHitDone) return;
        this.atkHitDone = true;
        const any = this.hitArc(d);
        if (!any && this.isPlayer) this.game.tryBreak(this);
    }

    /* ============================================================
     * 受击
     * 返回 true = 有效命中
     * ============================================================ */
    takeHit(h) {
        if (this.dead || this.invuln > 0) return false;

        const g = this.game;
        const fx = g.fx;
        const sx = this.sx(g.cam), cy = this.cy(g.cam);

        /* ---- 格挡判定 ---- */
        if (this.state === 'guard' && h.dir * this.facing < 0) {
            const perfect = this.stateT < 0.17;
            this.lastBlockPerfect = perfect;
            const dmg = perfect ? 0 : Math.max(1, Math.round(h.dmg * 0.12));
            this.hp -= dmg;
            this.vx = h.dir * (perfect ? 0.35 : 1.5);
            this.stun = perfect ? 0 : 0.14;
            fx.slash(sx + this.facing * 16, cy, 0.85 * this.ds, this.facing, 'h',
                perfect ? '#BFE9FF' : '#FFD166');
            fx.hitSpark(sx + this.facing * 14, cy + 6, -h.dir, perfect ? 1.5 : 0.7);
            g.audio.play(perfect ? 'perfectGuard' : 'guard');
            if (perfect) {
                fx.stop(0.14);
                fx.addFlash(0.34, '#BFE9FF');
                fx.text(sx, cy - 40, '完美格挡！', '#BFE9FF', 20);
                if (h.src && h.src.alive) { h.src.stun = 0.62; h.src.forceState('stagger'); }
            }
            if (dmg > 0) fx.damage(sx, cy - 20, dmg, 'guard');
            this.clampHp();
            return true;
        }

        /* ---- 命中 ---- */
        let dmg = Math.max(1, Math.round(h.dmg * (this.isBoss ? 1 : 1)));
        this.hp -= dmg;
        this.flash = 1;
        this.hitCount++;

        const armored = (this.superArmor && !h.launch && !h.heavy) ||
            (this.state === 'charge' && !h.heavy);
        const stun = h.stun || (armored ? 0 : (h.heavy ? 0.34 : 0.24));

        fx.damage(sx, cy - 16, dmg, h.heavy ? 'heavy' : 'normal');
        fx.hitSpark(sx + h.dir * 8, cy, h.dir, h.heavy ? 1.7 : 0.9);
        if (h.heavy) {
            fx.slash(sx, cy, 1.05 * this.ds, h.dir, 'h', '#FFE9A8');
            fx.addShake(6.5);
            fx.stop(TUNE.hitStopHeavy);
        } else {
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
            // 霸体：只掉血，动作继续
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

    /* ============================================================
     * 绘制
     * ============================================================ */
    drawShadow(ctx, cam) {
        if (this.remove) return;
        const k = PPM * this.ds;
        const h = U.clamp(this.y / 2.4, 0, 1);
        const w = 0.40 * k * (1 - h * 0.42);
        const a = 0.32 * (1 - h * 0.62) * this.shadowAlpha;
        Fig.shadow(ctx, this.sx(cam), screenY(this.z) + (cam.y || 0), w, a, 1);
    }

    draw(ctx, cam) {
        if (this.remove) return;
        const k = PPM * this.ds;
        const sx = this.sx(cam), sy = this.sy(cam);
        const o = {
            time: this.time,
            flash: this.flash,
            weaponAngle: this.weaponAngle || 0
        };

        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(k * this.facing, k);
        if (this.pose.squash && this.pose.squash !== 1) {
            ctx.scale(1 / this.pose.squash, this.pose.squash);
        }
        ctx.translate(0, -FOOT_OFF);
        if (this.pose.bodyRot) ctx.rotate(this.pose.bodyRot * this.facing);

        if (this.mount && this.state !== 'down' && this.state !== 'downA') {
            Fig.drawMount(ctx, this.look, 0, 0, 1, 1, this.time, o);
            ctx.translate(0, -0.52);
        }

        const s = Fig.solve(this.pose);
        Fig.draw(ctx, this.look, s, o);
        if (this.look.shieldColor) Fig.drawShield(ctx, this.look, s, o);
        ctx.restore();

        if (this.state === 'guard') this.drawGuardAura(ctx, cam);
        if (this.telegraph > 0) this.drawTelegraph(ctx, cam);
    }

    drawGuardAura(ctx, cam) {
        const k = this.ds;
        const sx = this.sx(cam), cy = this.cy(cam);
        const perfect = this.stateT < 0.17;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = perfect ? 0.55 : 0.24;
        ctx.strokeStyle = perfect ? '#BFE9FF' : '#9FB3C8';
        ctx.lineWidth = 2.4 * k;
        ctx.beginPath();
        ctx.ellipse(sx + this.facing * 10 * k, cy, 26 * k, 44 * k, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }

    /** 攻击预警（敌人起手） */
    drawTelegraph(ctx, cam) {
        const k = this.ds;
        const a = this.telegraph;
        const sx = this.sx(cam), cy = this.cy(cam);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.30 + 0.34 * Math.sin(this.time * 34);
        ctx.fillStyle = a > 0.6 ? '#FF5A3C' : '#FFC94D';
        ctx.beginPath();
        ctx.arc(sx + this.facing * 16 * k, cy - 6 * k, (7 + a * 8) * k, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.5 * a;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx + this.facing * 10 * k, cy);
        ctx.lineTo(sx + this.facing * (10 + 18 * a) * k, cy);
        ctx.stroke();
        ctx.restore();
    }
}

/* ============================================================
 * 三国战纪 · 特效系统
 * 粒子 / 斩击弧光 / 冲击波 / 伤害数字 / 屏幕震动 / 残影 / 落雷 / 火焰
 * ============================================================ */
'use strict';

class FX {
    constructor() {
        this.parts = [];
        this.arcs = [];
        this.waves = [];
        this.texts = [];
        this.rings = [];
        this.afterimages = [];
        this.beams = [];
        this.shake = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.flash = 0;
        this.flashColor = '#FFFFFF';
        this.hitStop = 0;
    }

    clear() {
        this.parts.length = 0; this.arcs.length = 0; this.waves.length = 0;
        this.texts.length = 0; this.rings.length = 0; this.afterimages.length = 0;
        this.beams.length = 0;
        this.shake = 0; this.flash = 0; this.hitStop = 0;
    }

    /* ---------------- 触发类 ---------------- */
    addShake(v) { this.shake = Math.min(28, this.shake + v); }
    addFlash(a, color) { this.flash = Math.max(this.flash, a); if (color) this.flashColor = color; }
    stop(t) { this.hitStop = Math.max(this.hitStop, t); }

    /** 屏幕坐标粒子 */
    spawn(o) {
        if (this.parts.length > 620) this.parts.shift();
        this.parts.push(Object.assign({
            x: 0, y: 0, vx: 0, vy: 0, g: 0, r: 3, life: 0.5, max: 0.5,
            color: '#FFFFFF', fade: true, shrink: true, glow: false, spin: 0, rot: 0, shape: 'dot', drag: 1
        }, o));
    }

    /** 命中火花 */
    hitSpark(x, y, dir, power) {
        power = power || 1;
        const n = 7 + (power * 6 | 0);
        for (let i = 0; i < n; i++) {
            const a = (dir > 0 ? -0.5 : Math.PI + 0.5) + U.rand(-0.95, 0.95);
            const sp = U.rand(120, 340) * (0.7 + power * 0.5);
            this.spawn({
                x, y: y - U.rand(6, 34),
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - U.rand(30, 130),
                g: 620, r: U.rand(1.6, 4.2) * (0.8 + power * 0.4),
                life: 0, max: U.rand(0.18, 0.42),
                color: i % 3 === 0 ? '#FFF8D6' : (i % 3 === 1 ? '#FFD166' : '#FF8A3C'),
                glow: true
            });
        }
        // 冲击星芒
        this.rings.push({
            x, y: y - 30, r: 4 * power, max: (34 + 26 * power), life: 0, dur: 0.20,
            color: '#FFF3C4', w: 3.5 * power
        });
    }

    /** 血/尘 */
    blood(x, y, dir, color) {
        for (let i = 0; i < 9; i++) {
            const a = U.rand(0, TAU);
            const sp = U.rand(40, 210);
            this.spawn({
                x, y: y - U.rand(20, 56),
                vx: Math.cos(a) * sp + dir * 70, vy: Math.sin(a) * sp - U.rand(60, 180),
                g: 780, r: U.rand(1.6, 3.6), life: 0, max: U.rand(0.3, 0.7),
                color: color || '#B71C1C'
            });
        }
    }

    dust(x, y, n, color) {
        n = n || 8;
        for (let i = 0; i < n; i++) {
            this.spawn({
                x: x + U.rand(-16, 16), y: y - U.rand(0, 6),
                vx: U.rand(-110, 110), vy: -U.rand(16, 84),
                g: 90, r: U.rand(5, 15), life: 0, max: U.rand(0.34, 0.72),
                color: color || 'rgba(190,175,150,0.55)', drag: 0.90, shrink: false
            });
        }
    }

    /** 斩击弧光（世界坐标，跟随角色纵深） */
    slash(x, y, sc, dir, kind, hue) {
        this.arcs.push({
            x, y, sc, dir, kind: kind || 'h', life: 0,
            dur: 0.17, hue: hue || '#FFFFFF'
        });
    }

    /** 圆形冲击波（屏幕空间椭圆，带纵深压扁） */
    wave(x, y, max, color, dur, w) {
        this.waves.push({ x, y, r: 6, max, life: 0, dur: dur || 0.34, color: color || '#FFFFFF', w: w || 4 });
    }

    /** 伤害数字 */
    damage(x, y, v, kind) {
        this.texts.push({
            x, y, v: Math.abs(Math.round(v)), life: 0, dur: 0.72,
            vy: -118, vx: U.rand(-24, 24), kind: kind || 'normal', sc: 1
        });
    }

    text(x, y, str, color, size) {
        this.texts.push({
            x, y, str: str, life: 0, dur: 1.0, vy: -52, vx: 0,
            kind: 'word', color: color || '#FFD700', size: size || 20
        });
    }

    /** 残影 */
    ghost(x, y, sc, facing, look, pose, time) {
        if (this.afterimages.length > 26) this.afterimages.shift();
        this.afterimages.push({ x, y, sc, facing, look, pose, time, life: 0, dur: 0.26 });
    }

    /** 落雷光束 */
    beam(x, yTop, yBot, color, dur) {
        this.beams.push({ x, yTop, yBot, life: 0, dur: dur || 0.42, color: color || '#BFE9FF', seed: Math.random() * 999 });
    }

    /** 火焰爆发 */
    fireBurst(x, y, n, sc) {
        for (let i = 0; i < (n || 14); i++) {
            const a = U.rand(-Math.PI, 0);
            const sp = U.rand(60, 260) * (sc || 1);
            this.spawn({
                x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8 - 60,
                g: 240, r: U.rand(4, 12) * (sc || 1), life: 0, max: U.rand(0.3, 0.66),
                color: i % 2 ? '#FF7A18' : '#FFC300', glow: true, drag: 0.94
            });
        }
    }

    /* ---------------- 更新 ---------------- */
    update(dt) {
        this.shake = Math.max(0, this.shake - this.shake * TUNE.shakeDecay * dt - 6 * dt);
        if (this.shake > 0.4) {
            this.shakeX = U.rand(-1, 1) * this.shake;
            this.shakeY = U.rand(-1, 1) * this.shake * 0.7;
        } else { this.shakeX = 0; this.shakeY = 0; }
        this.flash = Math.max(0, this.flash - dt * 3.4);

        for (let i = this.parts.length - 1; i >= 0; i--) {
            const p = this.parts[i];
            p.life += dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vy += p.g * dt;
            if (p.drag !== 1) { p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60); }
            if (p.spin) p.rot += p.spin * dt;
            if (p.life >= p.max) this.parts.splice(i, 1);
        }
        const step = (arr) => {
            for (let i = arr.length - 1; i >= 0; i--) {
                arr[i].life += dt;
                if (arr[i].life >= arr[i].dur) arr.splice(i, 1);
            }
        };
        step(this.arcs); step(this.waves); step(this.rings); step(this.texts); step(this.afterimages); step(this.beams);
    }

    /* ---------------- 绘制（屏幕空间） ---------------- */
    draw(ctx) {
        ctx.save();

        /* 残影（在所有实体之下） */
        for (const g of this.afterimages) {
            const k = 1 - g.life / g.dur;
            ctx.save();
            ctx.globalAlpha = 0.30 * k;
            ctx.translate(g.x, g.y);
            ctx.scale(g.facing * g.sc, g.sc);
            ctx.translate(0, -FOOT_OFF);
            Fig.draw(ctx, g.look, Fig.solve(g.pose), { time: g.time, ghost: true, tint: '#7FD8FF' });
            ctx.restore();
        }

        /* 冲击波 */
        for (const w of this.waves) {
            const k = w.life / w.dur;
            const r = w.r + (w.max - w.r) * U.ease.outCubic(k);
            ctx.save();
            ctx.globalAlpha = 1 - k;
            ctx.strokeStyle = w.color;
            ctx.lineWidth = w.w * (1 - k * 0.7);
            ctx.beginPath();
            ctx.ellipse(w.x, w.y, r, r * 0.34, 0, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = (1 - k) * 0.28;
            ctx.fillStyle = w.color;
            ctx.beginPath();
            ctx.ellipse(w.x, w.y, r, r * 0.34, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
        }

        /* 爆炸环 */
        for (const r of this.rings) {
            const k = r.life / r.dur;
            ctx.save();
            ctx.globalAlpha = 1 - k;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = r.w * (1 - k);
            const rad = r.r + (r.max - r.r) * U.ease.outQuad(k);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = i / 8 * TAU + 0.2;
                ctx.moveTo(r.x + Math.cos(a) * rad * 0.55, r.y + Math.sin(a) * rad * 0.55);
                ctx.lineTo(r.x + Math.cos(a) * rad, r.y + Math.sin(a) * rad);
            }
            ctx.stroke();
            ctx.restore();
        }

        /* 斩击弧光 */
        for (const a of this.arcs) {
            const k = a.life / a.dur;
            const S = a.sc;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = (1 - k) * 0.9;
            ctx.translate(a.x, a.y);
            ctx.scale(a.dir, 1);
            const R = 40 * S * (0.75 + k * 0.45);
            ctx.lineWidth = 9 * S * (1 - k * 0.55);
            ctx.strokeStyle = a.hue;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (a.kind === 'h') {
                ctx.arc(0, 0, R, -1.0 + k * 0.55, 0.85 + k * 0.55);
            } else if (a.kind === 'v') {
                ctx.arc(0, -34 * S, R * 0.9, -0.3 + k * 0.5, 2.1 + k * 0.5);
            } else { // thrust 直刺
                ctx.arc(0, -30 * S, R * 0.85, -0.42, 0.42);
            }
            ctx.stroke();
            ctx.globalAlpha = (1 - k) * 0.42;
            ctx.lineWidth = 3 * S;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
            ctx.restore();
        }

        /* 落雷 */
        for (const b of this.beams) {
            const k = b.life / b.dur;
            const fade = k < 0.22 ? k / 0.22 : 1 - (k - 0.22) / 0.78;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = U.clamp(fade, 0, 1);
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(b.x, b.yTop);
            let y = b.yTop;
            while (y < b.yBot) {
                y += 22;
                const nx = b.x + (U.hash(Math.floor(y / 22) + b.seed) - 0.5) * 46;
                ctx.lineTo(nx, Math.min(y, b.yBot));
            }
            ctx.stroke();
            ctx.lineWidth = 2.4;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
            ctx.globalAlpha = U.clamp(fade, 0, 1) * 0.5;
            const g = ctx.createRadialGradient(b.x, b.yBot, 2, b.x, b.yBot, 90);
            g.addColorStop(0, 'rgba(190,235,255,0.9)');
            g.addColorStop(1, 'rgba(120,190,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(b.x, b.yBot, 90, 0, TAU); ctx.fill();
            ctx.restore();
        }

        /* 粒子 */
        ctx.save();
        for (const p of this.parts) {
            const k = p.life / p.max;
            const a = p.fade ? (1 - k) : 1;
            const r = p.shrink ? p.r * (1 - k * 0.8) : p.r * (1 + k * 0.9);
            if (r <= 0.2) continue;
            ctx.globalAlpha = U.clamp(a, 0, 1);
            if (p.glow) ctx.globalCompositeOperation = 'lighter'; else ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = p.color;
            if (p.shape === 'streak') {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(Math.atan2(p.vy, p.vx));
                ctx.fillRect(-r * 3, -r * 0.5, r * 6, r);
                ctx.restore();
            } else {
                ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
            }
        }
        ctx.restore();

        /* 伤害数字 */
        ctx.save();
        ctx.textAlign = 'center';
        for (const t of this.texts) {
            const k = t.life / t.dur;
            const pop = t.kind === 'word' ? 1 : (k < 0.18 ? U.ease.outBack(k / 0.18) : 1);
            const y = t.y + t.vy * t.life + 260 * t.life * t.life;
            const x = t.x + t.vx * t.life;
            ctx.globalAlpha = k > 0.62 ? (1 - (k - 0.62) / 0.38) : 1;
            if (t.kind === 'word') {
                ctx.font = `bold ${(t.size || 20) * pop}px ${U.FONT}`;
                ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,6,0.85)';
                ctx.strokeText(t.str, x, y);
                ctx.fillStyle = t.color;
                ctx.fillText(t.str, x, y);
            } else {
                const size = (t.kind === 'crit' ? 30 : (t.kind === 'player' ? 25 : 21)) * pop;
                ctx.font = `bold ${size}px ${U.FONT}`;
                ctx.lineWidth = 4.5; ctx.strokeStyle = 'rgba(20,10,6,0.88)';
                ctx.strokeText(String(t.v), x, y);
                ctx.fillStyle = t.kind === 'crit' ? '#FFE082'
                    : (t.kind === 'player' ? '#FF8A80' : (t.kind === 'heal' ? '#69F0AE' : '#FFFFFF'));
                ctx.fillText(String(t.v), x, y);
            }
        }
        ctx.restore();

        ctx.restore();
    }

    /** 最上层：闪白 */
    drawFlash(ctx) {
        if (this.flash <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = U.clamp(this.flash, 0, 1);
        ctx.fillStyle = this.flashColor;
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);
        ctx.restore();
    }
}

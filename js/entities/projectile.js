/* ============================================================
 * 三国战纪 · 投射物（箭矢 / 火球 / 妖术弹）
 * ============================================================ */
'use strict';

class Projectile {
    constructor(game, cfg) {
        this.game = game;
        this.kind = cfg.kind || 'arrow';
        this.team = cfg.team;
        this.owner = cfg.owner || null;
        this.x = cfg.x; this.z = cfg.z; this.y = cfg.y != null ? cfg.y : 0.95;
        this.vx = cfg.vx || 0; this.vz = cfg.vz || 0;
        this.vy = cfg.vy || 0;
        this.dmg = cfg.dmg || 10;
        this.color = cfg.color || (this.kind === 'fire' ? '#FF7043' : '#C7CCD1');
        this.life = 0;
        this.maxLife = cfg.maxLife || 3.2;
        this.dead = false;
        this.homing = cfg.homing || 0;
        this.trail = [];
        this.rot = Math.atan2(this.vz * 0.6, this.vx);
    }

    update(dt) {
        this.life += dt;
        if (this.life > this.maxLife) { this.dead = true; return; }

        if (this.homing > 0) {
            let t = null, bd = 1e9;
            for (const a of this.game.actors) {
                if (a.team === this.team || a.dead) continue;
                const d = Math.abs(a.x - this.x);
                if (d < bd) { bd = d; t = a; }
            }
            if (t) {
                this.vz = U.damp(this.vz, (t.z - this.z) * 2.2, this.homing * 3.2, dt);
            }
        }

        if (this.kind === 'arrow') this.vy -= 1.6 * dt;

        this.x += this.vx * dt;
        this.z += this.vz * dt;
        this.y += this.vy * dt;
        this.rot = Math.atan2(this.vz * 0.55, this.vx);

        if (this.z < -0.4 || this.z > GROUND.zMax + 0.4) this.dead = true;
        if (this.y < 0.05) {
            this.dead = true;
            const g = this.game;
            if (this.kind === 'fire') g.fx.fireBurst(this.sx(), screenY(this.z), 8, 0.55);
            else g.fx.dust(this.sx(), screenY(this.z), 5, '#C8B79A');
        }
        const ar = this.game.arena;
        if (ar && (this.x < ar.min - 2 || this.x > ar.max + 2)) this.dead = true;

        // 命中
        for (const e of this.game.actors) {
            if (e.team === this.team || e.dead || e === this.owner) continue;
            if (Math.abs(e.x - this.x) > (e.rx + 0.14)) continue;
            if (Math.abs(e.z - this.z) > 0.42) continue;
            const feetY = e.y, topY = e.y + 1.55;
            if (this.y < feetY - 0.15 || this.y > topY) continue;
            e.takeHit({
                dmg: this.dmg, dir: U.sign(this.vx) || 1, kb: 1.6,
                kbUp: this.kind === 'fire' ? 1.4 : 0,
                heavy: this.kind !== 'arrow', src: this.owner, srcX: this.x
            });
            this.boom();
            this.dead = true;
            return;
        }

        this.trail.push({ x: this.sx(), y: this.py() });
        if (this.trail.length > 7) this.trail.shift();
    }

    boom() {
        const g = this.game;
        if (this.kind === 'fire') {
            g.fx.fireBurst(this.sx(), this.py(), 16, 1.0);
            g.fx.addShake(4);
            g.audio.play('fire');
        } else if (this.kind === 'orb') {
            g.fx.wave(this.sx(), this.py(), 70, this.color, 0.34, 4);
            g.fx.addShake(3);
            g.audio.play('hit');
        } else {
            g.fx.hitSpark(this.sx(), this.py(), U.sign(this.vx) || 1, 0.6);
            g.audio.play('hit', { volume: 0.7 });
        }
    }

    sx() { return VIEW.W / 2 + (this.x - this.game.cam.x) * PPM; }
    py() { return screenY(this.z) - this.y * PPM * depthScale(this.z); }

    draw(ctx) {
        const x = this.sx(), y = this.py();
        const k = depthScale(this.z);
        ctx.save();

        if (this.kind === 'arrow') {
            // 拖尾
            ctx.strokeStyle = U.rgba('#FFFFFF', 0.22);
            ctx.lineWidth = 2 * k;
            ctx.beginPath();
            for (let i = 0; i < this.trail.length; i++) {
                const p = this.trail[i];
                if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            }
            ctx.lineTo(x, y);
            ctx.stroke();

            ctx.translate(x, y);
            ctx.rotate(this.rot * 0.55);
            ctx.scale(k, k);
            // 杆
            ctx.fillStyle = '#6D4C33';
            ctx.fillRect(-20, -1.6, 26, 3.2);
            // 箭头
            ctx.fillStyle = '#D6DBE0';
            ctx.beginPath();
            ctx.moveTo(6, -4.4); ctx.lineTo(17, 0); ctx.lineTo(6, 4.4);
            ctx.closePath(); ctx.fill();
            // 羽
            ctx.fillStyle = '#C62828';
            ctx.beginPath();
            ctx.moveTo(-20, 0); ctx.lineTo(-13, -5.5); ctx.lineTo(-9, -1.2);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-20, 0); ctx.lineTo(-13, 5.5); ctx.lineTo(-9, 1.2);
            ctx.closePath(); ctx.fill();
        } else if (this.kind === 'fire') {
            const r = (10 + Math.sin(this.life * 30) * 2) * k;
            ctx.globalCompositeOperation = 'lighter';
            const grd = ctx.createRadialGradient(x, y, 1, x, y, r * 2.1);
            grd.addColorStop(0, 'rgba(255,240,190,0.95)');
            grd.addColorStop(0.4, 'rgba(255,130,40,0.7)');
            grd.addColorStop(1, 'rgba(200,40,0,0)');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, TAU); ctx.fill();
            ctx.fillStyle = '#FFF3C4';
            ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
        } else {
            // 妖术弹
            ctx.globalCompositeOperation = 'lighter';
            const r = (9 + Math.sin(this.life * 22) * 2) * k;
            const grd = ctx.createRadialGradient(x, y, 1, x, y, r * 2);
            grd.addColorStop(0, U.rgba('#FFFFFF', 0.95));
            grd.addColorStop(0.35, U.rgba(this.color, 0.8));
            grd.addColorStop(1, U.rgba(this.color, 0));
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fill();
            // 环绕符文
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = U.rgba(this.color, 0.8);
            ctx.lineWidth = 1.6 * k;
            ctx.beginPath();
            ctx.ellipse(x, y, r * 1.5, r * 0.7, this.life * 6, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();
    }
}

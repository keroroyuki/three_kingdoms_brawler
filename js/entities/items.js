/* ============================================================
 * 三国战纪 · 掉落道具
 * ============================================================ */
'use strict';

const ITEM_KINDS = {
    baozi: { name: '包子', heal: 38, color: '#F5DEB3', dark: '#C9A227', icon: 'bun', score: 120 },
    roast: { name: '烧鸡', heal: 82, color: '#D78A3A', dark: '#8B4513', icon: 'meat', score: 260 },
    wine: { name: '杜康酒', rage: 55, color: '#8E24AA', dark: '#4A148C', icon: 'jar', score: 200 },
    gold: { name: '金铢', score: 500, color: '#FFD700', dark: '#C9A227', icon: 'coin' },
    jade: { name: '玉玺', score: 2000, color: '#4DD0E1', dark: '#006064', icon: 'jade' },
    scroll: { name: '兵书', rage: 100, heal: 20, color: '#EFEFEF', dark: '#8D6E63', icon: 'scroll', score: 600 }
};

class Item {
    constructor(game, cfg) {
        this.game = game;
        this.kindKey = cfg.kind;
        this.def = ITEM_KINDS[cfg.kind] || ITEM_KINDS.gold;
        this.x = cfg.x; this.z = cfg.z; this.y = cfg.y != null ? cfg.y : 1.0;
        this.vx = cfg.vx != null ? cfg.vx : U.rand(-1.2, 1.2);
        this.vy = cfg.vy != null ? cfg.vy : 3.0;
        this.t = U.rand(0, 6);
        this.dead = false;
        this.life = 0;
        this.maxLife = 22;
        this.grounded = false;
        this.magnet = 0;
    }

    update(dt) {
        this.t += dt; this.life += dt;
        if (this.life > this.maxLife) { this.dead = true; return; }

        if (!this.grounded) {
            this.vy -= GRAVITY * 0.55 * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if (this.y <= 0) { this.y = 0; this.grounded = true; this.vx = 0; }
        } else {
            this.vx *= 0.85;
            this.x += this.vx * dt;
        }
        this.z = U.clamp(this.z, GROUND.zMin, GROUND.zPlayMax);

        // 磁吸
        const p = this.game.player;
        if (p && !p.dead && this.grounded) {
            const d = Math.abs(p.x - this.x) + Math.abs(p.z - this.z) * 2;
            if (d < 1.5) {
                this.x = U.damp(this.x, p.x, 9, dt);
                this.z = U.damp(this.z, p.z, 9, dt);
                this.y = U.damp(this.y, 0.55, 9, dt);
            }
            if (Math.abs(p.x - this.x) < 0.55 && Math.abs(p.z - this.z) < 0.5 && Math.abs(p.y - this.y) < 1.3) {
                this.pickup(p);
            }
        }
    }

    pickup(p) {
        const g = this.game, d = this.def;
        this.dead = true;
        g.audio.play(d.heal ? 'heal' : (d.rage ? 'skill' : 'coin'));
        if (d.heal) { p.heal(d.heal); g.fx.text(p.sx(g.cam), p.cy(g.cam) - 30, '+' + d.heal, '#7CFC75', 20); }
        if (d.rage) { p.addRage(d.rage); g.fx.text(p.sx(g.cam), p.cy(g.cam) - 30, '怒气 +' + d.rage, '#FFD166', 19); }
        if (d.score) { p.score += d.score; g.fx.text(p.sx(g.cam), p.cy(g.cam) - 52, '+' + d.score, '#FFD700', 16); }
        g.fx.spawn({
            x: this.x0(), y: this.y0(), vx: 0, vy: -60, g: 0, r: 26, life: 0, max: 0.4,
            color: d.color, glow: true, shrink: false
        });
        for (let i = 0; i < 10; i++) {
            g.fx.spawn({
                x: this.x0(), y: this.y0(), vx: U.rand(-90, 90), vy: U.rand(-160, -40),
                g: 500, r: U.rand(2, 4), life: 0, max: 0.5, color: d.color, glow: true
            });
        }
        g.onItemPicked(this, p);
    }

    x0() { return VIEW.W / 2 + (this.x - this.game.cam.x) * PPM; }
    y0() { return screenY(this.z) - this.y * PPM * depthScale(this.z); }

    draw(ctx) {
        const k = depthScale(this.z) * 0.86;
        const bob = this.grounded ? Math.abs(Math.sin(this.t * 3)) * 5 : 0;
        const x = this.x0(), y = this.y0() - bob;
        const d = this.def;
        const blink = this.life > this.maxLife - 4 && Math.floor(this.life * 8) % 2 === 0;

        ctx.save();
        // 阴影
        Fig.shadow(ctx, this.x0(), screenY(this.z), 11 * k, 0.28, 1);
        if (blink) { ctx.restore(); return; }

        ctx.translate(x, y);
        ctx.scale(k, k);
        const glow = 0.35 + Math.sin(this.t * 5) * 0.2;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = glow * 0.5;
        const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
        grd.addColorStop(0, U.rgba(d.color, 0.9));
        grd.addColorStop(1, U.rgba(d.color, 0));
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        const OUT = '#2B1B12';
        const stroke = (w) => { ctx.lineWidth = w || 1.8; ctx.strokeStyle = OUT; ctx.stroke(); };

        switch (d.icon) {
            case 'bun':
                ctx.beginPath(); ctx.ellipse(0, 0, 11, 9.5, 0, 0, TAU);
                ctx.fillStyle = d.color; ctx.fill(); stroke();
                ctx.beginPath(); ctx.ellipse(-3, -3.5, 4.5, 3, -0.4, 0, TAU);
                ctx.fillStyle = U.rgba('#FFFFFF', 0.4); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(0, -8); ctx.quadraticCurveTo(2, -11, 5, -8);
                ctx.lineWidth = 1.6; ctx.strokeStyle = d.dark; ctx.stroke();
                break;
            case 'meat':
                ctx.beginPath(); ctx.ellipse(0, 1, 10, 7.5, -0.15, 0, TAU);
                ctx.fillStyle = d.color; ctx.fill(); stroke();
                ctx.beginPath(); ctx.ellipse(-2, -1, 4.5, 2.6, -0.4, 0, TAU);
                ctx.fillStyle = U.rgba('#FFFFFF', 0.32); ctx.fill();
                ctx.strokeStyle = '#EDE7D9'; ctx.lineWidth = 3; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(9, 2); ctx.lineTo(15, 4); ctx.stroke();
                ctx.strokeStyle = OUT; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(9, 2); ctx.lineTo(15, 4); ctx.stroke();
                break;
            case 'jar':
                ctx.beginPath();
                ctx.moveTo(-6, -6); ctx.lineTo(6, -6);
                ctx.quadraticCurveTo(11, 0, 6, 8); ctx.lineTo(-6, 8);
                ctx.quadraticCurveTo(-11, 0, -6, -6);
                ctx.closePath();
                ctx.fillStyle = d.color; ctx.fill(); stroke();
                ctx.fillStyle = d.dark;
                ctx.fillRect(-7, -8.5, 14, 4);
                ctx.fillStyle = U.rgba('#FFFFFF', 0.3);
                ctx.fillRect(-4, 0, 2.5, 6);
                break;
            case 'coin':
                ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, TAU);
                ctx.fillStyle = d.color; ctx.fill(); stroke();
                ctx.fillStyle = d.dark;
                ctx.fillRect(-2.6, -2.6, 5.2, 5.2);
                ctx.beginPath(); ctx.arc(-3, -3, 3, 0, TAU);
                ctx.fillStyle = U.rgba('#FFFFFF', 0.45); ctx.fill();
                break;
            case 'jade':
                ctx.beginPath();
                ctx.moveTo(-9, -7); ctx.lineTo(9, -7); ctx.lineTo(7, 6); ctx.lineTo(-7, 6);
                ctx.closePath();
                ctx.fillStyle = d.color; ctx.fill(); stroke();
                ctx.fillStyle = d.dark;
                ctx.fillRect(-5, -7, 10, 4.5);
                ctx.fillStyle = U.rgba('#FFFFFF', 0.4);
                ctx.fillRect(-6.5, -1, 2.5, 6);
                break;
            case 'scroll':
                ctx.fillStyle = '#F3E7D3';
                U.roundRect(ctx, -10, -6, 20, 12, 2); ctx.fill(); stroke();
                ctx.fillStyle = d.dark;
                U.roundRect(ctx, -12, -7.5, 4, 15, 2); ctx.fill(); stroke();
                U.roundRect(ctx, 8, -7.5, 4, 15, 2); ctx.fill(); stroke();
                ctx.strokeStyle = '#C62828'; ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(-5, -2); ctx.lineTo(5, -2);
                ctx.moveTo(-5, 2); ctx.lineTo(2, 2);
                ctx.stroke();
                break;
        }
        ctx.restore();
    }
}

/** 木箱 / 陶罐：击碎后掉落 */
class Breakable {
    constructor(game, cfg) {
        this.game = game;
        this.kind = cfg.kind || 'crate';
        this.x = cfg.x; this.z = cfg.z;
        this.hp = 1;
        this.dead = false;
        this.t = U.rand(0, 5);
        this.hit = 0;
        this.drop = cfg.drop || null;
        this.drawY = 0;
    }

    takeHit() {
        const g = this.game;
        this.dead = true;
        g.audio.play('ko', { volume: 0.4 });
        const sx = VIEW.W / 2 + (this.x - g.cam.x) * PPM, sy = screenY(this.z);
        g.fx.dust(sx, sy, 14, this.kind === 'crate' ? '#A9793F' : '#B0A99A');
        g.fx.addShake(3);
        if (this.drop) g.dropItem(this.drop, this.x, this.z);
        else if (U.chance(0.55)) g.dropItem(U.pick(['baozi', 'gold', 'wine', 'gold']), this.x, this.z);
        return true;
    }

    draw(ctx) {
        const k = depthScale(this.z);
        const x = VIEW.W / 2 + (this.x - this.game.cam.x) * PPM;
        const y = screenY(this.z);
        ctx.save();
        Fig.shadow(ctx, x, y, 18 * k, 0.3, 1);
        ctx.translate(x, y);
        ctx.scale(k, k);
        const OUT = '#2B1B12';
        if (this.kind === 'crate') {
            // 粮草辎重箱：箱板竖纹 + 麻绳十字捆绑 + 朱色封条
            ctx.fillStyle = '#A9793F';
            ctx.fillRect(-16, -30, 32, 30);
            ctx.lineWidth = 2.4; ctx.strokeStyle = OUT;
            ctx.strokeRect(-16, -30, 32, 30);
            ctx.strokeStyle = 'rgba(90,60,24,0.45)'; ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(-5.5, -30); ctx.lineTo(-5.5, 0);
            ctx.moveTo(5.5, -30); ctx.lineTo(5.5, 0);
            ctx.stroke();
            ctx.strokeStyle = U.rgba('#FFFFFF', 0.18); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-13, -27); ctx.lineTo(13, -27); ctx.stroke();
            // 麻绳：两横一纵，深色描边压出绳股
            const rope = (w, col) => {
                ctx.strokeStyle = col; ctx.lineWidth = w;
                ctx.beginPath();
                ctx.moveTo(-16, -22); ctx.lineTo(16, -22);
                ctx.moveTo(-16, -8); ctx.lineTo(16, -8);
                ctx.moveTo(0, -30); ctx.lineTo(0, 0);
                ctx.stroke();
            };
            rope(3.2, '#C7A96A');
            rope(1.1, 'rgba(70,48,18,0.55)');
            // 封条
            ctx.fillStyle = '#B71C1C';
            ctx.fillRect(-4.5, -19, 9, 13);
            ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,10,10,0.55)';
            ctx.strokeRect(-4.5, -19, 9, 13);
        } else {
            // 灰陶酒坛：双系耳 + 红布封口
            ctx.beginPath();
            ctx.moveTo(-13, 0); ctx.quadraticCurveTo(-16, -18, -8, -25);
            ctx.lineTo(8, -25); ctx.quadraticCurveTo(16, -18, 13, 0);
            ctx.closePath();
            ctx.fillStyle = '#9E8E77'; ctx.fill();
            ctx.lineWidth = 2.2; ctx.strokeStyle = OUT; ctx.stroke();
            // 肩部双系耳
            ctx.strokeStyle = OUT; ctx.lineWidth = 2;
            [-1, 1].forEach((d) => {
                ctx.beginPath();
                ctx.arc(d * 13.5, -18, 4,
                    d > 0 ? -Math.PI * 0.5 : Math.PI * 0.5,
                    d > 0 ? Math.PI * 0.7 : Math.PI * 1.5, false);
                ctx.stroke();
            });
            ctx.strokeStyle = U.rgba('#FFFFFF', 0.16); ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.moveTo(-8, -18); ctx.lineTo(-6, -4); ctx.stroke();
            // 封口红布：坛口盖布 + 两侧垂角
            ctx.fillStyle = '#B71C1C';
            ctx.beginPath();
            ctx.moveTo(-9, -26); ctx.quadraticCurveTo(-13, -19, -8, -16);
            ctx.lineTo(-4, -25); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(9, -26); ctx.quadraticCurveTo(13, -19, 8, -16);
            ctx.lineTo(4, -25); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8B0000';
            ctx.beginPath(); ctx.ellipse(0, -25.5, 9.5, 4.2, 0, 0, TAU); ctx.fill();
            ctx.lineWidth = 1.8; ctx.strokeStyle = OUT; ctx.stroke();
            // 扎绳
            ctx.strokeStyle = '#C7A96A'; ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-9.5, -23.5); ctx.quadraticCurveTo(0, -22, 9.5, -23.5);
            ctx.stroke();
        }
        ctx.restore();
    }
}

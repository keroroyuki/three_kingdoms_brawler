/* ============================================================
 * 三国战纪 · 场景美术
 * 多层视差背景：天空 / 远山 / 中景建筑 / 地面 / 前景 / 大气粒子
 * 静态层预渲染到离屏画布并横向平铺；动态元素（火焰、灯笼、云）实时绘制
 * ============================================================ */
'use strict';

function mkCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
}

/* ------------------------------------------------------------
 * 场景基类
 * ---------------------------------------------------------- */
class Scene {
    constructor(cfg) {
        this.cfg = cfg;
        this.t = 0;
        this.parts = [];
        this.width = cfg.width || 5200;
        this.tint = cfg.tint || 'rgba(0,0,0,0)';
        this._buildStatic();
        this._seedWeather();
    }

    /** 平铺绘制一层（factor = 视差系数） */
    _tile(ctx, cv, camX, factor, y) {
        const w = cv.width;
        let off = (camX * factor) % w;
        if (off < 0) off += w;
        let x = -off;
        const ctxAny = ctx;
        // 相邻 tile 重叠 1px，消除因浮点/抗锯齿产生的接缝
        while (x < VIEW.W) { ctxAny.drawImage(cv, Math.round(x), y); x += w - 1; }
    }

    _buildStatic() { /* 子类实现 */ }

    _seedWeather() {
        const n = this.cfg.weatherCount || 60;
        for (let i = 0; i < n; i++) this.parts.push(this._makePart(true));
    }

    _makePart() { return null; }
    _updatePart() { }

    update(dt, camX) {
        this.t += dt;
        for (let i = 0; i < this.parts.length; i++) {
            const p = this.parts[i];
            this._updatePart(p, dt, camX);
            if (p.dead) this.parts[i] = this._makePart(false);
        }
    }

    draw(ctx, camX) {
        this.drawSky(ctx, camX);
        this.drawFar(ctx, camX);
        this.drawMid(ctx, camX);
        this.drawGround(ctx, camX);
    }
    /** 前景（在角色之后绘制） */
    drawFront(ctx, camX) {
        this.drawFore(ctx, camX);
        this.drawWeather(ctx, camX);
        if (this.tint !== 'rgba(0,0,0,0)') {
            ctx.fillStyle = this.tint;
            ctx.fillRect(0, 0, VIEW.W, VIEW.H);
        }
    }

    drawSky() { }
    drawFar() { }
    drawMid() { }
    drawGround() { }
    drawFore() { }
    drawWeather() { }
}

/* ============================================================
 * 第一关 · 涿郡原野（春日黄昏）
 * ========================================================== */
class PlainsScene extends Scene {
    constructor() {
        super({
            width: 5400,
            tint: 'rgba(255,170,80,0.055)',
            weatherCount: 46
        });
    }

    _buildStatic() {
        this.sky = this._sky();
        this.far = this._far();
        this.mid = this._mid();
        this.ground = this._ground();
        this.fore = this._fore();
        this.clouds = [];
        for (let i = 0; i < 7; i++) {
            this.clouds.push({ x: U.rand(0, 1400), y: U.rand(40, 165), s: U.rand(0.6, 1.5), v: U.rand(3, 8) });
        }
    }

    _sky() {
        const cv = mkCanvas(VIEW.W, VIEW.H), c = cv.getContext('2d');
        const g = c.createLinearGradient(0, 0, 0, GROUND.top + 40);
        g.addColorStop(0.00, '#1E5FA8');
        g.addColorStop(0.34, '#4E92D0');
        g.addColorStop(0.66, '#9FD0E8');
        g.addColorStop(0.88, '#F7D9A0');
        g.addColorStop(1.00, '#FBBE74');
        c.fillStyle = g; c.fillRect(0, 0, VIEW.W, VIEW.H);
        // 落日：居中并扩大光晕，避免单侧硬边造成竖直接缝
        const sx = 400, sy = 320;
        const sg = c.createRadialGradient(sx, sy, 6, sx, sy, 360);
        sg.addColorStop(0, 'rgba(255,240,190,0.85)');
        sg.addColorStop(0.22, 'rgba(255,206,120,0.42)');
        sg.addColorStop(0.55, 'rgba(255,180,90,0.16)');
        sg.addColorStop(1, 'rgba(255,180,90,0)');
        c.fillStyle = sg; c.beginPath(); c.arc(sx, sy, 360, 0, TAU); c.fill();
        c.fillStyle = '#FFF1C4'; c.beginPath(); c.arc(sx, sy, 24, 0, TAU); c.fill();
        return cv;
    }

    _far() {
        const W = this.width, H = 220, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const layers = [
            { col: '#7E9BB0', y: 150, h: 92, n: 5, seed: 3 },
            { col: '#5F7E96', y: 176, h: 72, n: 7, seed: 17 },
            { col: '#46627A', y: 200, h: 54, n: 9, seed: 41 }
        ];
        const scale = Math.max(1, Math.round(W / 1400));
        layers.forEach(L => { L.n = Math.max(3, Math.round(L.n * scale));
            c.fillStyle = L.col;
            c.beginPath();
            c.moveTo(0, H);
            let x = 0;
            for (let i = 0; i <= L.n; i++) {
                const px = (i / L.n) * W;
                const peak = L.y - L.h * (0.45 + U.hash(i * 7.3 + L.seed) * 0.85);
                if (i === 0) c.lineTo(0, peak);
                c.quadraticCurveTo(px - W / L.n * 0.5, peak + L.h * 0.55, px, L.y + U.hash(i + L.seed) * 10);
            }
            c.lineTo(W, H); c.closePath(); c.fill();
        });
        // 山顶薄雾
        const mg = c.createLinearGradient(0, 120, 0, 220);
        mg.addColorStop(0, 'rgba(255,255,255,0)');
        mg.addColorStop(1, 'rgba(235,244,250,0.55)');
        c.fillStyle = mg; c.fillRect(0, 120, W, 100);
        return cv;
    }

    _mid() {
        const W = this.width, H = 200, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const scale = Math.max(1, W / 1600);
        // 远树带
        c.fillStyle = '#3E6141';
        for (let i = 0; i < Math.round(70 * scale); i++) {
            const x = U.hash(i * 1.7) * W, h = 22 + U.hash(i * 3.1) * 26;
            c.beginPath();
            c.ellipse(x, 196 - h * 0.5, 11 + U.hash(i) * 6, h * 0.62, 0, 0, TAU);
            c.fill();
        }
        // 桃林（粉花树）
        const trees = Math.max(14, Math.round(14 * scale));
        for (let i = 0; i < trees; i++) {
            const x = (i / trees) * W + U.hash(i * 5.5) * 60;
            const s = 0.8 + U.hash(i * 2.2) * 0.55;
            this._blossomTree(c, x, 198, s);
        }
        // 农舍
        const houses = Math.max(4, Math.round(4 * scale));
        for (let i = 0; i < houses; i++) {
            const x = 180 + i * 420 * scale + U.hash(i * 9) * 90;
            this._cottage(c, x, 198, 0.9 + U.hash(i * 4) * 0.3);
        }
        return cv;
    }

    _blossomTree(c, x, y, s) {
        c.save(); c.translate(x, y); c.scale(s, s);
        c.fillStyle = '#5D4037';
        c.fillRect(-3.5, -46, 7, 46);
        c.strokeStyle = '#4E342E'; c.lineWidth = 2.6;
        c.beginPath(); c.moveTo(0, -40); c.lineTo(-13, -56); c.moveTo(0, -44); c.lineTo(12, -54); c.stroke();
        const puffs = [[0, -66, 26], [-19, -54, 19], [18, -55, 20], [-8, -76, 15], [10, -74, 14]];
        puffs.forEach((p, i) => {
            c.fillStyle = i % 2 ? '#F8BBD0' : '#F48FB1';
            c.beginPath(); c.arc(p[0], p[1], p[2], 0, TAU); c.fill();
        });
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.beginPath(); c.arc(-6, -72, 9, 0, TAU); c.fill();
        c.restore();
    }

    _cottage(c, x, y, s) {
        c.save(); c.translate(x, y); c.scale(s, s);
        c.fillStyle = '#8D6E63'; c.fillRect(-30, -26, 60, 26);
        c.fillStyle = '#6D4C41';
        for (let i = -30; i < 30; i += 10) c.fillRect(i, -26, 2, 26);
        c.fillStyle = '#5D4037'; c.beginPath();
        c.moveTo(-40, -26); c.lineTo(0, -50); c.lineTo(40, -26); c.closePath(); c.fill();
        c.fillStyle = '#4E342E'; c.beginPath();
        c.moveTo(-34, -29); c.quadraticCurveTo(0, -44, 34, -29); c.quadraticCurveTo(0, -36, -34, -29); c.fill();
        c.fillStyle = '#3E2723'; c.fillRect(-8, -16, 16, 16);
        c.fillStyle = '#FDD835'; c.fillRect(-5, -12, 10, 7);
        c.restore();
    }

    _ground() {
        const W = 8000, H = VIEW.H - GROUND.top, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const scale = Math.max(1, W / 800);
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#7A9B4E');
        g.addColorStop(0.35, '#6C8F45');
        g.addColorStop(1, '#546E36');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        // 石板路（中带）
        c.fillStyle = '#8D8060';
        c.fillRect(0, H * 0.44, W, H * 0.30);
        c.fillStyle = '#9C8F6E';
        c.fillRect(0, H * 0.46, W, H * 0.12);
        for (let i = 0; i < Math.round(26 * scale); i++) {
            const x = U.hash(i * 2.3) * W, y = H * 0.44 + U.hash(i * 5.1) * H * 0.30;
            c.fillStyle = 'rgba(90,80,58,0.5)';
            c.fillRect(x, y, 46 + U.hash(i) * 30, 2);
        }
        // 草丛（越近越大）
        for (let i = 0; i < Math.round(260 * scale); i++) {
            const x = U.hash(i * 1.13) * W;
            const ty = U.hash(i * 2.71);
            const y = 4 + ty * ty * (H - 8);
            const h = 3 + ty * 9;
            c.strokeStyle = ty > 0.5 ? '#4A6B2C' : '#7FA855';
            c.lineWidth = 1 + ty;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x + (U.hash(i * 7) - 0.5) * 5, y - h); c.stroke();
        }
        // 顶部远近过渡暗边
        const sg = c.createLinearGradient(0, 0, 0, 26);
        sg.addColorStop(0, 'rgba(60,80,50,0.55)');
        sg.addColorStop(1, 'rgba(60,80,50,0)');
        c.fillStyle = sg; c.fillRect(0, 0, W, 26);
        return cv;
    }

    _fore() {
        const W = 12000, H = 90, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const n = Math.max(30, Math.round(30 * (W / 900)));
        for (let i = 0; i < n; i++) {
            const x = U.hash(i * 3.9) * W;
            c.strokeStyle = '#3B5A22'; c.lineWidth = 3 + U.hash(i) * 2;
            c.beginPath();
            c.moveTo(x, H);
            c.quadraticCurveTo(x + (U.hash(i * 5) - 0.5) * 22, H - 30, x + (U.hash(i * 11) - 0.5) * 40, H - 66 - U.hash(i * 2) * 24);
            c.stroke();
        }
        return cv;
    }

    /* ---------------- 天气：桃花瓣 ---------------- */
    _makePart(seedAnywhere) {
        return {
            x: U.rand(-60, VIEW.W + 60),
            y: seedAnywhere ? U.rand(-20, VIEW.H) : U.rand(-60, -10),
            vx: U.rand(-26, -8), vy: U.rand(22, 48),
            r: U.rand(2.2, 4.6), ph: U.rand(0, TAU), sp: U.rand(1.6, 3.2),
            dead: false
        };
    }
    _updatePart(p, dt) {
        p.ph += dt * p.sp;
        p.x += (p.vx + Math.sin(p.ph) * 26) * dt;
        p.y += p.vy * dt;
        if (p.y > VIEW.H + 12 || p.x < -70) p.dead = true;
    }

    drawSky(ctx) { ctx.drawImage(this.sky, 0, 0); }

    drawFar(ctx, camX) {
        // 云
        ctx.save();
        for (const cl of this.clouds) {
            cl.x -= cl.v * 0.016;
            if (cl.x < -220) cl.x = 1500;
            const x = ((cl.x - camX * 0.045) % 1720 + 1720) % 1720 - 220;
            ctx.fillStyle = 'rgba(255,252,244,0.66)';
            ctx.beginPath();
            ctx.ellipse(x, cl.y, 62 * cl.s, 15 * cl.s, 0, 0, TAU);
            ctx.ellipse(x + 34 * cl.s, cl.y + 5 * cl.s, 44 * cl.s, 12 * cl.s, 0, 0, TAU);
            ctx.ellipse(x - 32 * cl.s, cl.y + 6 * cl.s, 38 * cl.s, 10 * cl.s, 0, 0, TAU);
            ctx.fill();
        }
        ctx.restore();
        this._tile(ctx, this.far, camX, 0.10, GROUND.top - 208);
    }

    drawMid(ctx, camX) {
        this._tile(ctx, this.mid, camX, 0.34, GROUND.top - 176);
    }

    drawGround(ctx, camX) {
        this._tile(ctx, this.ground, camX, 1.0, GROUND.top);
    }

    drawFore(ctx, camX) {
        this._tile(ctx, this.fore, camX, 1.5, VIEW.H - 82);
    }

    drawWeather(ctx) {
        ctx.save();
        for (const p of this.parts) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.sin(p.ph) * 0.9);
            ctx.fillStyle = '#F8BBD0';
            ctx.beginPath();
            ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }
}

/* ============================================================
 * 第二关 · 博望坡火攻（夜战）
 * ========================================================== */
class FireScene extends Scene {
    constructor() {
        super({ width: 5600, tint: 'rgba(255,90,20,0.085)', weatherCount: 70 });
    }

    _buildStatic() {
        this.sky = this._sky();
        this.far = this._far();
        this.mid = this._mid();
        this.ground = this._ground();
        this.fore = this._fore();
        /** 中景火点（动态火焰） */
        this.fires = [];
        for (let i = 0; i < 26; i++) {
            this.fires.push({ wx: U.rand(0, 5600), y: GROUND.top - U.rand(20, 120), s: U.rand(0.6, 1.9) });
        }
        this.smoke = [];
        for (let i = 0; i < 5; i++) {
            this.smoke.push({ wx: U.rand(0, 5600), h: U.rand(120, 260), w: U.rand(50, 110), ph: U.rand(0, TAU) });
        }
    }

    _sky() {
        const cv = mkCanvas(VIEW.W, VIEW.H), c = cv.getContext('2d');
        const g = c.createLinearGradient(0, 0, 0, GROUND.top + 30);
        g.addColorStop(0.00, '#12060A');
        g.addColorStop(0.30, '#2A0C0C');
        g.addColorStop(0.58, '#5C1B0C');
        g.addColorStop(0.80, '#9E3B0C');
        g.addColorStop(1.00, '#D2661A');
        c.fillStyle = g; c.fillRect(0, 0, VIEW.W, VIEW.H);
        // 星（仅上部少量）
        for (let i = 0; i < 40; i++) {
            const x = U.hash(i * 3.3) * VIEW.W, y = U.hash(i * 7.7) * 150;
            c.fillStyle = `rgba(255,240,220,${0.15 + U.hash(i) * 0.35})`;
            c.fillRect(x, y, 1.6, 1.6);
        }
        return cv;
    }

    _far() {
        const W = this.width, H = 210, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const layers = [
            { col: '#4A2118', y: 156, h: 88, n: 5, seed: 5 },
            { col: '#341510', y: 180, h: 66, n: 8, seed: 23 }
        ];
        const scale = Math.max(1, Math.round(W / 1400));
        layers.forEach(L => { L.n = Math.max(3, Math.round(L.n * scale));
            c.fillStyle = L.col; c.beginPath(); c.moveTo(0, H);
            for (let i = 0; i <= L.n; i++) {
                const px = (i / L.n) * W;
                const peak = L.y - L.h * (0.4 + U.hash(i * 6.1 + L.seed) * 0.8);
                if (i === 0) c.lineTo(0, peak);
                c.quadraticCurveTo(px - W / L.n * 0.5, peak + L.h * 0.5, px, L.y + U.hash(i + L.seed) * 8);
            }
            c.lineTo(W, H); c.closePath(); c.fill();
        });
        const mg = c.createLinearGradient(0, 130, 0, 210);
        mg.addColorStop(0, 'rgba(255,120,40,0)');
        mg.addColorStop(1, 'rgba(255,130,50,0.30)');
        c.fillStyle = mg; c.fillRect(0, 130, W, 80);
        return cv;
    }

    _mid() {
        const W = this.width, H = 210, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const scale = Math.max(1, W / 1600);
        // 焦黑树林剪影
        for (let i = 0; i < Math.round(54 * scale); i++) {
            const x = U.hash(i * 1.9) * W;
            const h = 40 + U.hash(i * 4.4) * 90;
            c.strokeStyle = '#1C0F0C';
            c.lineWidth = 5 + U.hash(i * 3) * 5;
            c.beginPath(); c.moveTo(x, 210); c.lineTo(x + (U.hash(i * 8) - 0.5) * 16, 210 - h); c.stroke();
            c.lineWidth = 2.4;
            c.beginPath(); c.moveTo(x + 2, 210 - h * 0.7); c.lineTo(x - 16 - U.hash(i) * 12, 210 - h * 0.95); c.stroke();
            c.beginPath(); c.moveTo(x + 2, 210 - h * 0.62); c.lineTo(x + 16 + U.hash(i) * 12, 210 - h * 0.9); c.stroke();
        }
        // 烧毁的营帐残骸
        const tents = Math.max(5, Math.round(5 * scale));
        for (let i = 0; i < tents; i++) {
            const x = 120 + i * 340 * scale + U.hash(i * 6) * 100;
            c.fillStyle = '#241511';
            c.beginPath();
            c.moveTo(x - 34, 210); c.lineTo(x, 150 + U.hash(i) * 20); c.lineTo(x + 34, 210);
            c.closePath(); c.fill();
            c.strokeStyle = '#140B09'; c.lineWidth = 3;
            c.beginPath(); c.moveTo(x - 10, 210); c.lineTo(x - 22, 176); c.stroke();
        }
        return cv;
    }

    _ground() {
        const W = 8000, H = VIEW.H - GROUND.top, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const scale = Math.max(1, W / 800);
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#3A2A22');
        g.addColorStop(0.4, '#2C1F18');
        g.addColorStop(1, '#1E1512');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        // 焦土裂纹 + 余烬点
        for (let i = 0; i < Math.round(200 * scale); i++) {
            const x = U.hash(i * 1.31) * W, ty = U.hash(i * 2.93);
            const y = 4 + ty * ty * (H - 8);
            c.fillStyle = `rgba(255,${90 + U.hash(i * 5) * 60 | 0},30,${0.10 + U.hash(i * 9) * 0.30})`;
            c.fillRect(x, y, 2 + U.hash(i) * 5, 1.4);
        }
        for (let i = 0; i < Math.round(60 * scale); i++) {
            const x = U.hash(i * 4.1) * W, y = 6 + U.hash(i * 6.7) * (H - 10);
            c.strokeStyle = 'rgba(70,55,45,0.8)'; c.lineWidth = 1;
            c.beginPath(); c.moveTo(x, y);
            c.quadraticCurveTo(x + 12, y + 6, x + 24 + U.hash(i) * 20, y + 2);
            c.stroke();
        }
        const sg = c.createLinearGradient(0, 0, 0, 30);
        sg.addColorStop(0, 'rgba(255,110,30,0.30)');
        sg.addColorStop(1, 'rgba(255,110,30,0)');
        c.fillStyle = sg; c.fillRect(0, 0, W, 30);
        return cv;
    }

    _fore() {
        const W = 12000, H = 110, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const n = Math.max(16, Math.round(16 * (W / 900)));
        for (let i = 0; i < n; i++) {
            const x = U.hash(i * 3.1) * W;
            c.strokeStyle = '#160D0A'; c.lineWidth = 6 + U.hash(i) * 6;
            c.beginPath();
            c.moveTo(x, H);
            c.quadraticCurveTo(x + (U.hash(i * 5) - 0.5) * 30, H - 40, x + (U.hash(i * 9) - 0.5) * 60, H - 100);
            c.stroke();
        }
        return cv;
    }

    /* ---------------- 天气：火星 / 灰烬 ---------------- */
    _makePart(seedAnywhere) {
        return {
            x: U.rand(0, VIEW.W),
            y: seedAnywhere ? U.rand(0, VIEW.H) : U.rand(VIEW.H + 8, VIEW.H + 120),
            vx: U.rand(-14, 26), vy: U.rand(-72, -26),
            r: U.rand(1.2, 3.0), ph: U.rand(0, TAU), sp: U.rand(2, 5),
            life: 0, max: U.rand(1.6, 3.4), dead: false
        };
    }
    _updatePart(p, dt) {
        p.ph += dt * p.sp;
        p.life += dt;
        p.x += (p.vx + Math.sin(p.ph) * 22) * dt;
        p.y += p.vy * dt;
        p.vy -= 12 * dt; // 热对流加速上升
        if (p.y < -14 || p.life > p.max) p.dead = true;
    }

    drawSky(ctx) { ctx.drawImage(this.sky, 0, 0); }

    drawFar(ctx, camX) {
        // 烟柱
        ctx.save();
        for (const s of this.smoke) {
            const x = s.wx - camX * 0.10;
            const px = ((x % 2200) + 2200) % 2200 - 400;
            if (px < -260 || px > VIEW.W + 260) continue;
            for (let i = 0; i < 7; i++) {
                const k = i / 7;
                const yy = GROUND.top - 150 - k * s.h + Math.sin(this.t * 0.7 + s.ph + i) * 8;
                ctx.fillStyle = `rgba(70,58,54,${0.20 * (1 - k)})`;
                ctx.beginPath();
                ctx.ellipse(px + Math.sin(this.t * 0.5 + i * 0.8 + s.ph) * 18 * k, yy,
                    s.w * (0.5 + k * 1.1), s.w * 0.34 * (0.6 + k), 0, 0, TAU);
                ctx.fill();
            }
        }
        ctx.restore();
        this._tile(ctx, this.far, camX, 0.11, GROUND.top - 198);
    }

    drawMid(ctx, camX) {
        this._tile(ctx, this.mid, camX, 0.36, GROUND.top - 188);
        // 动态火焰
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const f of this.fires) {
            const x = f.wx - camX * 0.36;
            const px = ((x % 2200) + 2200) % 2200 - 260;
            if (px < -60 || px > VIEW.W + 60) continue;
            const n = 4;
            for (let i = 0; i < n; i++) {
                const k = i / n;
                const wob = Math.sin(this.t * 8 + f.wx * 0.01 + i * 1.7) * 5 * f.s;
                const hgt = (26 + Math.sin(this.t * 11 + f.wx + i) * 9) * f.s * (1 - k * 0.45);
                const g = ctx.createRadialGradient(px + wob * (1 - k), f.y - hgt * 0.4, 1, px + wob * (1 - k), f.y - hgt * 0.4, hgt);
                g.addColorStop(0, `rgba(255,240,170,${0.55 * (1 - k * 0.5)})`);
                g.addColorStop(0.4, `rgba(255,150,40,${0.34 * (1 - k * 0.4)})`);
                g.addColorStop(1, 'rgba(180,40,0,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(px + wob * (1 - k), f.y - hgt * 0.4, hgt, 0, TAU);
                ctx.fill();
            }
        }
        ctx.restore();
    }

    drawGround(ctx, camX) { this._tile(ctx, this.ground, camX, 1.0, GROUND.top); }
    drawFore(ctx, camX) { this._tile(ctx, this.fore, camX, 1.55, VIEW.H - 100); }

    drawWeather(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.parts) {
            const k = 1 - p.life / p.max;
            ctx.fillStyle = `rgba(255,${150 + 90 * k | 0},${40 + 60 * k | 0},${0.85 * k})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * (0.4 + k * 0.8), 0, TAU);
            ctx.fill();
        }
        ctx.restore();
    }
}

/* ============================================================
 * 第三关 · 洛阳宫城（雪夜）
 * ========================================================== */
class PalaceScene extends Scene {
    constructor() {
        super({ width: 5800, tint: 'rgba(40,80,160,0.10)', weatherCount: 90 });
    }

    _buildStatic() {
        this.sky = this._sky();
        this.far = this._far();
        this.mid = this._mid();
        this.ground = this._ground();
        this.fore = this._fore();
        this.lanterns = [];
        for (let i = 0; i < 18; i++) {
            this.lanterns.push({ wx: U.rand(0, 5800), y: GROUND.top - U.rand(60, 150), ph: U.rand(0, TAU), s: U.rand(0.75, 1.25) });
        }
    }

    _sky() {
        const cv = mkCanvas(VIEW.W, VIEW.H), c = cv.getContext('2d');
        const g = c.createLinearGradient(0, 0, 0, GROUND.top + 30);
        g.addColorStop(0.00, '#050A1E');
        g.addColorStop(0.42, '#12224E');
        g.addColorStop(0.74, '#2B4380');
        g.addColorStop(1.00, '#5A6FA8');
        c.fillStyle = g; c.fillRect(0, 0, VIEW.W, VIEW.H);
        for (let i = 0; i < 90; i++) {
            const x = U.hash(i * 2.7) * VIEW.W, y = U.hash(i * 5.3) * 300;
            const a = 0.25 + U.hash(i * 9) * 0.6;
            c.fillStyle = `rgba(230,240,255,${a})`;
            const r = U.hash(i * 11) > 0.9 ? 1.9 : 1.1;
            c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        }
        // 月
        const mx = 148, my = 92;
        const mg = c.createRadialGradient(mx, my, 8, mx, my, 118);
        mg.addColorStop(0, 'rgba(240,246,255,0.55)');
        mg.addColorStop(0.35, 'rgba(200,220,255,0.18)');
        mg.addColorStop(1, 'rgba(150,190,255,0)');
        c.fillStyle = mg; c.beginPath(); c.arc(mx, my, 118, 0, TAU); c.fill();
        c.fillStyle = '#F3F6FB'; c.beginPath(); c.arc(mx, my, 30, 0, TAU); c.fill();
        c.fillStyle = 'rgba(200,214,240,0.55)';
        c.beginPath(); c.arc(mx - 9, my - 6, 6, 0, TAU); c.arc(mx + 8, my + 7, 4.5, 0, TAU); c.arc(mx + 3, my - 12, 3, 0, TAU); c.fill();
        return cv;
    }

    _far() {
        const W = this.width, H = 230, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const scale = Math.max(1, W / 1500);
        // 远处宫殿群剪影
        c.fillStyle = '#1B2A52';
        const n = Math.max(9, Math.round(9 * scale));
        for (let i = 0; i < n; i++) {
            const x = (i / n) * W + U.hash(i * 4) * 40;
            this._palace(c, x, 232, 0.55 + U.hash(i * 3) * 0.45, '#1B2A52', '#24365F');
        }
        const mg = c.createLinearGradient(0, 150, 0, 232);
        mg.addColorStop(0, 'rgba(90,130,200,0)');
        mg.addColorStop(1, 'rgba(90,130,200,0.35)');
        c.fillStyle = mg; c.fillRect(0, 150, W, 82);
        return cv;
    }

    /** 单层宫殿（重檐庑殿顶） */
    _palace(c, x, y, s, body, roof) {
        c.save(); c.translate(x, y); c.scale(s, s);
        c.fillStyle = body; c.fillRect(-52, -54, 104, 54);
        c.fillStyle = 'rgba(255,210,120,0.55)';
        for (let i = -44; i < 44; i += 22) c.fillRect(i, -44, 11, 17);
        // 下层檐
        c.fillStyle = roof;
        c.beginPath();
        c.moveTo(-72, -54);
        c.quadraticCurveTo(-40, -64, 0, -66);
        c.quadraticCurveTo(40, -64, 72, -54);
        c.quadraticCurveTo(40, -50, 0, -50);
        c.quadraticCurveTo(-40, -50, -72, -54);
        c.closePath(); c.fill();
        c.fillRect(-40, -92, 80, 28);
        // 上层檐
        c.beginPath();
        c.moveTo(-60, -92);
        c.quadraticCurveTo(-30, -104, 0, -108);
        c.quadraticCurveTo(30, -104, 60, -92);
        c.quadraticCurveTo(30, -88, 0, -88);
        c.quadraticCurveTo(-30, -88, -60, -92);
        c.closePath(); c.fill();
        c.restore();
    }

    _mid() {
        const W = this.width, H = 250, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const scale = Math.max(1, W / 1600);
        // 宫墙
        c.fillStyle = '#7A1F1C'; c.fillRect(0, 150, W, 100);
        c.fillStyle = '#5E1512';
        for (let i = 0; i < W; i += 40) c.fillRect(i, 150, 2, 100);
        c.fillStyle = '#C9A227'; c.fillRect(0, 146, W, 6);
        c.fillStyle = '#2B2B2B'; c.fillRect(0, 152, W, 6);
        // 宫门 + 角楼
        const gates = Math.max(4, Math.round(4 * scale));
        const gateSpacing = 400 * scale;
        for (let i = 0; i < gates; i++) {
            const x = 200 + i * gateSpacing;
            // 门洞
            c.fillStyle = '#2A0E0C';
            c.beginPath();
            c.moveTo(x - 40, 250); c.lineTo(x - 40, 176);
            c.quadraticCurveTo(x, 148, x + 40, 176); c.lineTo(x + 40, 250);
            c.closePath(); c.fill();
            // 门钉
            c.fillStyle = '#C9A227';
            for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
                c.beginPath(); c.arc(x - 24 + k * 16, 196 + r * 16, 2.4, 0, TAU); c.fill();
            }
            // 屋檐
            c.fillStyle = '#1F3A6E';
            c.beginPath();
            c.moveTo(x - 66, 162);
            c.quadraticCurveTo(0 + x - 30, 146, x, 138);
            c.quadraticCurveTo(x + 30, 146, x + 66, 162);
            c.quadraticCurveTo(x + 30, 154, x, 152);
            c.quadraticCurveTo(x - 30, 154, x - 66, 162);
            c.closePath(); c.fill();
            c.fillStyle = '#C9A227'; c.fillRect(x - 66, 160, 132, 4);
        }
        // 石灯
        for (let i = 0; i < Math.round(10 * scale); i++) {
            const x = 90 + i * 165 * scale + U.hash(i) * 40;
            c.fillStyle = '#8A8F96'; c.fillRect(x - 6, 196, 12, 54);
            c.fillStyle = '#A6ABB2'; c.fillRect(x - 13, 176, 26, 22);
            c.fillStyle = '#FFD79A'; c.fillRect(x - 8, 181, 16, 12);
        }
        return cv;
    }

    _ground() {
        const W = 8000, H = VIEW.H - GROUND.top, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#4B5570');
        g.addColorStop(0.35, '#5D6480');
        g.addColorStop(1, '#737A93');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        // 汉白玉方砖（透视网格）
        for (let r = 0; r < 9; r++) {
            const t0 = Math.pow(r / 9, 1.7), t1 = Math.pow((r + 1) / 9, 1.7);
            const y0 = t0 * H, y1 = t1 * H;
            const n = 6 + Math.floor(t0 * 8);
            for (let i = 0; i < n; i++) {
                const x0 = (i / n) * W, x1 = ((i + 1) / n) * W;
                c.fillStyle = (i + r) % 2 ? '#7E869E' : '#6B7288';
                c.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2);
            }
        }
        // 积雪
        for (let i = 0; i < Math.round(90 * (W / 800)); i++) {
            const x = U.hash(i * 1.7) * W, ty = U.hash(i * 3.3);
            const y = 2 + ty * ty * (H - 4);
            c.fillStyle = `rgba(240,246,255,${0.20 + U.hash(i * 5) * 0.35})`;
            c.beginPath(); c.ellipse(x, y, 8 + U.hash(i) * 26, 2 + U.hash(i) * 3, 0, 0, TAU); c.fill();
        }
        // 灯光反射
        const lg = c.createLinearGradient(0, 0, 0, H);
        lg.addColorStop(0, 'rgba(255,190,110,0.22)');
        lg.addColorStop(0.5, 'rgba(255,190,110,0.06)');
        lg.addColorStop(1, 'rgba(255,190,110,0)');
        c.fillStyle = lg; c.fillRect(0, 0, W, H);
        return cv;
    }

    _fore() {
        const W = 12000, H = 130, cv = mkCanvas(W, H), c = cv.getContext('2d');
        const scale = Math.max(1, W / 900);
        const n = Math.max(7, Math.round(7 * scale));
        // 顶部红绸 + 檐角
        for (let i = 0; i < n; i++) {
            const x = 60 + i * 140 * scale;
            c.fillStyle = '#6E1512';
            c.beginPath();
            c.moveTo(x - 40, 0); c.lineTo(x + 40, 0);
            c.quadraticCurveTo(x + 26, 46, x + 8, 62);
            c.lineTo(x - 8, 62);
            c.quadraticCurveTo(x - 26, 46, x - 40, 0);
            c.closePath(); c.fill();
            c.fillStyle = '#C9A227';
            c.beginPath(); c.arc(x, 66, 6, 0, TAU); c.fill();
        }
        return cv;
    }

    /* ---------------- 天气：飘雪 ---------------- */
    _makePart(seedAnywhere) {
        const depth = U.rand(0.3, 1);
        return {
            x: U.rand(-20, VIEW.W + 20),
            y: seedAnywhere ? U.rand(0, VIEW.H) : U.rand(-80, -6),
            vx: U.rand(-8, 18), vy: 26 + depth * 62,
            r: 1.1 + depth * 2.6, ph: U.rand(0, TAU), sp: U.rand(0.8, 2.2),
            a: 0.35 + depth * 0.55, dead: false
        };
    }
    _updatePart(p, dt) {
        p.ph += dt * p.sp;
        p.x += (p.vx + Math.sin(p.ph) * 16) * dt;
        p.y += p.vy * dt;
        if (p.y > VIEW.H + 8) p.dead = true;
    }

    drawSky(ctx) { ctx.drawImage(this.sky, 0, 0); }
    drawFar(ctx, camX) { this._tile(ctx, this.far, camX, 0.08, GROUND.top - 218); }

    drawMid(ctx, camX) {
        this._tile(ctx, this.mid, camX, 0.32, GROUND.top - 202);
        // 灯笼光晕
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const L of this.lanterns) {
            const x = L.wx - camX * 0.32;
            const px = ((x % 2200) + 2200) % 2200 - 300;
            if (px < -70 || px > VIEW.W + 70) continue;
            const pulse = 0.82 + Math.sin(this.t * 2.2 + L.ph) * 0.18;
            const R = 34 * L.s * pulse;
            const g = ctx.createRadialGradient(px, L.y, 1, px, L.y, R);
            g.addColorStop(0, 'rgba(255,190,110,0.60)');
            g.addColorStop(0.35, 'rgba(255,140,60,0.24)');
            g.addColorStop(1, 'rgba(255,110,40,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(px, L.y, R, 0, TAU); ctx.fill();
            // 灯笼本体
            ctx.fillStyle = 'rgba(220,50,40,0.95)';
            ctx.beginPath(); ctx.ellipse(px, L.y, 7 * L.s, 9 * L.s, 0, 0, TAU); ctx.fill();
        }
        ctx.restore();
    }

    drawGround(ctx, camX) { this._tile(ctx, this.ground, camX, 1.0, GROUND.top); }
    drawFore(ctx, camX) { this._tile(ctx, this.fore, camX, 1.5, 0); }

    drawWeather(ctx) {
        ctx.save();
        for (const p of this.parts) {
            ctx.fillStyle = `rgba(245,250,255,${p.a})`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        }
        ctx.restore();
    }
}

const SCENE_CLASS = { plains: PlainsScene, fire: FireScene, palace: PalaceScene };

function makeScene(theme) {
    const C = SCENE_CLASS[theme] || PlainsScene;
    return new C();
}

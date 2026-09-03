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
        // 沿路布点：间距必须是「屏幕距离」而非再乘一次画布缩放，
        // 否则间距被放大 scale 倍，大半元素会落到画布之外，中景变得空荡
        const row = (spacing, offset, draw) => {
            const n = Math.max(2, Math.floor(W / spacing));
            for (let i = 0; i < n; i++) {
                draw(offset + i * spacing + U.hash(i * 5.5 + spacing) * spacing * 0.30, i);
            }
        };
        // 远树带
        c.fillStyle = '#3E6141';
        const treeN = Math.round(W / 24);
        for (let i = 0; i < treeN; i++) {
            const x = U.hash(i * 1.7) * W, h = 22 + U.hash(i * 3.1) * 26;
            c.beginPath();
            c.ellipse(x, 196 - h * 0.5, 11 + U.hash(i) * 6, h * 0.62, 0, 0, TAU);
            c.fill();
        }
        // 桃林（第一关「桃园结义」的时令之花）
        row(150, 40, (x, i) => this._blossomTree(c, x, 198, 0.80 + U.hash(i * 2.2) * 0.55));
        // 坞堡：汉末豪强筑墙自守的庄园，点题乱世
        row(1500, 340, (x, i) => this._blockhouse(c, x, 198, 0.82 + U.hash(i * 4) * 0.22));
        // 烽燧：边塞报警高台
        row(1800, 620, (x, i) => this._beacon(c, x, 198, 0.78 + U.hash(i * 6) * 0.28));
        // 农舍
        row(420, 180, (x, i) => this._cottage(c, x, 198, 0.90 + U.hash(i * 4) * 0.30));
        // 黄巾旗：竿立道旁，点题「苍天已死，黄天当立」
        row(620, 260, (x, i) => this._banner(c, x, 198, 0.85 + U.hash(i * 8) * 0.30));
        return cv;
    }

    /** 黄巾军旗：黄底皂书「天」字，旗缘战损撕裂 */
    _banner(c, x, y, s) {
        c.save(); c.translate(x, y); c.scale(s, s);
        // 旗杆
        c.fillStyle = '#4E3B2A'; c.fillRect(-2.5, -76, 5, 76);
        // 竿首旄羽
        c.fillStyle = '#8D6E63';
        c.beginPath(); c.moveTo(0, -82); c.lineTo(6, -72); c.lineTo(-6, -72); c.closePath(); c.fill();
        // 旗面：黄底，右缘撕裂缺口
        c.fillStyle = '#D9A520';
        c.beginPath();
        c.moveTo(3, -76); c.lineTo(48, -71);
        c.lineTo(41, -58); c.lineTo(50, -48); c.lineTo(39, -38); c.lineTo(48, -30);
        c.lineTo(3, -27);
        c.closePath(); c.fill();
        c.fillStyle = 'rgba(120,80,16,0.30)'; c.fillRect(3, -40, 45, 4);
        // 皂书「天」字：两横一撇一捺
        c.strokeStyle = 'rgba(38,24,10,0.80)'; c.lineWidth = 2.6; c.lineCap = 'round';
        c.beginPath();
        c.moveTo(10, -66); c.lineTo(38, -65);
        c.moveTo(14, -56); c.lineTo(34, -55);
        c.moveTo(24, -61); c.lineTo(15, -40);
        c.moveTo(24, -61); c.lineTo(33, -41);
        c.stroke();
        c.restore();
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

    /** 坞堡：东汉末年豪强筑高墙自守的庄园，夯土墙 + 四角角楼 + 门楼 */
    _blockhouse(c, x, y, s) {
        c.save(); c.translate(x, y); c.scale(s, s);
        // 夯土高墙
        c.fillStyle = '#9E8B6E'; c.fillRect(-56, -40, 112, 40);
        // 夯层纹理
        c.fillStyle = 'rgba(105,88,64,0.42)';
        for (let i = 0; i < 5; i++) c.fillRect(-56, -38 + i * 8, 112, 1.6);
        // 墙头女墙（垛口）
        c.fillStyle = '#7A6A50'; c.fillRect(-56, -46, 112, 7);
        for (let i = -54; i < 54; i += 16) c.fillRect(i, -53, 9, 8);
        // 两侧角楼
        [-1, 1].forEach((d) => {
            const bx = d * 50;
            c.fillStyle = '#8A7659'; c.fillRect(bx - 11, -70, 22, 26);
            // 悬山顶
            c.fillStyle = '#4E3B2A';
            c.beginPath();
            c.moveTo(bx - 18, -70); c.lineTo(bx, -85); c.lineTo(bx + 18, -70); c.closePath(); c.fill();
            // 箭窗
            c.fillStyle = '#3A2C1E'; c.fillRect(bx - 3, -62, 6, 9);
        });
        // 中央门楼（重檐）
        c.fillStyle = '#6D5B42'; c.fillRect(-18, -66, 36, 26);
        c.fillStyle = '#3E2E20'; c.fillRect(-9, -52, 18, 12);
        c.fillStyle = '#4E3B2A';
        c.beginPath();
        c.moveTo(-27, -66); c.quadraticCurveTo(0, -79, 27, -66);
        c.quadraticCurveTo(0, -60, -27, -66); c.closePath(); c.fill();
        c.fillStyle = '#C9A227'; c.fillRect(-27, -67, 54, 3);
        c.restore();
    }

    /** 烽燧：边塞报警的夯土高台，顶设望楼，举烟示警 */
    _beacon(c, x, y, s) {
        c.save(); c.translate(x, y); c.scale(s, s);
        // 梯形夯土台
        c.fillStyle = '#96826A';
        c.beginPath();
        c.moveTo(-23, 0); c.lineTo(-13, -74); c.lineTo(13, -74); c.lineTo(23, 0);
        c.closePath(); c.fill();
        // 夯层
        c.fillStyle = 'rgba(105,88,64,0.40)';
        for (let i = 0; i < 7; i++) {
            const w = 23 - (i / 7) * 9;
            c.fillRect(-w, -70 + i * 10, w * 2, 1.5);
        }
        // 顶部望楼
        c.fillStyle = '#7A6A50'; c.fillRect(-10, -90, 20, 17);
        c.fillStyle = '#3A2C1E'; c.fillRect(-4, -84, 8, 8);
        c.fillStyle = '#4E3B2A';
        c.beginPath(); c.moveTo(-16, -90); c.lineTo(0, -102); c.lineTo(16, -90); c.closePath(); c.fill();
        // 烽烟一柱
        c.fillStyle = 'rgba(205,205,205,0.30)';
        c.beginPath();
        c.moveTo(-4, -101);
        c.quadraticCurveTo(-12, -114, -3, -128);
        c.quadraticCurveTo(7, -119, 4, -101);
        c.closePath(); c.fill();
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

    /** 坡脊高度：整数个周期的正弦叠加，保证首尾同高，平铺处不会出现台阶 */
    _slopeY(x) {
        const W = this.width;
        return 54 + Math.sin(x / W * TAU * 3) * 15 + Math.sin(x / W * TAU * 7 + 1.3) * 6;
    }

    /** 烧毁的辎重车：火烧博望坡所焚的正是曹军粮草车仗 */
    _wreckedWagon(c, x, y, s) {
        c.save(); c.translate(x, y); c.scale(s, s);
        // 坍塌倾斜的车厢
        c.fillStyle = '#2A1812';
        c.beginPath();
        c.moveTo(-30, -6); c.lineTo(-24, -34); c.lineTo(22, -30); c.lineTo(28, -8);
        c.closePath(); c.fill();
        // 车板缝隙
        c.strokeStyle = '#160C08'; c.lineWidth = 2;
        for (let i = -20; i < 22; i += 11) {
            c.beginPath(); c.moveTo(i, -32); c.lineTo(i - 2, -8); c.stroke();
        }
        // 车轮（带辐条）
        [[-18, 1], [16, 0.72]].forEach(([wx, ws]) => {
            c.save(); c.translate(wx, -2); c.scale(1, ws);
            c.strokeStyle = '#241410'; c.lineWidth = 3.4;
            c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.stroke();
            c.lineWidth = 1.8;
            for (let k = 0; k < 5; k++) {
                const a = k * Math.PI / 5;
                c.beginPath();
                c.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
                c.lineTo(-Math.cos(a) * 12, -Math.sin(a) * 12);
                c.stroke();
            }
            c.restore();
        });
        // 折断的车辕
        c.strokeStyle = '#241410'; c.lineWidth = 3.4;
        c.beginPath(); c.moveTo(24, -22); c.lineTo(47, -13); c.stroke();
        // 车内余烬
        c.fillStyle = 'rgba(255,120,40,0.32)';
        c.beginPath(); c.arc(-6, -15, 6, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,190,90,0.30)';
        c.beginPath(); c.arc(-4, -17, 2.6, 0, TAU); c.fill();
        c.restore();
    }

    _mid() {
        const W = this.width, H = 210, cv = mkCanvas(W, H), c = cv.getContext('2d');
        // 沿路布点：间距用屏幕距离，不随画布宽度二次放大
        const row = (spacing, offset, draw) => {
            const n = Math.max(2, Math.floor(W / spacing));
            for (let i = 0; i < n; i++) {
                draw(offset + i * spacing + U.hash(i * 4.7 + spacing) * spacing * 0.28, i);
            }
        };
        // 博望坡：南阳岗丘，伏兵正藏于坡后
        c.fillStyle = '#1A0E0B';
        c.beginPath();
        c.moveTo(0, 210);
        for (let x = 0; x <= W; x += 30) c.lineTo(x, 210 - this._slopeY(x));
        c.lineTo(W, 210 - this._slopeY(W)); c.lineTo(W, 210);
        c.closePath(); c.fill();
        // 坡脊受火光照亮的暖边
        c.strokeStyle = 'rgba(255,120,40,0.20)'; c.lineWidth = 2;
        c.beginPath();
        for (let x = 0; x <= W; x += 30) {
            const y = 210 - this._slopeY(x);
            if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
        // 焦黑树林剪影（立于坡前）
        const treeN = Math.round(W / 26);
        for (let i = 0; i < treeN; i++) {
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
        row(480, 120, (x, i) => {
            c.fillStyle = '#241511';
            c.beginPath();
            c.moveTo(x - 34, 210); c.lineTo(x, 150 + U.hash(i) * 20); c.lineTo(x + 34, 210);
            c.closePath(); c.fill();
            c.strokeStyle = '#140B09'; c.lineWidth = 3;
            c.beginPath(); c.moveTo(x - 10, 210); c.lineTo(x - 22, 176); c.stroke();
        });
        // 焚毁的辎重车仗，散落道旁
        row(700, 250, (x, i) => this._wreckedWagon(c, x, 208, 0.80 + U.hash(i * 5) * 0.30));
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
        // 远处宫殿群剪影：按固定间距铺满整幅，避免只堆在画布左端
        const n = Math.max(6, Math.round(W / 175));
        const step = W / n;
        for (let i = 0; i < n; i++) {
            const x = (i + 0.5) * step;
            this._palace(c, x, 232, 0.55 + U.hash(i * 3) * 0.45, '#1B2A52', '#24365F');
        }
        const mg = c.createLinearGradient(0, 150, 0, 232);
        mg.addColorStop(0, 'rgba(90,130,200,0)');
        mg.addColorStop(1, 'rgba(90,130,200,0.35)');
        c.fillStyle = mg; c.fillRect(0, 150, W, 82);
        return cv;
    }

    /** 屋檐：飞檐翘角 + 筒瓦竖垄 + 檐口瓦当 */
    _eave(c, halfW, yBase, rise, roof, tile) {
        c.fillStyle = roof;
        c.beginPath();
        c.moveTo(-halfW, yBase);
        c.quadraticCurveTo(-halfW * 0.55, yBase - rise, 0, yBase - rise * 1.06);
        c.quadraticCurveTo(halfW * 0.55, yBase - rise, halfW, yBase);
        // 飞檐翘角：两端向上反曲
        c.quadraticCurveTo(halfW * 0.58, yBase - rise * 0.18, halfW * 0.84, yBase - rise * 0.62);
        c.quadraticCurveTo(halfW * 0.40, yBase + rise * 0.30, 0, yBase + rise * 0.34);
        c.quadraticCurveTo(-halfW * 0.40, yBase + rise * 0.30, -halfW * 0.84, yBase - rise * 0.62);
        c.quadraticCurveTo(-halfW * 0.58, yBase - rise * 0.18, -halfW, yBase);
        c.closePath(); c.fill();
        // 筒瓦：顺坡而下的竖垄
        c.strokeStyle = tile; c.lineWidth = 1.1;
        for (let i = -5; i <= 5; i++) {
            const kx = (i / 5) * halfW * 0.88;
            c.beginPath();
            c.moveTo(kx * 0.30, yBase - rise * 1.00);
            c.quadraticCurveTo(kx * 0.80, yBase - rise * 0.42, kx, yBase + rise * 0.20);
            c.stroke();
        }
        // 檐口瓦当（一排圆头）
        c.fillStyle = tile;
        for (let i = -5; i <= 5; i++) {
            const kx = (i / 5) * halfW * 0.82;
            c.beginPath(); c.arc(kx, yBase + rise * 0.26, 1.5, 0, TAU); c.fill();
        }
    }

    /** 鸱吻：正脊两端龙首吞脊，中国宫殿最标志性的屋脊装饰 */
    _chiwen(c, x, y, s, color) {
        c.save(); c.translate(x, y); c.scale(s, s);
        c.fillStyle = color;
        // 龙首（张口吞脊）
        c.beginPath();
        c.moveTo(-6, 0); c.lineTo(-3, -9); c.lineTo(4, -11);
        c.lineTo(7, -5); c.lineTo(3, -3); c.lineTo(5, 1); c.lineTo(-4, 3);
        c.closePath(); c.fill();
        // 向内卷曲的龙尾
        c.beginPath();
        c.moveTo(-6, -1);
        c.quadraticCurveTo(-13, -6, -9, -12);
        c.quadraticCurveTo(-5, -15, -2, -10);
        c.lineWidth = 1.6; c.strokeStyle = color; c.stroke();
        c.restore();
    }

    /** 斗拱：檐下层层出跳的木构件，汉唐宫殿的核心特征 */
    _dougong(c, halfW, y, color, dark) {
        c.fillStyle = color;
        c.fillRect(-halfW, y, halfW * 2, 3.2);
        c.fillStyle = dark;
        const n = Math.max(4, Math.round(halfW / 9));
        for (let i = 0; i <= n; i++) {
            const bx = -halfW + (i / n) * halfW * 2;
            c.fillRect(bx - 1.6, y, 3.2, 5.4);        // 昂（斜出跳）
            c.fillRect(bx - 3.2, y + 4.6, 6.4, 2.6);  // 散斗
        }
    }

    /** 单层宫殿（重檐庑殿顶 + 鸱吻 + 斗拱） */
    _palace(c, x, y, s, body, roof) {
        c.save(); c.translate(x, y); c.scale(s, s);
        const tile = 'rgba(255,225,170,0.30)';
        // 台基
        c.fillStyle = 'rgba(210,200,190,0.22)'; c.fillRect(-58, -6, 116, 8);
        // 殿身
        c.fillStyle = body; c.fillRect(-52, -54, 104, 54);
        // 窗棂（直棂窗）
        c.fillStyle = 'rgba(255,210,120,0.55)';
        for (let i = -44; i < 44; i += 15) c.fillRect(i, -44, 9, 17);
        // 檐下斗拱
        this._dougong(c, 56, -58, '#B8860B', '#6D4C1F');
        // 下层檐
        this._eave(c, 72, -54, 12, roof, tile);
        // 正脊 + 鸱吻
        c.fillStyle = roof; c.fillRect(-46, -92, 92, 30);
        this._chiwen(c, -46, -92, 1.0, '#8C6D3F');                    // 左吻
        c.save(); c.translate(46, -92); c.scale(-1, 1);                // 右吻（镜像，尾朝外）
        this._chiwen(c, 0, 0, 1.0, '#8C6D3F'); c.restore();
        // 上层斗拱
        this._dougong(c, 40, -96, '#B8860B', '#6D4C1F');
        // 上层檐
        this._eave(c, 60, -92, 16, roof, tile);
        // 顶层正脊与宝顶
        c.fillStyle = roof; c.fillRect(-26, -114, 52, 8);
        c.fillStyle = '#C9A227';
        c.beginPath(); c.arc(0, -118, 4.2, 0, TAU); c.fill();
        c.fillRect(-1.4, -126, 2.8, 9);
        c.restore();
    }

    _mid() {
        const W = this.width, H = 250, cv = mkCanvas(W, H), c = cv.getContext('2d');
        // 宫墙
        c.fillStyle = '#7A1F1C'; c.fillRect(0, 150, W, 100);
        c.fillStyle = '#5E1512';
        for (let i = 0; i < W; i += 40) c.fillRect(i, 150, 2, 100);
        c.fillStyle = '#C9A227'; c.fillRect(0, 146, W, 6);
        c.fillStyle = '#2B2B2B'; c.fillRect(0, 152, W, 6);
        // 宫门 + 角楼
        const gates = Math.max(4, Math.round(W / 1200));
        const gateSpacing = W / gates;
        for (let i = 0; i < gates; i++) {
            const x = gateSpacing * (0.5 + i);
            // 城台（夯土包砖）
            c.fillStyle = '#6E1B18'; c.fillRect(x - 58, 168, 116, 82);
            c.fillStyle = 'rgba(82,18,15,0.55)';
            for (let k = -58; k < 58; k += 13) c.fillRect(x + k, 168, 2, 82);
            // 门洞（券门）
            c.fillStyle = '#2A0E0C';
            c.beginPath();
            c.moveTo(x - 34, 250); c.lineTo(x - 34, 188);
            c.quadraticCurveTo(x, 160, x + 34, 188); c.lineTo(x + 34, 250);
            c.closePath(); c.fill();
            // 门钉（九路门钉，宫门制）
            c.fillStyle = '#C9A227';
            for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
                c.beginPath(); c.arc(x - 21 + k * 14, 199 + r * 15, 2.2, 0, TAU); c.fill();
            }
            // 檐下斗拱 + 城楼屋檐（以原点为中心绘制，故先平移至门轴）
            c.save(); c.translate(x, 0);
            this._dougong(c, 50, 168, '#B8860B', '#6D4C1F');
            this._eave(c, 66, 162, 22, '#1F3A6E', 'rgba(255,225,170,0.30)');
            c.restore();
            // 正脊与鸱吻
            c.fillStyle = '#1F3A6E'; c.fillRect(x - 32, 128, 64, 13);
            this._chiwen(c, x - 32, 128, 1.0, '#C9A227');
            c.save(); c.translate(x + 32, 128); c.scale(-1, 1);
            this._chiwen(c, 0, 0, 1.0, '#C9A227'); c.restore();
            // 两侧子阙（汉阙形制：母阙 + 子阙）
            [-1, 1].forEach((d) => {
                const qx = x + d * 76;
                c.save(); c.translate(qx, 0);
                c.fillStyle = '#6E1B18'; c.fillRect(-9, 198, 18, 52);
                c.fillStyle = 'rgba(82,18,15,0.5)'; c.fillRect(-9, 198, 18, 4);
                this._eave(c, 17, 198, 10, '#1F3A6E', 'rgba(255,225,170,0.26)');
                c.restore();
            });
        }
        // 石灯：沿宫墙内侧等距排布
        const lamps = Math.max(6, Math.round(W / 560));
        const lampStep = W / lamps;
        for (let i = 0; i < lamps; i++) {
            const x = lampStep * (0.5 + i) + U.hash(i) * 30;
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
        // 间距固定为屏幕距离；若再乘画布缩放，一屏内几乎看不到垂幔
        const n = Math.max(6, Math.round(W / 190));
        const step = W / n;
        // 顶部红绸 + 檐角
        for (let i = 0; i < n; i++) {
            const x = step * (0.5 + i);
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

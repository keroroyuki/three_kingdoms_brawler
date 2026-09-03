/* ============================================================
 * 三国战纪 · 界面层
 * HUD / 标题 / 选人 / 暂停 / 结算 / 横幅提示
 * ============================================================ */
'use strict';

const C = {
    gold: '#F2C14E',
    goldD: '#B8860B',
    ink: '#1A1410',
    panel: 'rgba(24,18,14,0.74)',
    panelL: 'rgba(46,34,24,0.62)',
    hp: '#D64545',
    hpBack: '#3A2420',
    rage: '#F2C14E',
    rageFull: '#FF7043',
    white: '#F4EDE0',
    dim: 'rgba(244,237,224,0.55)'
};

function txt(ctx, s, x, y, size, color, align, opt) {
    opt = opt || {};
    ctx.save();
    ctx.font = `${opt.weight || 700} ${size}px ${U.FONT}`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = opt.baseline || 'alphabetic';
    if (opt.shadow !== false) {
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.fillText(s, x + (opt.sx || 2), y + (opt.sy || 2));
    }
    if (opt.stroke) {
        ctx.lineWidth = opt.strokeW || 4;
        ctx.strokeStyle = opt.stroke;
        ctx.lineJoin = 'round';
        ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color || C.white;
    ctx.fillText(s, x, y);
    ctx.restore();
}

class UI {
    constructor(game) {
        this.g = game;
        this.banner = null;     // {text, color, t, dur, size}
        this.skillBanner = null;
        this.waveBanner = null;
        this.t = 0;
        this.selectIndex = 0;
        this.pauseIndex = 0;
    }

    showBanner(text, color, size) {
        this.banner = { text, color: color || C.gold, t: 0, dur: 1.6, size: size || 34 };
    }
    showSkillBanner(text, super_) {
        this.skillBanner = { text, super: !!super_, t: 0, dur: 1.5 };
    }
    showWave(text, sub) {
        this.waveBanner = { text, sub: sub || '', t: 0, dur: 2.0 };
    }

    update(dt) {
        this.t += dt;
        const st = (b) => { if (b) { b.t += dt; if (b.t >= b.dur) return null; } return b; };
        this.banner = st(this.banner);
        this.skillBanner = st(this.skillBanner);
        this.waveBanner = st(this.waveBanner);
    }

    /* ============================================================
     * HUD
     * ========================================================== */
    drawHUD(ctx) {
        const g = this.g, p = g.player;
        if (!p) return;

        /* ---- 左上：角色面板 ---- */
        const px = 14, py = 12, pw = 268, ph = 74;
        ctx.save();
        U.roundRect(ctx, px, py, pw, ph, 8);
        ctx.fillStyle = C.panel; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = U.rgba(C.gold, 0.65); ctx.stroke();

        // 头像
        ctx.save();
        ctx.beginPath();
        U.roundRect(ctx, px + 6, py + 6, 52, 62, 6);
        ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
        const k = 34;
        ctx.translate(px + 32, py + 66);
        ctx.scale(k * 1, k * 1);
        ctx.translate(0, -FOOT_OFF);
        const look = p.look;
        const pose = Fig.idle(this.t * 1.0);
        Fig.draw(ctx, look, Fig.solve(pose), { time: this.t });
        ctx.restore();
        ctx.beginPath();
        U.roundRect(ctx, px + 6, py + 6, 52, 62, 6);
        ctx.lineWidth = 1.6; ctx.strokeStyle = U.rgba(C.gold, 0.5); ctx.stroke();

        // 名字
        txt(ctx, p.look.name, px + 66, py + 24, 17, C.gold);
        txt(ctx, p.look.title || '', px + 66, py + 41, 11, C.dim, 'left', { weight: 400 });

        // 血条
        this.bar(ctx, px + 66, py + 48, 132, 11, p.hp / p.maxHp, C.hp, C.hpBack, C.gold);
        txt(ctx, `${Math.ceil(p.hp)}/${p.maxHp}`, px + 204, py + 58, 10.5, C.dim, 'left', { weight: 500 });

        // 怒气条
        const rf = p.rage / p.maxRage;
        const rageCol = p.rage >= p.maxRage ? C.rageFull : C.rage;
        this.bar(ctx, px + 66, py + 62, 132, 8, rf, rageCol, '#2A2118', U.rgba(C.gold, 0.6));
        if (p.rage >= p.maxRage) {
            const a = 0.4 + Math.sin(this.t * 12) * 0.3;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = U.rgba('#FF7043', a * 0.35);
            U.roundRect(ctx, px + 66, py + 62, 132, 8, 4); ctx.fill();
            ctx.restore();
            txt(ctx, '超必杀就绪 · L', px + 66, py + 86, 11, '#FF8A65', 'left', { weight: 700 });
        } else if (p.rage >= 50) {
            txt(ctx, '必杀就绪 · L', px + 66, py + 86, 11, C.gold, 'left', { weight: 700 });
        }

        // 命数
        for (let i = 0; i < Math.max(0, p.lives - 1); i++) {
            const hx = px + 214 + i * 15, hy = py + 26;
            ctx.save();
            ctx.translate(hx, hy);
            ctx.beginPath();
            ctx.arc(0, 0, 5.2, 0, TAU);
            ctx.fillStyle = '#D64545'; ctx.fill();
            ctx.lineWidth = 1.4; ctx.strokeStyle = U.rgba('#FFFFFF', 0.5); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();

        /* ---- 右上：分数 ---- */
        ctx.save();
        U.roundRect(ctx, VIEW.W - 174, 12, 160, 40, 8);
        ctx.fillStyle = C.panel; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = U.rgba(C.gold, 0.55); ctx.stroke();
        txt(ctx, '战功', VIEW.W - 160, 30, 12, C.dim, 'left', { weight: 500 });
        txt(ctx, String(Math.round(p.score)).padStart(6, '0'), VIEW.W - 22, 45, 21, C.gold, 'right');
        ctx.restore();

        /* ---- 顶部中央：关卡进度 ---- */
        ctx.save();
        const lw = 250;
        U.roundRect(ctx, VIEW.W / 2 - lw / 2, 12, lw, 30, 8);
        ctx.fillStyle = C.panel; ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = U.rgba(C.gold, 0.45); ctx.stroke();
        txt(ctx, g.levelName(), VIEW.W / 2, 32, 13.5, C.white, 'center');
        // 进度条
        const prog = U.clamp((p.x - 0) / (g.level.length), 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        U.roundRect(ctx, VIEW.W / 2 - lw / 2 + 12, 38, lw - 24, 4, 2); ctx.fill();
        ctx.fillStyle = C.gold;
        U.roundRect(ctx, VIEW.W / 2 - lw / 2 + 12, 38, (lw - 24) * prog, 4, 2); ctx.fill();
        ctx.restore();

        /* ---- 连击 ---- */
        if (p.combo >= 2) {
            const k = U.clamp(p.comboT / 1.5, 0, 1);
            const pop = p.comboT > 1.32 ? (p.comboT - 1.32) / 0.18 : 0;
            ctx.save();
            ctx.globalAlpha = U.clamp(k * 1.6, 0, 1);
            const s = 1 + pop * 0.5;
            ctx.translate(VIEW.W - 96, 116);
            ctx.scale(s, s);
            txt(ctx, String(p.combo), 0, 6, 52, C.gold, 'center', { stroke: C.ink, strokeW: 6 });
            txt(ctx, '连击', 0, 28, 15, C.white, 'center', { stroke: C.ink, strokeW: 4 });
            ctx.restore();
        }

        /* ---- BOSS 血条 ---- */
        if (g.boss && !g.boss.dead && g.bossActive) {
            this.drawBossBar(ctx, g.boss);
        }

        /* ---- 前进指引 ---- */
        if (g.waveState === 'open' && !g.bossActive) {
            const a = 0.55 + Math.sin(this.t * 5) * 0.35;
            ctx.save();
            ctx.globalAlpha = a;
            const ax = VIEW.W - 70, ay = 250;
            txt(ctx, '前进', ax, ay - 16, 18, C.gold, 'center', { stroke: C.ink, strokeW: 5 });
            ctx.fillStyle = C.gold;
            ctx.beginPath();
            ctx.moveTo(ax + 26, ay); ctx.lineTo(ax - 6, ay - 15); ctx.lineTo(ax - 6, ay + 15);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = C.ink; ctx.lineWidth = 2.4; ctx.stroke();
            ctx.restore();
        }

        /* ---- 横幅 ---- */
        if (this.waveBanner) this.drawWaveBanner(ctx);
        if (this.skillBanner) this.drawSkillBanner(ctx);
        if (this.banner) this.drawBigBanner(ctx);
    }

    bar(ctx, x, y, w, h, v, fg, bg, border) {
        ctx.save();
        ctx.fillStyle = bg;
        U.roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
        const ww = Math.max(0, (w - 2) * U.clamp(v, 0, 1));
        if (ww > 0.5) {
            ctx.fillStyle = fg;
            U.roundRect(ctx, x + 1, y + 1, ww, h - 2, (h - 2) / 2); ctx.fill();
            ctx.fillStyle = U.rgba('#FFFFFF', 0.22);
            U.roundRect(ctx, x + 1, y + 1, ww, (h - 2) * 0.45, (h - 2) / 2); ctx.fill();
        }
        if (border) {
            ctx.strokeStyle = border; ctx.lineWidth = 1.2;
            U.roundRect(ctx, x, y, w, h, h / 2); ctx.stroke();
        }
        ctx.restore();
    }

    drawBossBar(ctx, b) {
        const w = 470, x = (VIEW.W - w) / 2, y = VIEW.H - 54;
        ctx.save();
        ctx.globalAlpha = 0.96;
        U.roundRect(ctx, x - 6, y - 22, w + 12, 50, 8);
        ctx.fillStyle = 'rgba(18,12,10,0.82)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = U.rgba(C.gold, 0.7); ctx.stroke();

        txt(ctx, b.look.name, x + 4, y - 6, 15, C.gold, 'left');
        txt(ctx, b.look.title, x + w - 4, y - 6, 11.5, C.dim, 'right', { weight: 500 });

        // 分段血条（阶段）
        const segs = b.kit ? b.kit.phases.length : 1;
        const gap = 3;
        const sw = (w - gap * (segs - 1)) / segs;
        const r = U.clamp(b.hp / b.maxHp, 0, 1);
        for (let i = 0; i < segs; i++) {
            const sx = x + i * (sw + gap);
            ctx.fillStyle = '#2A1A16';
            U.roundRect(ctx, sx, y, sw, 16, 3); ctx.fill();
            const lo = b.kit ? b.kit.phases[i] : 0;
            const hi = i === 0 ? 1 : (b.kit ? b.kit.phases[i - 1] : 1);
            const v = U.clamp((r - lo) / Math.max(0.001, hi - lo), 0, 1);
            if (v > 0) {
                const grd = ctx.createLinearGradient(sx, y, sx, y + 16);
                grd.addColorStop(0, '#FF8A3C');
                grd.addColorStop(1, '#B71C1C');
                ctx.fillStyle = grd;
                U.roundRect(ctx, sx + 1, y + 1, (sw - 2) * v, 14, 2); ctx.fill();
            }
            ctx.strokeStyle = U.rgba('#000000', 0.5); ctx.lineWidth = 1;
            U.roundRect(ctx, sx, y, sw, 16, 3); ctx.stroke();
        }
        ctx.restore();
    }

    drawWaveBanner(ctx) {
        const b = this.waveBanner;
        const k = b.t / b.dur;
        const inK = U.clamp(b.t / 0.35, 0, 1);
        const outK = U.clamp((b.dur - b.t) / 0.4, 0, 1);
        const a = Math.min(U.ease.outCubic(inK), outK);
        ctx.save();
        ctx.globalAlpha = a;
        const y = 168;
        const w = 460;
        const x = VIEW.W / 2 - w / 2 - (1 - U.ease.outCubic(inK)) * 120;
        const grd = ctx.createLinearGradient(x, 0, x + w, 0);
        grd.addColorStop(0, 'rgba(20,14,10,0)');
        grd.addColorStop(0.5, 'rgba(20,14,10,0.86)');
        grd.addColorStop(1, 'rgba(20,14,10,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(x, y - 40, w, 76);
        ctx.strokeStyle = U.rgba(C.gold, 0.75 * a);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 40, y + 30); ctx.lineTo(x + w - 40, y + 30);
        ctx.stroke();
        txt(ctx, b.text, VIEW.W / 2, y + 4, 32, C.gold, 'center', { stroke: C.ink, strokeW: 6 });
        if (b.sub) txt(ctx, b.sub, VIEW.W / 2, y + 26, 14, C.white, 'center', { weight: 500 });
        ctx.restore();
    }

    drawSkillBanner(ctx) {
        const b = this.skillBanner;
        const k = b.t / b.dur;
        const a = k < 0.14 ? k / 0.14 : (k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
        ctx.save();
        ctx.globalAlpha = U.clamp(a, 0, 1);
        const y = 300;
        const scale = 1 + (1 - U.clamp(b.t / 0.3, 0, 1)) * 0.5;
        ctx.translate(VIEW.W / 2, y);
        ctx.scale(scale, scale);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grd = ctx.createLinearGradient(-300, 0, 300, 0);
        const col = b.super ? '#FF7043' : '#7FD8FF';
        grd.addColorStop(0, U.rgba(col, 0));
        grd.addColorStop(0.5, U.rgba(col, 0.55));
        grd.addColorStop(1, U.rgba(col, 0));
        ctx.fillStyle = grd;
        ctx.fillRect(-300, -46, 600, 58);
        ctx.restore();
        const label = b.super ? '超 · 必 杀' : '必 杀';
        txt(ctx, label, 0, -14, 22, U.rgba('#FFFFFF', 0.85), 'center', { stroke: col, strokeW: 5 });
        txt(ctx, b.text, 0, 14, 27, '#FFF6DC', 'center', { stroke: C.ink, strokeW: 6 });
        ctx.restore();
    }

    drawBigBanner(ctx) {
        const b = this.banner;
        const k = b.t / b.dur;
        const a = k < 0.12 ? k / 0.12 : (k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1);
        ctx.save();
        ctx.globalAlpha = U.clamp(a, 0, 1);
        txt(ctx, b.text, VIEW.W / 2, 210, b.size, b.color, 'center', { stroke: C.ink, strokeW: 7 });
        ctx.restore();
    }

    /* ============================================================
     * 标题画面
     * ========================================================== */
    drawTitle(ctx) {
        const g = this.g;
        ctx.save();
        // 背景已由场景绘制，这里加暗角
        const grd = ctx.createLinearGradient(0, 0, 0, VIEW.H);
        grd.addColorStop(0, 'rgba(12,8,6,0.78)');
        grd.addColorStop(0.45, 'rgba(12,8,6,0.42)');
        grd.addColorStop(1, 'rgba(12,8,6,0.86)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);

        const bob = Math.sin(this.t * 1.6) * 5;
        // 标题
        ctx.save();
        ctx.translate(VIEW.W / 2, 158 + bob);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rg = ctx.createRadialGradient(0, 0, 10, 0, 0, 280);
        rg.addColorStop(0, 'rgba(255,190,80,0.28)');
        rg.addColorStop(1, 'rgba(255,190,80,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(0, 0, 280, 0, TAU); ctx.fill();
        ctx.restore();

        txt(ctx, '三 国 战 纪', 0, 0, 76, '#F7E3B0', 'center', { stroke: '#7A2E12', strokeW: 10 });
        ctx.save();
        ctx.globalAlpha = 0.9;
        txt(ctx, '三 国 战 纪', 0, 0, 76, 'rgba(255,255,255,0.20)', 'center', { shadow: false });
        ctx.restore();
        txt(ctx, 'THREE KINGDOMS BRAWLER', 6, 34, 16, C.gold, 'center', { weight: 600 });
        // 朱印
        ctx.save();
        ctx.translate(196, 44);
        ctx.rotate(-0.12);
        ctx.fillStyle = '#B71C1C';
        U.roundRect(ctx, -20, -20, 40, 40, 5); ctx.fill();
        ctx.strokeStyle = U.rgba('#FFFFFF', 0.7); ctx.lineWidth = 2; ctx.stroke();
        txt(ctx, '汉', 0, 10, 26, '#FFEBEE', 'center', { shadow: false });
        ctx.restore();
        ctx.restore();

        // 菜单
        const items = ['开始征战', '武将选择', '操作说明'];
        for (let i = 0; i < items.length; i++) {
            const y = 330 + i * 46;
            const sel = i === g.titleIndex;
            if (sel) {
                const pulse = 0.55 + Math.sin(this.t * 6) * 0.25;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = U.rgba(C.gold, 0.16 * pulse);
                U.roundRect(ctx, VIEW.W / 2 - 118, y - 24, 236, 36, 6); ctx.fill();
                ctx.restore();
                txt(ctx, '◆', VIEW.W / 2 - 100, y, 15, C.gold, 'center');
            }
            txt(ctx, items[i], VIEW.W / 2 + 12, y, sel ? 24 : 22,
                sel ? '#FFF0C4' : U.rgba(C.white, 0.72), 'center', { stroke: C.ink, strokeW: 4 });
        }

        // 最高战功（有记录才显示）
        if (g.bestScore > 0) {
            const bw = 210, by = 330 + items.length * 46 + 6;
            ctx.save();
            U.roundRect(ctx, VIEW.W / 2 - bw / 2, by - 17, bw, 28, 5);
            ctx.fillStyle = 'rgba(40,29,20,0.55)'; ctx.fill();
            ctx.strokeStyle = U.rgba(C.gold, 0.26); ctx.lineWidth = 1; ctx.stroke();
            txt(ctx, '最高战功', VIEW.W / 2 - bw / 2 + 14, by + 3, 13, U.rgba(C.white, 0.62), 'left', { weight: 500 });
            txt(ctx, String(g.bestScore), VIEW.W / 2 + bw / 2 - 14, by + 3, 15, C.gold, 'right', { weight: 700 });
            ctx.restore();
        }

        txt(ctx, '↑↓ 选择    Enter 确定', VIEW.W / 2, VIEW.H - 42, 14, C.dim, 'center', { weight: 500 });
        txt(ctx, '键盘操作 · 无需安装 · 打开即玩    M 静音', VIEW.W / 2, VIEW.H - 20, 12, U.rgba(C.white, 0.35), 'center', { weight: 400 });
        ctx.restore();
    }

    /* ============================================================
     * 帮助画面
     * ========================================================== */
    drawHelp(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(10,7,5,0.90)';
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);
        txt(ctx, '操 作 说 明', VIEW.W / 2, 78, 38, C.gold, 'center', { stroke: C.ink, strokeW: 7 });

        const rows = [
            ['W A S D / 方向键', '移动（上下调整纵深）'],
            ['J', '普通攻击（连按三连击）'],
            ['K', '跳跃（空中 J 可跳斩）'],
            ['Shift / 双击左右', '冲刺（冲刺中 J 为冲斩）'],
            ['空格（按住）', '防御（受击瞬间按为完美格挡）'],
            ['L / U', '必杀技（怒气 50 起，满 100 为超必杀）'],
            ['Enter', '确认 / 暂停菜单'],
            ['Esc / P', '暂停（切走窗口会自动暂停）'],
            ['M', '静音开关']
        ];
        let y = 130;
        for (const [k, v] of rows) {
            ctx.save();
            U.roundRect(ctx, 96, y - 18, 250, 30, 6);
            ctx.fillStyle = 'rgba(60,44,30,0.7)'; ctx.fill();
            ctx.strokeStyle = U.rgba(C.gold, 0.5); ctx.lineWidth = 1.4; ctx.stroke();
            txt(ctx, k, 221, y + 2, 16, '#FFE9A8', 'center', { weight: 600 });
            txt(ctx, v, 366, y + 2, 16, C.white, 'left', { weight: 500 });
            y += 37;
        }

        txt(ctx, '完美格挡：在敌人命中前一瞬按住防御，可完全免伤并让敌人失衡，', VIEW.W / 2, 470, 14, U.rgba(C.white, 0.78), 'center', { weight: 500 });
        txt(ctx, '随后 0.5 秒内按 J 触发强力反击。', VIEW.W / 2, 492, 14, U.rgba(C.white, 0.78), 'center', { weight: 500 });

        const a = 0.55 + Math.sin(this.t * 5) * 0.35;
        ctx.globalAlpha = a;
        txt(ctx, 'Enter / Esc 返回', VIEW.W / 2, VIEW.H - 26, 17, C.gold, 'center');
        ctx.restore();
    }

    /* ============================================================
     * 选人画面
     * ========================================================== */
    drawSelect(ctx) {
        const g = this.g;
        ctx.save();
        const grd = ctx.createLinearGradient(0, 0, 0, VIEW.H);
        grd.addColorStop(0, 'rgba(14,10,7,0.92)');
        grd.addColorStop(0.55, 'rgba(24,17,12,0.86)');
        grd.addColorStop(1, 'rgba(10,7,5,0.95)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);

        txt(ctx, '择 一 明 主', VIEW.W / 2, 62, 32, C.gold, 'center', { stroke: C.ink, strokeW: 6 });
        txt(ctx, '← → 选择    Enter 出征    Esc 返回', VIEW.W / 2, 88, 13, C.dim, 'center', { weight: 500 });

        const keys = Object.keys(HERO_KIT);
        const cx = VIEW.W / 2, cy = 300;
        const idx = g.selectIndex;

        // 卡片
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const look = LOOKS[key];
            const off = i - idx;
            const sel = i === idx;
            const x = cx + off * 128;
            const scale = sel ? 1 : 0.74;
            const a = sel ? 1 : U.clamp(1 - Math.abs(off) * 0.32, 0.14, 0.6);

            ctx.save();
            ctx.globalAlpha = a;
            const cw = 108, ch = 158;
            if (sel) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const rg = ctx.createRadialGradient(x, cy - 10, 8, x, cy - 10, 130);
                rg.addColorStop(0, U.rgba(C.gold, 0.30));
                rg.addColorStop(1, U.rgba(C.gold, 0));
                ctx.fillStyle = rg;
                ctx.beginPath(); ctx.arc(x, cy - 10, 130, 0, TAU); ctx.fill();
                ctx.restore();
            }
            U.roundRect(ctx, x - cw / 2, cy - ch / 2 - 6, cw, ch, 10);
            ctx.fillStyle = sel ? 'rgba(58,42,28,0.92)' : 'rgba(30,22,16,0.72)';
            ctx.fill();
            ctx.lineWidth = sel ? 3 : 1.6;
            ctx.strokeStyle = sel ? C.gold : 'rgba(242,193,78,0.34)';
            ctx.stroke();

            // 立绘
            ctx.save();
            ctx.beginPath();
            U.roundRect(ctx, x - cw / 2 + 3, cy - ch / 2 - 3, cw - 6, ch - 6, 8);
            ctx.clip();
            ctx.translate(x, cy + 56);
            const k = 74 * scale;
            ctx.scale(k, k);
            ctx.translate(0, -FOOT_OFF);
            const pose = sel ? Fig.idle(this.t * 1.4) : Fig.idle(this.t * 0.7 + i);
            Fig.draw(ctx, look, Fig.solve(pose), { time: this.t });
            ctx.restore();

            txt(ctx, look.name, x, cy + 66, sel ? 20 : 15, sel ? '#FFF0C4' : C.white, 'center', { stroke: C.ink, strokeW: 4 });
            ctx.restore();
        }

        // 详情面板
        const look = LOOKS[keys[idx]];
        const kit = HERO_KIT[keys[idx]];
        const st = look.stats;
        ctx.save();
        const pw = 470, ph = 118, pxx = cx - pw / 2, pyy = 432;
        U.roundRect(ctx, pxx, pyy, pw, ph, 10);
        ctx.fillStyle = 'rgba(20,14,10,0.86)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = U.rgba(C.gold, 0.6); ctx.stroke();

        txt(ctx, look.name, pxx + 22, pyy + 34, 27, C.gold, 'left', { stroke: C.ink, strokeW: 5 });
        txt(ctx, '「' + look.title + '」', pxx + 130, pyy + 33, 14, C.dim, 'left', { weight: 500 });
        txt(ctx, look.desc, pxx + 22, pyy + 58, 14, U.rgba(C.white, 0.85), 'left', { weight: 500 });
        txt(ctx, '必杀：' + kit.skillName, pxx + 22, pyy + 80, 14, '#FFE9A8', 'left', { weight: 600 });

        // 五维
        const bars = [
            ['体', st.hp / 170], ['攻', st.atk / 26], ['速', st.spd / 240], ['程', st.reach / 1.6]
        ];
        bars.forEach(([n, v], i) => {
            const bx = pxx + 300 + (i % 2) * 84;
            const by = pyy + 40 + Math.floor(i / 2) * 26;
            txt(ctx, n, bx, by + 8, 13, C.dim, 'left', { weight: 600 });
            this.bar(ctx, bx + 18, by, 52, 9, v, C.hp, '#2A1A16', U.rgba(C.gold, 0.5));
        });
        ctx.restore();
        ctx.restore();
    }

    /* ============================================================
     * 关卡开场
     * ========================================================== */
    drawLevelIntro(ctx) {
        const g = this.g;
        const k = U.clamp(g.introT / 3.2, 0, 1);
        const a = k < 0.15 ? k / 0.15 : (k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(8,6,4,0.62)';
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);
        const L = g.level;
        txt(ctx, L.name, VIEW.W / 2, 250, 40, C.gold, 'center', { stroke: C.ink, strokeW: 8 });
        txt(ctx, L.sub, VIEW.W / 2, 292, 18, U.rgba(C.white, 0.86), 'center', { weight: 500 });
        ctx.strokeStyle = U.rgba(C.gold, 0.7); ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(VIEW.W / 2 - 150, 268); ctx.lineTo(VIEW.W / 2 + 150, 268);
        ctx.stroke();
        ctx.restore();
    }

    /* ============================================================
     * 暂停
     * ========================================================== */
    drawPause(ctx) {
        const g = this.g;
        ctx.save();
        ctx.fillStyle = 'rgba(8,6,4,0.74)';
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);
        txt(ctx, '暂 停', VIEW.W / 2, 190, 44, C.gold, 'center', { stroke: C.ink, strokeW: 8 });
        const items = ['继续征战', '重新开始本关', '返回标题', '静音切换'];
        for (let i = 0; i < items.length; i++) {
            const y = 268 + i * 46;
            const sel = i === g.pauseIndex;
            if (sel) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = U.rgba(C.gold, 0.18);
                U.roundRect(ctx, VIEW.W / 2 - 130, y - 25, 260, 36, 6); ctx.fill();
                ctx.restore();
                txt(ctx, '◆', VIEW.W / 2 - 112, y, 15, C.gold, 'center');
            }
            txt(ctx, items[i], VIEW.W / 2 + 10, y, sel ? 23 : 21,
                sel ? '#FFF0C4' : U.rgba(C.white, 0.7), 'center', { stroke: C.ink, strokeW: 4 });
        }
        txt(ctx, this.g.audio.muted ? '当前：静音' : '当前：开启音效', VIEW.W / 2, VIEW.H - 60, 13, C.dim, 'center', { weight: 500 });
        ctx.restore();
    }

    /* ============================================================
     * 结算
     * ========================================================== */
    drawResult(ctx, win) {
        const g = this.g, p = g.player;
        ctx.save();
        ctx.fillStyle = 'rgba(8,6,4,0.84)';
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);

        const title = win ? '凯 旋 而 归' : '力 竭 而 亡';
        const col = win ? C.gold : '#B71C1C';
        txt(ctx, title, VIEW.W / 2, 130, 52, col, 'center', { stroke: C.ink, strokeW: 9 });
        txt(ctx, win ? '汉室可兴，将军威震天下。' : '将军暂避锋芒，再图后计。',
            VIEW.W / 2, 168, 16, U.rgba(C.white, 0.8), 'center', { weight: 500 });

        const rows = [
            ['总战功', String(Math.round(p.score))],
            ['最高连击', p.comboBest + ' 连'],
            ['命中次数', String(p.hitsLanded)],
            ['完美格挡', String(p.perfectGuards)],
            ['击破敌将', String(g.killCount)]
        ];
        let y = 224;
        for (const [k, v] of rows) {
            ctx.save();
            U.roundRect(ctx, VIEW.W / 2 - 190, y - 20, 380, 32, 6);
            ctx.fillStyle = 'rgba(40,29,20,0.66)'; ctx.fill();
            ctx.strokeStyle = U.rgba(C.gold, 0.32); ctx.lineWidth = 1.2; ctx.stroke();
            txt(ctx, k, VIEW.W / 2 - 170, y + 2, 15, U.rgba(C.white, 0.8), 'left', { weight: 500 });
            txt(ctx, v, VIEW.W / 2 + 170, y + 2, 17, C.gold, 'right', { weight: 700 });
            ctx.restore();
            y += 40;
        }

        // 最高战功 / 破纪录
        if (g.newRecord) {
            const pulse = 0.6 + Math.sin(this.t * 7) * 0.4;
            ctx.save();
            ctx.globalAlpha = pulse;
            txt(ctx, '★ 新纪录 ★', VIEW.W / 2, y + 14, 22, '#FFE082', 'center', { stroke: C.ink, strokeW: 5 });
            ctx.restore();
        } else if (g.bestScore > 0) {
            txt(ctx, '最高战功 ' + g.bestScore, VIEW.W / 2, y + 12, 15, U.rgba(C.white, 0.55), 'center', { weight: 500 });
        }

        const a = 0.55 + Math.sin(this.t * 5) * 0.35;
        ctx.globalAlpha = a;
        txt(ctx, win ? 'Enter 再来一局    Esc 返回标题' : 'Enter 重整旗鼓    Esc 返回标题',
            VIEW.W / 2, VIEW.H - 52, 18, C.gold, 'center');
        ctx.restore();
    }

    drawVictory(ctx) {
        const g = this.g, p = g.player;
        ctx.save();
        // 渐变夜幕：上浓下淡，让身后洛阳宫城夜景仍可读（纯 0.92 黑会把场景全盖住）
        const scrim = ctx.createLinearGradient(0, 0, 0, VIEW.H);
        scrim.addColorStop(0, 'rgba(8,6,4,0.88)');
        scrim.addColorStop(0.45, 'rgba(8,6,4,0.55)');
        scrim.addColorStop(1, 'rgba(10,8,5,0.22)');
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);
        // 主角身后一束暖光（克敌凯旋的舞台感）
        if (p) {
            const px = p.sx(g.cam), py = p.cy(g.cam) - 60;
            const glow = ctx.createRadialGradient(px, py, 10, px, py, 150);
            glow.addColorStop(0, 'rgba(255,214,140,0.30)');
            glow.addColorStop(1, 'rgba(255,214,140,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(px - 150, py - 150, 300, 300);
        }
        txt(ctx, '天 下 已 定', VIEW.W / 2, 150, 60, C.gold, 'center', { stroke: C.ink, strokeW: 10 });
        txt(ctx, '黄天已破，汉室重光。', VIEW.W / 2, 196, 18, U.rgba(C.white, 0.86), 'center', { weight: 500 });

        const bonus = g.computeBonus();
        // 结算文字底板：夜景透出后保证数字可读
        const panelH = 120 + bonus.length * 34 + 70;
        ctx.fillStyle = 'rgba(6,5,3,0.62)';
        ctx.strokeStyle = 'rgba(201,162,39,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(VIEW.W / 2 - 210, 244, 420, panelH);
        ctx.fill(); ctx.stroke();
        let y = 262;
        bonus.forEach((b, i) => {
            const app = U.clamp((g.resultT - 0.25 - i * 0.16) / 0.3, 0, 1);
            ctx.globalAlpha = app;
            txt(ctx, b[0], VIEW.W / 2 - 150, y, 17, U.rgba(C.white, 0.82), 'left', { weight: 500 });
            txt(ctx, '+' + b[1], VIEW.W / 2 + 150, y, 19, C.gold, 'right', { weight: 700 });
            y += 34;
        });
        ctx.globalAlpha = U.clamp((g.resultT - 0.25 - bonus.length * 0.16) / 0.3, 0, 1);
        txt(ctx, '最终战功', VIEW.W / 2 - 150, y + 22, 21, '#FFF0C4', 'left', { weight: 700 });
        txt(ctx, String(g.finalScore), VIEW.W / 2 + 150, y + 22, 26, C.gold, 'right', { weight: 700 });

        if (g.newRecord) {
            const pulse = 0.6 + Math.sin(this.t * 7) * 0.4;
            ctx.save();
            ctx.globalAlpha *= pulse;
            txt(ctx, '★ 新纪录 ★', VIEW.W / 2, y + 56, 20, '#FFE082', 'center', { stroke: C.ink, strokeW: 5 });
            ctx.restore();
        } else if (g.bestScore > 0) {
            txt(ctx, '最高战功 ' + g.bestScore, VIEW.W / 2, y + 54, 15, U.rgba(C.white, 0.55), 'center', { weight: 500 });
        }

        const a = 0.55 + Math.sin(this.t * 5) * 0.35;
        ctx.globalAlpha = a;
        txt(ctx, 'Enter 返回标题', VIEW.W / 2, VIEW.H - 46, 18, C.gold, 'center');
        ctx.restore();
    }

    drawFade(ctx, a) {
        if (a <= 0) return;
        ctx.save();
        ctx.fillStyle = U.rgba('#000000', U.clamp(a, 0, 1));
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);
        ctx.restore();
    }
}

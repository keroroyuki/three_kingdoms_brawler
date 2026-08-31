/* ============================================================
 * 三国战纪 · 核心工具库
 * ============================================================ */
'use strict';

const TAU = Math.PI * 2;

const U = {
    TAU,

    clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp(a, b, t) { return a + (b - a) * t; },
    inv(a, b, v) { return b === a ? 0 : (v - a) / (b - a); },
    /** 帧率无关的指数逼近 */
    damp(a, b, lambda, dt) { return b + (a - b) * Math.exp(-lambda * dt); },
    /** 线性逼近，每帧最多移动 step */
    approach(v, target, step) {
        if (v < target) return Math.min(v + step, target);
        if (v > target) return Math.max(v - step, target);
        return target;
    },

    rand(a, b) { return a + Math.random() * (b - a); },
    randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    pick(arr) { return arr[(Math.random() * arr.length) | 0]; },
    chance(p) { return Math.random() < p; },
    sign(v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); },

    dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); },

    /** 轴对齐矩形重叠 */
    overlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    },

    /** 角度归一化到 (-PI, PI] */
    wrapAngle(a) {
        while (a > Math.PI) a -= TAU;
        while (a <= -Math.PI) a += TAU;
        return a;
    },
    lerpAngle(a, b, t) { return a + U.wrapAngle(b - a) * t; },

    /* ---------------- 颜色 ---------------- */
    hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        const n = parseInt(hex, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    },
    rgbToHex(r, g, b) {
        const f = (v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
        return '#' + f(r) + f(g) + f(b);
    },
    /** amount > 0 变亮，< 0 变暗，范围 [-1, 1] */
    shade(hex, amount) {
        const { r, g, b } = U.hexToRgb(hex);
        if (amount >= 0) {
            return U.rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
        }
        const k = 1 + amount;
        return U.rgbToHex(r * k, g * k, b * k);
    },
    rgba(hex, alpha) {
        const { r, g, b } = U.hexToRgb(hex);
        return `rgba(${r},${g},${b},${alpha})`;
    },

    /* ---------------- 缓动 ---------------- */
    ease: {
        linear: t => t,
        inQuad: t => t * t,
        outQuad: t => t * (2 - t),
        inOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
        outCubic: t => 1 - Math.pow(1 - t, 3),
        inCubic: t => t * t * t,
        outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
        outElastic: t => (t === 0 || t === 1) ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1,
        outBounce: t => {
            const n = 7.5625, d = 2.75;
            if (t < 1 / d) return n * t * t;
            if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
            if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
            return n * (t -= 2.625 / d) * t + 0.984375;
        }
    },

    /* ---------------- 绘制辅助 ---------------- */
    /** 胶囊体路径（a→b，两端半径 wa/2 → wb/2） */
    capsule(ctx, ax, ay, bx, by, wa, wb) {
        const ang = Math.atan2(by - ay, bx - ax);
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        ctx.beginPath();
        ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2);
        ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
        ctx.arc(bx, by, wb / 2, ang + Math.PI / 2, ang - Math.PI / 2, true);
        ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
        ctx.arc(ax, ay, wa / 2, ang - Math.PI / 2, ang + Math.PI / 2, true);
        ctx.closePath();
    },

    roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    },

    /** 确定性噪声（用于背景装饰，避免每帧抖动） */
    hash(n) {
        const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return s - Math.floor(s);
    },

    /** 中文安全字体栈 */
    FONT: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif'
};

/** 圆角矩形填充 */
function fillRoundRect(ctx, x, y, w, h, r, color) {
    U.roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
}

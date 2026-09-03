/* ============================================================
 * 三国战纪 · 程序化角色渲染器
 * 骨骼求解 + 胶囊体绘制 + 姿态关键帧插值 + 武器绘制
 * 所有绘制在「单位空间」进行：脚底为原点，1 单位 ≈ 62px，y 向下为正
 * ============================================================ */
'use strict';

/** 骨骼常量（单位：米） */
const SK = {
    chestY: -0.46,
    neckY: -0.655,
    headY: -0.865,
    headR: 0.185,
    shoulderX: 0.145,
    shoulderY: -0.60,
    hipX: 0.105,
    hipY: 0.00,
    upperArm: 0.30,
    foreArm: 0.29,
    thigh: 0.44,
    shin: 0.44
};

const Fig = {
    PX: 62,              // 1 单位对应的像素
    OUTLINE: '#241811',  // 墨线色

    /* ========================================================
     * 姿态：基础模板
     * ======================================================== */
    base(o) {
        return Object.assign({
            bodyY: 0,
            bodyRot: 0,     // 整体绕骨盆旋转（击飞/旋转斩）
            lean: 0.03,     // 上身前倾
            headTilt: -0.02,
            armB: [1.36, 0.34],   // [上臂绝对角, 肘部相对弯曲]
            armF: [1.14, 0.32],
            legB: [1.58, -0.04],
            legF: [1.66, -0.06],
            weapon: 0,      // 武器附加角
            weapon2: 0,
            squash: 1
        }, o || {});
    },

    /** 姿态插值（递归处理数组字段） */
    blend(a, b, t) {
        const out = {};
        for (const k in a) {
            const va = a[k], vb = b[k];
            if (typeof va === 'number' && typeof vb === 'number') out[k] = va + (vb - va) * t;
            else if (Array.isArray(va) && Array.isArray(vb)) out[k] = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t];
            else out[k] = vb !== undefined ? vb : va;
        }
        return out;
    },

    /** 关键帧取样：frames = [[time, pose], ...] */
    sample(frames, t) {
        if (t <= frames[0][0]) return Fig.blend(frames[0][1], frames[0][1], 0);
        for (let i = 0; i < frames.length - 1; i++) {
            const [t0, p0] = frames[i], [t1, p1] = frames[i + 1];
            if (t >= t0 && t <= t1) {
                const k = (t1 === t0) ? 0 : (t - t0) / (t1 - t0);
                return Fig.blend(p0, p1, U.ease.outQuad(k));
            }
        }
        const last = frames[frames.length - 1];
        return Fig.blend(last[1], last[1], 0);
    },

    /* ========================================================
     * 姿态库
     * ======================================================== */
    idle(t) {
        const b = Math.sin(t * 2.1);
        return Fig.base({
            bodyY: b * 0.014,
            lean: 0.04 + b * 0.02,
            headTilt: -0.03 - b * 0.03,
            armB: [1.36 + b * 0.06, 0.34],
            armF: [1.14 - b * 0.05, 0.32],
            weapon: b * 0.06
        });
    },

    walk(t, rate) {
        const ph = t * (rate || 9);
        const s = Math.sin(ph), c = Math.cos(ph);
        const sw = 0.46;
        return Fig.base({
            bodyY: -0.012 + Math.abs(Math.sin(ph)) * 0.026,
            lean: 0.10,
            headTilt: -0.04,
            legB: [1.60 - s * sw, -0.06 + Math.max(0, s) * 0.85],
            legF: [1.60 + s * sw, -0.06 + Math.max(0, -s) * 0.85],
            armB: [1.34 + s * 0.34, 0.34],
            armF: [1.12 - s * 0.34, 0.34],
            weapon: -s * 0.12
        });
    },

    run(t) { return Fig.walk(t, 13); },

    jumpUp() {
        return Fig.base({
            bodyY: -0.02, lean: 0.10,
            armB: [1.05, 0.55], armF: [0.80, 0.60],
            legB: [1.30, 0.62], legF: [1.05, 0.75],
            weapon: -0.30
        });
    },
    fall() {
        return Fig.base({
            bodyY: 0.02, lean: 0.14,
            armB: [0.85, 0.45], armF: [1.25, 0.30],
            legB: [1.75, 0.40], legF: [1.35, 0.30],
            weapon: 0.25
        });
    },
    land() {
        return Fig.base({
            bodyY: 0.13, lean: 0.26,
            armB: [1.55, 0.35], armF: [1.42, 0.30],
            legB: [1.40, 0.55], legF: [1.85, 0.42],
            weapon: 0.20
        });
    },

    guard(t) {
        const b = Math.sin(t * 8) * 0.01;
        return Fig.base({
            bodyY: 0.045 + b, lean: 0.16, headTilt: 0.02,
            armB: [1.05, 1.05], armF: [0.72, 1.15],
            legB: [1.48, 0.12], legF: [1.78, 0.10],
            weapon: -0.85
        });
    },

    hurt() {
        return Fig.base({
            bodyY: 0.03, lean: -0.24, headTilt: 0.24,
            armB: [1.85, 0.55], armF: [1.62, 0.62],
            legB: [1.42, 0.18], legF: [1.72, 0.10],
            weapon: 0.55
        });
    },

    down(t) {
        return Fig.base({
            bodyY: 0.30, bodyRot: -1.35, lean: -0.18, headTilt: 0.35,
            armB: [2.35, 0.45], armF: [1.95, 0.55],
            legB: [1.15, 0.55], legF: [1.45, 0.45]
        });
    },
    getUp(t) {
        const k = U.clamp(t, 0, 1);
        return Fig.blend(Fig.down(0), Fig.base({ bodyY: 0.06, lean: 0.42, armB: [1.5, 0.6], armF: [1.3, 0.7], legB: [1.35, 0.85], legF: [1.6, 0.5] }), k);
    },

    cast(t) { // 施法蓄力
        const b = Math.sin(t * 18) * 0.03;
        return Fig.base({
            bodyY: -0.03 + b, lean: -0.10, headTilt: -0.10,
            armB: [0.15, 0.30], armF: [-0.20, 0.25],
            legB: [1.52, 0.10], legF: [1.72, 0.10],
            weapon: -1.15
        });
    },
    castRelease() {
        return Fig.base({
            bodyY: 0.05, lean: 0.34, headTilt: 0.06,
            armB: [1.15, 0.12], armF: [0.95, 0.08],
            legB: [1.35, 0.28], legF: [1.85, 0.18],
            weapon: -0.35
        });
    },
    spin(k) { // 旋转斩：k = 0..1 进度
        return Fig.base({
            bodyY: -0.04, bodyRot: k * Math.PI * 4, lean: 0,
            armB: [0.15, 0.10], armF: [0.05 + Math.PI, 0.10],
            legB: [1.42, 0.30], legF: [1.78, 0.25],
            weapon: -0.15
        });
    },
    thrust(k) { // 突刺：k = 0..1
        const e = U.ease.outCubic(U.clamp(k, 0, 1));
        return Fig.base({
            bodyY: -0.02, lean: 0.30 * e,
            armB: [1.30 - 0.55 * e, 0.15], armF: [1.20 - 0.95 * e, 0.06],
            legB: [1.42 - 0.30 * e, 0.20], legF: [1.95 + 0.25 * e, 0.22],
            weapon: -0.05 - 0.25 * e
        });
    },
    charge(t) { // 骑兵冲锋
        const b = Math.sin(t * 16) * 0.02;
        return Fig.base({
            bodyY: -0.02 + b, lean: 0.42,
            armB: [1.30, 0.20], armF: [0.95, 0.10],
            legB: [1.30, 0.55], legF: [1.70, 0.45],
            weapon: -0.55
        });
    },
    shoot(k) {
        const e = U.clamp(k, 0, 1);
        return Fig.base({
            bodyY: 0.0, lean: 0.05,
            armB: [1.20 - 0.55 * e, 0.10 - 0.10 * e], armF: [1.10 - 0.62 * e, 0.10],
            legB: [1.55, 0.10], legF: [1.70, 0.08],
            weapon: -0.20
        });
    },
    cheer(t) {
        const b = Math.sin(t * 3);
        return Fig.base({
            bodyY: b * 0.02, lean: -0.06,
            armB: [0.35, 0.25], armF: [-0.55, 0.35],
            legB: [1.58, -0.02], legF: [1.64, -0.02],
            weapon: -1.5
        });
    },

    /* ---------------- 三段连击 ---------------- */
    atk1Frames: [
        [0.00, { bodyY: 0, lean: 0.05, armB: [1.36, 0.34], armF: [1.14, 0.32], legB: [1.58, -0.04], legF: [1.66, -0.06], weapon: 0 }],
        [0.12, { bodyY: 0.02, lean: -0.10, armB: [1.55, 0.30], armF: [0.45, 0.85], legB: [1.52, 0.10], legF: [1.72, 0.06], weapon: -0.95 }],
        [0.22, { bodyY: -0.01, lean: 0.24, armB: [1.60, 0.25], armF: [1.28, -0.05], legB: [1.40, 0.20], legF: [1.88, 0.14], weapon: 0.42 }],
        [0.34, { bodyY: 0.02, lean: 0.20, armB: [1.50, 0.30], armF: [1.34, 0.14], legB: [1.46, 0.16], legF: [1.82, 0.12], weapon: 0.34 }],
        [0.46, { bodyY: 0, lean: 0.05, armB: [1.36, 0.34], armF: [1.14, 0.32], legB: [1.58, -0.04], legF: [1.66, -0.06], weapon: 0.06 }]
    ],
    atk2Frames: [
        [0.00, { bodyY: 0, lean: 0.05, armB: [1.36, 0.34], armF: [1.14, 0.32], legB: [1.58, -0.04], legF: [1.66, -0.06], weapon: 0 }],
        [0.10, { bodyY: 0.02, lean: -0.22, armB: [0.55, 0.55], armF: [1.45, 0.30], legB: [1.62, 0.08], legF: [1.58, 0.05], weapon: 0.85 }],
        [0.20, { bodyY: -0.01, lean: 0.30, armB: [1.85, -0.05], armF: [1.12, 0.10], legB: [1.34, 0.26], legF: [1.92, 0.16], weapon: -0.45 }],
        [0.32, { bodyY: 0.02, lean: 0.24, armB: [1.70, 0.10], armF: [1.26, 0.16], legB: [1.42, 0.20], legF: [1.85, 0.12], weapon: -0.30 }],
        [0.46, { bodyY: 0, lean: 0.05, armB: [1.36, 0.34], armF: [1.14, 0.32], legB: [1.58, -0.04], legF: [1.66, -0.06], weapon: 0.06 }]
    ],
    atk3Frames: [
        [0.00, { bodyY: 0, lean: 0.05, armB: [1.36, 0.34], armF: [1.14, 0.32], legB: [1.58, -0.04], legF: [1.66, -0.06], weapon: 0 }],
        [0.16, { bodyY: 0.10, lean: -0.26, armB: [0.95, 0.75], armF: [0.70, 0.95], legB: [1.30, 0.55], legF: [1.55, 0.42], weapon: -1.30 }],
        [0.30, { bodyY: -0.06, lean: 0.34, armB: [1.15, 0.30], armF: [0.42, 0.10], legB: [1.62, 0.10], legF: [1.50, 0.30], weapon: -1.05 }],
        [0.42, { bodyY: -0.02, lean: 0.16, armB: [1.30, 0.30], armF: [0.72, 0.20], legB: [1.62, 0.10], legF: [1.72, 0.14], weapon: -0.80 }],
        [0.62, { bodyY: 0, lean: 0.05, armB: [1.36, 0.34], armF: [1.14, 0.32], legB: [1.58, -0.04], legF: [1.66, -0.06], weapon: 0.06 }]
    ],
    atkAirFrames: [
        [0.00, { bodyY: -0.02, lean: 0.10, armB: [1.05, 0.55], armF: [0.80, 0.60], legB: [1.30, 0.62], legF: [1.05, 0.75], weapon: -0.30 }],
        [0.10, { bodyY: -0.04, lean: -0.16, armB: [0.30, 0.40], armF: [0.10, 0.30], legB: [1.15, 0.80], legF: [0.95, 0.90], weapon: -1.10 }],
        [0.20, { bodyY: 0.04, lean: 0.44, armB: [1.20, 0.15], armF: [1.05, 0.05], legB: [1.30, 0.65], legF: [1.55, 0.55], weapon: 0.55 }],
        [0.40, { bodyY: 0.05, lean: 0.36, armB: [1.30, 0.25], armF: [1.18, 0.12], legB: [1.35, 0.60], legF: [1.62, 0.50], weapon: 0.45 }]
    ],
    atkDashFrames: [
        [0.00, { bodyY: 0, lean: 0.30, armB: [1.30, 0.20], armF: [1.05, 0.15], legB: [1.42, 0.30], legF: [1.80, 0.20], weapon: -0.10 }],
        [0.30, { bodyY: -0.02, lean: 0.46, armB: [1.05, 0.06], armF: [0.88, 0.02], legB: [1.20, 0.55], legF: [2.00, 0.25], weapon: -0.05 }],
        [0.55, { bodyY: 0.04, lean: 0.34, armB: [1.20, 0.18], armF: [1.02, 0.10], legB: [1.38, 0.34], legF: [1.86, 0.22], weapon: -0.02 }]
    ],

    /* ========================================================
     * 骨骼求解
     * ======================================================== */
    solve(p) {
        // 兜底：任何字段缺失都退回基础姿态，绝不让渲染循环因畸形 pose 崩溃
        if (!p || !p.armB || !p.armF || !p.legB || !p.legF) p = Fig.base(p || {});
        const lean = p.lean || 0;
        const c = Math.cos(lean), s = Math.sin(lean);
        const rot = (x, y) => ({ x: x * c - y * s, y: x * s + y * c });
        const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
        const on = (o, a, l) => ({ x: o.x + Math.cos(a) * l, y: o.y + Math.sin(a) * l });

        const pelvis = { x: 0, y: p.bodyY || 0 };
        const chest = add(pelvis, rot(0, SK.chestY));
        const neck = add(pelvis, rot(0, SK.neckY));
        const head = add(pelvis, rot(0, SK.headY));
        const shB = add(pelvis, rot(-SK.shoulderX, SK.shoulderY));
        const shF = add(pelvis, rot(SK.shoulderX, SK.shoulderY));
        const hipB = add(pelvis, rot(-SK.hipX, SK.hipY));
        const hipF = add(pelvis, rot(SK.hipX, SK.hipY));

        const elB = on(shB, p.armB[0], SK.upperArm);
        const hdB = on(elB, p.armB[0] + p.armB[1], SK.foreArm);
        const elF = on(shF, p.armF[0], SK.upperArm);
        const hdF = on(elF, p.armF[0] + p.armF[1], SK.foreArm);

        const knB = on(hipB, p.legB[0], SK.thigh);
        const ftB = on(knB, p.legB[0] + p.legB[1], SK.shin);
        const knF = on(hipF, p.legF[0], SK.thigh);
        const ftF = on(knF, p.legF[0] + p.legF[1], SK.shin);

        return {
            pelvis, chest, neck, head, shB, shF, hipB, hipF,
            elB, hdB, elF, hdF, knB, ftB, knF, ftF,
            aArmB: p.armB[0] + p.armB[1],
            aArmF: p.armF[0] + p.armF[1],
            aLegB: p.legB[0] + p.legB[1],
            aLegF: p.legF[0] + p.legF[1]
        };
    },

    /* ========================================================
     * 主绘制
     * ctx 已变换到「单位空间」；look = 外观配置
     * ======================================================== */
    draw(ctx, look, s, o) {
        o = o || {};
        const B = look.build || 1;
        const time = o.time || 0;
        const flash = o.flash || 0;
        const OUT = Fig.OUTLINE;
        const OLW = 0.028;
        const skin = look.skin, skinD = look.skinDark || U.shade(look.skin, -0.22);
        const robe = look.robe, robeD = look.robeDark || U.shade(look.robe, -0.28);
        const robeL = look.robeLight || U.shade(look.robe, 0.18);
        const trim = look.trim || '#FFD700';

        const limb = (a, b, wa, wb, fill) => {
            U.capsule(ctx, a.x, a.y, b.x, b.y, wa, wb);
            ctx.fillStyle = fill; ctx.fill();
            ctx.lineWidth = OLW; ctx.strokeStyle = OUT; ctx.stroke();
        };
        const shape = (fill) => {
            ctx.fillStyle = fill; ctx.fill();
            ctx.lineWidth = OLW; ctx.strokeStyle = OUT; ctx.stroke();
        };

        /* ---- 披风（最底层） ---- */
        if (look.cape) {
            const sway = Math.sin(time * 3.4) * 0.05 + (o.capeBoost || 0);
            ctx.beginPath();
            ctx.moveTo(s.shB.x - 0.02, s.shB.y);
            ctx.quadraticCurveTo(-0.30 * B, s.chest.y + 0.10, -0.34 * B + sway, s.pelvis.y + 0.30);
            ctx.quadraticCurveTo(-0.16 * B, s.pelvis.y + 0.42, -0.20 * B + sway * 1.4, s.pelvis.y + 0.62);
            ctx.lineTo(0.02, s.pelvis.y + 0.52);
            ctx.lineTo(0.02, s.shB.y - 0.05);
            ctx.closePath();
            shape(look.cape);
        }

        /* ---- 后腿 / 后臂（压暗，制造层次） ---- */
        limb(s.hipB, s.knB, 0.165 * B, 0.135 * B, look.pants ? U.shade(look.pants, -0.25) : robeD);
        limb(s.knB, s.ftB, 0.135 * B, 0.105 * B, U.shade(look.boot || robeD, -0.2));
        Fig._foot(ctx, s.ftB, s.aLegB, look.boot || '#3E2723', B, OUT, OLW);

        limb(s.shB, s.elB, 0.115 * B, 0.098 * B, U.shade(robe, -0.12));
        limb(s.elB, s.hdB, 0.098 * B, 0.082 * B, U.shade(skin, -0.18));

        /* ---- 前腿 ---- */
        limb(s.hipF, s.knF, 0.175 * B, 0.140 * B, look.pants || robe);
        limb(s.knF, s.ftF, 0.140 * B, 0.110 * B, look.boot || '#4E342E');
        Fig._foot(ctx, s.ftF, s.aLegF, look.boot || '#4E342E', B, OUT, OLW);

        /* ---- 躯干 ---- */
        const tw = 0.365 * B;
        U.capsule(ctx, s.chest.x, s.chest.y + 0.02, s.pelvis.x, s.pelvis.y - 0.02, tw, 0.29 * B);
        shape(robe);

        // 衣襟（V 领）
        ctx.beginPath();
        ctx.moveTo(s.neck.x - 0.085 * B, s.neck.y - 0.02);
        ctx.lineTo(s.neck.x + 0.085 * B, s.neck.y - 0.02);
        ctx.lineTo(s.pelvis.x + 0.02, s.pelvis.y - 0.16);
        ctx.lineTo(s.pelvis.x - 0.02, s.pelvis.y - 0.16);
        ctx.closePath();
        ctx.fillStyle = robeL; ctx.fill();

        // 腰带
        U.capsule(ctx, s.pelvis.x - 0.14 * B, s.pelvis.y - 0.10, s.pelvis.x + 0.15 * B, s.pelvis.y - 0.115, 0.115 * B, 0.115 * B);
        shape(look.sash || '#8B0000');

        // 铠甲（胸甲 + 肩甲）
        if (look.armor) {
            ctx.beginPath();
            ctx.moveTo(s.chest.x - 0.19 * B, s.chest.y - 0.16);
            ctx.quadraticCurveTo(s.chest.x + 0.02 * B, s.chest.y - 0.24, s.chest.x + 0.20 * B, s.chest.y - 0.14);
            ctx.lineTo(s.chest.x + 0.17 * B, s.chest.y + 0.10);
            ctx.quadraticCurveTo(s.chest.x, s.chest.y + 0.17, s.chest.x - 0.16 * B, s.chest.y + 0.09);
            ctx.closePath();
            shape(look.armor);
            // 甲片高光
            ctx.beginPath();
            ctx.moveTo(s.chest.x - 0.13 * B, s.chest.y - 0.10);
            ctx.quadraticCurveTo(s.chest.x + 0.02 * B, s.chest.y - 0.16, s.chest.x + 0.14 * B, s.chest.y - 0.08);
            ctx.lineTo(s.chest.x + 0.12 * B, s.chest.y - 0.02);
            ctx.quadraticCurveTo(s.chest.x, s.chest.y - 0.08, s.chest.x - 0.12 * B, s.chest.y - 0.02);
            ctx.closePath();
            ctx.fillStyle = U.rgba('#FFFFFF', 0.18); ctx.fill();

            // 肩甲
            [[s.shF, 1], [s.shB, -1]].forEach(([sh, dir]) => {
                ctx.beginPath();
                ctx.ellipse(sh.x, sh.y - 0.02, 0.115 * B, 0.095 * B, dir * 0.3, 0, TAU);
                shape(look.armorLight || U.shade(look.armor, 0.2));
            });
        }

        /* ---- 袍摆 / 战裙 ---- */
        Fig._skirt(ctx, look, s, B, time, o, shape);

        /* ---- 飘带 ---- */
        if (look.ribbon) {
            const r1 = Math.sin(time * 4.2) * 0.09, r2 = Math.sin(time * 4.2 + 1.1) * 0.11;
            [[-1, r1], [1, r2]].forEach(([dir, sw]) => {
                ctx.beginPath();
                ctx.moveTo(s.pelvis.x - 0.10 * B * dir, s.pelvis.y - 0.04);
                ctx.quadraticCurveTo(-0.30 * B + sw, s.pelvis.y + 0.22, -0.36 * B + sw * 1.6, s.pelvis.y + 0.46);
                ctx.quadraticCurveTo(-0.24 * B + sw, s.pelvis.y + 0.26, -0.06 * B, s.pelvis.y + 0.08);
                ctx.closePath();
                ctx.fillStyle = look.ribbon; ctx.fill();
            });
        }

        /* ---- 头 ---- */
        Fig._head(ctx, look, s, B, time, o, shape, skin, skinD);

        /* ---- 前臂 ---- */
        limb(s.shF, s.elF, 0.122 * B, 0.104 * B, robe);
        limb(s.elF, s.hdF, 0.104 * B, 0.088 * B, skin);

        /* ---- 武器（跟随前手） ---- */
        if (look.weapon) {
            ctx.save();
            ctx.translate(s.hdF.x, s.hdF.y);
            ctx.rotate(s.aArmF - Math.PI / 2 + (o.weaponAngle || 0));
            Fig.drawWeapon(ctx, look, o);
            ctx.restore();
        }
        /* ---- 副手武器 ---- */
        if (look.offhand) {
            ctx.save();
            ctx.translate(s.hdB.x, s.hdB.y);
            ctx.rotate(s.aArmB - Math.PI / 2 + (o.offhandAngle || 0));
            Fig.drawWeapon(ctx, Object.assign({}, look, { weapon: look.offhand }), o);
            ctx.restore();
        }

        /* ---- 受击白闪 ---- */
        if (flash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = U.rgba('#FFFFFF', U.clamp(flash, 0, 1) * 0.85);
            ctx.fillRect(-1.6, -1.5, 3.2, 2.6);
            ctx.restore();
        }
    },

    _foot(ctx, ft, ang, color, B, OUT, OLW) {
        ctx.save();
        ctx.translate(ft.x, ft.y);
        ctx.rotate(ang - Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-0.09 * B, 0.0);
        ctx.lineTo(0.20 * B, 0.0);
        ctx.quadraticCurveTo(0.24 * B, 0.075, 0.10 * B, 0.075);
        ctx.lineTo(-0.08 * B, 0.070);
        ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = OLW; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.restore();
    },

    _skirt(ctx, look, s, B, time, o, shape) {
        const style = look.robeStyle || 'short';
        const wy = s.pelvis.y - 0.10;
        const len = style === 'long' ? 0.72 : (style === 'mid' ? 0.50 : 0.26);
        const wTop = 0.20 * B;
        const wBot = (style === 'long' ? 0.34 : style === 'mid' ? 0.30 : 0.26) * B;
        const hy = s.pelvis.y - 0.10 + len;
        const sway = Math.sin(time * 3.1 + (o.phase || 0)) * (style === 'long' ? 0.035 : 0.02);

        ctx.beginPath();
        ctx.moveTo(-wTop, wy);
        ctx.lineTo(wTop, wy);
        ctx.lineTo(wBot + sway, hy - 0.04);
        // 波浪下摆
        const segs = 6;
        for (let i = 0; i <= segs; i++) {
            const k = i / segs;
            const x = (wBot + sway) - k * (2 * (wBot + sway));
            const y = hy + Math.sin(k * Math.PI * 2 + time * 4) * 0.022;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        shape(look.skirt || look.robe);

        // 下摆镶边
        ctx.beginPath();
        ctx.moveTo(wBot + sway, hy - 0.04);
        for (let i = 0; i <= segs; i++) {
            const k = i / segs;
            const x = (wBot + sway) - k * (2 * (wBot + sway));
            ctx.lineTo(x, hy + Math.sin(k * Math.PI * 2 + time * 4) * 0.022);
        }
        ctx.lineTo(wBot + sway, hy + 0.03);
        for (let i = segs; i >= 0; i--) {
            const k = i / segs;
            const x = (wBot + sway) - k * (2 * (wBot + sway));
            ctx.lineTo(x, hy - 0.04 + Math.sin(k * Math.PI * 2 + time * 4) * 0.022);
        }
        ctx.closePath();
        ctx.fillStyle = look.trim || '#FFD700'; ctx.fill();
    },

    /* 脸型预设：rx/ry 控制头颅椭圆，jawR 控制下颌宽度（越大越方阔），jawY 控制下颌长度 */
    FACE_SHAPES: {
        round:  { rx: 0.98, ry: 0.94, jawR: 0.54, jawY: 0.86 }, // 面如冠玉（刘备）
        long:   { rx: 0.86, ry: 1.04, jawR: 0.42, jawY: 0.94 }, // 长脸威严（关羽）
        square: { rx: 0.97, ry: 0.98, jawR: 0.74, jawY: 0.93 }, // 豹头环眼（张飞）
        oval:   { rx: 0.89, ry: 1.00, jawR: 0.36, jawY: 0.92 }  // 清秀俊朗（赵云/诸葛亮）
    },

    /* 脸型轮廓：上颅为圆，下颌宽度由 jawR 决定，从而区分方圆瘦削。
     * jawR 可由外观配置的 face.jaw 覆盖（张飞的「豹头」等），不传则用脸型默认值。 */
    _facePath(ctx, hx, hy, R, P, jawOverride) {
        const jr = (jawOverride != null) ? jawOverride : P.jawR;
        ctx.beginPath();
        ctx.moveTo(hx + P.rx * R, hy - 0.01 * R);
        // 上颅
        ctx.bezierCurveTo(
            hx + P.rx * R, hy - P.ry * R * 1.34,
            hx - P.rx * R, hy - P.ry * R * 1.34,
            hx - P.rx * R, hy - 0.01 * R);
        // 下颌（jr 越大越方阔）
        ctx.bezierCurveTo(
            hx - P.rx * R * (0.58 + jr * 0.52), hy + P.jawY * R * 0.70,
            hx - jr * R, hy + P.jawY * R * 0.94,
            hx - jr * R * 0.44, hy + P.jawY * R);
        // 下巴
        ctx.quadraticCurveTo(hx, hy + P.jawY * R * 1.12, hx + jr * R * 0.44, hy + P.jawY * R);
        ctx.bezierCurveTo(
            hx + jr * R, hy + P.jawY * R * 0.94,
            hx + P.rx * R * (0.58 + jr * 0.52), hy + P.jawY * R * 0.70,
            hx + P.rx * R, hy - 0.01 * R);
        ctx.closePath();
    },

    /* 耳朵：刘备「两耳垂肩」是演义最鲜明的体貌特征 */
    _ears(ctx, look, hx, hy, R, shape, skin, skinD) {
        const kind = (look.face && look.face.ears) || 'normal';
        // 耳廓中心放在头轮廓外侧（≈0.88R），否则会被脸型路径整体覆盖
        const ex = hx - R * 0.88, ey = hy + R * 0.02;
        if (kind === 'long') {
            // 大而长的耳廓
            ctx.beginPath();
            ctx.ellipse(ex, ey, R * 0.30, R * 0.44, 0.28, 0, TAU);
            shape(skinD);
            // 垂至肩头的耳垂
            ctx.beginPath();
            ctx.ellipse(ex - R * 0.05, ey + R * 0.40, R * 0.175, R * 0.235, 0.32, 0, TAU);
            shape(skin);
            // 内廓阴影
            ctx.beginPath();
            ctx.ellipse(ex + R * 0.045, ey - R * 0.02, R * 0.115, R * 0.235, 0.28, 0, TAU);
            ctx.fillStyle = U.rgba('#000000', 0.13); ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(ex, ey, R * 0.235, R * 0.315, 0.28, 0, TAU);
            shape(skinD);
            ctx.beginPath();
            ctx.ellipse(ex + R * 0.035, ey, R * 0.095, R * 0.17, 0.28, 0, TAU);
            ctx.fillStyle = U.rgba('#000000', 0.13); ctx.fill();
        }
    },

    _head(ctx, look, s, B, time, o, shape, skin, skinD) {
        const R = SK.headR * B;
        const F = look.face || {};
        const P = Fig.FACE_SHAPES[F.shape] || Fig.FACE_SHAPES.oval;
        const hx = s.head.x, hy = s.head.y;

        // 脖子
        U.capsule(ctx, s.neck.x, s.neck.y + 0.03, hx, hy + 0.08, 0.10 * B, 0.10 * B);
        shape(skinD);

        // 耳朵（在头颅之下，先画）
        Fig._ears(ctx, look, hx, hy, R, shape, skin, skinD);

        // 脸（face.jaw 覆盖脸型默认的下颌宽度，用于「豹头」「方面」等特型）
        Fig._facePath(ctx, hx, hy, R, P, F.jaw);
        shape(skin);

        // 面色渲染：关羽「面如重枣」，颊部透出赤铜色
        if (look.blush) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(hx - R * 0.18, hy + R * 0.30, R * 0.52, R * 0.34, -0.2, 0, TAU);
            ctx.fillStyle = U.rgba(look.blush, 0.34); ctx.fill();
            ctx.beginPath();
            ctx.ellipse(hx + R * 0.46, hy + R * 0.28, R * 0.34, R * 0.26, 0.2, 0, TAU);
            ctx.fillStyle = U.rgba(look.blush, 0.28); ctx.fill();
            ctx.restore();
        }

        // 面部朝向：+x 为正前方（眉眼略上移，为帽檐留出额头空间）
        const eyeY = hy - 0.030;
        const browC = look.browColor || '#2B1B12';
        const browK = F.brow || 'bushy';
        const eyeK = F.eye || 'normal';
        // 近眼（靠后，因面向 +x 故 x 较小）/ 远眼（靠前）
        const eyes = [[hx + 0.030, 1], [hx + 0.094, 0.86]];
        const blink = (Math.sin(time * 1.3 + (o.phase || 0)) > 0.985) ? 0.16 : 1;
        const OUT = Fig.OUTLINE;

        // 侧脸阴影 / 额顶受光。
        // 注意：这里刻意不使用 clip()——canvas 裁剪极其昂贵，而头部每帧、
        // 每个角色都要绘制，用内收的椭圆叠加即可获得同样的立体感。
        ctx.beginPath();
        ctx.ellipse(hx - R * 0.38, hy + 0.01, R * 0.30, R * 0.66, 0, 0, TAU);
        ctx.fillStyle = U.rgba('#000000', 0.08); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(hx + R * 0.16, hy - R * 0.46, R * 0.34, R * 0.18, -0.3, 0, TAU);
        ctx.fillStyle = U.rgba('#FFFFFF', 0.09); ctx.fill();

        // 头饰必须在眉眼之前绘制：帽壳只盖额头，眉眼露在帽檐之下
        Fig._headgear(ctx, look, s, B, time, shape);

        /* ---- 眉 ---- */
        ctx.fillStyle = browC;
        eyes.forEach(([ex, sc]) => {
            ctx.save();
            ctx.translate(ex, eyeY);
            ctx.scale(sc, sc);
            ctx.beginPath();
            switch (browK) {
                case 'silkworm': // 卧蚕眉：浓黑粗壮、中段隆起、尾上扬
                    ctx.moveTo(-0.050, -0.040);
                    ctx.quadraticCurveTo(-0.014, -0.084, 0.026, -0.076);
                    ctx.quadraticCurveTo(0.052, -0.070, 0.062, -0.086);
                    ctx.quadraticCurveTo(0.030, -0.062, -0.006, -0.056);
                    ctx.quadraticCurveTo(-0.030, -0.052, -0.050, -0.040);
                    break;
                case 'bushy': // 浓眉：粗壮倒竖，凶悍
                    ctx.moveTo(-0.048, -0.036);
                    ctx.quadraticCurveTo(-0.010, -0.070, 0.034, -0.082);
                    ctx.lineTo(0.058, -0.064);
                    ctx.quadraticCurveTo(0.010, -0.050, -0.044, -0.026);
                    break;
                case 'sharp': // 剑眉：细长上挑，英气
                    ctx.moveTo(-0.046, -0.042);
                    ctx.quadraticCurveTo(-0.006, -0.064, 0.044, -0.082);
                    ctx.lineTo(0.056, -0.070);
                    ctx.quadraticCurveTo(0.006, -0.050, -0.044, -0.032);
                    break;
                case 'refined': // 清秀：细弯舒展
                    ctx.moveTo(-0.044, -0.044);
                    ctx.quadraticCurveTo(-0.006, -0.062, 0.038, -0.058);
                    ctx.quadraticCurveTo(0.006, -0.050, -0.042, -0.034);
                    break;
                default: // gentle：平缓温和
                    ctx.moveTo(-0.046, -0.046);
                    ctx.quadraticCurveTo(-0.006, -0.062, 0.044, -0.048);
                    ctx.quadraticCurveTo(0.006, -0.048, -0.044, -0.032);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });

        /* ---- 眼 ---- */
        eyes.forEach(([ex, sc]) => {
            ctx.save();
            ctx.translate(ex, eyeY);
            ctx.scale(sc, sc);
            if (blink < 0.5) {
                // 闭眼：一道弧线
                ctx.strokeStyle = '#1A1015'; ctx.lineWidth = 0.016;
                ctx.beginPath();
                ctx.moveTo(-0.026, 0.006); ctx.quadraticCurveTo(0, 0.016, 0.026, 0.002);
                ctx.stroke();
                ctx.restore(); return;
            }
            if (eyeK === 'round') {
                // 环眼：怒目圆睁（张飞豹头环眼）
                ctx.beginPath();
                ctx.ellipse(0.004, 0, 0.042, 0.046, 0, 0, TAU);
                ctx.fillStyle = '#F6F1E6'; ctx.fill();
                ctx.lineWidth = 0.020; ctx.strokeStyle = OUT; ctx.stroke();
                ctx.beginPath(); ctx.arc(0.010, 0.002, 0.021, 0, TAU);
                ctx.fillStyle = '#1A1015'; ctx.fill();
                ctx.beginPath(); ctx.arc(0.016, -0.009, 0.008, 0, TAU);
                ctx.fillStyle = '#FFFFFF'; ctx.fill();
            } else if (eyeK === 'phoenix') {
                // 丹凤眼：细长、外眼角上挑，威而不怒（关羽）
                ctx.beginPath();
                ctx.moveTo(-0.036, 0.012);
                ctx.quadraticCurveTo(-0.006, -0.038, 0.030, -0.030);
                ctx.quadraticCurveTo(0.042, -0.026, 0.046, -0.034);
                ctx.quadraticCurveTo(0.014, 0.008, -0.036, 0.017);
                ctx.closePath();
                ctx.fillStyle = '#F2EDE2'; ctx.fill();
                ctx.lineWidth = 0.014; ctx.strokeStyle = OUT; ctx.stroke();
                ctx.beginPath(); ctx.arc(0.002, -0.004, 0.016, 0, TAU);
                ctx.fillStyle = '#1A1015'; ctx.fill();
                ctx.beginPath(); ctx.arc(0.007, -0.010, 0.006, 0, TAU);
                ctx.fillStyle = '#FFFFFF'; ctx.fill();
            } else if (eyeK === 'sharp') {
                // 锐利有神（赵云）
                ctx.beginPath();
                ctx.moveTo(-0.030, 0.010);
                ctx.quadraticCurveTo(-0.002, -0.026, 0.030, -0.012);
                ctx.quadraticCurveTo(0.002, 0.020, -0.030, 0.014);
                ctx.closePath();
                ctx.fillStyle = '#F6F1E6'; ctx.fill();
                ctx.lineWidth = 0.015; ctx.strokeStyle = OUT; ctx.stroke();
                ctx.beginPath(); ctx.arc(0.004, -0.002, 0.017, 0, TAU);
                ctx.fillStyle = '#1A1015'; ctx.fill();
                ctx.beginPath(); ctx.arc(0.009, -0.008, 0.006, 0, TAU);
                ctx.fillStyle = '#FFFFFF'; ctx.fill();
            } else {
                // calm / normal：平和自然
                ctx.beginPath();
                ctx.ellipse(0.002, 0, 0.028, 0.034, 0, 0, TAU);
                ctx.fillStyle = '#1A1015'; ctx.fill();
                ctx.beginPath(); ctx.arc(0.008, -0.012, 0.009, 0, TAU);
                ctx.fillStyle = '#FFFFFF'; ctx.fill();
            }
            ctx.restore();
        });

        // 鼻 / 嘴
        ctx.strokeStyle = skinD; ctx.lineWidth = 0.014;
        ctx.beginPath(); ctx.moveTo(hx + 0.062, hy + 0.040); ctx.lineTo(hx + 0.050, hy + 0.068); ctx.stroke();
        if (o.mouth !== 'none') {
            ctx.strokeStyle = '#7A3B32'; ctx.lineWidth = 0.016;
            ctx.beginPath();
            if (o.mouth === 'open') { ctx.moveTo(hx + 0.018, hy + 0.098); ctx.lineTo(hx + 0.082, hy + 0.098); }
            else { ctx.moveTo(hx + 0.024, hy + 0.092); ctx.quadraticCurveTo(hx + 0.058, hy + 0.106, hx + 0.088, hy + 0.090); }
            ctx.stroke();
        }

        Fig._facialHair(ctx, look, s, B, shape);
    },

    _headgear(ctx, look, s, B, time, shape) {
        const R = SK.headR * B;
        const hx = s.head.x, hy = s.head.y;
        const hair = look.hair || '#231A16';
        const band = look.band || look.trim || '#C9A227';

        switch (look.head) {
            case 'crown': { // 刘备：束发金冠
                ctx.beginPath();
                ctx.arc(hx, hy - 0.140, R * 1.02, Math.PI * 1.02, Math.PI * 2.02);
                ctx.lineTo(hx + R * 1.02, hy - 0.120);
                ctx.lineTo(hx - R * 1.02, hy - 0.120);
                ctx.closePath();
                shape(hair);
                ctx.beginPath();
                ctx.moveTo(hx - R * 0.98, hy - 0.148);
                ctx.quadraticCurveTo(hx, hy - 0.180, hx + R * 0.98, hy - 0.148);
                ctx.lineTo(hx + R * 0.86, hy - 0.124);
                ctx.quadraticCurveTo(hx, hy - 0.152, hx - R * 0.86, hy - 0.124);
                ctx.closePath();
                shape(band);
                // 冠顶
                ctx.beginPath();
                ctx.moveTo(hx - 0.055, hy - 0.195);
                ctx.lineTo(hx + 0.055, hy - 0.195);
                ctx.lineTo(hx + 0.038, hy - 0.130);
                ctx.lineTo(hx - 0.038, hy - 0.130);
                ctx.closePath();
                shape(band);
                break;
            }
            case 'topknot': { // 关羽：束发 + 发髻
                ctx.beginPath();
                ctx.arc(hx, hy - 0.140, R * 1.0, Math.PI * 1.0, Math.PI * 2.0);
                ctx.lineTo(hx + R, hy - 0.120);
                ctx.lineTo(hx - R, hy - 0.120);
                ctx.closePath();
                shape(hair);
                ctx.beginPath();
                ctx.ellipse(hx - 0.045, hy - 0.20, 0.062, 0.048, -0.3, 0, TAU);
                shape(hair);
                ctx.beginPath();
                ctx.moveTo(hx - R * 0.95, hy - 0.148);
                ctx.quadraticCurveTo(hx, hy - 0.182, hx + R * 0.95, hy - 0.148);
                ctx.lineTo(hx + R * 0.84, hy - 0.124);
                ctx.quadraticCurveTo(hx, hy - 0.154, hx - R * 0.84, hy - 0.124);
                ctx.closePath();
                shape(look.bandColor || '#1B5E20');
                break;
            }
            case 'wild': { // 张飞：怒发 + 头巾
                ctx.beginPath();
                ctx.arc(hx, hy - 0.128, R * 1.0, Math.PI * 0.98, Math.PI * 2.02);
                ctx.closePath();
                shape(hair);
                for (let i = 0; i < 5; i++) {
                    const a = Math.PI * (1.15 + i * 0.18);
                    ctx.beginPath();
                    ctx.moveTo(hx + Math.cos(a) * R * 0.9, hy - 0.128 + Math.sin(a) * R * 0.9);
                    ctx.lineTo(hx + Math.cos(a - 0.06) * R * 1.42, hy - 0.128 + Math.sin(a - 0.06) * R * 1.42);
                    ctx.lineTo(hx + Math.cos(a + 0.10) * R * 0.9, hy - 0.128 + Math.sin(a + 0.10) * R * 0.9);
                    ctx.closePath();
                    shape(hair);
                }
                ctx.beginPath();
                ctx.moveTo(hx - R * 0.98, hy - 0.142);
                ctx.quadraticCurveTo(hx, hy - 0.172, hx + R * 0.98, hy - 0.142);
                ctx.lineTo(hx + R * 0.86, hy - 0.118);
                ctx.quadraticCurveTo(hx, hy - 0.146, hx - R * 0.86, hy - 0.118);
                ctx.closePath();
                shape(look.bandColor || '#37474F');
                break;
            }
            case 'cap': { // 诸葛亮：纶巾高冠
                ctx.beginPath();
                ctx.arc(hx, hy - 0.140, R * 0.98, Math.PI * 1.0, Math.PI * 2.0);
                ctx.lineTo(hx + R * 0.98, hy - 0.122);
                ctx.lineTo(hx - R * 0.98, hy - 0.122);
                ctx.closePath();
                shape(hair);
                ctx.beginPath();
                ctx.moveTo(hx - 0.105, hy - 0.125);
                ctx.lineTo(hx + 0.105, hy - 0.125);
                ctx.lineTo(hx + 0.088, hy - 0.21);
                ctx.quadraticCurveTo(hx, hy - 0.262, hx - 0.088, hy - 0.21);
                ctx.closePath();
                shape(look.bandColor || '#ECEFF1');
                // 冠带飘尾
                const sw = Math.sin(time * 2.6) * 0.03;
                ctx.beginPath();
                ctx.moveTo(hx - 0.085, hy - 0.10);
                ctx.quadraticCurveTo(hx - 0.20 + sw, hy - 0.06, hx - 0.24 + sw * 1.5, hy + 0.06);
                ctx.quadraticCurveTo(hx - 0.14, hy - 0.01, hx - 0.075, hy - 0.045);
                ctx.closePath();
                ctx.fillStyle = look.ribbon || '#B0BEC5'; ctx.fill();
                break;
            }
            case 'helm': { // 铁盔
                ctx.beginPath();
                ctx.arc(hx, hy - 0.132, R * 1.06, Math.PI * 1.0, Math.PI * 2.02);
                ctx.lineTo(hx + R * 1.06, hy - 0.114);
                ctx.lineTo(hx - R * 1.06, hy - 0.114);
                ctx.closePath();
                shape(look.armor || '#546E7A');
                // 盔脊
                ctx.beginPath();
                ctx.moveTo(hx - 0.014, hy - 0.205);
                ctx.quadraticCurveTo(hx + 0.03, hy - 0.14, hx + 0.10, hy - 0.112);
                ctx.lineTo(hx + 0.03, hy - 0.112);
                ctx.quadraticCurveTo(hx - 0.02, hy - 0.14, hx - 0.048, hy - 0.19);
                ctx.closePath();
                shape(look.trim || '#FFD700');
                // 红缨
                if (look.plume) {
                    const pw = Math.sin(time * 3.6) * 0.03;
                    ctx.beginPath();
                    ctx.moveTo(hx - 0.01, hy - 0.20);
                    ctx.quadraticCurveTo(hx - 0.12 + pw, hy - 0.30, hx - 0.20 + pw * 1.6, hy - 0.24);
                    ctx.quadraticCurveTo(hx - 0.10, hy - 0.23, hx - 0.005, hy - 0.185);
                    ctx.closePath();
                    ctx.fillStyle = look.plume; ctx.fill();
                }
                break;
            }
            case 'band': { // 黄巾
                ctx.beginPath();
                ctx.arc(hx, hy - 0.138, R * 1.0, Math.PI * 1.0, Math.PI * 2.02);
                ctx.lineTo(hx + R, hy - 0.118);
                ctx.lineTo(hx - R, hy - 0.118);
                ctx.closePath();
                shape(hair);
                ctx.beginPath();
                ctx.moveTo(hx - R * 1.02, hy - 0.146);
                ctx.quadraticCurveTo(hx, hy - 0.176, hx + R * 1.02, hy - 0.146);
                ctx.lineTo(hx + R * 1.02, hy - 0.122);
                ctx.quadraticCurveTo(hx, hy - 0.150, hx - R * 1.02, hy - 0.122);
                ctx.closePath();
                shape(band);
                // 巾尾
                const sw2 = Math.sin(time * 4.0) * 0.04;
                ctx.beginPath();
                ctx.moveTo(hx - R * 0.9, hy - 0.13);
                ctx.quadraticCurveTo(hx - 0.30 + sw2, hy - 0.06, hx - 0.34 + sw2 * 1.6, hy + 0.06);
                ctx.quadraticCurveTo(hx - 0.20, hy - 0.04, hx - R * 0.8, hy - 0.10);
                ctx.closePath();
                ctx.fillStyle = band; ctx.fill();
                break;
            }
            case 'mask': { // 天魔面具
                ctx.beginPath();
                ctx.arc(hx, hy - 0.095, R * 1.02, Math.PI * 0.98, Math.PI * 2.02);
                ctx.lineTo(hx + R * 1.02, hy - 0.072);
                ctx.lineTo(hx - R * 1.02, hy - 0.072);
                ctx.closePath();
                shape(look.maskColor || '#E0E0E0');
                ctx.fillStyle = look.maskMark || '#C62828';
                ctx.beginPath();
                ctx.moveTo(hx - 0.02, hy - 0.13); ctx.lineTo(hx + 0.02, hy - 0.13);
                ctx.lineTo(hx + 0.02, hy - 0.078); ctx.lineTo(hx - 0.02, hy - 0.078);
                ctx.closePath(); ctx.fill();
                break;
            }
            default: { // 普通发髻
                ctx.beginPath();
                ctx.arc(hx, hy - 0.140, R * 1.0, Math.PI * 1.0, Math.PI * 2.02);
                ctx.lineTo(hx + R, hy - 0.120);
                ctx.lineTo(hx - R, hy - 0.120);
                ctx.closePath();
                shape(hair);
            }
        }
    },

    _facialHair(ctx, look, s, B, shape) {
        const hx = s.head.x, hy = s.head.y;
        const m = look.beard;
        if (!m) return;
        if (m === 'long') { // 关羽长髯
            ctx.beginPath();
            ctx.moveTo(hx - 0.055, hy + 0.055);
            ctx.quadraticCurveTo(hx + 0.02, hy + 0.13, hx + 0.105, hy + 0.055);
            ctx.quadraticCurveTo(hx + 0.14, hy + 0.30, hx + 0.06, hy + 0.40);
            ctx.quadraticCurveTo(hx + 0.02, hy + 0.20, hx - 0.02, hy + 0.40);
            ctx.quadraticCurveTo(hx - 0.09, hy + 0.28, hx - 0.055, hy + 0.055);
            ctx.closePath();
            ctx.fillStyle = look.beardColor || '#231A16'; ctx.fill();
        } else if (m === 'stubble') { // 张飞络腮
            ctx.beginPath();
            ctx.ellipse(hx + 0.02, hy + 0.105, 0.105, 0.072, 0, 0, TAU);
            ctx.fillStyle = U.rgba(look.beardColor || '#231A16', 0.85); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(hx + 0.02, hy + 0.055);
            ctx.quadraticCurveTo(hx + 0.075, hy + 0.09, hx + 0.11, hy + 0.045);
            ctx.quadraticCurveTo(hx + 0.075, hy + 0.075, hx + 0.02, hy + 0.055);
            ctx.closePath();
            ctx.fillStyle = look.beardColor || '#231A16'; ctx.fill();
        } else if (m === 'goatee') {
            ctx.beginPath();
            ctx.moveTo(hx + 0.030, hy + 0.10);
            ctx.quadraticCurveTo(hx + 0.065, hy + 0.15, hx + 0.100, hy + 0.10);
            ctx.quadraticCurveTo(hx + 0.075, hy + 0.26, hx + 0.055, hy + 0.30);
            ctx.quadraticCurveTo(hx + 0.040, hy + 0.20, hx + 0.030, hy + 0.10);
            ctx.closePath();
            ctx.fillStyle = look.beardColor || '#231A16'; ctx.fill();
        }
    },

    /* ========================================================
     * 武器绘制（局部空间：原点=手，+x = 武器指向）
     * ======================================================== */
    drawWeapon(ctx, look, o) {
        const w = look.weapon;
        const OUT = Fig.OUTLINE, OLW = 0.02;
        const steel = look.steel || '#D6DBE0';
        const steelD = U.shade(steel, -0.3);
        const steelL = look.steelLight || U.shade(steel, 0.35);
        const wood = look.wood || '#6D4C33';
        const gripC = look.grip || '#8D6E63';
        const shape = (fill, lw) => {
            ctx.fillStyle = fill; ctx.fill();
            ctx.lineWidth = lw || OLW; ctx.strokeStyle = OUT; ctx.stroke();
        };

        /* blade：剑身。spine=true 时绘制双棱中脊（双股剑的辨识特征） */
        const blade = (len, w0, w1, color, hi, spine) => {
            ctx.beginPath();
            ctx.moveTo(0, -w0 / 2);
            ctx.lineTo(len * 0.72, -w1 / 2);
            ctx.lineTo(len, 0);
            ctx.lineTo(len * 0.72, w1 / 2);
            ctx.lineTo(0, w0 / 2);
            ctx.closePath();
            shape(color);
            // 上手高光面
            ctx.beginPath();
            ctx.moveTo(0.02, -w0 / 2 + 0.012);
            ctx.lineTo(len * 0.70, -w1 / 2 + 0.008);
            ctx.lineTo(len * 0.55, 0);
            ctx.lineTo(0.02, 0);
            ctx.closePath();
            ctx.fillStyle = hi || steelL; ctx.fill();
            // 剑脊：双棱隆起 + 中缝暗线，令刃面有立体感
            if (spine) {
                ctx.beginPath();
                ctx.moveTo(0.05, -0.010);
                ctx.lineTo(len * 0.88, -0.005);
                ctx.lineTo(len * 0.88, 0.005);
                ctx.lineTo(0.05, 0.010);
                ctx.closePath();
                ctx.fillStyle = U.shade(color, 0.40); ctx.fill();
            }
            ctx.beginPath();
            ctx.moveTo(0.06, 0); ctx.lineTo(len * 0.84, 0);
            ctx.lineWidth = 0.008; ctx.strokeStyle = U.rgba('#000000', 0.20);
            ctx.stroke();
        };
        const guard = (y, w) => {
            ctx.beginPath();
            U.roundRect(ctx, -0.02, -w / 2, 0.05, w, 0.02);
            shape(look.trim || '#C9A227');
        };

        switch (w) {
            case 'jian': { // 雌雄双股剑：双棱剑脊，剑首系穗
                ctx.beginPath(); ctx.moveTo(-0.02, -0.022); ctx.lineTo(0.16, -0.022); ctx.lineTo(0.16, 0.022); ctx.lineTo(-0.02, 0.022); ctx.closePath();
                shape(gripC);
                // 柄缠丝
                ctx.strokeStyle = U.rgba('#000000', 0.22); ctx.lineWidth = 0.008;
                for (let i = 0; i < 4; i++) {
                    const gx = 0.01 + i * 0.038;
                    ctx.beginPath(); ctx.moveTo(gx, -0.022); ctx.lineTo(gx + 0.014, 0.022); ctx.stroke();
                }
                guard(0, 0.13);
                // 剑身修长（基宽 0.042），过宽会像铲子
                blade(0.98, 0.042, 0.020, steel, steelL, true);
                // 剑首环
                ctx.beginPath(); ctx.arc(-0.045, 0, 0.038, 0, TAU);
                ctx.lineWidth = 0.016; ctx.strokeStyle = look.trim || '#C9A227'; ctx.stroke();
                // 剑穗
                const jw = Math.sin((o.time || 0) * 4.4) * 0.016;
                ctx.beginPath();
                ctx.moveTo(-0.06, 0.01);
                ctx.quadraticCurveTo(-0.11 + jw, 0.04, -0.15 + jw * 2, 0.085);
                ctx.lineWidth = 0.013; ctx.strokeStyle = look.ribbon || '#C62828'; ctx.stroke();
                break;
            }
            case 'jianShort': {
                ctx.beginPath(); ctx.moveTo(-0.02, -0.020); ctx.lineTo(0.13, -0.020); ctx.lineTo(0.13, 0.020); ctx.lineTo(-0.02, 0.020); ctx.closePath();
                shape(gripC);
                ctx.strokeStyle = U.rgba('#000000', 0.22); ctx.lineWidth = 0.008;
                for (let i = 0; i < 3; i++) {
                    const gx = 0.01 + i * 0.038;
                    ctx.beginPath(); ctx.moveTo(gx, -0.020); ctx.lineTo(gx + 0.014, 0.020); ctx.stroke();
                }
                guard(0, 0.11);
                blade(0.68, 0.040, 0.018, steel, steelL, true);
                ctx.beginPath(); ctx.arc(-0.038, 0, 0.032, 0, TAU);
                ctx.lineWidth = 0.014; ctx.strokeStyle = look.trim || '#C9A227'; ctx.stroke();
                const jw2 = Math.sin((o.time || 0) * 4.4 + 1.2) * 0.014;
                ctx.beginPath();
                ctx.moveTo(-0.05, 0.008);
                ctx.quadraticCurveTo(-0.09 + jw2, 0.034, -0.12 + jw2 * 2, 0.072);
                ctx.lineWidth = 0.011; ctx.strokeStyle = look.ribbon || '#C62828'; ctx.stroke();
                break;
            }
            case 'guandao': { // 青龙偃月刀（冷艳锯）：新月刃 + 龙吞口 + 刀背倒刺
                const gold = look.trim || '#C9A227';
                // 长杆
                ctx.beginPath(); ctx.moveTo(-0.42, -0.026); ctx.lineTo(1.02, -0.026); ctx.lineTo(1.02, 0.026); ctx.lineTo(-0.42, 0.026); ctx.closePath();
                shape(wood);
                // 杆身缠铜箍
                [0.30, 0.58, 0.86].forEach((bx) => {
                    ctx.beginPath(); U.roundRect(ctx, bx - 0.022, -0.030, 0.044, 0.060, 0.012);
                    shape(gold, 0.014);
                });
                // 刀背倒刺（小枝，偃月刀形制标志）
                ctx.beginPath();
                ctx.moveTo(0.97, -0.052); ctx.lineTo(1.02, -0.100); ctx.lineTo(1.08, -0.070);
                ctx.closePath(); shape(steel, 0.016);
                // 刀身（新月）
                ctx.beginPath();
                ctx.moveTo(0.88, -0.045);
                ctx.quadraticCurveTo(1.10, -0.055, 1.32, -0.10);
                ctx.quadraticCurveTo(1.14, 0.06, 0.88, 0.030);
                ctx.closePath();
                shape(steel);
                // 刃面高光
                ctx.beginPath();
                ctx.moveTo(0.92, -0.038);
                ctx.quadraticCurveTo(1.12, -0.048, 1.26, -0.082);
                ctx.lineTo(1.20, -0.030);
                ctx.closePath();
                ctx.fillStyle = steelL; ctx.fill();
                // 刃口银线
                ctx.beginPath();
                ctx.moveTo(0.90, 0.024);
                ctx.quadraticCurveTo(1.14, 0.052, 1.30, -0.082);
                ctx.lineWidth = 0.012; ctx.strokeStyle = U.rgba('#FFFFFF', 0.72); ctx.stroke();
                // 龙吞口：龙头衔刃
                ctx.beginPath();
                ctx.moveTo(0.80, -0.062);
                ctx.quadraticCurveTo(0.94, -0.072, 0.98, -0.040);
                ctx.lineTo(0.98, 0.050);
                ctx.quadraticCurveTo(0.94, 0.070, 0.80, 0.058);
                ctx.closePath(); shape(gold, 0.018);
                // 龙角
                ctx.beginPath();
                ctx.moveTo(0.84, -0.060); ctx.lineTo(0.88, -0.098); ctx.lineTo(0.92, -0.058);
                ctx.closePath(); ctx.fillStyle = gold; ctx.fill();
                // 龙眼
                ctx.beginPath(); ctx.arc(0.885, -0.018, 0.013, 0, TAU);
                ctx.fillStyle = '#B71C1C'; ctx.fill();
                ctx.beginPath(); ctx.arc(0.889, -0.022, 0.005, 0, TAU);
                ctx.fillStyle = '#FFFFFF'; ctx.fill();
                // 龙须
                ctx.beginPath();
                ctx.moveTo(0.80, 0.040);
                ctx.quadraticCurveTo(0.72, 0.060, 0.66, 0.038);
                ctx.lineWidth = 0.011; ctx.strokeStyle = gold; ctx.stroke();
                // 尾鐏
                ctx.beginPath(); ctx.moveTo(-0.42, -0.036); ctx.lineTo(-0.52, -0.028); ctx.lineTo(-0.52, 0.028); ctx.lineTo(-0.42, 0.036); ctx.closePath();
                shape(steelD);
                break;
            }
            case 'spear': { // 丈八蛇矛（波浪刃）
                ctx.beginPath(); ctx.moveTo(-0.50, -0.024); ctx.lineTo(1.16, -0.024); ctx.lineTo(1.16, 0.024); ctx.lineTo(-0.50, 0.024); ctx.closePath();
                shape('#3E2723');
                // 蛇形刃
                ctx.beginPath();
                ctx.moveTo(1.10, -0.030);
                ctx.bezierCurveTo(1.24, -0.10, 1.18, 0.02, 1.34, -0.03);
                ctx.bezierCurveTo(1.44, -0.02, 1.52, 0, 1.62, 0);
                ctx.bezierCurveTo(1.44, 0.03, 1.34, 0.05, 1.24, 0.06);
                ctx.bezierCurveTo(1.14, 0.08, 1.16, 0.02, 1.10, 0.030);
                ctx.closePath();
                shape(steel);
                ctx.beginPath();
                ctx.moveTo(1.14, -0.018); ctx.bezierCurveTo(1.28, -0.07, 1.24, 0.0, 1.42, -0.010);
                ctx.lineTo(1.42, 0.006); ctx.lineTo(1.14, 0.006);
                ctx.closePath();
                ctx.fillStyle = steelL; ctx.fill();
                // 红缨
                const sw = Math.sin((o.time || 0) * 5) * 0.02;
                ctx.beginPath();
                ctx.moveTo(1.06, -0.02);
                ctx.quadraticCurveTo(1.10 + sw, 0.02, 1.00 + sw * 2, 0.075);
                ctx.quadraticCurveTo(1.12, 0.03, 1.06, 0.03);
                ctx.closePath();
                ctx.fillStyle = look.tassel || '#C62828'; ctx.fill();
                break;
            }
            case 'lance': { // 龙胆枪
                ctx.beginPath(); ctx.moveTo(-0.36, -0.022); ctx.lineTo(1.10, -0.022); ctx.lineTo(1.10, 0.022); ctx.lineTo(-0.36, 0.022); ctx.closePath();
                shape(wood);
                ctx.beginPath();
                ctx.moveTo(1.02, -0.038); ctx.lineTo(1.10, -0.038); ctx.lineTo(1.10, 0.038); ctx.lineTo(1.02, 0.038);
                ctx.closePath(); shape(look.trim || '#C9A227');
                ctx.beginPath();
                ctx.moveTo(1.10, -0.042); ctx.lineTo(1.46, 0); ctx.lineTo(1.10, 0.042); ctx.lineTo(1.16, 0);
                ctx.closePath(); shape(steel);
                ctx.beginPath();
                ctx.moveTo(1.14, -0.026); ctx.lineTo(1.40, 0); ctx.lineTo(1.14, 0.006);
                ctx.closePath(); ctx.fillStyle = steelL; ctx.fill();
                const sw2 = Math.sin((o.time || 0) * 6) * 0.022;
                ctx.beginPath();
                ctx.moveTo(1.02, -0.02);
                ctx.quadraticCurveTo(1.06 + sw2, 0.03, 0.96 + sw2 * 2, 0.085);
                ctx.quadraticCurveTo(1.08, 0.035, 1.02, 0.03);
                ctx.closePath();
                ctx.fillStyle = look.tassel || '#D32F2F'; ctx.fill();
                break;
            }
            case 'ji': { // 方天画戟：中锋直刺 + 两侧月牙小枝，汉末最典型的实战长兵
                // 漆杆
                ctx.beginPath();
                ctx.moveTo(-0.52, -0.023); ctx.lineTo(1.04, -0.023);
                ctx.lineTo(1.04, 0.023); ctx.lineTo(-0.52, 0.023);
                ctx.closePath(); shape(wood);
                // 握把缠绳
                ctx.strokeStyle = U.rgba('#2B1B12', 0.55); ctx.lineWidth = 0.008;
                for (let i = 0; i < 7; i++) {
                    const gx = -0.26 + i * 0.028;
                    ctx.beginPath(); ctx.moveTo(gx, -0.023); ctx.lineTo(gx + 0.014, 0.023); ctx.stroke();
                }
                // 杆尾铜鐏
                ctx.beginPath();
                ctx.moveTo(-0.52, -0.026); ctx.lineTo(-0.40, -0.026);
                ctx.lineTo(-0.40, 0.026); ctx.lineTo(-0.52, 0.026);
                ctx.closePath(); shape(look.trim || '#C9A227');
                // 中锋：柳叶直刃，双棱起脊
                ctx.beginPath();
                ctx.moveTo(1.02, -0.040);
                ctx.quadraticCurveTo(1.30, -0.034, 1.66, 0);
                ctx.quadraticCurveTo(1.30, 0.034, 1.02, 0.040);
                ctx.lineTo(1.06, 0);
                ctx.closePath(); shape(steel);
                ctx.beginPath();
                ctx.moveTo(1.06, -0.020);
                ctx.quadraticCurveTo(1.30, -0.016, 1.56, 0);
                ctx.lineTo(1.06, 0.004);
                ctx.closePath(); ctx.fillStyle = steelL; ctx.fill();
                // 两侧月牙小枝：画戟之「画」，左右各一，刃口朝外
                [-1, 1].forEach((d) => {
                    ctx.beginPath();
                    ctx.moveTo(1.00, d * 0.022);
                    ctx.quadraticCurveTo(1.10, d * 0.150, 1.30, d * 0.088);
                    ctx.quadraticCurveTo(1.16, d * 0.086, 1.14, d * 0.020);
                    ctx.closePath(); shape(steel);
                    ctx.beginPath();
                    ctx.moveTo(1.04, d * 0.070);
                    ctx.quadraticCurveTo(1.12, d * 0.140, 1.26, d * 0.086);
                    ctx.lineWidth = 0.010; ctx.strokeStyle = U.rgba('#FFFFFF', 0.70); ctx.stroke();
                });
                // 戟座铜箍
                ctx.beginPath();
                ctx.moveTo(0.96, -0.034); ctx.lineTo(1.06, -0.034);
                ctx.lineTo(1.06, 0.034); ctx.lineTo(0.96, 0.034);
                ctx.closePath(); shape(look.trim || '#C9A227');
                // 红缨：画戟之饰
                const jw = Math.sin((o.time || 0) * 5.4) * 0.022;
                ctx.beginPath();
                ctx.moveTo(1.00, -0.02);
                ctx.quadraticCurveTo(1.04 + jw, 0.03, 0.94 + jw * 2, 0.085);
                ctx.quadraticCurveTo(1.06, 0.035, 1.00, 0.03);
                ctx.closePath();
                ctx.fillStyle = look.tassel || '#C62828'; ctx.fill();
                break;
            }
            case 'fan': { // 白鹤羽扇：柄 + 羽轴 + 羽枝分叉
                // 扇柄（竹节柄）
                ctx.beginPath(); ctx.moveTo(-0.06, -0.019); ctx.lineTo(0.17, -0.019); ctx.lineTo(0.17, 0.019); ctx.lineTo(-0.06, 0.019); ctx.closePath();
                shape('#6D4C33');
                ctx.strokeStyle = U.rgba('#3E2723', 0.55); ctx.lineWidth = 0.007;
                [-0.03, 0.03, 0.09].forEach((bx) => {
                    ctx.beginPath(); ctx.moveTo(bx, -0.019); ctx.lineTo(bx, 0.019); ctx.stroke();
                });
                // 鹤羽：由内向外层叠，每片带羽轴与羽枝
                const quill = '#FAFAFA', quillD = '#D8DCE0';
                for (let i = -4; i <= 4; i++) {
                    const a = i * 0.208;
                    ctx.save(); ctx.rotate(a);
                    const shade = Math.abs(i) % 2 === 0 ? quill : quillD;
                    ctx.beginPath();
                    ctx.moveTo(0.17, -0.015);
                    ctx.quadraticCurveTo(0.34, -0.030, 0.48, -0.004);
                    ctx.quadraticCurveTo(0.34, 0.030, 0.17, 0.015);
                    ctx.closePath();
                    shape(shade, 0.011);
                    // 羽轴
                    ctx.beginPath();
                    ctx.moveTo(0.18, 0); ctx.lineTo(0.47, -0.004);
                    ctx.lineWidth = 0.007; ctx.strokeStyle = U.rgba('#9E9E9E', 0.75); ctx.stroke();
                    // 羽枝（细密分叉）
                    ctx.lineWidth = 0.004; ctx.strokeStyle = U.rgba('#B0BEC5', 0.55);
                    for (let k = 1; k <= 5; k++) {
                        const px = 0.20 + k * 0.052;
                        const sp = 0.020 * (1 - k * 0.09);
                        ctx.beginPath(); ctx.moveTo(px, -0.002); ctx.lineTo(px + 0.026, -sp); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(px, -0.002); ctx.lineTo(px + 0.026, sp); ctx.stroke();
                    }
                    ctx.restore();
                }
                // 扇托玉环
                ctx.beginPath(); ctx.arc(0.17, 0, 0.040, 0, TAU); shape(look.trim || '#C9A227', 0.016);
                ctx.beginPath(); ctx.arc(0.17, 0, 0.018, 0, TAU);
                ctx.fillStyle = U.rgba('#FFFFFF', 0.45); ctx.fill();
                break;
            }
            case 'staff': { // 九节杖：太平道教主法器，杖身九节铜箍，顶端悬符
                ctx.beginPath(); ctx.moveTo(-0.40, -0.024); ctx.lineTo(0.98, -0.024); ctx.lineTo(0.98, 0.024); ctx.lineTo(-0.40, 0.024); ctx.closePath();
                shape('#4E342E');
                // 九节：沿杖身均布的铜箍鼓环
                ctx.fillStyle = '#B8860B';
                for (let i = 0; i < 9; i++) {
                    const nx = -0.34 + i * 0.155;
                    ctx.beginPath();
                    ctx.ellipse(nx, 0, 0.020, 0.040, 0, 0, TAU);
                    ctx.fill();
                }
                // 顶端符咒环
                ctx.save(); ctx.translate(1.06, 0); ctx.rotate((o.time || 0) * 1.6);
                ctx.beginPath(); ctx.arc(0, 0, 0.13, 0, TAU);
                ctx.lineWidth = 0.035; ctx.strokeStyle = look.magic || '#7E57C2'; ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 0.055, 0, TAU);
                ctx.fillStyle = U.rgba(look.magic || '#7E57C2', 0.55); ctx.fill();
                ctx.restore();
                ctx.beginPath(); ctx.arc(1.06, 0, 0.052, 0, TAU);
                ctx.fillStyle = look.magic || '#7E57C2'; ctx.fill();
                // 悬垂的黄色符纸（太平道符咒，随动作轻摆）
                const tw = Math.sin((o.time || 0) * 3.1) * 0.02;
                ctx.beginPath();
                ctx.moveTo(0.94, -0.05); ctx.lineTo(0.98, -0.05);
                ctx.quadraticCurveTo(1.00 + tw, 0.05, 0.99 + tw, 0.16);
                ctx.lineTo(0.93 + tw, 0.16);
                ctx.quadraticCurveTo(0.92, 0.05, 0.94, -0.05);
                ctx.closePath();
                ctx.fillStyle = '#FDD835'; ctx.fill();
                ctx.beginPath(); ctx.moveTo(0.945 + tw * 0.6, 0.02); ctx.lineTo(0.965 + tw * 0.6, 0.02);
                ctx.lineWidth = 0.012; ctx.strokeStyle = '#C62828'; ctx.stroke();
                break;
            }
            case 'dao': { // 朴刀
                ctx.beginPath(); ctx.moveTo(-0.03, -0.024); ctx.lineTo(0.20, -0.024); ctx.lineTo(0.20, 0.024); ctx.lineTo(-0.03, 0.024); ctx.closePath();
                shape(gripC);
                guard(0, 0.10);
                ctx.beginPath();
                ctx.moveTo(0.20, -0.038);
                ctx.quadraticCurveTo(0.62, -0.075, 0.86, -0.012);
                ctx.lineTo(0.86, 0.030);
                ctx.quadraticCurveTo(0.56, 0.030, 0.20, 0.038);
                ctx.closePath();
                shape(steel);
                ctx.beginPath();
                ctx.moveTo(0.24, -0.028); ctx.quadraticCurveTo(0.58, -0.058, 0.80, -0.010);
                ctx.lineTo(0.80, 0.004); ctx.quadraticCurveTo(0.56, -0.010, 0.24, 0.006);
                ctx.closePath(); ctx.fillStyle = steelL; ctx.fill();
                break;
            }
            case 'bow': {
                // 汉式长梢反曲弓：弓臂外凸，两端硬梢向前反折
                ctx.beginPath();
                ctx.moveTo(-0.06, -0.46);
                ctx.quadraticCurveTo(0.32, -0.22, 0.32, 0);
                ctx.quadraticCurveTo(0.32, 0.22, -0.06, 0.46);
                ctx.lineWidth = 0.05; ctx.strokeStyle = wood; ctx.stroke();
                ctx.lineWidth = 0.016; ctx.strokeStyle = OUT; ctx.stroke();
                // 弓梢
                ctx.lineWidth = 0.044; ctx.strokeStyle = U.shade(wood, -0.28);
                ctx.beginPath();
                ctx.moveTo(-0.06, -0.46); ctx.lineTo(0.08, -0.56);
                ctx.moveTo(-0.06, 0.46); ctx.lineTo(0.08, 0.56);
                ctx.stroke();
                // 弓弦
                ctx.beginPath();
                ctx.moveTo(0.08, -0.56); ctx.lineTo(0.08, 0.56);
                ctx.lineWidth = 0.012; ctx.strokeStyle = '#ECEFF1'; ctx.stroke();
                // 弓弣（缠皮革的握把）
                ctx.beginPath();
                ctx.moveTo(0.27, -0.11); ctx.lineTo(0.34, -0.11);
                ctx.lineTo(0.34, 0.11); ctx.lineTo(0.27, 0.11);
                ctx.closePath();
                ctx.fillStyle = look.grip || '#6D4C33'; ctx.fill();
                ctx.lineWidth = 0.014; ctx.strokeStyle = OUT; ctx.stroke();
                ctx.strokeStyle = U.rgba('#2B1B12', 0.5); ctx.lineWidth = 0.009;
                [-0.05, 0.01, 0.07].forEach((by) => {
                    ctx.beginPath(); ctx.moveTo(0.27, by); ctx.lineTo(0.34, by); ctx.stroke();
                });
                // 搭箭：箭杆横贯弓弣，簇尖探出弓臂之外
                ctx.beginPath();
                ctx.moveTo(-0.14, 0.05); ctx.lineTo(0.62, -0.02);
                ctx.lineWidth = 0.018; ctx.strokeStyle = '#A1887F'; ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0.62, -0.038); ctx.lineTo(0.76, -0.017);
                ctx.lineTo(0.62, 0.004); ctx.closePath();
                ctx.fillStyle = steel; ctx.fill();
                ctx.lineWidth = 0.012; ctx.strokeStyle = OUT; ctx.stroke();
                // 箭羽
                ctx.beginPath();
                ctx.moveTo(-0.14, 0.05); ctx.lineTo(-0.02, -0.03); ctx.lineTo(-0.04, 0.085);
                ctx.closePath();
                ctx.fillStyle = '#ECEFF1'; ctx.fill();
                ctx.lineWidth = 0.010; ctx.strokeStyle = OUT; ctx.stroke();
                break;
            }
            case 'axe': {
                ctx.beginPath(); ctx.moveTo(-0.28, -0.026); ctx.lineTo(0.72, -0.026); ctx.lineTo(0.72, 0.026); ctx.lineTo(-0.28, 0.026); ctx.closePath();
                shape('#5D4037');
                ctx.beginPath();
                ctx.moveTo(0.60, -0.045);
                ctx.quadraticCurveTo(0.90, -0.24, 0.98, -0.02);
                ctx.quadraticCurveTo(0.90, 0.14, 0.60, 0.045);
                ctx.closePath();
                shape(steel);
                ctx.beginPath();
                ctx.moveTo(0.66, -0.05); ctx.quadraticCurveTo(0.86, -0.17, 0.91, -0.03);
                ctx.lineTo(0.66, 0.0); ctx.closePath(); ctx.fillStyle = steelL; ctx.fill();
                break;
            }
            case 'none': break;
        }
    },

    /** 地面阴影 */
    shadow(ctx, x, y, w, alpha, squash) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y, w, w * (0.30 * (squash || 1)), 0, 0, TAU);
        ctx.fillStyle = U.rgba('#000000', alpha == null ? 0.30 : alpha);
        ctx.fill();
        ctx.restore();
    }
};

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

    _head(ctx, look, s, B, time, o, shape, skin, skinD) {
        const R = SK.headR * B;
        // 脖子
        U.capsule(ctx, s.neck.x, s.neck.y + 0.03, s.head.x, s.head.y + 0.08, 0.10 * B, 0.10 * B);
        shape(skinD);

        // 头
        ctx.beginPath();
        ctx.ellipse(s.head.x, s.head.y, R * 0.92, R, 0, 0, TAU);
        shape(skin);

        // 面部朝向：+x 为正前方
        const fx = s.head.x, fy = s.head.y;
        const eyeY = fy - 0.015;
        // 眉
        ctx.fillStyle = look.brow || '#2B1B12';
        ctx.fillRect(fx - 0.015, fy - 0.075, 0.085, 0.020);
        ctx.fillRect(fx + 0.055, fy - 0.082, 0.075, 0.020);
        // 眼
        const blink = (Math.sin(time * 1.3 + (o.phase || 0)) > 0.985) ? 0.2 : 1;
        ctx.fillStyle = '#1A1015';
        ctx.beginPath(); ctx.ellipse(fx + 0.040, eyeY, 0.026, 0.034 * blink, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(fx + 0.108, eyeY - 0.003, 0.024, 0.032 * blink, 0, 0, TAU); ctx.fill();
        if (blink > 0.5) {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(fx + 0.048, eyeY - 0.012, 0.009, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(fx + 0.115, eyeY - 0.015, 0.008, 0, TAU); ctx.fill();
        }
        // 鼻 / 嘴
        ctx.strokeStyle = skinD; ctx.lineWidth = 0.014;
        ctx.beginPath(); ctx.moveTo(fx + 0.075, fy + 0.040); ctx.lineTo(fx + 0.062, fy + 0.068); ctx.stroke();
        if (o.mouth !== 'none') {
            ctx.strokeStyle = '#7A3B32'; ctx.lineWidth = 0.016;
            ctx.beginPath();
            if (o.mouth === 'open') { ctx.moveTo(fx + 0.030, fy + 0.098); ctx.lineTo(fx + 0.095, fy + 0.098); }
            else { ctx.moveTo(fx + 0.035, fy + 0.092); ctx.quadraticCurveTo(fx + 0.070, fy + 0.106, fx + 0.100, fy + 0.090); }
            ctx.stroke();
        }

        // 侧脸阴影
        ctx.beginPath();
        ctx.ellipse(s.head.x - R * 0.42, s.head.y + 0.01, R * 0.34, R * 0.80, 0, 0, TAU);
        ctx.fillStyle = U.rgba('#000000', 0.07); ctx.fill();

        Fig._headgear(ctx, look, s, B, time, shape);
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
                ctx.arc(hx, hy - 0.03, R * 1.02, Math.PI * 1.02, Math.PI * 2.02);
                ctx.lineTo(hx + R * 1.02, hy + 0.01);
                ctx.lineTo(hx - R * 1.02, hy + 0.01);
                ctx.closePath();
                shape(hair);
                ctx.beginPath();
                ctx.moveTo(hx - R * 0.98, hy - 0.055);
                ctx.quadraticCurveTo(hx, hy - 0.105, hx + R * 0.98, hy - 0.055);
                ctx.lineTo(hx + R * 0.86, hy - 0.018);
                ctx.quadraticCurveTo(hx, hy - 0.058, hx - R * 0.86, hy - 0.018);
                ctx.closePath();
                shape(band);
                // 冠顶
                ctx.beginPath();
                ctx.moveTo(hx - 0.055, hy - 0.175);
                ctx.lineTo(hx + 0.055, hy - 0.175);
                ctx.lineTo(hx + 0.038, hy - 0.105);
                ctx.lineTo(hx - 0.038, hy - 0.105);
                ctx.closePath();
                shape(band);
                break;
            }
            case 'topknot': { // 关羽：束发 + 发髻
                ctx.beginPath();
                ctx.arc(hx, hy - 0.02, R * 1.0, Math.PI * 1.0, Math.PI * 2.0);
                ctx.lineTo(hx + R, hy + 0.02);
                ctx.lineTo(hx - R, hy + 0.02);
                ctx.closePath();
                shape(hair);
                ctx.beginPath();
                ctx.ellipse(hx - 0.045, hy - 0.20, 0.062, 0.048, -0.3, 0, TAU);
                shape(hair);
                ctx.beginPath();
                ctx.moveTo(hx - R * 0.95, hy - 0.03);
                ctx.quadraticCurveTo(hx, hy - 0.085, hx + R * 0.95, hy - 0.03);
                ctx.lineTo(hx + R * 0.84, hy + 0.005);
                ctx.quadraticCurveTo(hx, hy - 0.038, hx - R * 0.84, hy + 0.005);
                ctx.closePath();
                shape(look.bandColor || '#1B5E20');
                break;
            }
            case 'wild': { // 张飞：怒发 + 头巾
                ctx.beginPath();
                ctx.arc(hx, hy - 0.02, R * 1.0, Math.PI * 0.98, Math.PI * 2.02);
                ctx.closePath();
                shape(hair);
                for (let i = 0; i < 5; i++) {
                    const a = Math.PI * (1.15 + i * 0.18);
                    ctx.beginPath();
                    ctx.moveTo(hx + Math.cos(a) * R * 0.9, hy + Math.sin(a) * R * 0.9);
                    ctx.lineTo(hx + Math.cos(a - 0.06) * R * 1.42, hy + Math.sin(a - 0.06) * R * 1.42);
                    ctx.lineTo(hx + Math.cos(a + 0.10) * R * 0.9, hy + Math.sin(a + 0.10) * R * 0.9);
                    ctx.closePath();
                    shape(hair);
                }
                ctx.beginPath();
                ctx.moveTo(hx - R * 0.98, hy - 0.045);
                ctx.quadraticCurveTo(hx, hy - 0.095, hx + R * 0.98, hy - 0.045);
                ctx.lineTo(hx + R * 0.86, hy - 0.005);
                ctx.quadraticCurveTo(hx, hy - 0.048, hx - R * 0.86, hy - 0.005);
                ctx.closePath();
                shape(look.bandColor || '#37474F');
                break;
            }
            case 'cap': { // 诸葛亮：纶巾高冠
                ctx.beginPath();
                ctx.arc(hx, hy - 0.02, R * 0.98, Math.PI * 1.0, Math.PI * 2.0);
                ctx.lineTo(hx + R * 0.98, hy + 0.02);
                ctx.lineTo(hx - R * 0.98, hy + 0.02);
                ctx.closePath();
                shape(hair);
                ctx.beginPath();
                ctx.moveTo(hx - 0.105, hy - 0.03);
                ctx.lineTo(hx + 0.105, hy - 0.03);
                ctx.lineTo(hx + 0.088, hy - 0.20);
                ctx.quadraticCurveTo(hx, hy - 0.255, hx - 0.088, hy - 0.20);
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
                ctx.arc(hx, hy - 0.015, R * 1.06, Math.PI * 1.0, Math.PI * 2.02);
                ctx.lineTo(hx + R * 1.06, hy + 0.03);
                ctx.lineTo(hx - R * 1.06, hy + 0.03);
                ctx.closePath();
                shape(look.armor || '#546E7A');
                // 盔脊
                ctx.beginPath();
                ctx.moveTo(hx - 0.014, hy - 0.205);
                ctx.quadraticCurveTo(hx + 0.03, hy - 0.10, hx + 0.10, hy - 0.02);
                ctx.lineTo(hx + 0.03, hy - 0.02);
                ctx.quadraticCurveTo(hx - 0.02, hy - 0.10, hx - 0.048, hy - 0.19);
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
                ctx.arc(hx, hy - 0.03, R * 1.0, Math.PI * 1.0, Math.PI * 2.02);
                ctx.lineTo(hx + R, hy + 0.015);
                ctx.lineTo(hx - R, hy + 0.015);
                ctx.closePath();
                shape(hair);
                ctx.beginPath();
                ctx.moveTo(hx - R * 1.02, hy - 0.075);
                ctx.quadraticCurveTo(hx, hy - 0.115, hx + R * 1.02, hy - 0.075);
                ctx.lineTo(hx + R * 1.02, hy - 0.012);
                ctx.quadraticCurveTo(hx, hy - 0.048, hx - R * 1.02, hy - 0.012);
                ctx.closePath();
                shape(band);
                // 巾尾
                const sw2 = Math.sin(time * 4.0) * 0.04;
                ctx.beginPath();
                ctx.moveTo(hx - R * 0.9, hy - 0.055);
                ctx.quadraticCurveTo(hx - 0.30 + sw2, hy - 0.02, hx - 0.34 + sw2 * 1.6, hy + 0.10);
                ctx.quadraticCurveTo(hx - 0.20, hy + 0.01, hx - R * 0.8, hy - 0.015);
                ctx.closePath();
                ctx.fillStyle = band; ctx.fill();
                break;
            }
            case 'mask': { // 天魔面具
                ctx.beginPath();
                ctx.arc(hx, hy - 0.02, R * 1.02, Math.PI * 0.98, Math.PI * 2.02);
                ctx.lineTo(hx + R * 1.02, hy + 0.05);
                ctx.lineTo(hx - R * 1.02, hy + 0.05);
                ctx.closePath();
                shape(look.maskColor || '#E0E0E0');
                ctx.fillStyle = look.maskMark || '#C62828';
                ctx.beginPath();
                ctx.moveTo(hx - 0.02, hy - 0.13); ctx.lineTo(hx + 0.02, hy - 0.13);
                ctx.lineTo(hx + 0.02, hy + 0.03); ctx.lineTo(hx - 0.02, hy + 0.03);
                ctx.closePath(); ctx.fill();
                break;
            }
            default: { // 普通发髻
                ctx.beginPath();
                ctx.arc(hx, hy - 0.025, R * 1.0, Math.PI * 1.0, Math.PI * 2.02);
                ctx.lineTo(hx + R, hy + 0.015);
                ctx.lineTo(hx - R, hy + 0.015);
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
        const steelL = U.shade(steel, 0.35);
        const wood = look.wood || '#6D4C33';
        const gripC = look.grip || '#8D6E63';
        const shape = (fill, lw) => {
            ctx.fillStyle = fill; ctx.fill();
            ctx.lineWidth = lw || OLW; ctx.strokeStyle = OUT; ctx.stroke();
        };

        const blade = (len, w0, w1, color, hi) => {
            ctx.beginPath();
            ctx.moveTo(0, -w0 / 2);
            ctx.lineTo(len * 0.72, -w1 / 2);
            ctx.lineTo(len, 0);
            ctx.lineTo(len * 0.72, w1 / 2);
            ctx.lineTo(0, w0 / 2);
            ctx.closePath();
            shape(color);
            ctx.beginPath();
            ctx.moveTo(0.02, -w0 / 2 + 0.012);
            ctx.lineTo(len * 0.70, -w1 / 2 + 0.008);
            ctx.lineTo(len * 0.55, 0);
            ctx.lineTo(0.02, 0);
            ctx.closePath();
            ctx.fillStyle = hi || steelL; ctx.fill();
        };
        const guard = (y, w) => {
            ctx.beginPath();
            U.roundRect(ctx, -0.02, -w / 2, 0.05, w, 0.02);
            shape(look.trim || '#C9A227');
        };

        switch (w) {
            case 'jian': // 单/双股剑
                ctx.beginPath(); ctx.moveTo(-0.02, -0.022); ctx.lineTo(0.16, -0.022); ctx.lineTo(0.16, 0.022); ctx.lineTo(-0.02, 0.022); ctx.closePath();
                shape(gripC);
                guard(0, 0.13);
                blade(0.98, 0.062, 0.030, steel, steelL);
                break;
            case 'jianShort':
                ctx.beginPath(); ctx.moveTo(-0.02, -0.020); ctx.lineTo(0.13, -0.020); ctx.lineTo(0.13, 0.020); ctx.lineTo(-0.02, 0.020); ctx.closePath();
                shape(gripC);
                guard(0, 0.11);
                blade(0.68, 0.055, 0.026, steel, steelL);
                break;
            case 'guandao': { // 青龙偃月刀
                ctx.beginPath(); ctx.moveTo(-0.42, -0.026); ctx.lineTo(1.02, -0.026); ctx.lineTo(1.02, 0.026); ctx.lineTo(-0.42, 0.026); ctx.closePath();
                shape(wood);
                // 刀身（新月）
                ctx.beginPath();
                ctx.moveTo(0.86, -0.03);
                ctx.quadraticCurveTo(1.24, -0.30, 1.30, 0.02);
                ctx.quadraticCurveTo(1.22, 0.10, 0.86, 0.05);
                ctx.closePath();
                shape(steel);
                ctx.beginPath();
                ctx.moveTo(0.90, -0.05);
                ctx.quadraticCurveTo(1.16, -0.24, 1.20, -0.03);
                ctx.lineTo(0.92, -0.01);
                ctx.closePath();
                ctx.fillStyle = steelL; ctx.fill();
                // 龙口
                ctx.beginPath();
                ctx.moveTo(0.84, -0.055); ctx.lineTo(0.98, -0.055); ctx.lineTo(0.98, 0.055); ctx.lineTo(0.84, 0.055);
                ctx.closePath(); shape(look.trim || '#C9A227');
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
            case 'fan': { // 羽扇
                ctx.beginPath(); ctx.moveTo(-0.02, -0.020); ctx.lineTo(0.16, -0.020); ctx.lineTo(0.16, 0.020); ctx.lineTo(-0.02, 0.020); ctx.closePath();
                shape('#6D4C33');
                for (let i = -4; i <= 4; i++) {
                    const a = i * 0.20;
                    ctx.save(); ctx.rotate(a);
                    ctx.beginPath();
                    ctx.moveTo(0.16, -0.016);
                    ctx.quadraticCurveTo(0.34, -0.030, 0.46, 0);
                    ctx.quadraticCurveTo(0.34, 0.030, 0.16, 0.016);
                    ctx.closePath();
                    shape(i % 2 === 0 ? '#F5F5F5' : '#E0E0E0', 0.012);
                    ctx.restore();
                }
                ctx.beginPath(); ctx.arc(0.16, 0, 0.042, 0, TAU); shape(look.trim || '#C9A227');
                break;
            }
            case 'staff': { // 法杖
                ctx.beginPath(); ctx.moveTo(-0.40, -0.024); ctx.lineTo(0.98, -0.024); ctx.lineTo(0.98, 0.024); ctx.lineTo(-0.40, 0.024); ctx.closePath();
                shape('#4E342E');
                // 顶端符咒环
                ctx.save(); ctx.translate(1.06, 0); ctx.rotate((o.time || 0) * 1.6);
                ctx.beginPath(); ctx.arc(0, 0, 0.13, 0, TAU);
                ctx.lineWidth = 0.035; ctx.strokeStyle = look.magic || '#7E57C2'; ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, 0.055, 0, TAU);
                ctx.fillStyle = U.rgba(look.magic || '#7E57C2', 0.55); ctx.fill();
                ctx.restore();
                ctx.beginPath(); ctx.arc(1.06, 0, 0.052, 0, TAU);
                ctx.fillStyle = look.magic || '#7E57C2'; ctx.fill();
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
                ctx.beginPath();
                ctx.moveTo(0.0, -0.34);
                ctx.quadraticCurveTo(0.30, 0, 0.0, 0.34);
                ctx.lineWidth = 0.045; ctx.strokeStyle = wood; ctx.stroke();
                ctx.lineWidth = 0.014; ctx.strokeStyle = OUT; ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, -0.34); ctx.lineTo(0, 0.34);
                ctx.lineWidth = 0.012; ctx.strokeStyle = '#ECEFF1'; ctx.stroke();
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

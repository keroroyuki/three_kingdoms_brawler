/* ============================================================
 * 三国战纪 · Q 版人物（程序化建模 + 骨骼动画）
 *
 * 设计要点：
 *   · 头身比约 1 : 2.4，大头、短肢、圆手圆脚——Q 版剪影
 *   · 三国战纪式的辨识度：关羽绿袍长髯偃月刀、张飞黑甲蛇矛、
 *     赵云白袍银枪、刘备双股剑、诸葛亮羽扇纶巾
 *   · 三阶色阶 toon + 法线外扩描边，接近街机赛璐璐手感
 *   · 每个部位合并为一次 draw call，同兵种共享几何、独立材质
 * ============================================================ */
'use strict';

const Chibi = (function () {
    const G = TK.G, M = TK.mat;

    const HIP = 0.78;          // 胯高（脚底到胯）
    const THIGH = 0.36;
    const SHIN = 0.34;
    const TORSO_H = 0.62;
    const MOUNT_H = 0.92;      // 骑乘时抬升高度

    /* ============================================================
     * 通用小工具
     * ========================================================== */
    function sc(geo, x, y, z) { geo.scale(x, y == null ? x : y, z == null ? x : z); return geo; }
    function mirrorZ(list) { return list; }

    /** 圆形软阴影贴图（只生成一次） */
    let SHADOW_TEX = null;
    function shadowTex() {
        if (SHADOW_TEX) return SHADOW_TEX;
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const x = c.getContext('2d');
        const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, 'rgba(12,8,4,0.62)');
        g.addColorStop(0.55, 'rgba(12,8,4,0.34)');
        g.addColorStop(1, 'rgba(12,8,4,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 128, 128);
        SHADOW_TEX = new THREE.CanvasTexture(c);
        SHADOW_TEX.encoding = THREE.sRGBEncoding;
    SHADOW_TEX.colorSpace = THREE.SRGBColorSpace;
        return SHADOW_TEX;
    }

    /* ============================================================
     * 头部
     * ========================================================== */
    function headBase(look, R) {
        const parts = [];
        const skin = look.skin, dark = look.skinDark || U.shade(skin, -0.22);

        parts.push(G.sphere(R, skin, 22, 16, 1.0, 0.99, 0.94));
        // 下巴：略微前突的小球，Q 版脸型的圆钝感
        parts.push(G.at(G.sphere(R * 0.66, skin, 16, 12, 1.0, 0.78, 0.86), R * 0.20, -R * 0.34, 0));
        // 耳
        for (const s of [-1, 1]) {
            parts.push(G.at(G.sphere(R * 0.17, skin, 10, 8, 0.55, 1.0, 0.75),
                -R * 0.02, R * 0.0, s * R * 0.92));
        }
        // 鼻
        parts.push(G.at(G.sphere(R * 0.055, dark, 8, 6, 1.0, 0.9, 1.0), R * 0.97, -R * 0.10, 0));

        // 眼白 / 瞳 / 高光
        const eyeStyle = (look.face && look.face.eye) || 'normal';
        const eyeW = eyeStyle === 'round' ? 1.16 : (eyeStyle === 'phoenix' ? 0.92 : 1.0);
        const eyeH = eyeStyle === 'round' ? 1.10 : (eyeStyle === 'sharp' ? 0.86 : 1.0);
        // 头是 (R, R, 0.94R) 的椭球：取椭球表面点与其法线，把眼睛沿法线抬起一点，
        // 这样不论转到什么角度都不会被头骨吃掉，也不会像贴片一样浮在脸上。
        const ang = 0.52;
        for (const s of [-1, 1]) {
            const qx = Math.cos(ang), qz = s * 0.94 * Math.sin(ang);
            const ql = Math.hypot(qx, qz);
            const nx = qx / ql, nz = qz / ql;
            const ry = -Math.atan2(qz, qx);
            const put = (geo, out, yy) => G.at(geo,
                R * (qx + nx * out), yy, R * (qz + nz * out), 0, ry, 0);
            const white = G.sphere(R * 0.128 * eyeW, '#FBF7EF', 12, 10, 0.26, 1.0, 0.86);
            parts.push(put(white, 0.014, R * 0.03));
            const iris = G.sphere(R * 0.094 * eyeW, look.eyeColor || '#2A1710', 12, 10, 0.24, 1.0, 0.88);
            parts.push(put(iris, 0.038, R * 0.02));
            const hi = G.sphere(R * 0.028, '#FFFFFF', 8, 6, 0.35, 1.0, 1.0);
            parts.push(put(hi, 0.058, R * 0.070));
            // 上眼睑（深色压边，让眼神更「街机」）
            const lid = G.box(R * 0.02, R * 0.030, R * 0.23 * eyeW);
            parts.push(put(lid, 0.030, R * 0.120 * eyeH));
        }

        // 眉
        const brow = (look.face && look.face.brow) || 'normal';
        const bw = brow === 'bushy' ? 1.5 : (brow === 'silkworm' ? 1.35 : 1.0);
        const thick = brow === 'bushy' ? 0.055 : (brow === 'silkworm' ? 0.042 : 0.030);
        const angry = brow === 'bushy' ? 0.42 : (brow === 'silkworm' ? 0.30 : (brow === 'sharp' ? 0.24 : 0.08));
        const bang = 0.44;
        for (const s of [-1, 1]) {
            const qx = Math.cos(bang), qz = s * 0.94 * Math.sin(bang);
            const ql = Math.hypot(qx, qz);
            const bg = G.box(R * 0.05, R * thick, R * 0.23 * bw);
            parts.push(G.at(bg, R * (qx + qx / ql * 0.035), R * 0.27, R * (qz + qz / ql * 0.035),
                -s * angry, -Math.atan2(qz, qx), 0));
        }

        // 口
        parts.push(G.at(G.box(R * 0.02, R * 0.026, R * 0.11, '#5A2A20'), R * 0.895, -R * 0.36, 0));
        // 腮红（仅部分角色）
        if (look.blush) {
            for (const s of [-1, 1]) {
                parts.push(G.at(G.sphere(R * 0.10, look.blush, 10, 8, 0.16, 0.6, 0.9),
                    R * 0.855, -R * 0.15, s * R * 0.52));
            }
        }
        return parts;
    }

    function headHair(look, R) {
        const parts = [];
        const hair = look.hair || '#241812';
        const kind = look.head || 'band';

        // 后脑发团：压扁并后移，保证面部（尤其是眼）不被发团包住
        parts.push(G.at(G.sphere(R * 0.99, hair, 18, 14, 0.72, 1.0, 0.98), -R * 0.26, -R * 0.02, 0));
        // 头顶发盖（球冠）：只盖到发际线（约 y=0.46R），露出额头与眉眼
        const cap = new THREE.SphereGeometry(R * 1.005, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.33);
        parts.push(G.at(G.paint(cap, hair), 0, R * 0.03, 0));
        // 额前碎发：压在眉上，不遮眼
        for (let i = 0; i < 5; i++) {
            const z = -0.32 + i * 0.16;
            parts.push(G.at(G.cone(R * 0.065, R * 0.24, hair, 6),
                R * 0.80, R * 0.52, z * R, 0.15, -z * 0.5, Math.PI + 0.22));
        }
        // 鬓角
        for (const s of [-1, 1]) {
            parts.push(G.at(G.box(R * 0.09, R * 0.22, R * 0.09, hair), -R * 0.10, R * 0.02, s * R * 0.82, 0, 0, 0.12));
        }

        if (kind === 'topknot') {
            // 发髻 + 绿巾
            parts.push(G.at(G.cyl(R * 0.20, R * 0.24, R * 0.22, hair, 10), -R * 0.10, R * 1.02, 0, 0, 0, 0.12));
            parts.push(G.at(G.sphere(R * 0.24, hair, 12, 10, 1.0, 0.8, 1.0), -R * 0.10, R * 1.18, 0));
            const cloth = look.bandColor || look.robe;
            parts.push(G.at(G.cyl(R * 0.90, R * 0.97, R * 0.24, cloth, 14), -R * 0.06, R * 0.56, 0, 0, 0, 0.05));
            // 巾带
            for (const s of [-1, 1]) {
                parts.push(G.at(G.box(R * 0.05, R * 0.55, R * 0.10, cloth), -R * 0.58, R * 0.52, s * R * 0.20, 0.1, 0, 0.35));
            }
        } else if (kind === 'wild') {
            // 张飞：炸开的硬发 + 黄巾
            for (let i = 0; i < 7; i++) {
                const a = -1.2 + i * 0.4;
                parts.push(G.at(G.cone(R * 0.10, R * 0.52, hair, 5),
                    -R * 0.18, R * 0.92, Math.sin(a) * R * 0.55, -0.3, 0, Math.cos(a) * 0.9));
            }
            parts.push(G.at(G.torus(R * 0.94, R * 0.055, look.bandColor || '#FDD835', Math.PI * 2),
                0, R * 0.30, 0, Math.PI / 2, 0, 0.05));
            parts.push(G.at(G.box(R * 0.06, R * 0.30, R * 0.06, look.bandColor || '#FDD835'),
                -R * 0.92, R * 0.10, R * 0.42, 0, 0, 0.3));
        } else if (kind === 'crown') {
            // 刘备：进贤冠
            parts.push(G.at(G.cyl(R * 0.30, R * 0.36, R * 0.30, '#2B2118', 10), -R * 0.06, R * 1.10, 0, 0, 0, -0.10));
            parts.push(G.at(G.box(R * 0.34, R * 0.12, R * 0.42, '#15100C'), -R * 0.06, R * 1.30, 0, 0, 0, -0.10));
            parts.push(G.at(G.box(R * 0.36, R * 0.06, R * 0.46, look.trim || '#FFD700'), -R * 0.06, R * 1.16, 0, 0, 0, -0.10));
            parts.push(G.at(G.cyl(R * 0.02, R * 0.02, R * 0.9, look.trim || '#FFD700', 6), -R * 0.06, R * 1.13, 0, 0, 0, Math.PI / 2));
            // 冠缨
            parts.push(G.at(G.box(R * 0.05, R * 0.34, R * 0.05, '#C62828'), -R * 0.62, R * 0.70, R * 0.36, 0.2, 0, 0.2));
        } else if (kind === 'helm') {
            // 赵云 / 精锐：银盔 + 红缨。用锥形车削体盔，比半球更像战盔
            const steel = look.armor || '#CFD8DC';
            const domeC = U.shade(steel, -0.26);
            const trimC = look.trim || '#C9A227';
            const dome = G.lathe([
                [0.93, 0.40], [0.97, 0.52], [0.93, 0.70], [0.78, 0.88],
                [0.52, 1.02], [0.20, 1.12], [0.0, 1.14]
            ].map(p => [p[0] * R, p[1] * R]), domeC, 18);
            parts.push(G.at(dome, 0, 0, 0));
            // 盔沿金圈
            parts.push(G.at(G.torus(R * 0.94, R * 0.055, trimC, Math.PI * 2), 0, R * 0.42, 0, Math.PI / 2, 0, 0));
            // 护颊：两侧垂下的小片
            for (const s of [-1, 1]) {
                parts.push(G.at(G.box(R * 0.20, R * 0.26, R * 0.10, U.shade(steel, -0.34)), -R * 0.02, R * 0.24, s * R * 0.86, 0, s * 0.10, 0.06));
            }
            // 护颈：只包后脑
            parts.push(G.at(G.cyl(R * 0.84, R * 0.74, R * 0.18, U.shade(steel, -0.34), 14), -R * 0.30, R * 0.30, 0, 0, 0, 0.20));
            // 额前护片
            parts.push(G.at(G.box(R * 0.16, R * 0.16, R * 0.22, trimC), R * 0.86, R * 0.52, 0, 0, 0, -0.10));
            // 缨座 + 红缨
            parts.push(G.at(G.sphere(R * 0.11, trimC, 10, 8), 0, R * 1.10, 0));
            const plume = look.plume || '#D32F2F';
            parts.push(G.at(G.cone(R * 0.15, R * 0.62, plume, 9), -R * 0.03, R * 1.42, 0, 0, 0, 0.16));
            for (const s of [-1, 1]) {
                parts.push(G.at(G.cone(R * 0.09, R * 0.42, U.shade(plume, -0.10), 7),
                    -R * 0.05, R * 1.26, s * R * 0.12, s * 0.36, 0, 0.30));
            }
        } else if (kind === 'cap') {
            // 诸葛亮：纶巾
            const cloth = look.bandColor || '#ECEFF1';
            parts.push(G.at(G.box(R * 0.78, R * 0.42, R * 0.86, cloth), -R * 0.06, R * 0.92, 0, 0, 0, 0.03));
            parts.push(G.at(G.sphere(R * 0.44, cloth, 14, 10, 1.0, 0.55, 1.0), -R * 0.06, R * 1.12, 0));
            parts.push(G.at(G.box(R * 0.82, R * 0.06, R * 0.90, U.shade(cloth, -0.18)), -R * 0.06, R * 0.74, 0));
            // 巾尾
            for (const s of [-1, 1]) {
                parts.push(G.at(G.box(R * 0.05, R * 0.62, R * 0.10, cloth), -R * 0.60, R * 0.34, s * R * 0.22, 0, 0, 0.28));
            }
        } else if (kind === 'cult') {
            // 张角：高冠
            const c1 = look.bandColor || '#FFD700';
            parts.push(G.at(G.cyl(R * 0.34, R * 0.40, R * 0.34, '#2B2118', 12), -R * 0.04, R * 0.96, 0, 0, 0, -0.06));
            parts.push(G.at(G.box(R * 0.20, R * 0.62, R * 0.44, c1), -R * 0.04, R * 1.34, 0, 0, 0, -0.06));
            parts.push(G.at(G.box(R * 0.10, R * 0.66, R * 0.48, U.shade(c1, -0.18)), -R * 0.14, R * 1.34, 0, 0, 0, -0.06));
            parts.push(G.at(G.torus(R * 0.42, R * 0.05, '#B71C1C', Math.PI * 2), -R * 0.04, R * 1.06, 0, Math.PI / 2, 0, 0));
        } else if (kind === 'mask') {
            // 天魔：獠牙面具 + 双角
            parts.push(G.at(G.cyl(R * 0.92, R * 1.0, R * 0.30, look.maskColor || '#E8EAF6', 16),
                R * 0.22, R * 0.06, 0, 0, 0, Math.PI / 2));
            parts.push(G.at(G.box(R * 0.10, R * 0.16, R * 0.30, look.maskMark || '#D50000'), R * 0.44, -R * 0.12, 0));
            for (const s of [-1, 1]) {
                parts.push(G.at(G.cone(R * 0.10, R * 0.72, '#2B1B12', 6),
                    -R * 0.10, R * 1.08, s * R * 0.62, s * 0.5, 0, -0.25));
                parts.push(G.at(G.sphere(R * 0.075, look.magic || '#18FFFF', 10, 8, 1.0, 0.7, 0.6),
                    R * 0.86, R * 0.12, s * R * 0.34));
            }
        } else {
            // band：黄巾
            parts.push(G.at(G.torus(R * 0.94, R * 0.06, look.bandColor || '#FDD835', Math.PI * 2),
                0, R * 0.30, 0, Math.PI / 2, 0, 0.06));
            parts.push(G.at(G.box(R * 0.05, R * 0.44, R * 0.08, look.bandColor || '#FDD835'),
                -R * 0.90, R * 0.22, R * 0.30, 0.2, 0, 0.55));
            parts.push(G.at(G.box(R * 0.05, R * 0.36, R * 0.07, look.bandColor || '#FDD835'),
                -R * 0.86, R * 0.16, -R * 0.34, -0.2, 0, -0.5));
        }
        return parts;
    }

    function headBeard(look, R) {
        const parts = [];
        const kind = look.beard;
        if (!kind || kind === 'none') return parts;
        const c = look.beardColor || '#1A1410';

        if (kind === 'long') {
            // 关羽：过腹长髯——三段渐细，带一点前倾
            parts.push(G.at(G.lathe([[R * 0.30, 0], [R * 0.34, -R * 0.16], [R * 0.30, -R * 0.55],
                [R * 0.22, -R * 0.95], [R * 0.10, -R * 1.22], [0, -R * 1.30]], c, 10),
                R * 0.55, -R * 0.46, 0, 0, 0, -0.06, 1, 1, 0.72));
            parts.push(G.at(G.lathe([[R * 0.10, 0], [R * 0.12, -R * 0.30], [R * 0.06, -R * 0.62], [0, -R * 0.72]],
                U.shade(c, 0.18), 8), R * 0.60, -R * 0.52, 0, 0, 0, -0.1));
            // 髭
            for (const s of [-1, 1]) {
                parts.push(G.at(G.box(R * 0.05, R * 0.05, R * 0.24, c), R * 0.99, -R * 0.22, s * R * 0.14,
                    0, 0, s * 0.5));
            }
        } else if (kind === 'stubble') {
            // 张飞：虎须——下颌一圈硬胡
            for (let i = 0; i < 9; i++) {
                const a = -1.15 + i * 0.29;
                parts.push(G.at(G.cone(R * 0.06, R * 0.26, c, 5),
                    R * 0.30 + Math.cos(a) * R * 0.60, -R * 0.48 + Math.sin(a) * R * 0.22,
                    Math.sin(a) * R * 0.62, 0, 0, -0.4 + Math.cos(a) * 0.3));
            }
            for (const s of [-1, 1]) {
                parts.push(G.at(G.box(R * 0.05, R * 0.07, R * 0.30, c), R * 0.99, -R * 0.22, s * R * 0.16, 0, 0, s * 0.6));
            }
        } else if (kind === 'goatee') {
            parts.push(G.at(G.cone(R * 0.09, R * 0.34, c, 8), R * 0.82, -R * 0.60, 0, 0, 0, 0.10));
            for (const s of [-1, 1]) {
                parts.push(G.at(G.box(R * 0.04, R * 0.05, R * 0.20, c), R * 0.99, -R * 0.22, s * R * 0.13, 0, 0, s * 0.4));
            }
        }
        return parts;
    }

    /* ============================================================
     * 躯干
     * ========================================================== */
    function torsoParts(look, W) {
        const parts = [];
        const robe = look.robe;
        const dark = look.robeDark || U.shade(robe, -0.25);
        const light = look.robeLight || U.shade(robe, 0.18);
        const long = look.robeStyle === 'long';

        // 身体主体：下宽上收的车削体，Q 版的圆筒身形
        const prof = [
            [0.02, -0.34], [0.19, -0.33], [0.215, -0.18], [0.22, 0.04],
            [0.205, 0.20], [0.16, 0.29], [0.06, 0.325], [0.0, 0.33]
        ];
        const body = G.paintGrad(G.lathe(prof, robe, 18), dark, light, 'y', -0.34, 0.33);
        sc(body, W, 1, 0.82);
        parts.push(body);

        // 交领右衽：两道斜襟
        parts.push(G.at(G.box(0.20, 0.055, 0.10, light), 0.14, 0.20, -0.08, 0, 0.35, 0.9));
        parts.push(G.at(G.box(0.22, 0.055, 0.10, light), 0.14, 0.10, 0.10, 0, -0.35, 0.55));
        parts.push(G.at(G.box(0.06, 0.30, 0.05, look.trim || '#C9A227'), 0.20, 0.02, -0.13, 0.10, 0, 0.10));

        // 腰封
        const sash = look.sash || '#C9A227';
        parts.push(G.at(G.cyl(0.235 * W, 0.245 * W, 0.13, sash, 18), 0, -0.10, 0));
        parts.push(G.at(G.torus(0.20 * W, 0.035, U.shade(sash, -0.2), Math.PI * 2), 0, -0.10, 0, Math.PI / 2, 0, 0));
        // 结
        parts.push(G.at(G.sphere(0.07, U.shade(sash, 0.1), 8, 6, 1, 0.8, 0.6), 0.19 * W, -0.10, 0));
        for (const s of [-1, 1]) {
            parts.push(G.at(G.box(0.035, 0.26, 0.05, sash), 0.21 * W, -0.26, s * 0.05, s * 0.10, 0, 0.06));
        }

        // 下摆：A 字裙，长袍及胫、短打扮及膝（别盖到脚踝，否则腿完全看不见）
        const hemY = long ? -0.44 : -0.30;
        const hem = look.skirt || robe;
        // 轮廓必须从下往上写：反着写车削体的法线朝里，整条裙子会渲成黑的
        const skirt = G.paintGrad(G.lathe([
            [0.29 * W, hemY - 0.02], [0.32 * W, hemY], [0.30 * W, hemY * 0.55], [0.27 * W, -0.14], [0.24 * W, -0.02]
        ], hem, 18), hem, U.shade(hem, -0.18), 'y', 0, hemY);
        sc(skirt, 1, 1, 0.86);
        parts.push(skirt);
        // 摆缘
        parts.push(G.at(G.torus(0.315 * W, 0.022, look.trim || '#C9A227', Math.PI * 2), 0, hemY, 0, Math.PI / 2, 0, 0, 1, 1, 0.86));

        // 甲胄：胸甲 + 肩吞 + 腹甲
        if (look.armor) {
            const ar = look.armor, al = look.armorLight || U.shade(ar, 0.2);
            parts.push(G.at(G.box(0.13, 0.30, 0.34 * W, ar), 0.17, 0.10, 0, 0, 0, 0.02));
            parts.push(G.at(G.box(0.05, 0.26, 0.30 * W, al), 0.235, 0.10, 0, 0, 0, 0.02));
            // 鳞甲横条
            for (let i = 0; i < 3; i++) {
                parts.push(G.at(G.box(0.045, 0.03, 0.33 * W, U.shade(ar, -0.22)), 0.215, -0.04 + i * 0.10, 0));
            }
            // 腹甲 / 护腰
            parts.push(G.at(G.box(0.12, 0.14, 0.30 * W, U.shade(ar, -0.1)), 0.16, -0.20, 0));
            // 肩吞
            for (const s of [-1, 1]) {
                const pd = new THREE.SphereGeometry(0.145, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
                parts.push(G.at(G.paint(pd, ar), 0, 0.29, s * 0.25 * W, s * 0.25, 0, 0));
                parts.push(G.at(G.torus(0.135, 0.022, look.trim || '#C9A227', Math.PI * 2), 0, 0.27, s * 0.25 * W, Math.PI / 2, 0, 0));
            }
        } else {
            // 布衣：肩线
            parts.push(G.at(G.torus(0.20 * W, 0.020, light, Math.PI * 2), 0, 0.27, 0, Math.PI / 2, 0, 0));
        }

        // 披风：挂在肩后，面片法线朝镜头（+Z），下摆向后展开
        if (look.cape) {
            const cg = new THREE.PlaneGeometry(0.46, 0.96, 4, 6);
            const pos = cg.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.array[i * 3], y = pos.array[i * 3 + 1];
                const k = (0.48 - y) / 0.96;                 // 0 顶 → 1 底
                pos.array[i * 3] = x * (0.86 + 0.34 * k);   // 下摆略微外扩
                pos.array[i * 3 + 1] = y - 0.48;            // 顶端对齐挂点
                pos.array[i * 3 + 2] = -0.02 - 0.13 * k * k;
            }
            cg.computeVertexNormals();
            G.paint(cg, look.cape);
            const cape = new THREE.Group();
            // 面片不加描边：外扩法线会让黑色轮廓盖住布面
            G.part(cape, cg, null, { outline: false });
            cape.position.set(-0.15, 0.30, 0);
            cape.rotation.z = -0.10;
            cape.userData.isCape = true;
            parts.capeGroup = cape;
        }
        return parts;
    }

    /* ============================================================
     * 四肢
     * ========================================================== */
    function armParts(look, side, W) {
        // side: 1 = 右（+Z，靠镜头），-1 = 左
        const parts = [];
        const skin = look.skin;
        const sleeve = look.robe;
        const sleeveD = look.robeDark || U.shade(sleeve, -0.22);
        const armored = !!look.armor;
        const w = (look.body && look.body.armW) || 1;

        // 上臂：短而圆
        parts.push(G.at(G.capsule(0.070 * w, 0.13, skin, 10), 0, -0.13, 0));
        // 袖子
        const sg = G.cyl(0.086 * w, 0.115 * w, 0.24, sleeve, 12);
        parts.push(G.at(sg, 0, -0.14, 0));
        parts.push(G.at(G.torus(0.098 * w, 0.022, sleeveD, Math.PI * 2), 0, -0.25, 0, Math.PI / 2, 0, 0));
        if (armored) {
            // 护臂
            parts.push(G.at(G.cyl(0.082 * w, 0.075 * w, 0.15, look.armor, 10), 0, -0.36, 0));
            parts.push(G.at(G.box(0.05, 0.10, 0.10, look.armorLight || '#B0BEC5'), 0.06, -0.36, 0));
        }
        // 前臂
        parts.push(G.at(G.capsule(0.061 * w, 0.10, skin, 10), 0, -0.12, 0));
        // 手
        parts.push(G.at(G.sphere(0.080, skin, 12, 10, 1.0, 0.92, 0.95), 0, -0.03, 0));
        return parts;
    }

    function legParts(look, side) {
        const parts = [];
        const pants = look.pants || '#37474F';
        const boot = look.boot || '#3E2723';
        const w = (look.body && look.body.legW) || 1;

        parts.push(G.at(G.capsule(0.082 * w, 0.16, pants, 10), 0, -0.18, 0));
        // 裤脚
        parts.push(G.at(G.cyl(0.088 * w, 0.10 * w, 0.12, U.shade(pants, -0.12), 10), 0, -0.30, 0));
        // 小腿
        parts.push(G.at(G.capsule(0.070 * w, 0.14, pants, 10), 0, -0.17, 0));
        // 靴
        parts.push(G.at(G.box(0.20, 0.13, 0.15, boot), 0.05, -0.30, 0));
        parts.push(G.at(G.sphere(0.075, boot, 10, 8, 1.2, 0.9, 0.9), 0.14, -0.30, 0));
        parts.push(G.at(G.cyl(0.080 * w, 0.085 * w, 0.10, U.shade(boot, 0.12), 10), 0, -0.245, 0));
        return parts;
    }

    /* ============================================================
     * 坐骑：Q 版战马
     * ========================================================== */
    function buildMount(look) {
        const mk = look.mount;
        const g = new THREE.Group();
        const parts = [];
        const body = mk.body || '#5D4037';
        const mane = mk.mane || '#2B1B12';
        const hoof = mk.hoof || '#263238';
        const saddle = mk.saddle || '#8B0000';

        // 躯干
        parts.push(G.at(G.capsule(0.26, 0.52, body, 12), 0, 0.62, 0, 0, 0, Math.PI / 2, 1, 1, 0.9));
        parts.push(G.at(G.sphere(0.27, body, 14, 10, 1.0, 0.9, 0.9), -0.30, 0.62, 0, 0, 0, 0.1));
        // 颈
        parts.push(G.at(G.cyl(0.13, 0.18, 0.42, body, 10), 0.40, 0.86, 0, 0, 0, -0.55));
        // 头
        parts.push(G.at(G.box(0.26, 0.17, 0.17, body), 0.60, 1.04, 0, 0, 0, -0.35));
        parts.push(G.at(G.box(0.14, 0.10, 0.14, U.shade(body, -0.12), 12), 0.71, 0.98, 0, 0, 0, -0.35));
        // 耳
        for (const s of [-1, 1]) {
            parts.push(G.at(G.cone(0.045, 0.12, body, 5), 0.52, 1.16, s * 0.07, -s * 0.15, 0, -0.2));
        }
        // 眼
        for (const s of [-1, 1]) {
            parts.push(G.at(G.sphere(0.028, '#140C08', 8, 6, 1, 1, 0.6), 0.66, 1.08, s * 0.085));
        }
        // 鬃毛
        for (let i = 0; i < 5; i++) {
            parts.push(G.at(G.cone(0.055, 0.20, mane, 5), 0.34 - i * 0.10, 0.94 + i * 0.015, 0, 0, 0, 0.9));
        }
        // 鞍
        parts.push(G.at(G.capsule(0.19, 0.26, saddle, 10), -0.02, 0.82, 0, 0, 0, Math.PI / 2, 1, 0.7, 1));
        parts.push(G.at(G.box(0.30, 0.04, 0.34, U.shade(saddle, 0.18)), -0.02, 0.86, 0));
        // 尾
        parts.push(G.at(G.cone(0.09, 0.46, mane, 6), -0.56, 0.60, 0, 0, 0, 1.9));
        // 四腿（分前后、左右）
        const legs = [];
        const LEG = [[0.34, 0.14], [0.30, -0.14], [-0.34, 0.14], [-0.32, -0.14]];
        for (const [lx, lz] of LEG) {
            const lg = new THREE.Group();
            const pp = [];
            pp.push(G.at(G.capsule(0.058, 0.20, body, 8), 0, -0.17, 0));
            pp.push(G.at(G.capsule(0.048, 0.16, U.shade(body, -0.1), 8), 0, -0.44, 0));
            pp.push(G.at(G.box(0.10, 0.07, 0.09, hoof), 0.01, -0.54, 0));
            G.part(lg, G.merge(pp));
            lg.position.set(lx, 0.52, lz);
            legs.push(lg);
            g.add(lg);
        }
        G.part(g, G.merge(parts), null);
        return { group: g, legs };
    }

    /* ============================================================
     * 组装：返回带命名骨骼的 Group
     * ========================================================== */
    function buildFigure(look) {
        const R = 0.42 * (look.body && look.body.headR ? look.body.headR : 1);
        const W = look.build || 1;

        const root = new THREE.Group();          // 脚底原点 + 朝向
        root.name = 'root';
        const tilt = new THREE.Group();          // 整体倾倒（受击 / 倒地）
        tilt.name = 'tilt';
        const spin = new THREE.Group();          // 旋转类必杀
        spin.name = 'spin';
        const squash = new THREE.Group();        // 挤压拉伸
        squash.name = 'squash';
        root.add(tilt); tilt.add(spin); spin.add(squash);

        /* ---- 坐骑 ---- */
        let mount = null;
        if (look.mount) {
            mount = buildMount(look);
            mount.group.position.y = 0;
            mount.group.name = 'mount';
            root.add(mount.group);
        }
        const lift = look.mount ? MOUNT_H : 0;

        const hips = new THREE.Group();
        hips.name = 'hips';
        hips.position.y = HIP + lift;
        squash.add(hips);

        const torso = new THREE.Group();
        torso.name = 'torso';
        hips.add(torso);

        const tParts = torsoParts(look, W);
        const capeGroup = tParts.capeGroup;
        delete tParts.capeGroup;
        const torsoGeo = G.merge(tParts);
        const torsoMesh = G.part(torso, torsoGeo, null, { name: 'torsoMesh' });
        torsoMesh.userData.tint = true;

        if (capeGroup) {
            capeGroup.position.y = 0.30;
            torso.add(capeGroup);
        }

        /* ---- 颈 / 头 ---- */
        const neck = new THREE.Group();
        neck.name = 'neck';
        neck.position.y = 0.38;
        torso.add(neck);
        const head = new THREE.Group();
        head.name = 'head';
        head.position.y = R * 0.86;
        neck.add(head);

        const hParts = headBase(look, R).concat(headHair(look, R)).concat(headBeard(look, R));
        const headGeo = G.merge(hParts);
        const headMesh = G.part(head, headGeo, null, { name: 'headMesh' });
        headMesh.userData.tint = true;

        // 眨眼用：单独挂一对眼睛反而更贵，这里在动画里整体轻微缩放头部代替

        /* ---- 手臂 ---- */
        const arms = {};
        for (const s of [1, -1]) {
            const side = s > 0 ? 'R' : 'L';
            const sh = new THREE.Group();
            sh.name = 'sh' + side;
            sh.position.set(0, 0.24, s * 0.24 * W);
            torso.add(sh);
            const upGeo = G.merge(armParts(look, s, W));
            const upMesh = G.part(sh, upGeo, null);
            upMesh.userData.tint = true;

            const el = new THREE.Group();
            el.name = 'el' + side;
            el.position.y = -0.28;
            sh.add(el);
            const foreGeo = G.merge([
                G.at(G.capsule(0.058 * ((look.body && look.body.armW) || 1), 0.10, look.skin, 10), 0, -0.12, 0),
                G.at(G.sphere(0.078, look.skin, 12, 10, 1.0, 0.92, 0.95), 0, -0.26, 0)
            ]);
            const foreMesh = G.part(el, foreGeo, null);
            foreMesh.userData.tint = true;

            const hand = new THREE.Group();
            hand.name = 'hand' + side;
            hand.position.y = -0.26;
            el.add(hand);

            arms[side] = { shoulder: sh, elbow: el, hand };
        }

        /* ---- 兵器 ---- */
        let weapon = null, glow = null;
        if (look.weapon) {
            weapon = Weapon.build(look.weapon, {
                steel: look.steel, wood: look.wood, grip: look.grip,
                trim: look.trim, tassel: look.tassel, magic: look.magic
            });
            glow = weapon.glow || null;
            weapon.group.name = 'weaponMain';
            weapon.group.position.set(0.02, -0.02, 0);
            weapon.group.rotation.set(Weapon.restTilt(look.weapon), 0, Weapon.restAngle(look.weapon));
            arms.R.hand.add(weapon.group);
        }
        // 副手（刘备双剑）
        if (look.offhand) {
            const off = Weapon.build(look.offhand, { steel: look.steel, trim: look.trim, grip: look.grip });
            off.group.name = 'weaponOff';
            off.group.scale.setScalar(0.82);
            off.group.position.set(0.02, -0.02, 0);
            off.group.rotation.z = -0.32;
            arms.L.hand.add(off.group);
        }
        // 盾
        if (look.shieldColor) {
            const sp = [];
            sp.push(G.at(G.box(0.10, 0.46, 0.34, look.shieldColor), 0.10, -0.10, 0, 0, 0, 0.02));
            sp.push(G.at(G.box(0.13, 0.10, 0.36, look.shieldBoss || '#C9A227'), 0.09, 0.02, 0));
            sp.push(G.at(G.sphere(0.09, look.shieldBoss || '#C9A227', 10, 8, 0.8, 1, 1), 0.17, -0.10, 0));
            const shGeo = G.merge(sp);
            const shMesh = G.part(arms.L.hand, shGeo, null);
            shMesh.userData.tint = true;
        }

        /* ---- 腿 ---- */
        const legs = {};
        for (const s of [1, -1]) {
            const side = s > 0 ? 'R' : 'L';
            const hip = new THREE.Group();
            hip.name = 'hip' + side;
            hip.position.set(0, 0, s * 0.115);
            hips.add(hip);
            const thighGeo = G.merge([
                G.at(G.capsule(0.080 * ((look.body && look.body.legW) || 1), 0.16, look.pants || '#37474F', 10), 0, -0.18, 0)
            ]);
            G.part(hip, thighGeo, null);

            const knee = new THREE.Group();
            knee.name = 'knee' + side;
            knee.position.y = -THIGH;
            hip.add(knee);
            const shinGeo = G.merge(legParts(look, s).slice(1));
            const shinMesh = G.part(knee, shinGeo, null);
            shinMesh.userData.tint = true;

            legs[side] = { hip, knee };
        }

        /* ---- 影子 ---- */
        const shadowMat = new THREE.MeshBasicMaterial({
            map: shadowTex(), transparent: true, opacity: 0.75,
            depthWrite: false, color: 0x000000
        });
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.012;
        shadow.renderOrder = 1;

        return {
            root, tilt, spin, squash, hips, torso, neck, head,
            arms, legs, weapon, glow, mount, shadow, shadowMat, R, lift,
            cape: capeGroup
        };
    }

    /* ============================================================
     * 姿态：所有动画都是对以下通道的插值
     * ========================================================== */
    const BASE = {
        y: 0, tz: 0.015, ty: 0.10, spin: 0, sy: 1,
        hx: 0, hy: 0.06, hz: 0,
        aLx: 0.10, aLy: 0.06, aLz: 0.02, eL: 0.24,
        aRx: -0.10, aRy: -0.06, aRz: 0.02, eR: 0.26,
        lLx: 0.04, lLz: 0.02, kL: 0.10, fL: 0,
        lRx: -0.04, lRz: 0.02, kR: 0.10, fR: 0,
        wz: 0, wx: 0, cape: 0.06
    };
    const CH = Object.keys(BASE);

    function P(o) { return Object.assign({}, BASE, o); }

    function lerpP(a, b, t) {
        const o = {};
        for (let i = 0; i < CH.length; i++) {
            const k = CH[i];
            o[k] = a[k] + (b[k] - a[k]) * t;
        }
        return o;
    }

    /** 关键帧采样：frames = [[k, pose], ...]，段内 easeOut */
    function keys(k, frames) {
        if (k <= frames[0][0]) return frames[0][1];
        for (let i = 1; i < frames.length; i++) {
            if (k <= frames[i][0]) {
                const a = frames[i - 1], b = frames[i];
                let t = (k - a[0]) / Math.max(0.0001, b[0] - a[0]);
                t = t < 0 ? 0 : (t > 1 ? 1 : t);
                return lerpP(a[1], b[1], U.ease.outCubic(t));
            }
        }
        return frames[frames.length - 1][1];
    }

    /* ---------------- 基础状态 ---------------- */
    function idle(t, look) {
        const b = Math.sin(t * 2.1);
        const b2 = Math.sin(t * 2.1 + 0.7);
        const guardPose = look && look.weapon === 'guandao';
        return P({
            y: 0.012 * b,
            tz: 0.02 + 0.012 * b,
            ty: 0.10 + 0.03 * b2,
            hz: -0.02 + 0.02 * b2,
            hy: 0.05 + 0.05 * Math.sin(t * 0.7),
            aLz: 0.03 + 0.04 * b, eL: 0.22 + 0.05 * b,
            aRz: 0.03 + 0.05 * b2, eR: 0.26 + 0.06 * b2,
            aRx: -0.12, aLx: 0.12,
            kL: 0.12, kR: 0.12,
            wz: guardPose ? 0.06 : 0.02,
            cape: 0.05 + 0.03 * b
        });
    }

    function walk(t) {
        const p = t * 8.4;
        const s = Math.sin(p), c = Math.cos(p);
        return P({
            y: 0.028 * Math.abs(s) - 0.01,
            tz: 0.075,
            ty: 0.12 + 0.10 * s,
            hz: 0.03 * c,
            aLz: -0.42 * s, eL: 0.30 + 0.18 * Math.max(0, s),
            aRz: 0.42 * s, eR: 0.30 + 0.18 * Math.max(0, -s),
            aLx: 0.10, aRx: -0.10,
            lLz: 0.52 * s, kL: 0.12 + 0.45 * Math.max(0, -s), fL: -0.12 * s,
            lRz: -0.52 * s, kR: 0.12 + 0.45 * Math.max(0, s), fR: 0.12 * s,
            wz: -0.04 + 0.08 * s,
            cape: 0.10 + 0.06 * Math.abs(s)
        });
    }

    function run(t) {
        const p = t * 13.5;
        const s = Math.sin(p), c = Math.cos(p);
        return P({
            y: 0.07 * Math.abs(s),
            tz: 0.24,
            ty: 0.14 + 0.16 * s,
            hx: 0.05,
            aLz: -0.85 * s, eL: 0.95,
            aRz: 0.85 * s, eR: 0.95,
            aLx: 0.14, aRx: -0.14,
            lLz: 0.88 * s, kL: 0.25 + 0.85 * Math.max(0, -s), fL: -0.2 * s,
            lRz: -0.88 * s, kR: 0.25 + 0.85 * Math.max(0, s), fR: 0.2 * s,
            wz: 0.14,
            cape: 0.30 + 0.10 * Math.abs(s)
        });
    }

    function jump() {
        return P({
            y: 0, tz: -0.06, ty: 0.10,
            aLz: 0.75, eL: 0.55, aRz: 0.85, eR: 0.45,
            aLx: 0.30, aRx: -0.30,
            lLz: 0.55, kL: 0.95, lRz: -0.30, kR: 0.55,
            wz: 0.10, cape: 0.42, hy: -0.10
        });
    }

    function fall() {
        return P({
            tz: 0.10, ty: 0.08,
            aLz: 0.35, eL: 0.35, aRz: 0.55, eR: 0.30,
            aLx: 0.55, aRx: -0.55,
            lLz: 0.25, kL: 0.35, lRz: -0.45, kR: 0.25,
            wz: 0.06, cape: 0.36, hy: 0.10
        });
    }

    function land(k) {
        const c = 1 - Math.min(1, k * 1.6);
        return P({
            y: -0.10 * c, tz: 0.16, ty: 0.10,
            kL: 0.10 + 0.70 * c, kR: 0.10 + 0.70 * c,
            lLz: 0.20 * c, lRz: -0.20 * c,
            aLz: 0.30 * c, aRz: 0.35 * c, aLx: 0.30 * c, aRx: -0.30 * c,
            tz2: 0,
            cape: 0.30 * c,
            sy: 1 - 0.10 * c
        });
    }

    function guard(t) {
        const b = Math.sin(t * 6) * 0.02;
        return P({
            y: -0.035, tz: 0.10, ty: -0.35,
            aLz: 1.05, eL: 1.05, aLx: 0.22,
            aRz: 1.15, eR: 1.25, aRx: -0.18,
            lLz: 0.18, kL: 0.35, lRz: -0.15, kR: 0.30,
            wz: -0.42 + b, wx: 0.15,
            hz: 0.03, cape: 0.14
        });
    }

    function hurt() {
        return P({
            tz: -0.26, ty: -0.30,
            hz: 0.22, hx: -0.10,
            aLz: -0.55, eL: 0.75, aLx: 0.55,
            aRz: -0.35, eR: 0.65, aRx: -0.55,
            lLz: 0.30, kL: 0.35, lRz: -0.25, kR: 0.45,
            wz: -0.9, cape: 0.35
        });
    }

    function stagger() {
        return P({
            tz: -0.16, ty: -0.14, hz: 0.16,
            aLz: -0.20, eL: 0.45, aRz: -0.10, eR: 0.40,
            aLx: 0.35, aRx: -0.35,
            kL: 0.30, kR: 0.35, lLz: 0.15, lRz: -0.10,
            wz: -0.6, cape: 0.2
        });
    }

    function downA() {
        return P({
            tz: -1.05, ty: -0.2,
            aLz: -0.9, aRz: -0.7, aLx: 0.9, aRx: -0.9, eL: 0.3, eR: 0.3,
            lLz: 0.7, lRz: 0.35, kL: 0.5, kR: 0.7,
            hz: 0.3, wz: -1.2, cape: 0.5
        });
    }

    function down() {
        return P({
            y: 0.16, tz: -1.42, ty: -0.1,
            aLz: -0.4, aRz: -0.3, aLx: 0.5, aRx: -0.5, eL: 0.35, eR: 0.35,
            lLz: 0.45, lRz: 0.20, kL: 0.55, kR: 0.35,
            hz: 0.28, wz: -1.0, cape: 0.42
        });
    }

    function getUp(k) {
        const t = U.clamp(k, 0, 1);
        const d = down();
        const s = P({ y: -0.06, tz: 0.18, kL: 0.55, kR: 0.55, lLz: 0.2, lRz: -0.2, ty: 0.1 });
        return lerpP(d, s, U.ease.outCubic(t));
    }

    function cast(t) {
        const b = Math.sin(t * 16) * 0.03;
        return P({
            tz: -0.10, ty: 0.05, hz: -0.12,
            aLz: 1.75, eL: 0.35, aLx: 0.35,
            aRz: 1.95, eR: 0.45, aRx: -0.25,
            lLz: 0.15, kL: 0.18, lRz: -0.15, kR: 0.18,
            wz: 0.20 + b, wx: 0.2, cape: 0.28, y: 0.02
        });
    }

    function cheer(t) {
        const b = Math.sin(t * 7);
        return P({
            y: 0.03 + 0.03 * b, tz: -0.02, ty: 0.10,
            aLz: 2.35 + 0.1 * b, eL: 0.55, aLx: 0.35,
            aRz: 2.45 - 0.1 * b, eR: 0.5, aRx: -0.35,
            hz: -0.08, hy: 0.1,
            kL: 0.15, kR: 0.15, wz: -0.20, cape: 0.2
        });
    }

    function charge(t) {
        const b = Math.sin(t * 20) * 0.02;
        return P({
            y: -0.05, tz: 0.34, ty: -0.2,
            aLz: -0.85, eL: 1.1, aRz: -0.55, eR: 1.0,
            aLx: 0.25, aRx: -0.25,
            lLz: 0.45, kL: 0.55, lRz: -0.35, kR: 0.6,
            wz: -0.35 + b, cape: 0.45, hz: 0.05
        });
    }

    function dash() {
        return P({
            y: 0.02, tz: 0.40, ty: 0.35,
            aLz: -0.95, eL: 0.9, aRz: -0.75, eR: 0.8,
            aLx: 0.2, aRx: -0.2,
            lLz: 0.75, kL: 0.35, lRz: -0.55, kR: 0.55,
            wz: -0.5, cape: 0.55, hy: 0.16
        });
    }

    function attack(kind, k) {
        switch (kind) {
            case 'slash2':
                return keys(k, [
                    [0, P({})],
                    [0.26, P({ ty: 0.55, aRz: 1.10, eR: 0.85, aLz: -0.25, tz: 0.02, wz: -0.1 })],
                    [0.42, P({ ty: -0.55, aRz: -0.55, eR: 0.15, tz: -0.10, wz: -0.9, hz: -0.1 })],
                    [0.60, P({ ty: -0.75, aRz: -0.85, eR: 0.2, tz: -0.06, wz: -1.1 })],
                    [1, P({})]
                ]);
            case 'heavy':
                return keys(k, [
                    [0, P({})],
                    [0.32, P({
                        tz: -0.18, aRz: 2.45, eR: 0.15, aRx: -0.35, aLz: 2.25, eL: 0.3,
                        hz: -0.16, hy: 0.1, y: 0.03, wz: -1.9
                    })],
                    [0.46, P({
                        tz: 0.30, aRz: 0.85, eR: 0.35, aLz: 1.05, eL: 0.5,
                        hz: 0.18, y: -0.06, kL: 0.4, kR: 0.4, wz: -0.35
                    })],
                    [0.62, P({ tz: 0.34, aRz: 0.55, eR: 0.45, y: -0.08, kL: 0.5, kR: 0.5, wz: -0.2 })],
                    [1, P({})]
                ]);
            case 'sweep':
                return keys(k, [
                    [0, P({})],
                    [0.30, P({ ty: 0.75, aRz: 1.5, eR: 0.35, tz: -0.06, aLz: 0.6, wz: -1.2 })],
                    [0.48, P({ ty: -0.85, aRz: 0.2, eR: 0.1, tz: 0.16, aLz: -0.4, wz: -0.1, hz: 0.1 })],
                    [0.66, P({ ty: -1.0, aRz: -0.3, eR: 0.15, tz: 0.12, wz: 0.15 })],
                    [1, P({})]
                ]);
            case 'thrust':
                return keys(k, [
                    [0, P({})],
                    [0.28, P({ ty: -0.55, aRz: -0.75, eR: 1.5, tz: 0.12, aLz: 0.5, eL: 1.2, wz: -0.5 })],
                    [0.42, P({ ty: 0.35, aRz: 1.65, eR: 0.05, tz: -0.14, aLz: -0.3, eL: 0.4, wz: -1.55, y: -0.02 })],
                    [0.62, P({ ty: 0.28, aRz: 1.45, eR: 0.15, tz: -0.08, wz: -1.45 })],
                    [1, P({})]
                ]);
            case 'air':
                return keys(k, [
                    [0, jump()],
                    [0.3, P({ tz: 0.22, aRz: 2.5, eR: 0.2, aLz: 1.3, tz: -0.1, lLz: 0.7, kL: 0.9, wz: -1.9 })],
                    [0.55, P({ tz: 0.35, aRz: 0.6, eR: 0.4, aLz: 0.4, lLz: 0.5, kL: 0.7, wz: -0.2 })],
                    [1, jump()]
                ]);
            case 'dashAtk':
                return keys(k, [
                    [0, dash()],
                    [0.3, P({ tz: 0.35, ty: -0.4, aRz: -0.6, eR: 1.0, wz: -0.4 })],
                    [0.48, P({ tz: 0.30, ty: 0.4, aRz: 1.7, eR: 0.1, wz: -1.6, lLz: 0.6, kL: 0.3 })],
                    [1, dash()]
                ]);
            case 'counter':
                return keys(k, [
                    [0, guard(0)],
                    [0.2, P({ ty: 0.5, aRz: 1.7, eR: 0.2, wz: -1.5 })],
                    [0.45, P({ ty: -0.3, aRz: 0.9, eR: 0.3, tz: 0.2, wz: -0.4 })],
                    [1, P({})]
                ]);
            case 'slash1':
            default:
                return keys(k, [
                    [0, P({})],
                    [0.26, P({ ty: -0.45, aRz: -0.95, eR: 1.0, aRx: -0.30, aLz: 0.35, tz: 0.04, wz: -0.05 })],
                    [0.42, P({ ty: 0.55, aRz: 1.65, eR: 0.12, aRx: -0.20, tz: -0.12, wz: -1.55, hz: -0.08 })],
                    [0.60, P({ ty: 0.70, aRz: 1.95, eR: 0.2, tz: -0.08, wz: -1.8 })],
                    [1, P({})]
                ]);
        }
    }

    /** 必杀技 / BOSS 技能姿态 */
    function special(kind, k, t) {
        switch (kind) {
            case 'spin':
                return P({
                    spin: k * Math.PI * 2 * 2.0,
                    tz: 0.05, ty: 0,
                    aLz: 1.55, eL: 0.15, aLx: 0.25,
                    aRz: 1.65, eR: 0.15, aRx: -0.25,
                    lLz: 0.3, kL: 0.35, lRz: -0.3, kR: 0.35,
                    wz: -1.62, cape: 0.5 + 0.2 * Math.sin(k * 30)
                });
            case 'thrustSpecial':
                return keys(k, [
                    [0, cast(0)],
                    [0.18, P({ ty: -0.4, aRz: -0.5, eR: 1.5, tz: 0.2 })],
                    [0.34, P({ ty: 0.5, aRz: 1.75, eR: 0.0, tz: -0.2, y: -0.02, lLz: 0.5, kL: 0.2, lRz: -0.5 })],
                    [0.62, P({ ty: 0.4, aRz: 1.6, eR: 0.1, tz: -0.1, wz: -1.6 })],
                    [1, P({})]
                ]);
            case 'castRelease':
                return P({
                    tz: -0.16, ty: 0.12, hz: -0.2,
                    aLz: 2.0, eL: 0.1, aLx: 0.55,
                    aRz: 2.1, eR: 0.1, aRx: -0.55,
                    wz: -0.20, cape: 0.6, y: 0.02
                });
            case 'roar':
                return keys(k, [
                    [0, cast(0)],
                    [0.35, P({
                        tz: -0.24, hz: -0.35, hy: 0.1, aLz: 2.2, aRz: 2.3, aLx: 0.9, aRx: -0.9,
                        eL: 0.2, eR: 0.2, wz: -0.22, y: 0.04
                    })],
                    [0.6, P({ tz: -0.1, aLz: 1.6, aRz: 1.7, aLx: 0.6, aRx: -0.6, wz: -1.6 })],
                    [1, P({})]
                ]);
            case 'leap':
                return k < 0.5 ? jump() : downA();
            default:
                return cast(t);
        }
    }

    /* ============================================================
     * 动画状态机：把 actor 状态映射为姿态
     * ========================================================== */
    function poseFor(a, dt) {
        const t = a.animT;
        let p, lambda = 15;

        if (a.state === 'skill' && a.skillDef) {
            const d = a.skillDef;
            p = special(d.anim || 'cast', U.clamp(a.stateT / d.dur, 0, 1), t);
            lambda = 26;
            return { p, lambda };
        }
        if (a.current) {
            // BOSS 技能：起手用蓄力姿态，出手交给技能类型
            const s = a.current;
            const W = a.windupDur || 0.5;
            if (a.skillT < W) {
                p = cast(t);
                p.tz -= 0.05 * (a.skillT / W);
            } else {
                const k = U.clamp((a.skillT - W) / Math.max(0.01, s.dur || 0.7), 0, 1);
                if (s.type === 'spin') p = special('spin', k, t);
                else if (s.type === 'sweep') p = attack('sweep', k);
                else if (s.type === 'thrust') p = attack('thrust', k);
                else if (s.type === 'dash') p = attack('dashAtk', k);
                else if (s.type === 'leap') p = special('leap', k, t);
                else p = special('castRelease', k, t);
            }
            return { p, lambda: 22 };
        }
        if (a.atkDef) {
            const d = a.atkDef;
            const k = U.clamp(a.stateT / Math.max(0.01, d.dur), 0, 1);
            return { p: attack(d.anim || 'slash1', k), lambda: 28 };
        }

        switch (a.state) {
            case 'walk': p = walk(t); break;
            case 'run': p = run(t); break;
            case 'jump': case 'air': p = a.vy > 0 ? jump() : fall(); break;
            case 'land': p = land(U.clamp(a.stateT / 0.22, 0, 1)); break;
            case 'guard': p = guard(t); break;
            case 'hurt': p = hurt(); lambda = 24; break;
            case 'stagger': p = stagger(); lambda = 20; break;
            case 'downA': p = downA(); lambda = 12; break;
            case 'down': p = down(); lambda = 10; break;
            case 'getUp': p = getUp(U.clamp(a.stateT / 0.44, 0, 1)); lambda = 20; break;
            case 'cast': p = cast(t); break;
            case 'charge': p = charge(t); break;
            case 'cheer': p = cheer(t); break;
            case 'dash': p = dash(); break;
            case 'idle':
            default: p = idle(t, a.look); break;
        }
        if (a.dead && a.state !== 'downA' && a.state !== 'down') p = downA();
        return { p, lambda };
    }

    /* ============================================================
     * 角色实例
     * ========================================================== */
    const TEMPLATE = {};

    function template(lookKey, look) {
        if (!TEMPLATE[lookKey]) TEMPLATE[lookKey] = buildFigure(look);
        return TEMPLATE[lookKey];
    }

    class Rig {
        constructor(lookKey, look) {
            this.key = lookKey;
            this.look = look;
            const tpl = template(lookKey, look);
            this.root = tpl.root.clone(true);
            this.root.scale.setScalar(look.bossScale ? look.bossScale : 1);

            // 每个实例一份材质，受击闪白才不会串到同兵种身上
            this.mat = M.toon();
            this.root.traverse((o) => {
                if (o.isMesh && o.userData.tint) o.material = this.mat;
            });

            const get = (n) => this.root.getObjectByName(n);
            this.tilt = get('tilt');
            this.spin = get('spin');
            this.squash = get('squash');
            this.hips = get('hips');
            this.torso = get('torso');
            this.neck = get('neck');
            this.head = get('head');
            this.cape = this.root.getObjectByName('torso') &&
                this.root.getObjectByName('torso').children.find(c => c.userData.isCape) || null;

            this.shR = get('shR'); this.shL = get('shL');
            this.elR = get('elR'); this.elL = get('elL');
            this.hipR = get('hipR'); this.hipL = get('hipL');
            this.kneeR = get('kneeR'); this.kneeL = get('kneeL');

            this.weapon = get('weaponMain') || null;
            this.wBase = look.weapon ? Weapon.restAngle(look.weapon) : 0;
            this.wTilt = look.weapon ? Weapon.restTilt(look.weapon) : 0;
            this.glow = null;
            if (this.weapon) {
                this.weapon.traverse(o => {
                    if (o.isMesh && o.material && o.material.blending === THREE.AdditiveBlending) {
                        if (!this.glow) this.glow = o;
                    }
                });
            }

            // 影子独立于 root（跳跃时留在地面）
            this.shadow = tpl.shadow.clone();
            this.shadow.material = tpl.shadow.material.clone();

            this.mount = get('mount') || null;
            this.mountLegs = this.mount ? this.mount.children.slice(0, 4) : null;

            this.pose = Object.assign({}, BASE);
            this.blinkT = U.rand(0, 3);
        }

        update(a, dt) {
            const res = poseFor(a, dt);
            const target = res.p;
            const lam = res.lambda || 15;
            const k = 1 - Math.exp(-lam * dt);
            const cur = this.pose;
            for (let i = 0; i < CH.length; i++) {
                const key = CH[i];
                let v = target[key];
                if (key === 'spin') {
                    // 旋转是连续量，直接赋值避免拖影
                    cur[key] = v;
                } else {
                    cur[key] = cur[key] + (v - cur[key]) * k;
                }
            }

            this.root.position.set(a.x, a.y, a.z);

            let yaw = a.facing > 0 ? -0.30 : Math.PI + 0.30;
            // 朝向切换时平滑转身
            let dy = yaw - this.root.rotation.y;
            while (dy > Math.PI) dy -= Math.PI * 2;
            while (dy < -Math.PI) dy += Math.PI * 2;
            this.root.rotation.y += dy * Math.min(1, dt * 18);

            this.tilt.rotation.z = cur.tz;
            this.spin.rotation.y = cur.spin;
            this.squash.scale.y = cur.sy;
            this.hips.position.y = HIP + (this.look.mount ? MOUNT_H : 0) + cur.y;
            this.torso.rotation.set(0, cur.ty, 0);
            // 头部比身体多转一点朝向镜头：横版侧视下仍能看清两只眼睛（三国战纪式 3/4 脸）
            this.head.rotation.set(cur.hx, cur.hy - a.facing * 0.98, cur.hz);

            this.shR.rotation.set(cur.aRx, cur.aRy, cur.aRz);
            this.shL.rotation.set(cur.aLx, cur.aLy, cur.aLz);
            this.elR.rotation.z = -cur.eR;
            this.elL.rotation.z = -cur.eL;

            this.hipR.rotation.set(cur.lRx, 0, cur.lRz);
            this.hipL.rotation.set(cur.lLx, 0, cur.lLz);
            this.kneeR.rotation.z = -cur.kR;
            this.kneeL.rotation.z = -cur.kL;

            if (this.weapon) {
                this.weapon.rotation.set((this.wTilt || 0) + (cur.wx || 0), 0, (this.wBase || 0) + cur.wz);
                this.weapon.rotation.x = cur.wx;
            }
            if (this.cape) {
                this.cape.rotation.z = -0.10 - cur.cape;
                this.cape.rotation.x = Math.sin(a.time * 3.4) * 0.06;
            }

            // 受击闪白
            this.mat.emissive.setScalar(U.clamp(a.flash, 0, 1) * 0.85);
            const fade = a.fade == null ? 1 : a.fade;
            if (fade < 1) {
                this.mat.transparent = true;
                this.mat.opacity = fade;
            } else if (this.mat.transparent) {
                this.mat.transparent = false;
                this.mat.opacity = 1;
            }

            // 无敌闪烁
            const blink = a.invuln > 0 && !a.dead && a.state !== 'skill';
            this.root.visible = !(blink && Math.floor(a.time * 22) % 2 === 0);

            // 影子
            const hk = U.clamp(a.y / 2.6, 0, 1);
            const sc = (this.look.bossScale || 1) * (1 - hk * 0.4);
            this.shadow.position.set(a.x, 0.012, a.z);
            this.shadow.scale.set(1.05 * sc, 0.62 * sc, 1);
            this.shadow.material.opacity = 0.62 * (1 - hk * 0.7) * fade;
            this.shadow.visible = !a.remove && fade > 0.02;

            // 坐骑摆腿
            if (this.mountLegs) {
                const gallop = (a.state === 'walk' || a.state === 'run') ? a.animT * 12 : a.time * 3;
                for (let i = 0; i < this.mountLegs.length; i++) {
                    this.mountLegs[i].rotation.z = Math.sin(gallop + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.45;
                }
            }

            // 法珠呼吸
            if (this.glow) {
                const s = 1 + Math.sin(a.time * 5) * 0.12;
                this.glow.scale.setScalar(s);
            }
        }

        attach(scene) {
            scene.add(this.root);
            scene.add(this.shadow);
        }

        detach(scene) {
            scene.remove(this.root);
            scene.remove(this.shadow);
        }

        dispose() {
            this.mat.dispose();
            if (this.shadow) this.shadow.material.dispose();
        }
    }

    return {
        create(lookKey, look) { return new Rig(lookKey, look); },
        poseFor,
        BASE
    };
})();

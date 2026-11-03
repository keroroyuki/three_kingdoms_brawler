/* ============================================================
 * 三国战纪 · 兵器库
 * 所有兵器以「握把中心」为原点，刃身指向 +X，刃背朝 +Y。
 * 返回 { group, glow }：group 直接挂到手骨上，glow 为可选自发光体。
 * ============================================================ */
'use strict';

const Weapon = (function () {
    const G = TK.G, M = TK.mat;

    /**
     * 合批并「把握点挪到原点」。
     * 之前是把偏移加在 group.position 上，那是在手的坐标系里平移，
     * 一转角整根杆就横向甩开、手并不在杆上。必须烘进几何体。
     */
    function finish(parts, mat, gripX) {
        const geo = G.merge(parts);
        if (gripX) geo.translate(-gripX, 0, 0);
        const group = new THREE.Group();
        G.part(group, geo, mat, { name: 'weapon' });
        return group;
    }

    /* ---------------- 直剑（双股剑） ---------------- */
    function jian(p) {
        const steel = p.steel || '#DDE3E8';
        const pale = U.shade(steel, 0.35);
        const grip = p.grip || '#6D4C33';
        const part = [];
        // 剑身：细长四棱，中脊略厚
        part.push(G.at(G.box(0.62, 0.055, 0.028, steel), 0.40, 0, 0));
        part.push(G.at(G.box(0.60, 0.016, 0.040, pale), 0.40, 0.004, 0));
        // 剑尖
        part.push(G.at(G.cone(0.030, 0.13, pale, 4), 0.755, 0, 0, 0, 0, -Math.PI / 2, 1, 1, 0.5));
        // 护手
        part.push(G.at(G.box(0.052, 0.15, 0.07, p.trim || '#C9A227'), 0.075, 0, 0));
        part.push(G.at(G.box(0.03, 0.05, 0.05, '#7A5A22'), 0.10, 0, 0));
        // 握柄 + 缠绳
        part.push(G.at(G.cyl(0.026, 0.028, 0.20, grip, 10), 0, 0, 0, 0, 0, Math.PI / 2));
        for (let i = 0; i < 4; i++) {
            part.push(G.at(G.torus(0.030, 0.006, '#8D6E63'), -0.07 + i * 0.045, 0, 0, 0, Math.PI / 2, 0));
        }
        // 剑首
        part.push(G.at(G.sphere(0.038, p.trim || '#C9A227', 10, 8), -0.105, 0, 0));
        return { group: finish(part, null, 0) };
    }

    /* ---------------- 青龙偃月刀 ---------------- */
    function guandao(p) {
        const wood = p.wood || '#5D4037';
        const steel = p.steel || '#D9E8EC';
        const edge = '#F2FBFD';
        const part = [];
        const L = 2.15;
        // 刀杆（上细下粗，缠布握把）
        part.push(G.at(G.cyl(0.034, 0.044, L, wood, 10), 0, 0, 0, 0, 0, Math.PI / 2));
        part.push(G.at(G.cyl(0.040, 0.040, 0.26, '#3E2723', 10), -0.30, 0, 0, 0, 0, Math.PI / 2));
        for (let i = 0; i < 5; i++) {
            part.push(G.at(G.torus(0.044, 0.007, '#8D6E63'), -0.42 + i * 0.06, 0, 0, 0, Math.PI / 2, 0));
        }
        // 尾锥
        part.push(G.at(G.cone(0.045, 0.14, '#C9A227', 8), -1.13, 0, 0, 0, 0, Math.PI / 2));
        // 龙头吞口
        const headX = L / 2 - 0.10;
        part.push(G.at(G.sphere(0.085, '#C9A227', 12, 10), headX, 0, 0));
        part.push(G.at(G.cone(0.055, 0.12, '#C9A227', 8), headX + 0.06, 0.05, 0, 0, 0, -1.2));
        // 偃月刃：内外两段同心圆弧夹出一个月牙（外弧为刃口，内弧贴杆）
        const bx = headX + 0.02;
        const crescent = (rIn, rOut, y0, y1, h, hex) => {
            const pts = [];
            const C = [0.02, 0.40];
            const N = 9;
            for (let i = 0; i <= N; i++) {
                const a = y0 + (i / N) * (y1 - y0);
                pts.push([C[0] + Math.cos(a) * rOut, C[1] + Math.sin(a) * rOut]);
            }
            for (let i = N; i >= 0; i--) {
                const a = y0 + (i / N) * (y1 - y0);
                pts.push([C[0] + Math.cos(a) * rIn, C[1] + Math.sin(a) * rIn]);
            }
            return G.at(G.shape(pts, h, hex), bx, 0, 0);
        };
        part.push(crescent(0.23, 0.47, -1.42, 0.62, 0.042, steel));
        part.push(crescent(0.405, 0.47, -1.40, 0.62, 0.030, edge));
        // 刃根与杆的连接加厚
        part.push(G.at(G.box(0.10, 0.20, 0.055, '#8FA6AD'), bx + 0.05, 0.04, 0, 0, 0, -0.12));
        // 吞口下的红缨
        part.push(G.at(G.cone(0.055, 0.20, p.tassel || '#B3352B', 8), headX - 0.04, -0.13, 0, 0, 0, 0.15));
        return { group: finish(part, null, -0.56) };
    }

    /* ---------------- 丈八蛇矛 ---------------- */
    function spear(p, short) {
        const wood = p.wood || '#4E342E';
        const steel = p.steel || '#D6DBE0';
        const part = [];
        const L = short ? 1.85 : 2.05;
        part.push(G.at(G.cyl(0.028, 0.036, L, wood, 10), 0, 0, 0, 0, 0, Math.PI / 2));
        // 蛇形矛头：三节弯折
        const hx = L / 2 - 0.02;
        part.push(G.at(G.cyl(0.042, 0.034, 0.10, '#8D6E63', 8), hx + 0.02, 0, 0, 0, 0, Math.PI / 2));
        part.push(G.at(G.box(0.14, 0.075, 0.03, steel), hx + 0.11, 0.012, 0, 0, 0, 0.12));
        part.push(G.at(G.box(0.13, 0.062, 0.028, steel), hx + 0.22, -0.004, 0, 0, 0, -0.16));
        part.push(G.at(G.cone(0.030, 0.16, '#EFF6F8', 4), hx + 0.33, 0.012, 0, 0, 0, -Math.PI / 2, 0.55, 1, 0.45));
        // 红缨
        part.push(G.at(G.cone(0.052, 0.19, p.tassel || '#C62828', 9), hx - 0.02, -0.12, 0, 0, 0, 0.10));
        for (let i = 0; i < 4; i++) {
            part.push(G.at(G.box(0.012, 0.16, 0.012, p.tassel || '#C62828'), hx - 0.02, -0.2, -0.03 + i * 0.02, 0.2, 0, 0.3));
        }
        // 尾锥
        part.push(G.at(G.cone(0.035, 0.12, '#C9A227', 8), -L / 2 + 0.02, 0, 0, 0, 0, Math.PI / 2));
        return { group: finish(part, null, short ? -0.41 : -0.51) };
    }

    /* ---------------- 环首刀 ---------------- */
    function dao(p) {
        const steel = p.steel || '#C7CCD1';
        const edge = U.shade(steel, 0.4);
        const part = [];
        // 刀柄
        part.push(G.at(G.cyl(0.024, 0.028, 0.19, '#6D4C33', 8), -0.03, 0, 0, 0, 0, Math.PI / 2));
        part.push(G.at(G.torus(0.036, 0.008, '#C9A227', Math.PI * 2), -0.135, 0, 0, 0, Math.PI / 2, 0));
        // 护手
        part.push(G.at(G.box(0.036, 0.13, 0.05, '#8D6E63'), 0.08, 0, 0));
        // 刀身：单刃带弧
        part.push(G.at(G.box(0.34, 0.095, 0.026, steel), 0.27, 0.02, 0, 0, 0, 0.05));
        part.push(G.at(G.box(0.30, 0.085, 0.024, steel), 0.52, 0.075, 0, 0, 0, 0.24));
        part.push(G.at(G.box(0.22, 0.070, 0.022, steel), 0.70, 0.145, 0, 0, 0, 0.42));
        part.push(G.at(G.box(0.86, 0.022, 0.03, edge), 0.43, 0.055, 0, 0, 0, 0.14));
        // 刀尖
        part.push(G.at(G.cone(0.035, 0.16, edge, 4), 0.80, 0.20, 0, 0, 0, -1.35, 0.6, 1, 0.5));
        return { group: finish(part, null, 0.04) };
    }

    /* ---------------- 大斧 ---------------- */
    function axe(p) {
        const wood = p.wood || '#3E2723';
        const steel = p.steel || '#D6DBE0';
        const part = [];
        const L = 1.55;
        part.push(G.at(G.cyl(0.038, 0.046, L, wood, 10), 0, 0, 0, 0, 0, Math.PI / 2));
        const hx = L / 2 - 0.08;
        part.push(G.at(G.cyl(0.055, 0.050, 0.16, '#455A64', 10), hx, 0, 0, 0, 0, Math.PI / 2));
        // 斧刃
        part.push(G.at(G.box(0.16, 0.34, 0.05, steel), hx + 0.10, 0.16, 0, 0, 0, 0.06));
        part.push(G.at(G.cone(0.26, 0.22, U.shade(steel, 0.3), 6), hx + 0.13, 0.40, 0, 0, 0, 0.06, 1, 1, 0.22));
        // 背刺
        part.push(G.at(G.cone(0.055, 0.22, '#90A4AE', 6), hx + 0.02, -0.16, 0, 0, 0, Math.PI));
        part.push(G.at(G.box(0.05, 0.16, 0.045, '#C9A227'), hx + 0.03, 0.06, 0));
        return { group: finish(part, null, -0.26) };
    }

    /* ---------------- 方天画戟 ---------------- */
    function ji(p) {
        const wood = p.wood || '#3E2723';
        const steel = p.steel || '#D6DBE0';
        const part = [];
        const L = 2.05;
        part.push(G.at(G.cyl(0.032, 0.040, L, wood, 10), 0, 0, 0, 0, 0, Math.PI / 2));
        const hx = L / 2 - 0.04;
        part.push(G.at(G.cone(0.045, 0.26, '#EFF6F8', 5), hx + 0.13, 0, 0, 0, 0, -Math.PI / 2, 0.5, 1, 0.4));
        // 月牙侧刃
        part.push(G.at(G.box(0.06, 0.30, 0.028, steel), hx - 0.02, 0.20, 0, 0, 0, 0.22));
        part.push(G.at(G.cone(0.14, 0.20, U.shade(steel, 0.25), 5), hx - 0.06, 0.36, 0, 0, 0, 0.5, 1, 1, 0.2));
        // 缚绳与红缨
        part.push(G.at(G.cyl(0.05, 0.045, 0.08, '#C9A227', 8), hx - 0.10, 0, 0, 0, 0, Math.PI / 2));
        part.push(G.at(G.cone(0.06, 0.22, p.tassel || '#D32F2F', 9), hx - 0.14, -0.14, 0, 0, 0, 0.1));
        return { group: finish(part, null, -0.50) };
    }

    /* ---------------- 长杖（术士 / 张角） ---------------- */
    function staff(p) {
        const wood = p.wood || '#4E342E';
        const part = [];
        const L = 1.95;
        part.push(G.at(G.cyl(0.030, 0.040, L, wood, 10), 0, 0, 0, 0, 0, Math.PI / 2));
        // 竹节
        for (let i = -2; i <= 2; i++) {
            part.push(G.at(G.torus(0.041, 0.008, U.shade(wood, -0.25), Math.PI * 2), i * 0.36, 0, 0, 0, Math.PI / 2, 0));
        }
        // 杖首：金环 + 悬浮法珠
        const hx = L / 2 - 0.02;
        part.push(G.at(G.torus(0.085, 0.016, '#C9A227', Math.PI * 2), hx, 0, 0, 0, Math.PI / 2, 0));
        for (let i = 0; i < 3; i++) {
            const a = -0.9 + i * 0.9;
            part.push(G.at(G.cone(0.018, 0.16, '#C9A227', 5), hx, Math.sin(a) * 0.10, Math.cos(a) * 0.10, a, 0, 0));
        }
        const g = finish(part, null, -0.46);
        const orbColor = p.magic || '#7E57C2';
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 10), M.glow(orbColor, 0.95));
        orb.position.set(hx + 0.03 + 0.46, 0, 0);
        g.add(orb);
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 10), M.glow(orbColor, 0.24));
        halo.position.copy(orb.position);
        g.add(halo);
        return { group: g, glow: orb, halo };
    }

    /* ---------------- 羽扇 ---------------- */
    function fan(p) {
        const part = [];
        // 扇柄
        part.push(G.at(G.cyl(0.022, 0.026, 0.20, '#4E342E', 8), -0.09, 0, 0, 0, 0, Math.PI / 2));
        const rootX = 0.02;
        const N = 11;
        for (let i = 0; i < N; i++) {
            const a = -0.72 + (i / (N - 1)) * 1.44;
            const len = 0.40 + Math.cos(a) * 0.10;
            const g = G.cyl(0.010, 0.030, len, i % 2 ? '#F7F3E4' : '#E4DCC4', 6);
            G.at(g, 0, 0, 0, 0, 0, 0);
            G.at(g, rootX + Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5, 0, 0, 0, a - Math.PI / 2);
            part.push(g);
        }
        // 扇骨
        for (let i = 0; i < 5; i++) {
            const a = -0.7 + (i / 4) * 1.4;
            part.push(G.at(G.box(0.30, 0.012, 0.012, '#8D6E63'), rootX + Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0, 0, 0, a));
        }
        part.push(G.at(G.torus(0.030, 0.010, '#C9A227', Math.PI * 2), rootX, 0, 0, 0, 0, 0));
        return { group: finish(part, null, 0.0) };
    }

    /* ---------------- 弓 ---------------- */
    function bow(p) {
        const wood = p.wood || '#6D4C33';
        const part = [];
        // 弓身：立式，沿 Y 展开
        const seg = 5;
        for (let i = 0; i < seg; i++) {
            const t = i / (seg - 1);
            const yy = -0.44 + t * 0.88;
            const xx = -0.16 + Math.pow(Math.abs(yy) / 0.44, 2) * 0.20;
            part.push(G.at(G.box(0.035, 0.24, 0.028, i % 2 ? wood : U.shade(wood, 0.12)), xx, yy, 0, 0, 0, (yy < 0 ? -1 : 1) * 0.55));
        }
        part.push(G.at(G.box(0.05, 0.13, 0.04, '#3E2723'), -0.13, 0, 0));
        // 弓弦
        part.push(G.at(G.cyl(0.005, 0.005, 0.90, '#EFE6D2', 4), -0.20, 0, 0, 0, 0, 0));
        // 握把缠绳
        part.push(G.at(G.cyl(0.028, 0.028, 0.10, '#8D6E63', 8), -0.13, 0, 0, 0, 0, 0));
        return { group: finish(part) };
    }

    const BUILD = {
        jian, guandao, dao, axe, ji, staff, fan, bow,
        spear: (p) => spear(p, false),
        lance: (p) => spear(p, true)
    };

    return {
        build(key, palette) {
            const fn = BUILD[key] || dao;
            return fn(palette || {});
        },
        /** 兵器长度，供 AI 与命中反馈参考 */
        length(key) {
            return ({ guandao: 2.3, spear: 2.2, lance: 2.0, ji: 2.2, axe: 1.7, staff: 2.0, jian: 1.0, dao: 0.95, fan: 0.5, bow: 0.9 })[key] || 1.0;
        },
        /**
         * 握把相对几何中心的偏移：长兵器要握在靠后 1/3 处，
         * 否则整根杆会以手心为中点，一半捅进地面。
         */
        grip(key) {
            return ({ guandao: 0.62, spear: 0.58, lance: 0.52, ji: 0.56, staff: 0.46, axe: 0.34 })[key] || 0;
        },
        /** 待机时兵器的仰角（弧度）：长兵器竖举略前倾，短兵器前指 */
        restAngle(key) {
            return ({
                guandao: 1.05, spear: 1.10, lance: 1.12, ji: 1.05,
                staff: 1.20, axe: 1.00, jian: 1.15, dao: 1.00, fan: 1.46, bow: 0.0
            })[key] || 0.0;
        },
        /** 待机时向体侧的外倾角，避免长杆从脸颊中间穿过去 */
        restTilt(key) {
            return ({ guandao: 0.30, spear: 0.30, lance: 0.30, ji: 0.30, staff: 0.28, axe: 0.26, jian: 0.10, dao: 0.10, fan: 0.16 })[key] || 0.0;
        }
    };
})();

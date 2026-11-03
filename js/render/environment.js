/* ============================================================
 * 三国战纪 · 关卡场景（3D 立体布景）
 * 远景山峦 → 中景村舍/宫墙 → 近景栏栅灯火 → 地面与前景草丛
 * 所有静态件按 24 单位分块合批，兼顾视锥剔除与绘制调用
 * ============================================================ */
'use strict';

const World = (function () {
    const G = TK.G;

    /* ---------------- 程序化贴图 ---------------- */
    function noiseTexture(base, alt, opts) {
        opts = opts || {};
        const n = 256;
        const c = document.createElement('canvas');
        c.width = c.height = n;
        const x = c.getContext('2d');
        x.fillStyle = base;
        x.fillRect(0, 0, n, n);
        // 大色块
        for (let i = 0; i < 90; i++) {
            x.globalAlpha = U.rand(0.05, 0.16);
            x.fillStyle = i % 3 ? alt : U.shade(base, 0.1);
            const r = U.rand(14, 52);
            x.beginPath();
            x.ellipse(U.rand(0, n), U.rand(0, n), r, r * U.rand(0.5, 0.9), U.rand(0, 3), 0, TAU);
            x.fill();
        }
        // 细颗粒
        for (let i = 0; i < 2600; i++) {
            x.globalAlpha = U.rand(0.05, 0.22);
            x.fillStyle = i % 2 ? alt : U.shade(base, i % 3 ? 0.12 : -0.14);
            const s = U.rand(0.8, 2.6);
            x.fillRect(U.rand(0, n), U.rand(0, n), s, s);
        }
        // 草叶
        if (opts.grass) {
            x.globalAlpha = 0.30;
            for (let i = 0; i < 260; i++) {
                const px = U.rand(0, n), py = U.rand(0, n);
                x.strokeStyle = i % 2 ? U.shade(base, 0.22) : U.shade(base, -0.18);
                x.lineWidth = 1;
                x.beginPath();
                x.moveTo(px, py);
                x.lineTo(px + U.rand(-2, 2), py - U.rand(3, 7));
                x.stroke();
            }
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.encoding = THREE.sRGBEncoding;
    t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
    }

    /** 道路贴图：中间实、两侧渐隐，直接压在地面上不会有硬边 */
    function pathTexture(base, alt) {
        const w = 256, h = 64;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d');
        x.clearRect(0, 0, w, h);
        const grd = x.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(0.16, base);
        grd.addColorStop(0.5, base);
        grd.addColorStop(0.84, base);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = grd;
        x.fillRect(0, 0, w, h);
        x.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < 1400; i++) {
            x.globalAlpha = U.rand(0.05, 0.25);
            x.fillStyle = i % 3 ? alt : U.shade(base.replace(/rgba?\([^)]*\)/, '#000'), 0.2);
            x.fillStyle = i % 3 ? alt : '#8A6E4A';
            const s = U.rand(1, 4);
            x.fillRect(U.rand(0, w), U.rand(0, h), s, s);
        }
        x.globalAlpha = 0.35;
        for (let i = 0; i < 40; i++) {
            x.fillStyle = '#7C6242';
            x.beginPath();
            x.ellipse(U.rand(0, w), U.rand(h * 0.25, h * 0.75), U.rand(2, 5), U.rand(1.5, 3.5), 0, 0, TAU);
            x.fill();
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        t.encoding = THREE.sRGBEncoding;
    t.colorSpace = THREE.SRGBColorSpace;
        return t;
    }

    /** 光晕贴图（火把 / 灯笼 / 烟） */
    function glowTexture() {
        const n = 128;
        const c = document.createElement('canvas');
        c.width = c.height = n;
        const x = c.getContext('2d');
        const g = x.createRadialGradient(n / 2, n / 2, 2, n / 2, n / 2, n / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.3, 'rgba(255,235,180,0.75)');
        g.addColorStop(0.65, 'rgba(255,160,70,0.22)');
        g.addColorStop(1, 'rgba(255,120,40,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, n, n);
        const t = new THREE.CanvasTexture(c);
        t.encoding = THREE.sRGBEncoding;
    t.colorSpace = THREE.SRGBColorSpace;
        return t;
    }

    let GLOW_TEX = null;
    const glowTex = () => (GLOW_TEX || (GLOW_TEX = glowTexture()));

    /* ============================================================
     * 合批器
     * ========================================================== */
    const CHUNK = 24;
    class Batch {
        constructor() { this.map = new Map(); }
        add(geo, x) {
            const k = Math.floor((x + 40) / CHUNK);
            if (!this.map.has(k)) this.map.set(k, []);
            this.map.get(k).push(geo);
        }
        flush(group, mat) {
            for (const [k, list] of this.map) {
                if (!list.length) continue;
                const geo = G.merge(list);
                const m = new THREE.Mesh(geo, mat);
                m.frustumCulled = true;
                group.add(m);
            }
            this.map.clear();
        }
    }

    /* ---------------- 基础零件 ---------------- */
    const b = {
        box(w, h, d, hex, x, y, z, rx, ry, rz) {
            return G.at(G.box(w, h, d, hex), x, y, z, rx, ry, rz);
        },
        cyl(rt, rb, h, hex, x, y, z, rx, ry, rz, seg) {
            return G.at(G.cyl(rt, rb, h, hex, seg || 10), x, y, z, rx, ry, rz);
        },
        cone(r, h, hex, x, y, z, rx, ry, rz, seg) {
            return G.at(G.cone(r, h, hex, seg || 8), x, y, z, rx, ry, rz);
        },
        sph(r, hex, x, y, z, sx, sy, sz) {
            return G.at(G.sphere(r, hex, 12, 9), x, y, z, 0, 0, 0, sx, sy, sz);
        }
    };

    /* ---------------- 植被 ---------------- */
    function tree(x, z, s, pal, kind) {
        const out = [];
        const trunkH = 2.3 * s;
        out.push(b.cyl(0.12 * s, 0.22 * s, trunkH, pal.wood, x, trunkH / 2, z, 0, 0, 0.06, 7));
        // 分枝
        out.push(b.cyl(0.07 * s, 0.10 * s, 1.0 * s, pal.wood, x + 0.35 * s, trunkH * 0.78, z, 0, 0, -0.7, 6));
        out.push(b.cyl(0.07 * s, 0.10 * s, 0.9 * s, pal.wood, x - 0.32 * s, trunkH * 0.72, z, 0, 0, 0.75, 6));

        if (kind === 'burnt') {
            out.push(b.cone(0.42 * s, 1.1 * s, '#2A201C', x, trunkH + 0.3 * s, z, 0.1, 0, 0.1, 5));
            out.push(b.cone(0.26 * s, 0.7 * s, '#241A16', x + 0.5 * s, trunkH * 0.85, z + 0.2, 0, 0, -0.8, 5));
            return out;
        }
        const leaf = kind === 'blossom' ? pal.bloom : pal.leaf;
        const leaf2 = kind === 'blossom' ? U.shade(pal.bloom, -0.12) : pal.leaf2;
        const n = 4;
        for (let i = 0; i < n; i++) {
            const a = i / n * TAU + 0.7;
            const rr = (0.55 + U.hash(x + i) * 0.28) * s;
            out.push(b.sph(rr, i % 2 ? leaf : leaf2,
                x + Math.cos(a) * 0.62 * s, trunkH + 0.45 * s + Math.sin(a * 2) * 0.28 * s,
                z + Math.sin(a) * 0.45 * s, 1.15, 0.9, 1.0));
        }
        out.push(b.sph(0.85 * s, leaf, x, trunkH + 1.0 * s, z, 1.2, 0.85, 1.1));
        return out;
    }

    function grassTuft(x, z, s, hex, hex2) {
        const out = [];
        for (let i = 0; i < 4; i++) {
            const a = -0.5 + i * 0.32;
            out.push(b.cone(0.045 * s, (0.42 + (i % 2) * 0.2) * s, i % 2 ? hex : hex2,
                x + Math.sin(a) * 0.10 * s, 0.21 * s, z + Math.cos(a) * 0.08 * s, 0.16, 0, a, 4));
        }
        return out;
    }

    function rock(x, z, s, hex, hex2) {
        return [
            b.sph(0.34 * s, hex, x, 0.22 * s, z, 1.0, 0.72, 0.86),
            b.sph(0.20 * s, hex2, x + 0.30 * s, 0.14 * s, z + 0.12 * s, 1.0, 0.8, 0.9)
        ];
    }

    /* ---------------- 建筑 ---------------- */
    function hut(x, z, s, pal, glow) {
        const out = { solid: [], glow: [] };
        const w = 2.8 * s, h = 1.9 * s, d = 2.2 * s;
        out.solid.push(b.box(w, h, d, pal.wood, x, h / 2, z));
        // 夯土墙脚
        out.solid.push(b.box(w * 1.06, 0.35 * s, d * 1.06, U.shade(pal.wood, -0.18), x, 0.18 * s, z));
        // 茅草顶
        const roof = G.at(G.cone(1.0, 1.0, U.shade(pal.leaf, -0.1), 4), x, h + 0.55 * s, z, 0, Math.PI / 4, 0, w * 0.95, 1.1 * s, d * 0.95);
        out.solid.push(roof);
        out.solid.push(b.box(w * 1.02, 0.10 * s, d * 1.02, U.shade(pal.wood, -0.3), x, h + 0.05 * s, z));
        // 门洞
        out.solid.push(b.box(0.78 * s, 1.25 * s, 0.12 * s, '#241812', x, 0.62 * s, z + d / 2 + 0.01));
        // 窗（暖光）
        out.glow.push(b.box(0.42 * s, 0.36 * s, 0.06 * s, pal.lantern, x - 0.78 * s, 1.28 * s, z + d / 2 + 0.02));
        return out;
    }

    function fence(x, z, len, pal) {
        const out = [];
        out.push(b.box(len, 0.09, 0.09, pal.wood, x + len / 2, 0.62, z));
        out.push(b.box(len, 0.09, 0.09, pal.wood, x + len / 2, 0.32, z));
        for (let i = 0; i <= len / 1.0; i++) {
            out.push(b.cyl(0.055, 0.07, 0.86, U.shade(pal.wood, -0.1), x + i * 1.0, 0.43, z, 0, 0, 0.04, 6));
        }
        return out;
    }

    function banner(x, z, pal, color) {
        const g = new THREE.Group();
        const poleH = 3.2;
        const pole = G.merge([
            b.cyl(0.045, 0.06, poleH, pal.wood, 0, poleH / 2, 0, 0, 0, 0, 6),
            b.sph(0.09, '#C9A227', 0, poleH, 0)
        ]);
        G.part(g, pole, null);

        // 旗面：带竖向布褶，挂在横杆上
        const cloth = new THREE.PlaneGeometry(0.72, 1.35, 4, 6);
        const pos = cloth.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const px = pos.array[i * 3], py = pos.array[i * 3 + 1];
            pos.array[i * 3 + 2] = Math.sin(px * 9) * 0.04;
            pos.array[i * 3] = px * (0.92 + 0.08 * (0.675 - py));
            pos.array[i * 3 + 1] = py + 0.66;
        }
        cloth.computeVertexNormals();
        G.paint(cloth, color);
        const clothMesh = G.part(g, cloth, new THREE.MeshToonMaterial({
            color: 0xffffff, vertexColors: true, gradientMap: TK.gradient, side: THREE.DoubleSide
        }), { outline: false });
        clothMesh.position.set(0.42, poleH - 1.0, 0);
        clothMesh.userData.cloth = true;

        // 横杆
        G.part(g, G.merge([b.box(0.9, 0.05, 0.05, '#C9A227', 0.45, poleH - 0.15, 0)]), null);
        g.position.set(x, 0, z);
        g.userData.cloth = clothMesh;
        g.userData.phase = U.rand(0, 6);
        return g;
    }

    function torch(x, z, pal) {
        const g = new THREE.Group();
        const parts = [
            b.cyl(0.06, 0.08, 1.5, pal.wood, 0, 0.75, 0, 0, 0, 0.04, 6),
            b.cyl(0.16, 0.10, 0.26, '#3E2A22', 0, 1.55, 0, 0, 0, 0, 8)
        ];
        G.part(g, G.merge(parts), null);
        const flame = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex(), color: new THREE.Color(pal.lantern), blending: THREE.AdditiveBlending,
            transparent: true, depthWrite: false, opacity: 0.95
        }));
        flame.scale.setScalar(1.5);
        flame.position.set(0, 1.78, 0);
        g.add(flame);
        g.position.set(x, 0, z);
        g.userData.flame = flame;
        g.userData.phase = U.rand(0, 9);
        return g;
    }

    function lantern(x, y, z, pal) {
        const g = new THREE.Group();
        const body = G.merge([
            G.at(G.sphere(0.22, pal.lantern, 12, 9), 0, 0, 0, 0, 0, 0, 1, 1.2, 1),
            b.cyl(0.12, 0.12, 0.05, '#7A2E12', 0, 0.27, 0, 0, 0, 0, 8),
            b.cyl(0.12, 0.12, 0.05, '#7A2E12', 0, -0.27, 0, 0, 0, 0, 8)
        ]);
        G.part(g, body, new THREE.MeshBasicMaterial({ color: new THREE.Color(pal.lantern) }), { outline: false });
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex(), color: new THREE.Color(pal.lantern), blending: THREE.AdditiveBlending,
            transparent: true, depthWrite: false, opacity: 0.55
        }));
        halo.scale.setScalar(1.4);
        g.add(halo);
        g.position.set(x, y, z);
        g.userData.halo = halo;
        return g;
    }

    /* ============================================================
     * 三大主题
     * ========================================================== */
    function buildPlains(root, level, pal, anim) {
        const solid = new Batch(), glow = new Batch();
        const L = level.length;

        // 田垄与远山
        for (let i = 0; i < 7; i++) {
            const x = 10 + i * 18;
            solid.add(b.cone(5.6, 9.5, U.shade(pal.fog, -0.08), x, 0, -52, 0, 0.4, 0, 7), x);
            solid.add(b.cone(4.0, 7.0, U.shade(pal.fog, 0.06), x + 8, 0, -60, 0, 0.2, 0, 6), x);
        }
        // 村庄
        for (let i = 0; i < 6; i++) {
            const x = 8 + i * 20 + U.rand(-2, 2);
            const s = U.rand(0.85, 1.15);
            const h = hut(x, -11 - U.rand(0, 3), s, pal);
            for (const g of h.solid) solid.add(g, x);
            for (const g of h.glow) glow.add(g, x);
        }
        // 桃林
        for (let i = 0; i < 26; i++) {
            const x = U.rand(-6, L + 12);
            const z = -6 - U.rand(0, 9);
            const s = U.rand(0.9, 1.5);
            for (const g of tree(x, z, s, pal, i % 3 === 0 ? 'blossom' : 'leaf')) solid.add(g, x);
        }
        // 近景篱笆与石
        for (let i = 0; i < 10; i++) {
            const x = 4 + i * 11;
            for (const g of fence(x, -3.2, 6, pal)) solid.add(g, x);
        }
        for (let i = 0; i < 40; i++) {
            const x = U.rand(0, L);
            const z = U.rand(-2.2, 0.4);
            for (const g of grassTuft(x, z, U.rand(0.9, 1.4), pal.groundAlt, pal.leaf)) solid.add(g, x);
        }
        for (let i = 0; i < 26; i++) {
            const x = U.rand(0, L);
            const z = U.rand(-5, -1);
            for (const g of rock(x, z, U.rand(0.5, 1.1), pal.rock, U.shade(pal.rock, -0.12))) solid.add(g, x);
        }
        // 战场前景草从（遮挡画面下缘，增加纵深）
        for (let i = 0; i < 60; i++) {
            const x = U.rand(-10, L + 10);
            const s = U.rand(1.6, 2.6);
            for (const g of grassTuft(x, 5.4, s, '#3E5A2A', '#4E6A32')) solid.add(g, x);
        }

        solid.flush(root, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: TK.gradient }));
        glow.flush(root, new THREE.MeshBasicMaterial({ vertexColors: true }));

        // 旗幡与火把
        for (let i = 0; i < 8; i++) {
            const x = 12 + i * 13;
            const bn = banner(x, -4.6, pal, i % 3 === 0 ? '#B3352B' : '#D8B25A');
            root.add(bn);
            anim.push(bn);
        }
        for (let i = 0; i < 7; i++) {
            const x = 6 + i * 17;
            const t = torch(x, 3.9, pal);
            root.add(t);
            anim.push(t);
        }
        // 村口牌楼
        const gateX = 6;
        const gate = [];
        gate.push(b.cyl(0.16, 0.20, 3.4, '#6B4A2F', gateX, 1.7, -2.6, 0, 0, 0, 8));
        gate.push(b.cyl(0.16, 0.20, 3.4, '#6B4A2F', gateX + 4.2, 1.7, -2.6, 0, 0, 0, 8));
        gate.push(b.box(4.9, 0.22, 0.36, '#8B3A2E', gateX + 2.1, 3.5, -2.6));
        gate.push(b.box(5.4, 0.16, 0.5, '#5A2A22', gateX + 2.1, 3.68, -2.6));
        const gm = new THREE.Mesh(G.merge(gate), new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: TK.gradient }));
        root.add(gm);
    }

    function buildFire(root, level, pal, anim) {
        const solid = new Batch(), glow = new Batch();
        const L = level.length;

        for (let i = 0; i < 7; i++) {
            const x = 12 + i * 17;
            solid.add(b.cone(5.0, 8.0, '#3A2420', x, 0, -50, 0, 0.3, 0, 6), x);
        }
        // 焦木
        for (let i = 0; i < 24; i++) {
            const x = U.rand(-4, L + 8);
            const z = -6 - U.rand(0, 10);
            for (const g of tree(x, z, U.rand(0.9, 1.4), pal, 'burnt')) solid.add(g, x);
        }
        // 营帐（残破）
        for (let i = 0; i < 6; i++) {
            const x = 14 + i * 19;
            const z = -8 - U.rand(0, 3);
            const s = U.rand(1.0, 1.3);
            solid.add(b.cone(2.1 * s, 2.0 * s, U.shade(pal.wood, 0.1), x, 1.0 * s, z, 0, 0.5, 0, 4), x);
            solid.add(b.box(2.6 * s, 0.08, 0.08, '#2A1A14', x, 1.9 * s, z), x);
            glow.add(b.box(0.3, 0.3, 0.05, '#FF8A3C', x, 0.9 * s, z + 1.05 * s), x);
        }
        // 栅栏与残车
        for (let i = 0; i < 12; i++) {
            const x = U.rand(0, L);
            const z = U.rand(-3.4, -1.4);
            const w = U.rand(1.6, 3.0);
            solid.add(b.box(w, 0.12, 0.12, '#2E2018', x, 0.55, z, 0, 0, U.rand(-0.2, 0.2)), x);
            solid.add(b.box(w, 0.10, 0.10, '#2E2018', x, 0.25, z, 0, 0, U.rand(-0.2, 0.2)), x);
        }
        for (let i = 0; i < 34; i++) {
            const x = U.rand(0, L);
            const z = U.rand(-4, 0.3);
            for (const g of rock(x, z, U.rand(0.4, 1.0), '#3A3230', '#2A2422')) solid.add(g, x);
        }
        for (let i = 0; i < 50; i++) {
            const x = U.rand(-8, L + 8);
            for (const g of grassTuft(x, 5.2, U.rand(1.4, 2.4), '#33291E', '#3E3224')) solid.add(g, x);
        }

        solid.flush(root, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: TK.gradient }));
        glow.flush(root, new THREE.MeshBasicMaterial({ vertexColors: true }));

        // 火盆（每处一团火 + 光晕）
        for (let i = 0; i < 9; i++) {
            const x = 8 + i * 14;
            const t = torch(x, -3.0, pal);
            root.add(t); anim.push(t);
        }
        // 战场两侧余烬
        for (let i = 0; i < 5; i++) {
            const bn = banner(18 + i * 24, 4.4, pal, '#8B2A22');
            root.add(bn); anim.push(bn);
        }
    }

    function buildPalace(root, level, pal, anim) {
        const solid = new Batch(), glow = new Batch();
        const L = level.length;

        // 宫墙：每 12 米一段，红柱 + 青瓦顶
        for (let i = 0; i < 10; i++) {
            const x = i * 13;
            solid.add(b.box(13, 5.2, 0.6, '#8E4A3A', x + 6.5, 2.6, -9.5), x);
            // 檐口
            solid.add(b.box(13.4, 0.5, 1.1, '#2E3A44', x + 6.5, 5.3, -9.4), x);
            solid.add(b.box(13.4, 0.3, 1.3, '#22303A', x + 6.5, 5.6, -9.2), x);
            // 红柱
            for (let k = 0; k < 4; k++) {
                solid.add(b.cyl(0.20, 0.24, 5.0, '#7A2A24', x + 1.6 + k * 3.2, 2.5, -8.6, 0, 0, 0, 8), x);
            }
            // 窗棂
            solid.add(b.box(2.0, 1.5, 0.08, '#3A2A22', x + 5.5, 3.0, -9.15), x);
            for (let k = 0; k < 5; k++) {
                solid.add(b.box(0.07, 1.5, 0.06, pal.lantern, x + 4.6 + k * 0.45, 3.0, -9.1), x);
                solid.add(b.box(2.0, 0.07, 0.06, pal.lantern, x + 5.5, 2.4 + k * 0.3, -9.1), x);
            }
            // 廊下灯笼
            glow.add(b.box(0.45, 0.6, 0.35, pal.lantern, x + 3.0, 3.7, -8.3), x);
            glow.add(b.box(0.45, 0.6, 0.35, pal.lantern, x + 9.6, 3.7, -8.3), x);
        }
        // 石阶与地面条石
        for (let i = 0; i < 4; i++) {
            solid.add(b.box(L, 0.14, 0.5, '#4A4F5E', L / 2, 0.07, -8.4 + i * 0.6), 0);
        }
        // 阙楼
        const tx = level.boss ? level.boss.at + 4 : L - 10;
        solid.add(b.box(7, 8, 5, '#5A4038', tx, 4, -14), tx);
        solid.add(b.box(8.4, 0.6, 6.2, '#2A3038', tx, 8.2, -14), tx);
        solid.add(b.box(9.6, 0.4, 7.0, '#222C34', tx, 8.6, -14), tx);
        solid.add(b.cone(0.1, 0.1, '#222C34', tx, 8.8, -14, 0, 0, 0, 4), tx);

        // 松树
        for (let i = 0; i < 14; i++) {
            const x = U.rand(0, L);
            const z = -5.5 - U.rand(0, 2.5);
            const s = U.rand(0.8, 1.2);
            for (const g of tree(x, z, s, pal, 'leaf')) solid.add(g, x);
        }
        // 铜炉
        for (let i = 0; i < 6; i++) {
            const x = 10 + i * 20;
            solid.add(b.cyl(0.42, 0.52, 0.9, '#5A4A32', x, 0.45, 3.2, 0, 0, 0, 8), x);
            solid.add(b.cyl(0.58, 0.5, 0.22, '#7A6440', x, 0.95, 3.2, 0, 0, 0, 8), x);
            glow.add(b.box(0.5, 0.12, 0.5, pal.lantern, x, 1.02, 3.2), x);
        }
        for (let i = 0; i < 26; i++) {
            const x = U.rand(0, L);
            for (const g of rock(x, U.rand(-2, 0.2), U.rand(0.4, 0.8), pal.rock, U.shade(pal.rock, -0.1))) solid.add(g, x);
        }
        for (let i = 0; i < 40; i++) {
            const x = U.rand(-8, L + 8);
            for (const g of grassTuft(x, 5.2, U.rand(1.2, 2.0), '#1E2A24', '#28352C')) solid.add(g, x);
        }

        solid.flush(root, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: TK.gradient }));
        glow.flush(root, new THREE.MeshBasicMaterial({ vertexColors: true }));

        for (let i = 0; i < 10; i++) {
            const x = 3 + i * 12.5;
            const ln = lantern(x, 3.7, -8.0, pal);
            root.add(ln); anim.push(ln);
        }
    }

    /* ============================================================
     * World
     * ========================================================== */
    class WorldScene {
        constructor(level) {
            this.level = level;
            this.theme = level.theme;
            this.pal = level.palette;
            this.root = new THREE.Group();
            this.anim = [];
            this.time = 0;

            const L = level.length;

            /* ---- 地面 ---- */
            const gTex = noiseTexture(this.pal.ground, this.pal.groundAlt, { grass: true });
            gTex.repeat.set(L / 4, 8);
            this.groundMat = new THREE.MeshToonMaterial({ map: gTex, gradientMap: TK.gradient });
            const ground = new THREE.Mesh(new THREE.PlaneGeometry(L + 80, 34), this.groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.position.set(L / 2, -0.02, -9);
            this.root.add(ground);

            /* ---- 道路 ---- */
            const pTex = pathTexture(this.pal.path, this.pal.pathAlt);
            pTex.repeat.set(L / 6, 1);
            this.pathMat = new THREE.MeshToonMaterial({
                map: pTex, gradientMap: TK.gradient, transparent: true, depthWrite: false
            });
            const path = new THREE.Mesh(new THREE.PlaneGeometry(L + 40, GROUND.zMax + 1.2), this.pathMat);
            path.rotation.x = -Math.PI / 2;
            path.position.set(L / 2, 0.015, (GROUND.zMax + 1.2) / 2 - 0.6);
            path.renderOrder = 1;
            this.root.add(path);

            /* ---- 主题布景 ---- */
            if (this.theme === 'fire') buildFire(this.root, level, this.pal, this.anim);
            else if (this.theme === 'palace') buildPalace(this.root, level, this.pal, this.anim);
            else buildPlains(this.root, level, this.pal, this.anim);

            /* ---- 飘浮尘埃 ---- */
            this._buildMotes();

            /* ---- 火光补光（近身两盏，写实又不拖性能） ---- */
            this.warmA = new THREE.PointLight(new THREE.Color(this.pal.lantern), 0.0, 14, 2);
            this.warmB = new THREE.PointLight(new THREE.Color(this.pal.lantern), 0.0, 14, 2);
            this.root.add(this.warmA, this.warmB);
        }

        _buildMotes() {
            const n = this.theme === 'fire' ? 140 : 80;
            const pos = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) {
                pos[i * 3] = U.rand(-10, this.level.length + 10);
                pos[i * 3 + 1] = U.rand(0.2, 5.5);
                pos[i * 3 + 2] = U.rand(-8, 5);
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.PointsMaterial({
                size: this.theme === 'fire' ? 0.09 : 0.06,
                color: new THREE.Color(this.theme === 'fire' ? '#FFB066' : '#FFF0C8'),
                transparent: true, opacity: 0.55, depthWrite: false,
                blending: THREE.AdditiveBlending, sizeAttenuation: true
            });
            this.motes = new THREE.Points(geo, mat);
            this.motes.frustumCulled = false;
            this.root.add(this.motes);
            this.moteSeed = pos;
        }

        update(dt, camX) {
            this.time += dt;
            const t = this.time;
            for (const o of this.anim) {
                if (o.userData.cloth) {
                    const ph = o.userData.phase || 0;
                    o.userData.cloth.rotation.z = Math.sin(t * 1.6 + ph) * 0.10 - 0.04;
                    o.userData.cloth.rotation.y = Math.sin(t * 1.1 + ph) * 0.12;
                }
                if (o.userData.flame) {
                    const ph = o.userData.phase || 0;
                    const s = 1.35 + Math.sin(t * 9 + ph) * 0.18 + Math.sin(t * 17 + ph * 2) * 0.08;
                    o.userData.flame.scale.set(s * 0.9, s * 1.25, 1);
                    o.userData.flame.material.opacity = 0.75 + Math.sin(t * 13 + ph) * 0.2;
                }
                if (o.userData.halo) {
                    o.userData.halo.material.opacity = 0.42 + Math.sin(t * 2.2 + o.position.x) * 0.12;
                }
            }

            // 尘埃缓慢上浮 + 跟随镜头循环
            if (this.motes) {
                const arr = this.motes.geometry.attributes.position.array;
                const halfW = 26;
                for (let i = 0; i < arr.length / 3; i++) {
                    arr[i * 3 + 1] += dt * (0.12 + (i % 5) * 0.02);
                    arr[i * 3] += dt * 0.16;
                    if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = 0.2;
                    if (arr[i * 3] > camX + halfW) arr[i * 3] -= halfW * 2;
                    if (arr[i * 3] < camX - halfW) arr[i * 3] += halfW * 2;
                }
                this.motes.geometry.attributes.position.needsUpdate = true;
            }

            // 近身火光跟着镜头，照亮角色与地面
            const k = 0.55 + 0.12 * Math.sin(t * 7.3);
            this.warmA.position.set(camX - 3.2, 1.6, 2.6);
            this.warmB.position.set(camX + 3.6, 1.4, -0.8);
            const warmI = this.theme === 'palace' ? 0.5 : (this.theme === 'fire' ? 1.15 : 0.0);
            this.warmA.intensity = warmI * k;
            this.warmB.intensity = warmI * (1.2 - k * 0.5);
        }
    }

    return {
        create(level) { return new WorldScene(level); }
    };
})();

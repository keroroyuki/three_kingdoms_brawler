/* ============================================================
 * 三国战纪 · 卡通渲染底座
 * 材质（三阶色阶 toon）、描边、几何拼装与合批
 * ============================================================ */
'use strict';

THREE.ColorManagement.enabled = true;

const TK = window.TK = window.TK || {};

/* ---------------- 颜色 ---------------- */
TK.col = function (hex) { return new THREE.Color(hex); };

/* ---------------- 三阶色阶贴图 ---------------- */
(function buildGradient() {
    // 暗部压到 56/255：原来 96 起跳，背光面永远不暗，模型看起来像平面贴纸
    const v = new Uint8Array([56, 118, 196, 244, 255]);
    const t = new THREE.DataTexture(v, v.length, 1, THREE.RedFormat);
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    TK.gradient = t;
    t.__shared = true;   // 模块级共享贴图，切关/销毁场景时不能 dispose

    // 金属用的更硬朗的三阶（暗部更深、高光更亮）
    const v2 = new Uint8Array([44, 118, 208, 255]);
    const t2 = new THREE.DataTexture(v2, v2.length, 1, THREE.RedFormat);
    t2.minFilter = THREE.NearestFilter;
    t2.magFilter = THREE.NearestFilter;
    t2.generateMipmaps = false;
    t2.needsUpdate = true;
    TK.gradientMetal = t2;
    t2.__shared = true;
})();

/* ---------------- 材质 ---------------- */
const TOON_BASE = new THREE.MeshToonMaterial({
    vertexColors: true,
    gradientMap: TK.gradient,
    color: 0xffffff
});
TOON_BASE.__shared = true;

const OUTLINE_MAT = new THREE.ShaderMaterial({
    uniforms: {
        uColor: { value: new THREE.Color('#170F0A') },
        uWidth: { value: 0.013 }
    },
    vertexShader: [
        'uniform float uWidth;',
        'void main() {',
        '  vec3 p = position + normalize(normal) * uWidth;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
        '}'
    ].join('\n'),
    fragmentShader: [
        'uniform vec3 uColor;',
        'void main() { gl_FragColor = vec4(uColor, 1.0); }'
    ].join('\n'),
    side: THREE.BackSide
});
OUTLINE_MAT.__shared = true;

TK.mat = {
    /** 每个角色独立一份，便于受击闪白 */
    toon() { return TOON_BASE.clone(); },
    outline() { return OUTLINE_MAT; },
    /** 特效用的自发光材质 */
    glow(hex, opacity) {
        return new THREE.MeshBasicMaterial({
            color: new THREE.Color(hex),
            transparent: true,
            opacity: opacity == null ? 1 : opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    },
    basic(hex, opacity) {
        return new THREE.MeshBasicMaterial({
            color: new THREE.Color(hex),
            transparent: opacity != null && opacity < 1,
            opacity: opacity == null ? 1 : opacity,
            depthWrite: opacity == null || opacity >= 1
        });
    }
};

/* ============================================================
 * 几何工具：统一带上顶点色，方便按部位合批成一次 draw call
 * ============================================================ */
const G = {};

/** 给几何体刷上顶点色 */
G.paint = function (geo, hex) {
    const c = TK.col(hex);
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
};

/** 渐变刷色：沿某个轴从 colA 过渡到 colB，用于布料的明暗过渡 */
G.paintGrad = function (geo, hexA, hexB, axis, from, to) {
    const a = TK.col(hexA), b = TK.col(hexB);
    const pos = geo.attributes.position;
    const n = pos.count;
    const arr = new Float32Array(n * 3);
    const key = axis === 'y' ? 1 : (axis === 'z' ? 2 : 0);
    for (let i = 0; i < n; i++) {
        let t = (pos.array[i * 3 + key] - from) / (to - from || 1);
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        arr[i * 3] = a.r + (b.r - a.r) * t;
        arr[i * 3 + 1] = a.g + (b.g - a.g) * t;
        arr[i * 3 + 2] = a.b + (b.b - a.b) * t;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
};

/** 位移 / 旋转 / 缩放（就地修改） */
G.at = function (geo, x, y, z, rx, ry, rz, sx, sy, sz) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler(rx || 0, ry || 0, rz || 0);
    q.setFromEuler(e);
    m.compose(
        new THREE.Vector3(x || 0, y || 0, z || 0),
        q,
        new THREE.Vector3(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz)
    );
    geo.applyMatrix4(m);
    return geo;
};

G.sphere = function (r, hex, ws, hs, sx, sy, sz) {
    const g = new THREE.SphereGeometry(r, ws || 16, hs || 12);
    if (sx != null) g.scale(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    return G.paint(g, hex);
};

G.capsule = function (r, len, hex, ws) {
    const g = new THREE.CapsuleGeometry(r, len, 6, ws || 12);
    return G.paint(g, hex);
};

G.box = function (w, h, d, hex) {
    return G.paint(new THREE.BoxGeometry(w, h, d), hex);
};

G.cyl = function (rt, rb, h, hex, seg) {
    return G.paint(new THREE.CylinderGeometry(rt, rb, h, seg || 14), hex);
};

G.cone = function (r, h, hex, seg) {
    return G.paint(new THREE.ConeGeometry(r, h, seg || 12), hex);
};

G.torus = function (r, tube, hex, arc) {
    return G.paint(new THREE.TorusGeometry(r, tube, 8, 20, arc == null ? Math.PI * 2 : arc), hex);
};

G.ring = function (ri, ro, hex, seg) {
    return G.paint(new THREE.RingGeometry(ri, ro, seg || 24), hex);
};

G.plane = function (w, h, hex, ws, hs) {
    return G.paint(new THREE.PlaneGeometry(w, h, ws || 1, hs || 1), hex);
};

/** 车削体：pts 为 [x,y] 轮廓，用来做下摆、发髻、胡须等 */
G.lathe = function (pts, hex, seg) {
    const v = pts.map(p => new THREE.Vector2(p[0], p[1]));
    return G.paint(new THREE.LatheGeometry(v, seg || 16), hex);
};

/**
 * 多边形挤出板：pts 为 [x,y] 轮廓（逆时针），depth 为厚度。
 * 用来做偃月刀刃这种带弧的异形片，比拿几个方块拼干净得多。
 */
G.shape = function (pts, depth, hex) {
    const d = depth || 0.03;
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -d / 2);
    return G.paint(g, hex);
};

/** 合并几何（统一转非索引，去掉 uv，只保留 position/normal/color） */
G.merge = function (list) {
    const geos = [];
    for (let g of list) {
        if (!g) continue;
        if (g.index) g = g.toNonIndexed();
        if (!g.attributes.color) G.paint(g, '#ffffff');
        geos.push(g);
    }
    let total = 0;
    for (const g of geos) total += g.attributes.position.count;
    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    let o = 0;
    for (const g of geos) {
        const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
        pos.set(p.array, o * 3);
        nor.set(n.array, o * 3);
        col.set(c.array, o * 3);
        o += p.count;
        g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
};

/** 生成一个带描边的部件（描边与本体共用几何，仅材质不同） */
G.part = function (group, geo, mat, opts) {
    opts = opts || {};
    const mesh = new THREE.Mesh(geo, mat || TOON_BASE);
    if (opts.outline !== false) {
        const o = new THREE.Mesh(geo, OUTLINE_MAT);
        o.renderOrder = (opts.order || 0) - 1;
        mesh.add(o);
    }
    mesh.renderOrder = opts.order || 0;
    if (opts.name) mesh.name = opts.name;
    group.add(mesh);
    return mesh;
};


/* ---------------- 通用径向光晕贴图 ---------------- */
let _GLOW = null;
TK.glowTex = function () {
    if (_GLOW) return _GLOW;
    const n = 128;
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(n / 2, n / 2, 1, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,235,190,0.55)');
    g.addColorStop(0.7, 'rgba(255,170,90,0.16)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, n, n);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.colorSpace = THREE.SRGBColorSpace;
    t.__shared = true;
    _GLOW = t;
    return t;
};

TK.G = G;

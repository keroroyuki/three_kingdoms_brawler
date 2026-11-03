/* ============================================================
 * 三国战纪 · 掉落道具与可破坏物（three.js 版）
 *
 * 每件道具/木箱的部件在首次使用时合并成单一 geometry，
 * 之后所有同类实例共享几何与材质 —— 单件只占 1 次 draw call。
 * ============================================================ */
'use strict';

const ITEM_KINDS = {
    baozi: { name: '胡饼', heal: 38, color: '#EBC98C', dark: '#A9722E', icon: 'bun', score: 120 },
    roast: { name: '炙鸡', heal: 82, color: '#D7802F', dark: '#7E3D10', icon: 'meat', score: 260 },
    wine: { name: '杜康酒', rage: 55, color: '#8E24AA', dark: '#4A148C', icon: 'jar', score: 200 },
    gold: { name: '金铢', score: 500, color: '#FFD700', dark: '#C9A227', icon: 'coin' },
    jade: { name: '玉玺', score: 2000, color: '#4DD0E1', dark: '#006064', icon: 'jade' },
    scroll: { name: '兵书', rage: 100, heal: 20, color: '#EFEFEF', dark: '#8D6E63', icon: 'scroll', score: 600 }
};

/* ============================================================
 * 投影贴图（道具/木箱落地时的接地影）
 * ========================================================== */
let _SOFT_SHADOW = null;
function softShadowTex() {
    if (_SOFT_SHADOW) return _SOFT_SHADOW;
    const n = 64;
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(n / 2, n / 2, 1, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, n, n);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.colorSpace = THREE.SRGBColorSpace;
    _SOFT_SHADOW = t;
    return t;
}

/* ============================================================
 * 道具模型：原点在几何中心，长宽约 0.3~0.4 世界单位
 * ========================================================== */
function buildItemGeometry(d) {
    const parts = [];

    switch (d.icon) {
        /* 胡饼：汉末自西域传入，饼面撒胡麻，是行军最常见的干粮 */
        case 'bun': {
            parts.push(G.at(G.sphere(0.155, d.color, 16, 12, 1, 0.54, 1), 0, 0, 0));
            // 饼面隆起的边圈
            parts.push(G.at(G.torus(0.112, 0.016, d.dark), 0, 0.055, 0, Math.PI / 2, 0, 0));
            // 芝麻：位置固定，保证每次掉落长得一样
            const seeds = [
                [-0.07, 0.076, -0.02], [-0.02, 0.083, -0.05], [0.035, 0.082, -0.035],
                [0.075, 0.075, 0.01], [-0.055, 0.079, 0.045], [0.0, 0.084, 0.05],
                [0.055, 0.078, 0.06], [-0.095, 0.070, 0.025]
            ];
            for (const s of seeds) {
                parts.push(G.at(G.sphere(0.014, '#FBF3DC', 6, 5, 1, 0.55, 1.35), s[0], s[1], s[2]));
            }
            break;
        }

        /* 炙鸡腿：汉画像石庖厨图常见「貊炙」，整腿炙烤，骨端便于持握 */
        case 'meat': {
            const tilt = 1.12;
            parts.push(G.at(G.capsule(0.088, 0.13, d.color, 12), -0.03, -0.01, 0, 0, 0, tilt));
            // 烤痕
            parts.push(G.at(G.torus(0.089, 0.011, d.dark), -0.055, 0.03, 0, Math.PI / 2, 0.00, 0.62));
            parts.push(G.at(G.torus(0.088, 0.009, d.dark), -0.02, 0.003, 0, Math.PI / 2, 0.00, 0.62));
            // 腿骨
            parts.push(G.at(G.cyl(0.021, 0.024, 0.17, '#EFE6D2', 8), 0.10, 0.09, 0, 0, 0, tilt));
            parts.push(G.at(G.sphere(0.036, '#EFE6D2', 10, 8), 0.165, 0.15, 0, 0, 0, 0, 1, 0.8, 0.8));
            break;
        }

        /* 杜康酒：小口鼓腹灰陶，红布封口扎绳，颈下贴「酒」字签 */
        case 'wine': {
            parts.push(G.lathe([
                [0.001, -0.20], [0.135, -0.195], [0.185, -0.12], [0.192, -0.02],
                [0.165, 0.075], [0.105, 0.125], [0.082, 0.17], [0.094, 0.192], [0.001, 0.195]
            ], d.color, 16));
            // 红布封口
            parts.push(G.at(G.cyl(0.108, 0.125, 0.038, '#B71C1C', 14), 0, 0.198, 0));
            // 扎绳
            parts.push(G.at(G.torus(0.126, 0.012, '#D8BC7A'), 0, 0.185, 0, Math.PI / 2, 0, 0));
            // 酒字签（两道墨痕代替字，小尺寸下仍可读）
            parts.push(G.at(G.plane(0.105, 0.115, '#F6EFDD'), 0, -0.005, 0.188));
            parts.push(G.at(G.box(0.062, 0.011, 0.006, '#3E2723'), 0, 0.026, 0.193));
            parts.push(G.at(G.box(0.062, 0.011, 0.006, '#3E2723'), 0, -0.002, 0.193));
            parts.push(G.at(G.box(0.040, 0.011, 0.006, '#3E2723'), 0, -0.030, 0.193));
            break;
        }

        /* 金铢：外圆内方的五铢形制，内外有廓 */
        case 'coin': {
            parts.push(G.at(G.cyl(0.155, 0.155, 0.028, d.color, 22), 0, 0, 0, Math.PI / 2, 0, 0));
            parts.push(G.at(G.torus(0.118, 0.010, d.dark), 0, 0, 0.016, 0, 0, 0));
            parts.push(G.at(G.torus(0.118, 0.010, d.dark), 0, 0, -0.016, 0, 0, 0));
            // 方孔
            parts.push(G.at(G.box(0.055, 0.055, 0.034, '#3A2A08'), 0, 0, 0));
            parts.push(G.at(G.box(0.062, 0.008, 0.036, d.dark), 0, 0.073, 0));
            parts.push(G.at(G.box(0.062, 0.008, 0.036, d.dark), 0, -0.073, 0));
            break;
        }

        /* 玉玺：螭虎钮 + 印台 + 朱砂印面 */
        case 'jade': {
            parts.push(G.at(G.box(0.30, 0.16, 0.26, d.color), 0, -0.05, 0));
            parts.push(G.at(G.box(0.306, 0.045, 0.266, '#C62828'), 0, -0.125, 0));
            // 螭虎钮
            parts.push(G.at(G.box(0.16, 0.09, 0.13, d.color), 0, 0.06, 0));
            parts.push(G.at(G.sphere(0.072, d.color, 12, 9, 1.15, 0.9, 1), 0.02, 0.12, 0));
            parts.push(G.at(G.cone(0.026, 0.07, d.color, 6), -0.055, 0.13, 0, 0, 0, 0.4));
            parts.push(G.at(G.cone(0.026, 0.07, d.color, 6), 0.085, 0.13, 0, 0, 0, -0.4));
            // 印面朱砂
            parts.push(G.at(G.plane(0.24, 0.18, '#B71C1C'), 0, -0.152, 0, -Math.PI / 2, 0, 0));
            break;
        }

        /* 兵书：三国书于竹简，以麻绳编联 */
        case 'scroll': {
            const N = 6;
            for (let i = 0; i < N; i++) {
                const x = -0.135 + i * 0.054;
                parts.push(G.at(G.box(0.044, 0.27, 0.032, i % 2 ? '#E0BC7C' : '#CBA35C'), x, 0, 0));
                for (let j = 0; j < 3; j++) {
                    parts.push(G.at(G.box(0.028, 0.012, 0.006, '#2B1B12'), x, 0.055 - j * 0.055, 0.019));
                }
            }
            // 编绳两道
            parts.push(G.at(G.box(0.34, 0.014, 0.042, '#4E342E'), 0, 0.072, 0));
            parts.push(G.at(G.box(0.34, 0.014, 0.042, '#4E342E'), 0, -0.072, 0));
            break;
        }
    }

    // 竹简上的墨痕需要深色而不是透明，单独刷一遍顶点色
    return G.merge(parts);
}

/** 每种道具共享的几何/材质缓存 */
const ITEM_ASSETS = {};
function itemAsset(kind) {
    let a = ITEM_ASSETS[kind];
    if (a) return a;
    const d = ITEM_KINDS[kind] || ITEM_KINDS.gold;
    a = ITEM_ASSETS[kind] = {
        geo: buildItemGeometry(d),
        mat: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: TK.gradient }),
        shadowGeo: new THREE.PlaneGeometry(1, 1),
        shadowMat: new THREE.MeshBasicMaterial({
            map: softShadowTex(), transparent: true, opacity: 0.7, depthWrite: false
        })
    };
    return a;
}

/* ============================================================
 * Item
 * ========================================================== */
class Item {
    constructor(game, cfg) {
        this.game = game;
        this.kindKey = cfg.kind;
        this.def = ITEM_KINDS[cfg.kind] || ITEM_KINDS.gold;
        this.x = cfg.x; this.z = cfg.z; this.y = cfg.y != null ? cfg.y : 1.0;
        this.vx = cfg.vx != null ? cfg.vx : U.rand(-1.2, 1.2);
        this.vy = cfg.vy != null ? cfg.vy : 3.0;
        this.t = U.rand(0, 6);
        this.dead = false;
        this.life = 0;
        this.maxLife = 22;
        this.grounded = false;
        this.magnet = 0;

        const A = itemAsset(this.kindKey);
        this.group = new THREE.Group();
        this.mesh = new THREE.Mesh(A.geo, A.mat);
        this.mesh.add(new THREE.Mesh(A.geo, TK.mat.outline()));
        this.group.add(this.mesh);

        // 外发光：替代原 2D 精灵的径向光晕，同时是暗场地上的可读性保障
        this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: TK.glowTex(),
            color: new THREE.Color(this.def.color),
            transparent: true, opacity: 0.5, depthWrite: false,
            blending: THREE.AdditiveBlending
        }));
        this.halo.scale.setScalar(0.72);
        this.group.add(this.halo);

        this.shadow = new THREE.Mesh(A.shadowGeo, A.shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.set(this.x, 0.012, this.z);

        const scene = game.stage.scene;
        scene.add(this.group);
        scene.add(this.shadow);
        this._sync(0);
    }

    update(dt) {
        this.t += dt; this.life += dt;
        if (this.life > this.maxLife) { this.dispose(); return; }

        if (!this.grounded) {
            this.vy -= GRAVITY * 0.55 * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if (this.y <= 0) { this.y = 0; this.grounded = true; this.vx = 0; }
        } else {
            this.vx *= 0.85;
            this.x += this.vx * dt;
        }
        this.z = U.clamp(this.z, GROUND.zMin, GROUND.zPlayMax);

        // 磁吸
        const p = this.game.player;
        if (p && !p.dead && this.grounded) {
            const d = Math.abs(p.x - this.x) + Math.abs(p.z - this.z) * 2;
            if (d < 1.5) {
                this.x = U.damp(this.x, p.x, 9, dt);
                this.z = U.damp(this.z, p.z, 9, dt);
                this.y = U.damp(this.y, 0.55, 9, dt);
            }
            if (Math.abs(p.x - this.x) < 0.55 && Math.abs(p.z - this.z) < 0.5 && Math.abs(p.y - this.y) < 1.3) {
                this.pickup(p);
                return;
            }
        }
        this._sync(dt);
    }

    _sync(dt) {
        const bob = this.grounded ? Math.abs(Math.sin(this.t * 3)) * 0.06 : 0;
        this.group.position.set(this.x, this.y + 0.30 + bob, this.z);
        this.group.rotation.y = this.t * 1.5;

        const glow = 0.40 + Math.sin(this.t * 5) * 0.16;
        this.halo.material.opacity = glow;
        this.halo.scale.setScalar(0.70 + Math.sin(this.t * 4) * 0.05);

        const k = 1 - U.clamp(this.y / 3, 0, 1) * 0.45;
        this.shadow.position.set(this.x, 0.012, this.z);
        this.shadow.scale.set(0.62 * k, 0.62 * k, 1);
        this.shadow.material.opacity = 0.62 * k;

        // 临期闪烁
        const blink = this.life > this.maxLife - 4 && Math.floor(this.life * 8) % 2 === 0;
        this.group.visible = !blink;
    }

    pickup(p) {
        const g = this.game, d = this.def;
        g.audio.play(d.heal ? 'heal' : (d.rage ? 'skill' : 'coin'));
        const pos = { x: this.x, y: this.y + 0.55, z: this.z };
        if (d.heal) g.fx.text({ x: this.x, y: pos.y + 0.35, z: this.z }, '+' + d.heal, '#7CFC75', 20);
        if (d.rage) g.fx.text({ x: this.x, y: pos.y + 0.35, z: this.z }, '怒气 +' + d.rage, '#FFD166', 19);
        if (d.score) g.fx.text({ x: this.x, y: pos.y + 0.72, z: this.z }, '+' + d.score, '#FFD700', 16);
        g.fx.wave({ x: this.x, y: 0, z: this.z }, 55, d.color, 0.42, 4);
        g.fx.dust(pos, 10, d.color);
        this.dispose();
        g.onItemPicked(this, p);
    }

    dispose() {
        if (this.dead) return;
        this.dead = true;
        const scene = this.game.stage.scene;
        scene.remove(this.group);
        scene.remove(this.shadow);
        this.halo.material.dispose();
        // 几何与基础材质为同类道具共享，此处不释放
    }
}

/* ============================================================
 * 木箱 / 陶罐：击碎后掉落
 * ========================================================== */
function buildBreakableGeometry(kind) {
    const parts = [];
    if (kind === 'crate') {
        // 粮草辎重箱：箱板竖纹 + 麻绳十字捆绑 + 朱色封条
        parts.push(G.at(G.box(0.64, 0.56, 0.52, '#A9793F'), 0, 0.28, 0));
        for (const x of [-0.21, 0, 0.21]) {
            parts.push(G.at(G.box(0.085, 0.56, 0.535, '#8E6330'), x, 0.28, 0));
        }
        parts.push(G.at(G.box(0.65, 0.05, 0.53, '#C7A96A'), 0, 0.44, 0));
        parts.push(G.at(G.box(0.65, 0.05, 0.53, '#C7A96A'), 0, 0.13, 0));
        parts.push(G.at(G.box(0.07, 0.57, 0.54, '#C7A96A'), 0, 0.28, 0));
        // 封条
        parts.push(G.at(G.box(0.16, 0.24, 0.012, '#B71C1C'), 0, 0.30, 0.268));
        parts.push(G.at(G.box(0.66, 0.06, 0.06, '#6B4A2F'), 0, 0.02, 0));
    } else {
        // 灰陶酒坛：鼓腹 + 双系耳 + 红布封口
        parts.push(G.lathe([
            [0.001, 0.00], [0.19, 0.005], [0.25, 0.12], [0.27, 0.28],
            [0.235, 0.44], [0.14, 0.52], [0.12, 0.57], [0.135, 0.60], [0.001, 0.60]
        ], '#9E8E77', 18));
        // 肩部双系耳
        for (const s of [-1, 1]) {
            parts.push(G.at(G.torus(0.055, 0.016, '#9E8E77', Math.PI * 0.9),
                s * 0.255, 0.44, 0, Math.PI / 2, 0, s > 0 ? 0.4 : Math.PI - 0.4));
        }
        parts.push(G.at(G.cyl(0.145, 0.16, 0.05, '#B71C1C', 14), 0, 0.605, 0));
        parts.push(G.at(G.torus(0.155, 0.014, '#C7A96A'), 0, 0.575, 0, Math.PI / 2, 0, 0));
    }
    return G.merge(parts);
}

const BREAK_ASSETS = {};
function breakAsset(kind) {
    let a = BREAK_ASSETS[kind];
    if (a) return a;
    a = BREAK_ASSETS[kind] = {
        geo: buildBreakableGeometry(kind),
        mat: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: TK.gradient }),
        shadowGeo: new THREE.PlaneGeometry(1, 1),
        shadowMat: new THREE.MeshBasicMaterial({
            map: softShadowTex(), transparent: true, opacity: 0.55, depthWrite: false
        })
    };
    return a;
}

class Breakable {
    constructor(game, cfg) {
        this.game = game;
        this.kind = cfg.kind || 'crate';
        this.x = cfg.x; this.z = cfg.z;
        this.hp = 1;
        this.dead = false;
        this.t = U.rand(0, 5);
        this.hit = 0;
        this.drop = cfg.drop || null;
        this.drawY = 0;

        const A = breakAsset(this.kind);
        this.group = new THREE.Group();
        this.mesh = new THREE.Mesh(A.geo, A.mat);
        this.mesh.add(new THREE.Mesh(A.geo, TK.mat.outline()));
        this.group.add(this.mesh);
        this.group.position.set(this.x, 0, this.z);
        this.group.rotation.y = U.rand(-0.18, 0.18);

        this.shadow = new THREE.Mesh(A.shadowGeo, A.shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.set(this.x, 0.012, this.z);
        this.shadow.scale.set(this.kind === 'crate' ? 1.0 : 0.78, this.kind === 'crate' ? 0.85 : 0.72, 1);

        const scene = game.stage.scene;
        scene.add(this.group);
        scene.add(this.shadow);
    }

    takeHit() {
        if (this.dead) return false;
        const g = this.game;
        g.audio.play('ko', { volume: 0.4 });
        const pos = { x: this.x, y: 0.4, z: this.z };
        g.fx.dust(pos, 16, this.kind === 'crate' ? '#A9793F' : '#B0A99A');
        g.fx.fireBurst({ x: this.x, y: 0.3, z: this.z }, 6, 0.5);
        g.fx.addShake(3);
        if (this.drop) g.dropItem(this.drop, this.x, this.z);
        else if (U.chance(0.55)) g.dropItem(U.pick(['baozi', 'gold', 'wine', 'gold']), this.x, this.z);
        this.dispose();
        return true;
    }

    dispose() {
        if (this.dead) return;
        this.dead = true;
        const scene = this.game.stage.scene;
        scene.remove(this.group);
        scene.remove(this.shadow);
    }
}

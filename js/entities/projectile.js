/* ============================================================
 * 三国战纪 · 投射物（箭矢 / 火球 / 妖术弹）
 * ============================================================ */
'use strict';

/* 投射物共享资源：箭每帧都可能生成，绝不能每发都新建几何/材质并泄漏。
   这些资源随页面常驻，数量固定（箭 ×1、核心 ×1、外壳/光晕按颜色 ×N）。 */
const PROJ_ASSETS = {
    arrowGeo: null, arrowMat: null,
    coreGeo: null, coreMat: null,
    shellGeo: null, shellMat: new Map(),
    haloMat: new Map()
};

class Projectile {
    constructor(game, cfg) {
        this.game = game;
        this.stage = game.stage;
        this.kind = cfg.kind || 'arrow';
        this.team = cfg.team;
        this.owner = cfg.owner || null;
        this.x = cfg.x; this.z = cfg.z; this.y = cfg.y != null ? cfg.y : 0.95;
        this.vx = cfg.vx || 0; this.vz = cfg.vz || 0;
        this.vy = cfg.vy || 0;
        this.dmg = cfg.dmg || 10;
        this.color = cfg.color || (this.kind === 'fire' ? '#FF7043' : '#C7CCD1');
        this.life = 0;
        this.maxLife = cfg.maxLife || 3.2;
        this.dead = false;
        this.homing = cfg.homing || 0;
        this.rot = Math.atan2(this.vz * 0.6, this.vx);

        this.group = new THREE.Group();
        this._build();
        this.stage.scene.add(this.group);
        this.sync(0);
    }

    _build() {
        const G = TK.G;
        if (this.kind === 'arrow') {
            if (!PROJ_ASSETS.arrowGeo) {
                const parts = [
                    G.at(G.cyl(0.012, 0.012, 0.52, '#6D4C33', 6), 0, 0, 0, 0, 0, Math.PI / 2),
                    G.at(G.cone(0.035, 0.14, '#D6DBE0', 4), 0.32, 0, 0, 0, 0, -Math.PI / 2, 0.5, 1, 0.5),
                    G.at(G.box(0.10, 0.09, 0.012, '#C62828'), -0.22, 0, 0, 0, 0, 0.2),
                    G.at(G.box(0.10, 0.012, 0.09, '#C62828'), -0.22, 0, 0, 0, 0, 0.2)
                ];
                PROJ_ASSETS.arrowGeo = G.merge(parts);
            }
            if (!PROJ_ASSETS.arrowMat) {
                PROJ_ASSETS.arrowMat = new THREE.MeshToonMaterial({
                    vertexColors: true, gradientMap: TK.gradient
                });
            }
            this.group.add(new THREE.Mesh(PROJ_ASSETS.arrowGeo, PROJ_ASSETS.arrowMat));
        } else {
            // 火球 / 妖术弹：内芯 + 外晕
            const col = this.kind === 'fire' ? '#FFB347' : this.color;
            PROJ_ASSETS.coreGeo = PROJ_ASSETS.coreGeo || new THREE.SphereGeometry(0.10, 12, 8);
            PROJ_ASSETS.coreMat = PROJ_ASSETS.coreMat || new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF3C4') });
            PROJ_ASSETS.shellGeo = PROJ_ASSETS.shellGeo || new THREE.SphereGeometry(0.20, 12, 8);
            let shellMat = PROJ_ASSETS.shellMat.get(col);
            if (!shellMat) {
                shellMat = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(col), transparent: true, opacity: 0.55,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                PROJ_ASSETS.shellMat.set(col, shellMat);
            }
            let haloMat = PROJ_ASSETS.haloMat.get(col);
            if (!haloMat) {
                haloMat = new THREE.SpriteMaterial({
                    map: TK.glowTex(), color: new THREE.Color(col), blending: THREE.AdditiveBlending,
                    transparent: true, depthWrite: false, opacity: 0.9
                });
                PROJ_ASSETS.haloMat.set(col, haloMat);
            }
            const core = new THREE.Mesh(PROJ_ASSETS.coreGeo, PROJ_ASSETS.coreMat);
            const shell = new THREE.Mesh(PROJ_ASSETS.shellGeo, shellMat);
            const halo = new THREE.Sprite(haloMat);
            halo.scale.setScalar(0.9);
            this.group.add(core, shell, halo);
            this.core = core; this.shell = shell; this.halo = halo;
        }
    }

    update(dt) {
        this.life += dt;
        if (this.life > this.maxLife) { this._kill(); return; }

        if (this.homing > 0) {
            let t = null, bd = 1e9;
            for (const a of this.game.actors) {
                if (a.team === this.team || a.dead) continue;
                const d = Math.abs(a.x - this.x);
                if (d < bd) { bd = d; t = a; }
            }
            if (t) {
                this.vz = U.damp(this.vz, (t.z - this.z) * 2.2, this.homing * 3.2, dt);
            }
        }

        if (this.kind === 'arrow') this.vy -= 1.6 * dt;

        const prevX = this.x;
        this.x += this.vx * dt;
        this.z += this.vz * dt;
        this.y += this.vy * dt;
        this.rot = Math.atan2(this.vz * 0.55, this.vx);

        if (this.z < -0.4 || this.z > GROUND.zMax + 0.4) { this._kill(); return; }
        if (this.y < 0.05) {
            const g = this.game;
            if (this.kind === 'fire') g.fx.fireBurst({ x: this.x, y: 0.1, z: this.z }, 8, 0.55);
            else g.fx.dust({ x: this.x, y: 0.05, z: this.z }, 5, '#C8B79A');
            this._kill();
            return;
        }
        const ar = this.game.arena;
        if (ar && (this.x < ar.min - 2 || this.x > ar.max + 2)) { this._kill(); return; }

        // 用本帧的位移线段做扫掠检测：箭速 11+，低帧率下一帧就能跨过半个身位，
        // 只比对当前点会让箭“穿人而过”。
        const midX = (prevX + this.x) * 0.5;
        const halfSpan = Math.abs(this.x - prevX) * 0.5;
        for (const e of this.game.actors) {
            if (e.team === this.team || e.dead || e === this.owner) continue;
            if (Math.abs(e.x - midX) > (e.rx + 0.14) + halfSpan) continue;
            if (Math.abs(e.z - this.z) > 0.42) continue;
            const feetY = e.y, topY = e.y + 1.75 * e.rigScale;
            if (this.y < feetY - 0.15 || this.y > topY) continue;
            e.takeHit({
                dmg: this.dmg, dir: U.sign(this.vx) || 1, kb: 1.6,
                kbUp: this.kind === 'fire' ? 1.4 : 0,
                heavy: this.kind !== 'arrow', src: this.owner, srcX: this.x
            });
            this.boom();
            this._kill();
            return;
        }

        this.sync(dt);
    }

    sync(dt) {
        this.group.position.set(this.x, this.y, this.z);
        this.group.rotation.y = -this.rot;
        if (this.kind === 'arrow') {
            this.group.rotation.z = Math.atan2(this.vy, Math.abs(this.vx)) * 0.6;
        } else if (this.core) {
            const p = 1 + Math.sin(this.life * 26) * 0.12;
            this.core.scale.setScalar(p);
            this.shell.scale.setScalar(1 + Math.sin(this.life * 18) * 0.15);
            this.halo.scale.setScalar(0.85 + Math.sin(this.life * 22) * 0.1);
        }
    }

    boom() {
        const g = this.game;
        const pos = { x: this.x, y: this.y, z: this.z };
        if (this.kind === 'fire') {
            g.fx.fireBurst(pos, 16, 1.0);
            g.fx.addShake(4);
            g.audio.play('fire');
        } else if (this.kind === 'orb') {
            g.fx.wave({ x: this.x, y: 0, z: this.z }, 70, this.color, 0.34, 4);
            g.fx.addShake(3);
            g.audio.play('hit');
        } else {
            g.fx.hitSpark(pos, U.sign(this.vx) || 1, 0.6);
            g.audio.play('hit', { volume: 0.7 });
        }
    }

    _kill() {
        if (this.dead) return;
        this.dead = true;
        this.stage.scene.remove(this.group);
        // 几何/材质为跨关卡共享资源，不能在这里 dispose
    }
}

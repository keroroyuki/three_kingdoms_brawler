/* ============================================================
 * 三国战纪 · 3D 特效
 * 粒子（单次 draw call）/ 斩击弧光 / 冲击波 / 落雷 / 残影
 * 伤害数字投影回 2D 覆盖层绘制
 * ============================================================ */
'use strict';

class FX3D {
    constructor(stage) {
        this.stage = stage;
        this.scene = stage.scene;

        this.parts = [];
        this.pool = [];
        this.maxParts = 900;

        this.arcs = [];
        this.waves = [];
        this.beams = [];
        this.texts = [];
        this.ghosts = [];

        this.shake = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.flash = 0;
        this.flashColor = '#FFFFFF';
        this.hitStop = 0;

        this._initPoints();
        this._initArcs();
        this._initWaves();
        this._initBeams();
        this._initGhosts();
    }

    /* ============================================================
     * 粒子
     * ========================================================== */
    _initPoints() {
        const n = this.maxParts;
        this.pos = new Float32Array(n * 3);
        this.col = new Float32Array(n * 3);
        this.siz = new Float32Array(n);
        this.alp = new Float32Array(n);
        for (let i = 0; i < n; i++) this.alp[i] = 0;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
        geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1));
        geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alp, 1));
        geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uPixel: { value: VIEW.H / (2 * Math.tan(CAM.fov * Math.PI / 360)) }
            },
            vertexShader: [
                'attribute vec3 aColor; attribute float aSize; attribute float aAlpha;',
                'uniform float uPixel;',
                'varying vec3 vColor; varying float vAlpha;',
                'void main() {',
                '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
                '  gl_PointSize = aSize * uPixel / max(0.6, -mv.z);',
                '  gl_Position = projectionMatrix * mv;',
                '  vColor = aColor; vAlpha = aAlpha;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor; varying float vAlpha;',
                'void main() {',
                '  vec2 p = gl_PointCoord - vec2(0.5);',
                '  float d = length(p);',
                '  if (d > 0.5) discard;',
                '  float a = smoothstep(0.5, 0.06, d) * vAlpha;',
                '  gl_FragColor = vec4(vColor, a);',
                '}'
            ].join('\n')
        });
        this.points = new THREE.Points(geo, mat);
        this.points.frustumCulled = false;
        this.points.renderOrder = 5;
        this.scene.add(this.points);
    }

    /** 取一个粒子槽位 */
    _slot() {
        if (this.parts.length < this.maxParts) {
            const p = {
                x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, size: 0.06,
                life: 0, max: 0.5, r: 1, gg: 1, b: 1, drag: 1, shrink: true, idx: this.parts.length
            };
            this.parts.push(p);
            return p;
        }
        // 池满：复用最老的
        let oldest = this.parts[0];
        for (const p of this.parts) if (p.life / p.max > oldest.life / oldest.max) oldest = p;
        return oldest;
    }

    emit(o) {
        const p = this._slot();
        p.x = o.x; p.y = o.y; p.z = o.z;
        p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
        p.g = o.g || 0;
        p.size = o.size || 0.06;
        p.life = 0;
        p.max = o.life || 0.5;
        p.drag = o.drag == null ? 1 : o.drag;
        p.shrink = o.shrink !== false;
        const c = new THREE.Color(o.color || '#FFFFFF');
        p.r = c.r; p.gg = c.g; p.b = c.b;
        return p;
    }

    /* ============================================================
     * 斩击弧光
     * ========================================================== */
    _initArcs() {
        this.arcPool = [];
        for (let i = 0; i < 16; i++) {
            const geo = new THREE.RingGeometry(0.52, 0.92, 24, 1, -1.05, 2.10);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
            });
            const m = new THREE.Mesh(geo, mat);
            m.visible = false;
            m.renderOrder = 8;
            this.scene.add(m);
            this.arcPool.push(m);
        }
        this.arcIdx = 0;
    }

    slash(pos, scale, dir, kind, hue) {
        const m = this.arcPool[this.arcIdx++ % this.arcPool.length];
        m.visible = true;
        m.position.set(pos.x + dir * 0.28, pos.y, pos.z + 0.45);
        m.scale.set(scale * dir, scale, scale);
        m.rotation.z = kind === 'v' ? 1.35 : (kind === 'thrust' ? 0.0 : 0.2);
        m.material.color.set(hue || '#FFE9A8');
        m.userData.life = 0;
        m.userData.dur = 0.19;
        m.userData.spin = (kind === 'v' ? -1.4 : (kind === 'thrust' ? 0 : -1.1)) * dir;
        m.userData.baseScale = scale;
        this.arcs.push(m);
    }

    /* ============================================================
     * 冲击波（贴地）
     * ========================================================== */
    _initWaves() {
        this.wavePool = [];
        for (let i = 0; i < 10; i++) {
            const geo = new THREE.RingGeometry(0.76, 1.0, 32);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const m = new THREE.Mesh(geo, mat);
            m.rotation.x = -Math.PI / 2;
            m.visible = false;
            m.renderOrder = 6;
            this.scene.add(m);
            this.wavePool.push(m);
        }
        this.waveIdx = 0;
    }

    wave(pos, maxR, color, dur, w) {
        const m = this.wavePool[this.waveIdx++ % this.wavePool.length];
        m.visible = true;
        m.position.set(pos.x, 0.05, pos.z);
        m.material.color.set(color || '#FFFFFF');
        m.material.opacity = 0.9;
        m.userData.life = 0;
        m.userData.dur = dur || 0.34;
        m.userData.maxR = maxR / 60;   // 旧接口以像素计，这里换算成世界单位
        m.userData.w = w || 4;
        this.waves.push(m);
    }

    /* ============================================================
     * 落雷
     * ========================================================== */
    _initBeams() {
        const geo = new THREE.PlaneGeometry(0.9, 11, 1, 1);
        geo.translate(0, 5.5, 0);
        this.beamPool = [];
        for (let i = 0; i < 6; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending, depthWrite: false
            });
            const m = new THREE.Mesh(geo, mat);
            m.visible = false;
            m.renderOrder = 7;
            this.scene.add(m);
            this.beamPool.push(m);
        }
        this.beamIdx = 0;
    }

    beam(x, z, color, dur) {
        const m = this.beamPool[this.beamIdx++ % this.beamPool.length];
        m.visible = true;
        m.position.set(x, 0, z + 0.4);
        m.material.color.set(color || '#BFE9FF');
        m.material.opacity = 1;
        m.userData.life = 0;
        m.userData.dur = dur || 0.42;
        m.userData.seed = Math.random() * 99;
        this.beams.push(m);
    }

    /* ============================================================
     * 残影
     * ========================================================== */
    _initGhosts() {
        const geo = new THREE.CapsuleGeometry(0.30, 1.1, 4, 10);
        this.ghostPool = [];
        for (let i = 0; i < 10; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: 0x7FD8FF, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const m = new THREE.Mesh(geo, mat);
            m.visible = false;
            this.scene.add(m);
            this.ghostPool.push(m);
        }
        this.ghostIdx = 0;
    }

    ghost(a) {
        const m = this.ghostPool[this.ghostIdx++ % this.ghostPool.length];
        m.visible = true;
        m.position.set(a.x, a.y + 1.15, a.z);
        m.scale.set(1, 1, 1);
        m.material.opacity = 0.30;
        m.userData.life = 0;
        m.userData.dur = 0.24;
        this.ghosts.push(m);
    }

    /* ============================================================
     * 便捷发射器
     * ========================================================== */
    addShake(v) { this.shake = Math.min(26, this.shake + v); }
    addFlash(a, color) { this.flash = Math.max(this.flash, a); if (color) this.flashColor = color; }
    stop(t) { this.hitStop = Math.max(this.hitStop, t); }

    hitSpark(pos, dir, power) {
        power = power || 1;
        const n = 8 + (power * 7 | 0);
        for (let i = 0; i < n; i++) {
            const a = U.rand(0, TAU);
            const sp = U.rand(2.2, 6.4) * (0.7 + power * 0.5);
            this.emit({
                x: pos.x, y: pos.y + U.rand(-0.15, 0.25), z: pos.z + U.rand(-0.1, 0.1),
                vx: Math.cos(a) * sp + dir * 1.6, vy: Math.sin(a) * sp * 0.9 + U.rand(0.2, 1.4),
                vz: U.rand(-1.2, 1.2), g: -7,
                size: U.rand(0.035, 0.085) * (0.8 + power * 0.4),
                life: U.rand(0.16, 0.38),
                color: i % 3 === 0 ? '#FFF8D6' : (i % 3 === 1 ? '#FFD166' : '#FF8A3C'),
                drag: 0.86
            });
        }
    }

    dust(pos, n, color) {
        n = n || 8;
        for (let i = 0; i < n; i++) {
            this.emit({
                x: pos.x + U.rand(-0.35, 0.35), y: pos.y + U.rand(0, 0.15), z: pos.z + U.rand(-0.25, 0.25),
                vx: U.rand(-2.4, 2.4), vy: U.rand(0.3, 1.4), vz: U.rand(-0.8, 0.8),
                g: -1.0, size: U.rand(0.10, 0.22), life: U.rand(0.4, 0.8),
                color: color || '#C8B79A', drag: 0.9, shrink: false
            });
        }
    }

    fireBurst(pos, n, sc) {
        for (let i = 0; i < (n || 14); i++) {
            const a = U.rand(0, TAU);
            const sp = U.rand(1.2, 5.0) * (sc || 1);
            this.emit({
                x: pos.x, y: pos.y, z: pos.z,
                vx: Math.cos(a) * sp * 0.8, vy: U.rand(1.0, 4.4) * (sc || 1), vz: Math.sin(a) * sp * 0.5,
                g: 1.2, size: U.rand(0.08, 0.24) * (sc || 1), life: U.rand(0.3, 0.66),
                color: i % 2 ? '#FF7A18' : '#FFC300', drag: 0.93
            });
        }
        this.emit({
            x: pos.x, y: pos.y + 0.2, z: pos.z, size: 0.9 * (sc || 1), life: 0.22,
            color: '#FFD08A', drag: 1
        });
    }

    /** 伤害数字 */
    damage(pos, v, kind) {
        this.texts.push({
            x: pos.x, y: pos.y, z: pos.z,
            v: Math.abs(Math.round(v)), life: 0, dur: 0.78,
            vy: 1.5, vx: U.rand(-0.4, 0.4), kind: kind || 'normal'
        });
    }

    text(pos, str, color, size) {
        this.texts.push({
            x: pos.x, y: pos.y, z: pos.z, str: str, life: 0, dur: 1.0,
            vy: 0.9, vx: 0, kind: 'word', color: color || '#FFD700', size: size || 20
        });
    }

    clear() {
        this.parts.length = 0;
        for (let i = 0; i < this.maxParts; i++) this.alp[i] = 0;
        this.arcs.length = 0; this.waves.length = 0; this.beams.length = 0;
        this.texts.length = 0; this.ghosts.length = 0;
        for (const m of this.arcPool) m.visible = false;
        for (const m of this.wavePool) m.visible = false;
        for (const m of this.beamPool) m.visible = false;
        for (const m of this.ghostPool) m.visible = false;
        this.shake = 0; this.flash = 0; this.hitStop = 0;
    }

    /* ============================================================
     * 更新
     * ========================================================== */
    update(dt) {
        this.shake = Math.max(0, this.shake - this.shake * TUNE.shakeDecay * dt - 6 * dt);
        if (this.shake > 0.35) {
            this.shakeX = U.rand(-1, 1) * this.shake * 0.022;
            this.shakeY = U.rand(-1, 1) * this.shake * 0.016;
        } else { this.shakeX = 0; this.shakeY = 0; }
        this.flash = Math.max(0, this.flash - dt * 3.4);

        /* 粒子 */
        const pos = this.pos, col = this.col, siz = this.siz, alp = this.alp;
        for (let i = 0; i < this.parts.length; i++) {
            const p = this.parts[i];
            p.life += dt;
            const k = p.life / p.max;
            if (k >= 1) { alp[i] = 0; continue; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
            p.vy -= p.g * dt;
            if (p.drag !== 1) {
                const f = Math.pow(p.drag, dt * 60);
                p.vx *= f; p.vy *= f; p.vz *= f;
            }
            if (p.y < 0.02) { p.y = 0.02; p.vy = Math.abs(p.vy) * 0.25; p.vx *= 0.7; p.vz *= 0.7; }
            pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
            col[i * 3] = p.r; col[i * 3 + 1] = p.gg; col[i * 3 + 2] = p.b;
            siz[i] = p.size * (p.shrink ? (1 - k * 0.75) : (1 + k * 0.6));
            alp[i] = 1 - k * k;
        }
        // 清空多余槽位
        for (let i = this.parts.length; i < this.maxParts; i++) alp[i] = 0;
        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.geometry.attributes.aColor.needsUpdate = true;
        this.points.geometry.attributes.aSize.needsUpdate = true;
        this.points.geometry.attributes.aAlpha.needsUpdate = true;

        /* 弧光 */
        for (let i = this.arcs.length - 1; i >= 0; i--) {
            const m = this.arcs[i];
            m.userData.life += dt;
            const k = m.userData.life / m.userData.dur;
            if (k >= 1) { m.visible = false; this.arcs.splice(i, 1); continue; }
            const sc = m.userData.baseScale;
            m.scale.set(sc * (0.55 + k * 0.75), sc * (0.55 + k * 0.75), sc);
            m.rotation.z += m.userData.spin * dt;
            m.material.opacity = (1 - k) * (1 - k) * 1.15;
        }

        /* 冲击波 */
        for (let i = this.waves.length - 1; i >= 0; i--) {
            const m = this.waves[i];
            m.userData.life += dt;
            const k = m.userData.life / m.userData.dur;
            if (k >= 1) { m.visible = false; this.waves.splice(i, 1); continue; }
            const r = m.userData.maxR * U.ease.outCubic(k);
            m.scale.setScalar(Math.max(0.05, r));
            m.material.opacity = (1 - k) * 0.85;
        }

        /* 落雷 */
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const m = this.beams[i];
            m.userData.life += dt;
            const k = m.userData.life / m.userData.dur;
            if (k >= 1) { m.visible = false; this.beams.splice(i, 1); continue; }
            const fade = k < 0.22 ? k / 0.22 : 1 - (k - 0.22) / 0.78;
            m.material.opacity = U.clamp(fade, 0, 1) * 0.9;
            m.scale.x = 0.7 + Math.sin(k * 40 + m.userData.seed) * 0.25;
            m.rotation.y = 0.02;
        }

        /* 残影 */
        for (let i = this.ghosts.length - 1; i >= 0; i--) {
            const m = this.ghosts[i];
            m.userData.life += dt;
            const k = m.userData.life / m.userData.dur;
            if (k >= 1) { m.visible = false; this.ghosts.splice(i, 1); continue; }
            m.material.opacity = 0.32 * (1 - k);
            m.scale.y = 1 + k * 0.1;
        }

        /* 文字 */
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.life += dt;
            if (t.life >= t.dur) { this.texts.splice(i, 1); continue; }
            t.y += t.vy * dt;
            t.x += t.vx * dt;
            t.vy *= 0.94;
        }
    }

    /* ============================================================
     * 2D 覆盖层：伤害数字 / 闪白
     * ========================================================== */
    drawOverlay(ctx, stage) {
        ctx.save();
        ctx.textAlign = 'center';
        const p = {};
        for (const t of this.texts) {
            const k = t.life / t.dur;
            const pop = t.kind === 'word' ? 1 : (k < 0.18 ? U.ease.outBack(k / 0.18) : 1);
            stage.project(t.x, t.y, t.z, p);
            if (!p.visible) continue;
            ctx.globalAlpha = k > 0.62 ? (1 - (k - 0.62) / 0.38) : 1;
            if (t.kind === 'word') {
                ctx.font = `bold ${(t.size || 20) * pop}px ${U.FONT}`;
                ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,6,0.85)';
                ctx.strokeText(t.str, p.x, p.y);
                ctx.fillStyle = t.color;
                ctx.fillText(t.str, p.x, p.y);
            } else {
                const size = (t.kind === 'crit' ? 30 : (t.kind === 'player' ? 25 : 20)) * pop;
                ctx.font = `bold ${size}px ${U.FONT}`;
                ctx.lineWidth = 4.2; ctx.strokeStyle = 'rgba(20,10,6,0.88)';
                ctx.strokeText(String(t.v), p.x, p.y);
                ctx.fillStyle = t.kind === 'crit' ? '#FFE082'
                    : (t.kind === 'player' ? '#FF8A80' : (t.kind === 'heal' ? '#69F0AE' : '#FFFFFF'));
                ctx.fillText(String(t.v), p.x, p.y);
            }
        }
        ctx.restore();

        if (this.flash > 0.01) {
            ctx.save();
            ctx.globalAlpha = U.clamp(this.flash, 0, 1);
            ctx.fillStyle = this.flashColor;
            ctx.fillRect(0, 0, VIEW.W, VIEW.H);
            ctx.restore();
        }
    }
}

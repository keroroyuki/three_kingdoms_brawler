/* ============================================================
 * 三国战纪 · 3D 舞台
 * 渲染器 / 透视相机 / 三点布光 / 天穹 / 世界→屏幕投影
 * ============================================================ */
'use strict';

class Stage {
    constructor(canvas) {
        this.canvas = canvas;
        const r = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true
        });
        r.outputEncoding = THREE.sRGBEncoding;
        r.toneMapping = THREE.NoToneMapping;
        r.setClearColor(0x101418, 1);
        r.shadowMap.enabled = false;
        this.renderer = r;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0xd9dcc0, 24, 80);

        this.camera = new THREE.PerspectiveCamera(CAM.fov, VIEW.W / VIEW.H, 0.5, 260);
        this.camX = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        this._buildLights();
        this._buildSky();

        this.world = new THREE.Group();
        this.scene.add(this.world);

        this.dpr = 1;
        this.dprCap = 1.5;   // 运行期性能不达标时由 Game 降到 1
        this.cssW = VIEW.W;
        this.cssH = VIEW.H;

        this._v = new THREE.Vector3();
        this._pv = new THREE.Vector2();
    }

    /* ---------------- 灯光 ---------------- */
    _buildLights() {
        // 原来 ambient 0.30 + hemi 0.22 的底光太高，角色几乎只剩一个色块；
        // 压低环境光、抬高主光，让 Q 版模型也有明确的受光面与背光面。
        this.ambient = new THREE.AmbientLight(0xffffff, 0.17);
        this.scene.add(this.ambient);

        this.hemi = new THREE.HemisphereLight(0xbfe2ff, 0x8a7a4e, 0.16);
        this.scene.add(this.hemi);

        this.key = new THREE.DirectionalLight(0xfff2ce, 0.88);
        this.key.position.set(-6, 12, 9);
        this.scene.add(this.key);
        this.key.target.position.set(0, 0, 1.5);
        this.scene.add(this.key.target);

        // 冷色补光：从角色右后方压一道轮廓光，让 Q 版剪影更立体
        this.rim = new THREE.DirectionalLight(0x9fc6ff, 0.40);
        this.rim.position.set(8, 5, -7);
        this.scene.add(this.rim);
    }

    setPalette(p) {
        this.scene.fog.color.set(p.fog);
        this.scene.fog.near = p.fogNear != null ? p.fogNear : 24;
        this.scene.fog.far = p.fogFar != null ? p.fogFar : 80;
        this.renderer.setClearColor(new THREE.Color(p.skyBottom), 1);

        // 默认光比：环境光压低、主光抬高，角色才有受光面/背光面。
        // 暗色主题（夜战、火攻）可以在 palette 里单独提高 ambient/keyInt。
        this.ambient.intensity = p.ambient != null ? p.ambient : 0.17;
        this.hemi.color.set(p.hemiSky || '#bfe2ff');
        this.hemi.groundColor.set(p.hemiGround || '#8a7a4e');
        this.hemi.intensity = p.hemiInt != null ? p.hemiInt : 0.16;
        this.key.intensity = p.keyInt != null ? p.keyInt : 0.88;
        this.key.color.set(p.dir || '#fff2ce');
        this.rim.intensity = p.rimInt != null ? p.rimInt : 0.40;
        this.rim.color.set(p.rim || '#9fc6ff');

        if (this.skyMat) {
            this.skyMat.uniforms.top.value.set(p.skyTop);
            this.skyMat.uniforms.bottom.value.set(p.skyBottom);
            this.skyMat.uniforms.sun.value.set(p.sun || '#FFE9B0');
        }
        if (this.sun && p.sunPos) {
            this.sun.position.set(p.sunPos[0] * 90 - 45, p.sunPos[1] * 60 - 8, -95);
        }
    }

    /* ---------------- 天穹 ---------------- */
    _buildSky() {
        const geo = new THREE.SphereGeometry(150, 32, 20);
        this.skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            fog: false,
            uniforms: {
                top: { value: new THREE.Color('#6FA8CC') },
                bottom: { value: new THREE.Color('#F6E3B4') },
                sun: { value: new THREE.Color('#FFE9B0') },
                sunDir: { value: new THREE.Vector3(0.45, 0.28, -0.85).normalize() }
            },
            vertexShader: [
                'varying vec3 vP;',
                'void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 top; uniform vec3 bottom; uniform vec3 sun; uniform vec3 sunDir;',
                'varying vec3 vP;',
                'void main() {',
                '  float h = clamp(vP.y * 1.15 + 0.10, 0.0, 1.0);',
                '  vec3 c = mix(bottom, top, pow(h, 0.85));',
                '  float d = max(dot(normalize(vP), normalize(sunDir)), 0.0);',
                '  c += sun * pow(d, 90.0) * 0.9;',
                '  c += sun * pow(d, 8.0) * 0.16;',
                '  gl_FragColor = vec4(c, 1.0);',
                '}'
            ].join('\n')
        });
        this.sky = new THREE.Mesh(geo, this.skyMat);
        this.sky.frustumCulled = false;
        this.scene.add(this.sky);

        // 日轮
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFEFC0, transparent: true, opacity: 0.9, fog: false, depthWrite: false });
        this.sun = new THREE.Mesh(new THREE.CircleGeometry(4.4, 24), sunMat);
        this.sun.position.set(-20, 16, -95);
        this.scene.add(this.sun);
    }

    /* ---------------- 构图 ---------------- */
    resize(cssW, cssH) {
        this.cssW = cssW; this.cssH = cssH;
        const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap || 1.5);
        this.dpr = dpr;
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(cssW, cssH, false);
        this.camera.aspect = CSS_ASPECT(cssW, cssH);
        this.camera.updateProjectionMatrix();
    }

    /** 摄像机跟随：x 轴平移，俯角固定 */
    setCamX(x) { this.camX = x; }

    applyCamera() {
        const d = CAM.dist, p = CAM.pitch;
        this.camera.position.set(
            this.camX + this.shakeX,
            CAM.lookY + Math.sin(p) * d + this.shakeY,
            CAM.lookZ + Math.cos(p) * d
        );
        this.camera.lookAt(this.camX + this.shakeX, CAM.lookY + this.shakeY, CAM.lookZ);
        this.sky.position.set(this.camX, 8, 0);
        this.sun.position.set(this.camX - 30, 18, -120);
        this.key.position.set(this.camX - 8, 14, 11);
        this.key.target.position.set(this.camX + 2, 0.8, 1.6);
        this.key.target.updateMatrixWorld();
    }

    /** 世界坐标 → 800x600 逻辑屏幕坐标 */
    project(x, y, z, out) {
        const v = this._v.set(x, y, z).project(this.camera);
        const o = out || {};
        o.x = (v.x * 0.5 + 0.5) * VIEW.W;
        o.y = (-v.y * 0.5 + 0.5) * VIEW.H;
        o.visible = v.z < 1;
        return o;
    }

    render() {
        this.applyCamera();
        this.renderer.render(this.scene, this.camera);
    }

    get info() { return this.renderer.info; }
}

function CSS_ASPECT(w, h) { return w / Math.max(1, h); }

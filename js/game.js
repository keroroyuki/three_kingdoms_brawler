/* ============================================================
 * 三国战纪 · 主程序（three.js 版）
 * 流程：标题 → 选人 → 关卡开场 → 战斗（波次推进 / BOSS）→ 结算
 *
 * 渲染分两层：
 *   #gameCanvas  WebGL —— 3D 世界、角色、特效
 *   #uiCanvas    2D     —— HUD、菜单、伤害数字、闪白
 * ============================================================ */
'use strict';

const ST = {
    TITLE: 'title', HELP: 'help', SELECT: 'select',
    INTRO: 'intro', PLAY: 'play', PAUSE: 'pause',
    CLEAR: 'clear', RESULT: 'result', VICTORY: 'victory'
};

/**
 * 难度档位：只调整敌军血量、攻击力与同时出手人数，不改玩家的数值，
 * 这样三档之间的手感差异来自"敌人压迫感"而不是"自己的武将变弱了"。
 */
const DIFFICULTY = [
    { key: 'easy', name: '简单', sub: '敌军势弱，可安心熟悉招式', hp: 0.78, atk: 0.70, tokens: -1 },
    { key: 'normal', name: '普通', sub: '标准强度，攻守需讲分寸', hp: 1.00, atk: 1.00, tokens: 0 },
    { key: 'hard', name: '困难', sub: '敌军蜂拥，一着不慎即破防', hp: 1.30, atk: 1.32, tokens: 1 }
];

class Game {
    constructor(canvas, uiCanvas) {
        this.canvas = canvas;
        this.uiCanvas = uiCanvas;
        this.ctx = uiCanvas.getContext('2d');
        this.uiScale = 1;

        /** 最高战功（localStorage 持久化）；file:// 或隐私模式下可能不可用 */
        this.bestScore = Game.loadBest();
        this.newRecord = false;
        /** 难度（同样持久化，下次进游戏沿用上次的选择） */
        this.diffIndex = Game.loadDiff();
        this.diff = DIFFICULTY[this.diffIndex];

        this.input = new InputManager();
        this.audio = new AudioEngine();

        this.stage = new Stage(canvas);
        this.fx = new FX3D(this.stage);
        this.ui = new UI(this);

        this.state = ST.TITLE;
        this.titleIndex = 0;
        this.selectIndex = 0;
        this.pauseIndex = 0;

        this.cam = { x: 10 };
        this.actors = [];
        this.projectiles = [];
        this.items = [];
        this.breakables = [];
        this.timers = [];
        this.spawnQueue = [];
        this.showcase = [];

        this.arena = { min: 0.8, max: 20 };
        this.softArena = { min: 0, max: 40 };
        this.tokenHolders = [];
        this.maxTokens = 2;

        this.levelIndex = 0;
        this.level = LEVELS[0];
        this.world = null;
        this.gateIndex = 0;
        this.waveState = 'open';
        this.boss = null;
        this.bossActive = false;
        this.killCount = 0;
        this.player = null;
        this.heroKey = 'liubei';

        this.introT = 0;
        this.resultT = 0;
        this.clearT = 0;
        this.t = 0;
        this.fade = 0;
        this.fadeTarget = 0;
        this.pending = null;
        this.totalScore = 0;
        this.finalScore = 0;
        this.playTime = 0;

        this._last = performance.now();
        this._bindGlobal();
        this._fitCanvas();
        window.addEventListener('resize', () => this._fitCanvas());

        this._setWorld(this.level);
        this._enterTitle();
    }

    /* ---------------- 最高战功持久化 ---------------- */
    static BEST_KEY = 'sgzj.bestScore';
    static DIFF_KEY = 'sgzj.diffIndex';

    static loadBest() {
        try {
            const v = parseInt(window.localStorage.getItem(Game.BEST_KEY) || '0', 10);
            return Number.isFinite(v) && v > 0 ? v : 0;
        } catch (e) {
            return 0; // file:// 受限或隐私模式：静默降级为不记录
        }
    }

    static loadDiff() {
        try {
            const v = parseInt(window.localStorage.getItem(Game.DIFF_KEY) || '1', 10);
            return v >= 0 && v < DIFFICULTY.length ? v : 1;
        } catch (e) {
            return 1;
        }
    }

    setDiff(i) {
        this.diffIndex = U.clamp(i, 0, DIFFICULTY.length - 1);
        this.diff = DIFFICULTY[this.diffIndex];
        try { window.localStorage.setItem(Game.DIFF_KEY, String(this.diffIndex)); } catch (e) { /* 忽略 */ }
    }

    /** 结算时调用；返回是否破纪录 */
    commitScore(score) {
        const s = Math.round(score) || 0;
        this.newRecord = s > this.bestScore;
        if (this.newRecord) {
            this.bestScore = s;
            try { window.localStorage.setItem(Game.BEST_KEY, String(s)); } catch (e) { /* 忽略写入失败 */ }
        }
        return this.newRecord;
    }

    /* ---------------- 画布自适应 ---------------- */
    _fitCanvas() {
        const pad = 24;
        const aw = window.innerWidth - pad * 2;
        const ah = window.innerHeight - pad * 2 - 40;
        const s = Math.max(0.4, Math.min(aw / VIEW.W, ah / VIEW.H));
        const cw = Math.round(VIEW.W * s), ch = Math.round(VIEW.H * s);

        this.canvas.style.width = cw + 'px';
        this.canvas.style.height = ch + 'px';
        this.uiCanvas.style.width = cw + 'px';
        this.uiCanvas.style.height = ch + 'px';
        this.stage.resize(cw, ch);

        // UI 覆盖层：2D 绘制很便宜，高分屏下用 2× 后备缓冲保证文字锐利
        const dpr = window.devicePixelRatio || 1;
        const r = this._lowQ ? 1 : (dpr >= 1.5 ? 2 : 1);
        this.uiScale = r;
        const bw = VIEW.W * r, bh = VIEW.H * r;
        if (this.uiCanvas.width !== bw || this.uiCanvas.height !== bh) {
            this.uiCanvas.width = bw;
            this.uiCanvas.height = bh;
        }
    }

    /**
     * 运行期性能监测：连续两个 1.5s 采样窗口在战斗状态下低于 46 FPS，
     * 就把 WebGL 的像素比降到 1×（降级后不再回升，避免反复抖动）。
     */
    _monitorPerf(rawDt) {
        if (this._lowQ) return;
        const m = this._perf || (this._perf = { t: 0, n: 0, bad: 0 });
        m.t += rawDt;
        m.n++;
        if (m.t < 1.5) return;
        const fps = m.n / m.t;
        if (this.state === ST.PLAY) m.bad = fps < 46 ? m.bad + 1 : 0;
        m.t = 0; m.n = 0;
        if (m.bad >= 2) {
            this._lowQ = true;
            this.stage.dprCap = 1;
            this._fitCanvas();
        }
    }

    _bindGlobal() {
        const unlock = () => {
            this.audio.init();
            this.audio.resume();
        };
        window.addEventListener('keydown', unlock, { once: false });
        window.addEventListener('pointerdown', unlock, { once: false });

        // 切走窗口/标签页时自动暂停：避免玩家回来时已经被打死
        const autoPause = () => {
            if (this.state === ST.PLAY) {
                this.state = ST.PAUSE;
                this.pauseIndex = 0;
                this.input.flush();
            }
            this.audio.suspend();
        };
        window.addEventListener('blur', autoPause);
        document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

        // 全局静音热键 M（暂停菜单里也有对应选项）
        window.addEventListener('keydown', (e) => {
            if (e.code !== 'KeyM' || e.repeat) return;
            this.audio.setMuted(!this.audio.muted);
            if (!this.audio.muted && this.state === ST.PLAY) {
                this.audio.playMusic(this.bossActive ? 'boss' : this.level.music);
            }
            this.ui.showBanner(this.audio.muted ? '已静音' : '恢复音量', '#9FD6FF', 26);
        });
    }

    /* ============================================================
     * 场景 / 展示台
     * ========================================================== */
    _setWorld(level) {
        if (this.world) {
            this.stage.scene.remove(this.world.root);
            this._disposeObject(this.world.root);
            this.world = null;
        }
        this.stage.setPalette(level.palette);
        this.world = World.create(level);
        this.stage.scene.add(this.world.root);
    }

    _disposeObject(root) {
        root.traverse((o) => {
            if (o.geometry && o.geometry.dispose) o.geometry.dispose();
            const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
            for (const m of mats) {
                // 模块级共享资源（色阶、描边、光晕、阴影贴图）不能在这里释放，
                // 否则切到下一关后所有描边/光晕都会失效并触发重编译卡顿。
                if (!m || m.__shared) continue;
                if (m.map && m.map.__shared !== true) m.map.dispose();
                if (m.gradientMap && m.gradientMap.__shared !== true) m.gradientMap.dispose();
                if (m.dispose) m.dispose();
            }
        });
    }

    /** 标题/选人时站在场景里的 3D 武将 */
    _setShowcase(keys) {
        this._clearShowcase();
        this.showcase = keys.map((key, i) => {
            const look = LOOKS[key];
            const rig = Chibi.create(key, look);
            rig.attach(this.stage.scene);
            const a = {
                look, key,
                x: this.cam.x + (i - (keys.length - 1) / 2) * 1.55,
                y: 0, z: 1.8,
                facing: 1,
                state: 'idle', stateT: U.rand(0, 1.2), animT: U.rand(0, 4),
                time: U.rand(0, 6), vy: 0,
                dead: false, remove: false, flash: 0, invuln: 0, fade: 1,
                atkDef: null, skillDef: null, current: null
            };
            return { key, rig, a };
        });
    }

    _clearShowcase() {
        for (const h of this.showcase) {
            h.rig.detach(this.stage.scene);
            h.rig.dispose();
        }
        this.showcase.length = 0;
    }

    _updateShowcase(dt) {
        for (const h of this.showcase) {
            const a = h.a;
            a.time += dt;
            a.animT += dt;
            a.stateT += dt;
            h.rig.update(a, dt);
        }
    }

    _enterTitle() {
        this.state = ST.TITLE;
        this.titleIndex = 0;
        this.t = 0;
        this.cam.x = 12;
        // 展示"开始征战"实际会使用的武将，避免标题里的角色和开局角色对不上
        this._setShowcase([this.heroKey || 'guanyu']);
        this.input.flush();
    }

    _enterSelect() {
        this.state = ST.SELECT;
        this._setShowcase(Object.keys(HERO_KIT));
        const list = this.showcase;
        for (let i = 0; i < list.length; i++) {
            const sel = i === this.selectIndex;
            list[i].a.x = this.cam.x + (i - 2) * 1.55;
            list[i].a.z = sel ? 2.45 : 1.55;
        }
        this.input.flush();
    }

    _layoutSelect(dt) {
        const cx = this.cam.x;
        for (let i = 0; i < this.showcase.length; i++) {
            const h = this.showcase[i], a = h.a;
            const sel = i === this.selectIndex;
            a.x = U.damp(a.x, cx + (i - 2) * 1.50, 7, dt);
            a.z = U.damp(a.z, sel ? 1.55 : 0.75, 6, dt);
            a.facing = 1;
            h.rig.root.scale.setScalar(sel ? 1.06 : 1.0);
        }
    }

    returnToTitle() {
        // 中途退出也应结算最高战功，否则玩家放弃本局时分数白打
        if (this.player) this.commitScore(this.player.score);
        this._clearShowcase();
        this._disposeLevel();
        this.levelIndex = 0;
        this.level = LEVELS[0];
        this._setWorld(this.level);
        this.player = null;
        this.boss = null;
        this.bossActive = false;
        this._enterTitle();
        this.audio.playMusic(null);
    }

    /* ============================================================
     * 流程控制
     * ========================================================== */
    levelName() {
        return this.level ? this.level.name.replace(/^第.章 · /, '') : '';
    }

    startGame(heroKey) {
        this.heroKey = heroKey || 'liubei';
        this.levelIndex = 0;
        this.totalScore = 0;
        this.killCount = 0;
        this.playTime = 0;
        this.newRecord = false; // 新一局重置破纪录标记，避免上一局的提示残留
        this.player = null;     // 不继承上一局的分数/命数
        this.loadLevel(0);
    }

    _disposeActor(a) {
        if (!a || a._disposed) return;
        a._disposed = true;
        if (a.dispose) a.dispose();
    }

    /** 清空当前关卡的所有实体（3D 对象必须显式移出场景并释放） */
    _disposeLevel() {
        for (const a of this.actors) this._disposeActor(a);
        this.actors.length = 0;
        for (const p of this.projectiles) if (p._kill) p._kill();
        this.projectiles.length = 0;
        for (const it of this.items) it.dispose();
        this.items.length = 0;
        for (const b of this.breakables) b.dispose();
        this.breakables.length = 0;
        this.timers.length = 0;
        this.spawnQueue.length = 0;
        this.tokenHolders.length = 0;
        this.boss = null;
        this.bossActive = false;
        this.fx.clear();
    }

    loadLevel(i) {
        this.levelIndex = i;
        this.level = LEVELS[i];
        const S = LEVEL_SCALE[Math.min(i, LEVEL_SCALE.length - 1)];
        const D = this.diff || DIFFICULTY[1];
        // 关卡成长与本局难度相乘；同时出手的敌人数量也随难度增减
        this.scaleHp = S.hp * D.hp;
        this.scaleAtk = S.atk * D.atk;
        this.maxTokens = Math.max(1, S.tokens + D.tokens);

        this._clearShowcase();
        this._disposeLevel();
        this._setWorld(this.level);

        this.gateIndex = 0;
        this.waveState = 'open';
        this.killCount = this.killCount || 0;

        // 玩家
        const p = new Player(this, { look: this.heroKey, x: 3.0, z: 2.0, facing: 1 });
        if (this.player) {
            p.lives = this.player.lives;
            p.score = this.player.score;
            p.rage = this.player.rage;
            p.comboBest = this.player.comboBest;
            p.hitsLanded = this.player.hitsLanded;
            p.perfectGuards = this.player.perfectGuards;
        }
        this.player = p;
        this.actors.push(p);

        // 本关入场存档：暂停菜单「重新挑战」回到这里，避免靠反复重开刷分
        this.levelCheckpoint = {
            score: p.score, rage: p.rage, comboBest: p.comboBest,
            hitsLanded: p.hitsLanded, perfectGuards: p.perfectGuards,
            killCount: this.killCount
        };

        // 场景道具
        for (const pr of this.level.props) {
            this.breakables.push(new Breakable(this, { kind: pr.k, x: pr.x, z: pr.z, drop: pr.drop }));
        }

        const half = CAM.halfW;
        this.cam.x = U.clamp(p.x, half, Math.max(half, this.level.length - half));
        this.arena = { min: 0.8, max: this.level.waves[0].at };
        this.softArena = { min: 0, max: this.level.length };

        this.introT = 0;
        this.state = ST.INTRO;
        this.input.flush();
        this.audio.playMusic(this.level.music);
    }

    nextLevel() {
        if (this.levelIndex + 1 >= LEVELS.length) {
            let sum = this.player.score;
            for (const b of this.computeBonus()) sum += b[1];
            this.finalScore = Math.round(sum);
            this.commitScore(this.finalScore);
            this.state = ST.VICTORY;
            this.resultT = 0;
            this.audio.playMusic(null);
            this.audio.play('victory');
            return;
        }
        this.loadLevel(this.levelIndex + 1);
    }

    computeBonus() {
        const p = this.player;
        return [
            ['通关奖励', 10000],
            ['剩余生命 × ' + Math.max(0, p.lives - 1), Math.max(0, p.lives - 1) * 3000],
            ['最高连击 × ' + p.comboBest, p.comboBest * 120],
            ['完美格挡 × ' + p.perfectGuards, p.perfectGuards * 200],
            ['击破敌将 × ' + this.killCount, this.killCount * 60]
        ];
    }

    /* ============================================================
     * 波次 / 闸门
     * ========================================================== */
    get currentGate() {
        if (this.gateIndex < this.level.waves.length) return this.level.waves[this.gateIndex];
        return this.level.boss;
    }

    updateWaves(dt) {
        this._updateBossFocus();
        const p = this.player;
        if (!p || p.dead) return;

        if (this.bossActive) {
            if (this.boss && this.boss.dead) {
                this.bossActive = false;
                this.onBossDefeated();
            }
            return;
        }

        if (this.waveState === 'open') {
            const gate = this.level.waves[this.gateIndex];
            if (gate && p.x >= gate.at) {
                this.startWave(gate);
            } else if (!gate && this.level.boss && p.x >= this.level.boss.at) {
                this.startBoss();
            }
        } else if (this.waveState === 'fight') {
            if (this.spawnQueue.length === 0) {
                let alive = 0;
                for (const a of this.actors) if (a.team === TEAM.FOE && !a.dead) alive++;
                if (alive === 0) this.clearWave();
            }
        } else if (this.waveState === 'clear') {
            // 解锁前进（clearWave 已把 gateIndex 推进到下一个闸门）
            const next = this.gateIndex;
            if (next < this.level.waves.length) {
                this.arena.max = this.level.waves[next].at;
            } else if (this.level.boss) {
                this.arena.max = this.level.boss.at;
            } else {
                this.arena.max = this.level.length - 1;
            }
        }
    }

    /** BOSS 登场时压低杂兵的视觉权重，避免小兵和敌将抢同一档亮度 */
    _updateBossFocus() {
        const on = this.bossActive && this.boss && !this.boss.dead;
        for (const a of this.actors) {
            if (a.team !== TEAM.FOE || a === this.boss) continue;
            a.dimmed = on;
        }
    }

    startWave(gate) {
        this.waveState = 'fight';
        this.gateX = gate.at;
        this.arena = { min: Math.max(0.8, gate.at - 6.4), max: gate.at + 2.8 };
        this.softArena = { min: gate.at - 9.5, max: gate.at + 10 };
        this.spawnQueue = buildSpawnList(gate, gate.at, this.levelIndex);
        this.ui.showWave(`第 ${this.gateIndex + 1} 波 · ${gate.hint}`, '肃清敌军方可前进');
        this.audio.play('waveClear', { volume: 0.6 });
        this.fx.addShake(3);
    }

    clearWave() {
        this.waveState = 'clear';
        this.gateIndex++;
        this.ui.showBanner('敌人已肃清', '#7CFC75', 30);
        this.audio.play('waveClear');
        const p = this.player;
        p.score += 800;
        p.addRage(12);
        // 波次结束到下一波之间有 0.9s 的空档，残留箭矢仍会飞过来；
        // 这在“肃清”提示之后被打死非常出戏，直接清空并给短暂无敌。
        for (const pr of this.projectiles) if (pr.team !== p.team) pr._kill();
        p.invuln = Math.max(p.invuln, 1.2);
        // 掉落奖励
        const kind = U.pick(['baozi', 'gold', 'wine', 'baozi', 'roast']);
        this.dropItem(kind, p.x + 1.2, U.clamp(p.z, 0.6, 3.0));
        this.timers.push({ t: 0.9, fn: () => { if (this.waveState === 'clear') this.waveState = 'open'; } });
    }

    startBoss() {
        const b = this.level.boss;
        this.bossActive = true;
        this.waveState = 'boss';
        this.gateX = b.at;
        this.arena = { min: Math.max(0.8, b.at - 7.2), max: Math.min(b.at + 7.2, this.level.length - 0.8) };
        this.softArena = { min: b.at - 8.5, max: b.at + 8.5 };
        // 入场位置不能超出关卡右界，否则 BOSS 会贴着屏幕右缘只露半个身子
        const spawnX = Math.min(b.at + 3.4, this.level.length - 1.2);
        const boss = new Boss(this, {
            look: b.type, x: spawnX, z: 1.9, facing: -1, lockX: b.at,
            // BOSS 不叠加关卡成长（原本就按最终数值设计），只吃难度系数
            hpMul: (this.diff || DIFFICULTY[1]).hp,
            atkMul: (this.diff || DIFFICULTY[1]).atk
        });
        this.boss = boss;
        this.actors.push(boss);
        this.audio.playMusic('boss');
        this.ui.showWave(b.title + ' · ' + LOOKS[b.type].name, '黄天当立，岁在甲子');
        this.fx.addShake(9);
    }

    onBossReady(boss) {
        this.audio.play('bossRoar');
    }

    onBossDefeated() {
        const p = this.player;
        p.score += 5000;
        // 敌将已倒，杂兵恢复原本亮度（清场庆祝时不该再压暗）
        for (const a of this.actors) a.dimmed = false;
        // 清掉场上残留的敌方投射物，并给玩家一段无敌时间：
        // 结算前被最后一发妖术弹打死是最挫败的体验。
        for (const pr of this.projectiles) if (pr.team !== p.team) pr._kill();
        p.invuln = Math.max(p.invuln, 3.6);
        this.audio.playMusic(this.level.music);
        this.audio.play('victory');
        this.fx.addFlash(0.85, '#FFE9A8');
        this.fx.addShake(18);
        this.state = ST.CLEAR;
        this.clearT = 0;
        this.ui.showBanner('敌将讨取！', C_gold(), 40);
        for (let i = 0; i < 3; i++) {
            this.timers.push({
                t: 0.3 + i * 0.25,
                fn: () => this.dropItem(U.pick(['roast', 'wine', 'jade']), p.x + U.rand(-1.5, 1.5), U.rand(0.8, 2.8))
            });
        }
    }

    /* ============================================================
     * 实体管理
     * ========================================================== */
    spawnEnemy(type, x, z, opts) {
        opts = opts || {};
        const e = new Enemy(this, {
            look: type, x: U.clamp(x, this.softArena.min, this.softArena.max), z,
            facing: opts.facing != null ? opts.facing : (x > (this.player ? this.player.x : 0) ? -1 : 1),
            hpMul: this.scaleHp, atkMul: this.scaleAtk, entering: opts.entering
        });
        this.actors.push(e);
        return e;
    }

    spawnProjectile(cfg) { this.projectiles.push(new Projectile(this, cfg)); }

    dropItem(kind, x, z) {
        this.items.push(new Item(this, { kind, x, z, y: 1.0, vy: 3.4 }));
    }

    schedule(t, fn) { this.timers.push({ t, fn }); }

    requestToken(e) {
        if (this.tokenHolders.length >= this.maxTokens) return false;
        if (this.tokenHolders.indexOf(e) >= 0) return true;
        this.tokenHolders.push(e);
        return true;
    }
    releaseToken(e) {
        const i = this.tokenHolders.indexOf(e);
        if (i >= 0) this.tokenHolders.splice(i, 1);
    }

    onActorDead(a) {
        if (a === this.player) {
            if (this.player.lives <= 0) {
                this.timers.push({ t: 1.8, fn: () => this.gameOver() });
            }
            return;
        }
        this.killCount++;
        this.releaseToken(a);
        const p = this.player;
        if (p) p.registerHit(a.maxHp * 0.2, true);
        // 掉落
        if (U.chance(a.isBoss ? 1 : 0.16)) {
            const table = ['baozi', 'baozi', 'gold', 'wine', 'gold', 'roast'];
            this.dropItem(U.pick(table), a.x, a.z);
        }
    }

    onItemPicked() { }

    gameOver() {
        this.state = ST.RESULT;
        this.resultT = 0;
        this.win = false;
        // 结算面板会盖在尸体上，"最高战功"等文字会和角色模型叠在一起，
        // 这里通过 hideRig 让渲染层跳过阵亡的玩家模型（rig 每帧重算 visible）。
        if (this.player) this.player.hideRig = true;
        this.commitScore(this.player ? this.player.score : 0);
        this.audio.playMusic(null);
        this.audio.play('gameover');
    }

    tryBreak(actor) {
        const reach = actor.reach + 0.35;
        for (const b of this.breakables) {
            if (b.dead) continue;
            const dx = (b.x - actor.x) * actor.facing;
            if (dx < -0.2 || dx > reach) continue;
            if (Math.abs(b.z - actor.z) > 0.55) continue;
            b.takeHit();
            return true;
        }
        return false;
    }

    /* ============================================================
     * 主循环
     * ========================================================== */
    start() {
        this._last = performance.now();
        this.frames = 0;
        const loop = (now) => {
            let dt = (now - this._last) / 1000;
            const rawDt = dt;
            this._last = now;
            if (dt > 0.05) dt = 0.05;
            if (dt < 0) dt = 0;
            try {
                this.frame(dt);
                this.frames++;
                this._monitorPerf(rawDt);
            } catch (e) {
                // 单帧异常不应冻结整个游戏：记录一次后继续
                this._errCount = (this._errCount || 0) + 1;
                if (this._errCount <= 3) {
                    window.__loopErr = (e && e.stack) || String(e);
                    console.error('[frame error]', e);
                }
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    frame(dt) {
        this.input.update(dt);
        this.ui.update(dt);
        this.handleStateKeys();

        switch (this.state) {
            case ST.TITLE:
                this.t += dt;
                this.cam.x = 12 + Math.sin(this.t * 0.12) * 3.2;
                if (this.showcase[0]) this.showcase[0].a.x = this.cam.x + 2.62;
                this._updateShowcase(dt);
                this.world.update(dt, this.cam.x);
                this.fx.update(dt);
                break;
            case ST.HELP:
                this.world.update(dt, this.cam.x);
                this.fx.update(dt);
                break;
            case ST.SELECT:
                this._layoutSelect(dt);
                this._updateShowcase(dt);
                this.world.update(dt, this.cam.x);
                this.fx.update(dt);
                break;
            case ST.INTRO:
                this.introT += dt;
                this.world.update(dt, this.cam.x);
                this.fx.update(dt);
                if (this.introT > 3.2 || this.input.justPressed('start')) {
                    this.state = ST.PLAY; this.input.flush();
                }
                break;
            case ST.PLAY: this.updatePlay(dt); break;
            case ST.PAUSE: break;
            case ST.CLEAR:
                this.clearT += dt;
                this.updateWorld(dt, true);
                if (this.clearT > 3.4 || this.input.justPressed('start')) this.nextLevel();
                break;
            case ST.RESULT:
                this.resultT += dt;
                this.fx.update(dt * 0.6);
                if (this.resultT > 0.6) {
                    // 与界面文案一致：Enter 用同一武将重开，Esc 回标题
                    if (this.input.justPressed('start')) {
                        this.startGame(this.heroKey);
                        this.input.flush();
                    } else if (this.input.justPressed('pause')) {
                        this.returnToTitle();
                    }
                }
                break;
            case ST.VICTORY:
                this.resultT += dt;
                this.world.update(dt, this.cam.x);
                this.fx.update(dt);
                if (this.resultT > 0.8 && (this.input.justPressed('start') || this.input.justPressed('pause'))) {
                    this.returnToTitle();
                }
                break;
        }

        this.render();
        this.input.lateUpdate();
    }

    handleStateKeys() {
        const inp = this.input;
        switch (this.state) {
            case ST.TITLE:
                if (inp.justPressed('up')) { this.titleIndex = (this.titleIndex + 2) % 3; this.audio.play('cursor'); }
                if (inp.justPressed('down')) { this.titleIndex = (this.titleIndex + 1) % 3; this.audio.play('cursor'); }
                if (inp.justPressed('start')) {
                    this.audio.play('confirm');
                    if (this.titleIndex === 0) {
                        // 开始征战 = 用上次选择的武将直接开打
                        this.startGame(this.heroKey);
                    } else if (this.titleIndex === 1) {
                        this._enterSelect();
                    } else {
                        this.state = ST.HELP;
                    }
                    this.input.flush();
                }
                break;
            case ST.HELP:
                if (inp.justPressed('start') || inp.justPressed('pause')) {
                    this.state = ST.TITLE; this.audio.play('confirm'); this.input.flush();
                }
                break;
            case ST.SELECT: {
                const n = Object.keys(HERO_KIT).length;
                if (inp.justPressed('left')) { this.selectIndex = (this.selectIndex + n - 1) % n; this.audio.play('cursor'); }
                if (inp.justPressed('right')) { this.selectIndex = (this.selectIndex + 1) % n; this.audio.play('cursor'); }
                // ↑↓ 切难度：选人页两轴分工，方向键左右管武将，上下管难度
                if (inp.justPressed('up')) { this.setDiff(this.diffIndex - 1); this.audio.play('cursor'); }
                if (inp.justPressed('down')) { this.setDiff(this.diffIndex + 1); this.audio.play('cursor'); }
                if (inp.justPressed('pause')) { this.state = ST.TITLE; this.audio.play('confirm'); this.input.flush(); }
                if (inp.justPressed('start')) {
                    this.audio.play('confirm');
                    this.startGame(Object.keys(HERO_KIT)[this.selectIndex]);
                    this.input.flush();
                }
                break;
            }
            case ST.PLAY:
                if (inp.justPressed('pause')) {
                    this.state = ST.PAUSE; this.pauseIndex = 0;
                    this.audio.play('menu'); this.input.flush();
                }
                break;
            case ST.PAUSE:
                if (inp.justPressed('up')) { this.pauseIndex = (this.pauseIndex + 3) % 4; this.audio.play('cursor'); }
                if (inp.justPressed('down')) { this.pauseIndex = (this.pauseIndex + 1) % 4; this.audio.play('cursor'); }
                if (inp.justPressed('pause')) { this.state = ST.PLAY; this.audio.play('confirm'); this.audio.resume(); this.input.flush(); }
                if (inp.justPressed('start')) {
                    this.audio.play('confirm');
                    // 失焦自动暂停时音频上下文已被 suspend，操作暂停菜单时统一唤醒
                    this.audio.resume();
                    this.input.flush();
                    if (this.pauseIndex === 0) this.state = ST.PLAY;
                    else if (this.pauseIndex === 1) {
                        // 回到本关入场状态，防止重复刷同一波敌人涨战功
                        const cp = this.levelCheckpoint;
                        if (cp && this.player) {
                            this.player.score = cp.score;
                            this.player.rage = cp.rage;
                            this.player.comboBest = cp.comboBest;
                            this.player.hitsLanded = cp.hitsLanded;
                            this.player.perfectGuards = cp.perfectGuards;
                            this.killCount = cp.killCount;
                        }
                        this.player.lives = Math.max(1, this.player.lives);
                        this.loadLevel(this.levelIndex);
                    }
                    else if (this.pauseIndex === 2) { this.returnToTitle(); }
                    else { this.audio.setMuted(!this.audio.muted); if (!this.audio.muted) this.audio.playMusic(this.bossActive ? 'boss' : this.level.music); }
                }
                break;
        }
    }

    /* ---------------- 战斗主更新 ---------------- */
    updatePlay(dt) {
        if (this.fx.hitStop > 0) {
            this.fx.hitStop -= dt;
            this.fx.update(dt * 0.25);
            this.updateCamera(dt);
            this.world.update(dt * 0.3, this.cam.x);
            return;
        }
        this.playTime += dt;
        this.updateWorld(dt, false);
        this.updateWaves(dt);
    }

    updateWorld(dt, frozenAI) {
        // 定时回调
        for (let i = this.timers.length - 1; i >= 0; i--) {
            const tm = this.timers[i];
            tm.t -= dt;
            if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); }
        }

        // 刷怪队列
        if (this.spawnQueue && this.spawnQueue.length) {
            for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
                const s = this.spawnQueue[i];
                s.delay -= dt;
                if (s.delay <= 0) {
                    this.spawnQueue.splice(i, 1);
                    this.spawnEnemy(s.type, s.x, s.z, { entering: true });
                }
            }
        }

        // 实体
        for (const a of this.actors) {
            if (a.remove) continue;
            if (a.dead) {
                a.deadT = (a.deadT || 0) + dt;
                if (a === this.player) { a.update(dt); continue; }
                if (a.deadT > 2.4) { a.remove = true; continue; }
            }
            if (frozenAI && a !== this.player) { a.animate(dt); a.rig.update(a, dt); continue; }
            a.update(dt);
        }
        // 清理（3D 对象一并释放）
        for (let i = this.actors.length - 1; i >= 0; i--) {
            if (this.actors[i].remove) {
                this._disposeActor(this.actors[i]);
                this.actors.splice(i, 1);
            }
        }

        // 投射物
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt);
            if (p.dead) this.projectiles.splice(i, 1);
        }
        // 道具
        for (let i = this.items.length - 1; i >= 0; i--) {
            const it = this.items[i];
            it.update(dt);
            if (it.dead) this.items.splice(i, 1);
        }
        // 木箱
        for (let i = this.breakables.length - 1; i >= 0; i--) {
            if (this.breakables[i].dead) this.breakables.splice(i, 1);
        }

        this.separate();
        this.fx.update(dt);
        this.updateCamera(dt);
        this.world.update(dt, this.cam.x);
    }

    /** 角色互推，避免重叠 */
    separate() {
        const list = this.actors;
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            if (a.dead || a.remove) continue;
            for (let j = i + 1; j < list.length; j++) {
                const b = list[j];
                if (b.dead || b.remove) continue;
                if (a.y > 0.7 || b.y > 0.7) continue;
                const dx = b.x - a.x;
                const dz = b.z - a.z;
                // 留一点额外间距：rx 只是判定半径，模型实际更宽，
                // 完全贴合的两个人会在同深度下糊成一团。
                const mx = a.rx + b.rx + 0.05;
                const mz = a.rz + b.rz + 0.04;
                if (Math.abs(dx) >= mx || Math.abs(dz) >= mz) continue;
                const pushX = (mx - Math.abs(dx)) * 0.5 * (dx < 0 ? -1 : 1);
                const pushZ = (mz - Math.abs(dz)) * 0.5 * (dz < 0 ? -1 : 1);
                const wa = b.mass / (a.mass + b.mass), wb = a.mass / (a.mass + b.mass);
                // 出招中的角色只减弱推挤而不是完全免疫，
                // 否则多个敌人同帧挥刀时会完全叠在玩家身上。
                const aFix = (a.atkDef || a.state === 'charge') ? 0.3 : 1;
                const bFix = (b.atkDef || b.state === 'charge') ? 0.3 : 1;
                a.x -= pushX * wa * aFix; a.z -= pushZ * wa * aFix;
                b.x += pushX * wb * bFix; b.z += pushZ * wb * bFix;
                a.z = U.clamp(a.z, GROUND.zMin, GROUND.zPlayMax);
                b.z = U.clamp(b.z, GROUND.zMin, GROUND.zPlayMax);
            }
        }
        // 挤压也会把人推出战区边界，这里再收敛一次，避免出现「怪卡在空气墙外」
        for (const a of list) {
            if (!a.dead && !a.remove) a.clampToArena();
        }
    }

    updateCamera(dt) {
        const half = CAM.halfW;
        const L = this.level.length;
        let target = this.player ? this.player.x : half;
        // BOSS 战时镜头往 BOSS 偏一点，免得一方跑到看不见的地方
        if (this.bossActive && this.boss && !this.boss.dead && this.player) {
            target = Math.max(this.player.x, this.boss.x - 3.0);
        }
        target = U.clamp(target, half, Math.max(half, L - half));
        this.cam.x = U.damp(this.cam.x, target, 6.5, dt);
        this.cam.x = U.clamp(this.cam.x, half, Math.max(half, L - half));
    }

    /* ============================================================
     * 渲染
     * ========================================================== */
    render() {
        const ctx = this.ctx;
        ctx.setTransform(this.uiScale, 0, 0, this.uiScale, 0, 0);
        ctx.clearRect(0, 0, VIEW.W, VIEW.H);

        // 3D
        this.stage.setCamX(this.cam.x);
        this.stage.shakeX = this.fx.shakeX;
        this.stage.shakeY = this.fx.shakeY;
        this.stage.render();

        // 伤害数字 / 闪白
        this.fx.drawOverlay(ctx, this.stage);

        // 战场边界提示
        if (this.state === ST.PLAY || this.state === ST.INTRO || this.state === ST.CLEAR) {
            if (this.waveState === 'fight' || this.bossActive) this.drawArenaEdge(ctx);
        }

        // 界面层
        switch (this.state) {
            case ST.TITLE: this.ui.drawTitle(ctx); break;
            case ST.HELP: this.ui.drawHelp(ctx); break;
            case ST.SELECT: this.ui.drawSelect(ctx); break;
            case ST.INTRO: this.ui.drawHUD(ctx); this.ui.drawLevelIntro(ctx); break;
            case ST.PLAY: this.ui.drawHUD(ctx); break;
            case ST.PAUSE: this.ui.drawHUD(ctx); this.ui.drawPause(ctx); break;
            case ST.CLEAR: this.ui.drawHUD(ctx); break;
            case ST.RESULT: this.ui.drawResult(ctx, false); break;
            case ST.VICTORY: this.ui.drawVictory(ctx); break;
        }

        this.drawVignette(ctx);
        if (this.fade > 0) this.ui.drawFade(ctx, this.fade);
    }

    drawArenaEdge(ctx) {
        ctx.save();
        const p = {}, pb = {};
        const edges = [
            { x: this.arena.min, dir: -1 },
            { x: this.arena.max, dir: 1 }
        ];
        const t = this.playTime;
        for (const e of edges) {
            this.stage.project(e.x, 2.55, 1.8, p);
            this.stage.project(e.x, 0.0, 1.8, pb);
            if (!p.visible || !pb.visible) continue;
            if (p.x < -90 || p.x > VIEW.W + 90) continue;

            // 竖立的淡光幕：顶端透明、近地变浓，像一道看不见的屏障
            const h = Math.max(24, pb.y - p.y);
            const vg = ctx.createLinearGradient(0, p.y, 0, pb.y);
            vg.addColorStop(0, 'rgba(255,150,70,0)');
            vg.addColorStop(0.55, 'rgba(255,140,60,0.10)');
            vg.addColorStop(1, 'rgba(255,120,50,0.30)');
            ctx.fillStyle = vg;
            const w = 30;
            ctx.fillRect(p.x - w / 2, p.y, w, h);

            // 地面光带：一道贴地的弧光
            const eg = ctx.createRadialGradient(pb.x, pb.y, 2, pb.x, pb.y, 46);
            eg.addColorStop(0, 'rgba(255,190,110,0.42)');
            eg.addColorStop(1, 'rgba(255,120,50,0)');
            ctx.fillStyle = eg;
            ctx.beginPath();
            ctx.ellipse(pb.x, pb.y, 46, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            // 上升的光点，让边界有「通电」的感觉
            for (let i = 0; i < 4; i++) {
                const k = ((t * 0.42 + i * 0.25) % 1);
                const yy = pb.y - k * h;
                const a = (1 - k) * 0.5;
                ctx.fillStyle = `rgba(255,206,140,${a.toFixed(3)})`;
                ctx.fillRect(p.x - 1.5, yy, 3, 8);
            }
        }
        ctx.restore();
    }

    drawVignette(ctx) {
        // 暗角是固定画面元素，没必要每帧重建一个 800x600 的径向渐变
        if (!this._vignette) {
            const c = document.createElement('canvas');
            c.width = VIEW.W; c.height = VIEW.H;
            const x = c.getContext('2d');
            const g = x.createRadialGradient(VIEW.W / 2, VIEW.H / 2, VIEW.H * 0.42, VIEW.W / 2, VIEW.H / 2, VIEW.H * 0.95);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(1, 'rgba(0,0,0,0.42)');
            x.fillStyle = g;
            x.fillRect(0, 0, VIEW.W, VIEW.H);
            // 前景压暗：底部的近景草带原来比战场还亮，会把视线从角色身上拉走
            const bg = x.createLinearGradient(0, VIEW.H * 0.70, 0, VIEW.H);
            bg.addColorStop(0, 'rgba(0,0,0,0)');
            bg.addColorStop(1, 'rgba(0,0,0,0.30)');
            x.fillStyle = bg;
            x.fillRect(0, VIEW.H * 0.70, VIEW.W, VIEW.H * 0.30);
            this._vignette = c;
        }
        ctx.drawImage(this._vignette, 0, 0, VIEW.W, VIEW.H);

        // 低血量警示：残血时屏幕四周缓慢起伏的红晕，比只看血条更有压迫感
        const p = this.player;
        if (this.state === ST.PLAY && p && !p.dead && p.hp / p.maxHp < 0.28) {
            if (!this._dangerVignette) {
                const c = document.createElement('canvas');
                c.width = VIEW.W; c.height = VIEW.H;
                const x = c.getContext('2d');
                const g = x.createRadialGradient(VIEW.W / 2, VIEW.H / 2, VIEW.H * 0.24, VIEW.W / 2, VIEW.H / 2, VIEW.H * 0.86);
                g.addColorStop(0, 'rgba(180,20,20,0)');
                g.addColorStop(1, 'rgba(180,20,20,0.85)');
                x.fillStyle = g;
                x.fillRect(0, 0, VIEW.W, VIEW.H);
                this._dangerVignette = c;
            }
            ctx.save();
            ctx.globalAlpha = 0.16 + Math.sin(this.playTime * 5.2) * 0.08;
            ctx.drawImage(this._dangerVignette, 0, 0, VIEW.W, VIEW.H);
            ctx.restore();
        }
    }

    /* ---------------- 对外便捷接口（UI / 实体回调） ---------------- */
    showBanner(t, c, s) { this.ui.showBanner(t, c, s); }
    showSkillBanner(t, sup) { this.ui.showSkillBanner(t, sup); }
}

function C_gold() { return '#F2C14E'; }

/* ============================================================
 * 启动
 * ========================================================== */
function startGameApp() {
    const canvas = document.getElementById('gameCanvas');
    const uiCanvas = document.getElementById('uiCanvas');
    if (!canvas || !uiCanvas) {
        window.__lastErr = 'canvas not found';
        return;
    }
    const game = new Game(canvas, uiCanvas);
    window.GAME = game;
    game.start();
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startGameApp);
} else {
    startGameApp();
}

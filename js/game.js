/* ============================================================
 * 三国战纪 · 主程序
 * 流程：标题 → 选人 → 关卡开场 → 战斗（波次推进 / BOSS）→ 结算
 * ============================================================ */
'use strict';

const ST = {
    TITLE: 'title', HELP: 'help', SELECT: 'select',
    INTRO: 'intro', PLAY: 'play', PAUSE: 'pause',
    CLEAR: 'clear', RESULT: 'result', VICTORY: 'victory'
};

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = true;
        this.renderScale = 1;

        /** 最高战功（localStorage 持久化）；file:// 或隐私模式下可能不可用 */
        this.bestScore = Game.loadBest();
        this.newRecord = false;

        this.input = new InputManager();
        this.audio = new AudioEngine();
        this.fx = new FX();
        this.ui = new UI(this);

        this.state = ST.TITLE;
        this.titleIndex = 0;
        this.selectIndex = 0;
        this.pauseIndex = 0;

        this.cam = { x: 0, y: 0 };
        this.actors = [];
        this.projectiles = [];
        this.items = [];
        this.breakables = [];
        this.timers = [];

        this.arena = { min: 0.8, max: 20 };
        this.softArena = { min: 0, max: 40 };
        this.tokenHolders = [];
        this.maxTokens = 2;

        this.levelIndex = 0;
        this.level = LEVELS[0];
        this.scene = makeScene(this.level.theme);
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
        this.fade = 0;
        this.fadeTarget = 0;
        this.pending = null;
        this.totalScore = 0;
        this.finalScore = 0;
        this.playTime = 0;

        this._last = performance.now();
        this._acc = 0;
        this._bindGlobal();
        this._fitCanvas();
        window.addEventListener('resize', () => this._fitCanvas());
    }

    /* ---------------- 最高战功持久化 ---------------- */
    static BEST_KEY = 'sgzj.bestScore';

    static loadBest() {
        try {
            const v = parseInt(window.localStorage.getItem(Game.BEST_KEY) || '0', 10);
            return Number.isFinite(v) && v > 0 ? v : 0;
        } catch (e) {
            return 0; // file:// 受限或隐私模式：静默降级为不记录
        }
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
        const c = this.canvas;
        const pad = 24;
        const aw = window.innerWidth - pad * 2;
        const ah = window.innerHeight - pad * 2 - 40;
        const s = Math.max(0.5, Math.min(aw / VIEW.W, ah / VIEW.H));
        c.style.width = Math.round(VIEW.W * s) + 'px';
        c.style.height = Math.round(VIEW.H * s) + 'px';

        // 后备缓冲倍率。
        // 重要：这里刻意不让缓冲跟随任意缩放比。实测表明，非整数倍的
        // ctx.scale() 会让每帧的每一次绘制都走慢速光栅化路径——在软件渲染
        // 环境（--disable-gpu / 虚拟机 / 远程桌面 / 低端机）下帧率会从 55 FPS
        // 掉到 8 FPS，相差近 7 倍。
        // 因此策略为：默认 1:1 绘制（快速路径），仅当放大显著或高分屏时才
        // 提升到 2×（此时用户通常有大屏且带 GPU 加速，代价可承受），
        // 并在运行期监测到持续低帧率时自动降级回 1×。
        const dpr = window.devicePixelRatio || 1;
        const want = s * dpr;
        let r = 1;
        if (!this._perfCapped && want >= 1.75) r = 2;
        const bw = Math.round(VIEW.W * r), bh = Math.round(VIEW.H * r);
        this.renderScale = r;
        if (c.width !== bw || c.height !== bh) {
            c.width = bw; c.height = bh;
            // 改变尺寸会重置上下文状态，这里恢复需要的绘制属性
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
        }
    }

    /**
     * 运行期性能监测：连续两个 1.5s 采样窗口在战斗状态下低于 48 FPS，
     * 就把后备缓冲从 2× 降回 1×（降级后不再回升，避免反复抖动）。
     * 传入的是未经钳制的真实帧间隔，否则 dt 上限会把低帧率"美化"成 20 FPS。
     */
    _monitorPerf(rawDt) {
        if (this._perfCapped) return;
        if ((this.renderScale || 1) <= 1) return;
        const m = this._perf || (this._perf = { t: 0, n: 0, bad: 0 });
        m.t += rawDt;
        m.n++;
        if (m.t < 1.5) return;
        const fps = m.n / m.t;
        // 只在战斗态判定：标题/暂停等静态画面帧率低不代表渲染压力
        if (this.state === ST.PLAY) m.bad = fps < 48 ? m.bad + 1 : 0;
        m.t = 0; m.n = 0;
        if (m.bad >= 2) {
            this._perfCapped = true;
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
        this.canvas.addEventListener('pointerdown', () => { this.audio.init(); this.audio.resume(); });

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

    loadLevel(i) {
        this.levelIndex = i;
        this.level = LEVELS[i];
        const S = LEVEL_SCALE[Math.min(i, LEVEL_SCALE.length - 1)];
        this.scaleHp = S.hp; this.scaleAtk = S.atk; this.maxTokens = S.tokens;

        this.scene = makeScene(this.level.theme);
        this.actors.length = 0;
        this.projectiles.length = 0;
        this.items.length = 0;
        this.breakables.length = 0;
        this.timers.length = 0;
        this.tokenHolders.length = 0;
        this.fx.clear();
        this.boss = null;
        this.bossActive = false;
        this.gateIndex = 0;
        this.waveState = 'open';
        this.killCount = this.killCount || 0;

        // 玩家
        const p = new Player(this, { look: this.heroKey, x: 3.0, z: 2.0, facing: 1 });
        if (this.player) {
            p.lives = this.player.lives;
            p.score = this.player.score;
            p.comboBest = this.player.comboBest;
            p.hitsLanded = this.player.hitsLanded;
            p.perfectGuards = this.player.perfectGuards;
        }
        this.player = p;
        this.actors.push(p);

        // 场景道具
        for (const pr of this.level.props) {
            this.breakables.push(new Breakable(this, { kind: pr.k, x: pr.x, z: pr.z, drop: pr.drop }));
        }

        this.cam.x = Math.max(VIEW.W / 2 / PPM, Math.min(p.x, this.level.length - VIEW.W / 2 / PPM));
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
        // 掉落奖励
        const kind = U.pick(['baozi', 'gold', 'wine', 'baozi', 'roast']);
        this.dropItem(kind, p.x + 1.2, U.clamp(p.z, 0.6, 3.0));
        // 补充箭塔式提示
        this.timers.push({ t: 0.9, fn: () => { if (this.waveState === 'clear') this.waveState = 'open'; } });
    }

    startBoss() {
        const b = this.level.boss;
        this.bossActive = true;
        this.waveState = 'boss';
        this.gateX = b.at;
        this.arena = { min: Math.max(0.8, b.at - 7.2), max: Math.min(b.at + 7.2, this.level.length - 0.8) };
        this.softArena = { min: b.at - 8.5, max: b.at + 8.5 };
        const boss = new Boss(this, { look: b.type, x: b.at + 5.0, z: 1.9, facing: -1, lockX: b.at });
        this.boss = boss;
        this.actors.push(boss);
        this.audio.playMusic('boss');
        this.ui.showWave(b.title + ' · ' + LOOKS[b.type].name, '黄天当立，岁在甲子');
        this.fx.addShake(9);
    }

    onBossReady(boss) {
        // BOSS 入场语音；BOSS 名称已在 startBoss 的 showWave 中展示，避免重复
        this.audio.play('bossRoar');
    }

    onBossDefeated() {
        const p = this.player;
        p.score += 5000;
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
                if (!this._errCount) this._errCount = 0;
                this._errCount++;
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
            case ST.TITLE: this.updateTitle(dt); break;
            case ST.HELP: this.scene.update(dt, this.cam.x * PPM); break;
            case ST.SELECT: this.updateSelect(dt); break;
            case ST.INTRO:
                this.introT += dt;
                this.scene.update(dt, this.cam.x * PPM);
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
                    if (this.input.justPressed('start')) { this.state = ST.TITLE; this.input.flush(); }
                    if (this.input.justPressed('pause')) { this.state = ST.TITLE; this.input.flush(); }
                }
                break;
            case ST.VICTORY:
                this.resultT += dt;
                this.scene.update(dt, this.cam.x * PPM);
                this.fx.update(dt);
                if (this.resultT > 0.8 && (this.input.justPressed('start') || this.input.justPressed('pause'))) {
                    this.state = ST.TITLE; this.input.flush();
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
                    if (this.titleIndex === 0) { this.state = ST.SELECT; }
                    else if (this.titleIndex === 1) { this.state = ST.SELECT; }
                    else { this.state = ST.HELP; }
                    this.input.flush();
                }
                break;
            case ST.HELP:
                if (inp.justPressed('start') || inp.justPressed('pause')) { this.state = ST.TITLE; this.audio.play('confirm'); this.input.flush(); }
                break;
            case ST.SELECT:
                if (inp.justPressed('left')) { this.selectIndex = (this.selectIndex + 4) % 5; this.audio.play('cursor'); }
                if (inp.justPressed('right')) { this.selectIndex = (this.selectIndex + 1) % 5; this.audio.play('cursor'); }
                if (inp.justPressed('pause')) { this.state = ST.TITLE; this.audio.play('confirm'); this.input.flush(); }
                if (inp.justPressed('start')) {
                    this.audio.play('confirm');
                    this.startGame(Object.keys(HERO_KIT)[this.selectIndex]);
                    this.input.flush();
                }
                break;
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
                    // 失焦自动暂停时音频上下文已被 suspend，操作暂停菜单（恢复/重开/返回标题）时统一唤醒
                    this.audio.resume();
                    this.input.flush();
                    if (this.pauseIndex === 0) this.state = ST.PLAY;
                    else if (this.pauseIndex === 1) { this.player.lives = Math.max(1, this.player.lives); this.loadLevel(this.levelIndex); }
                    else if (this.pauseIndex === 2) { this.state = ST.TITLE; this.audio.playMusic(null); }
                    else { this.audio.setMuted(!this.audio.muted); if (!this.audio.muted) this.audio.playMusic(this.bossActive ? 'boss' : this.level.music); }
                }
                break;
        }
    }

    updateTitle(dt) {
        this.t = (this.t || 0) + dt;
        this.cam.x += dt * 0.55;
        this.scene.update(dt, this.cam.x * PPM);
    }

    updateSelect(dt) {
        this.scene.update(dt, this.cam.x * PPM);
    }

    /* ---------------- 战斗主更新 ---------------- */
    updatePlay(dt) {
        if (this.fx.hitStop > 0) {
            this.fx.hitStop -= dt;
            this.fx.update(dt * 0.25);
            this.updateCamera(dt);
            this.scene.update(dt * 0.3, this.cam.x * PPM);
            return;
        }
        this.playTime += dt;
        this.updateWorld(dt, false);
        this.updateWaves(dt);

        // 玩家阵亡且无命 → 已在 onActorDead 排程
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
            if (frozenAI && a !== this.player) { a.animate(dt); continue; }
            a.update(dt);
        }
        // 清理
        for (let i = this.actors.length - 1; i >= 0; i--) {
            if (this.actors[i].remove) this.actors.splice(i, 1);
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
        this.scene.update(dt, this.cam.x * PPM);
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
                const mx = a.rx + b.rx;
                const mz = a.rz + b.rz;
                if (Math.abs(dx) >= mx || Math.abs(dz) >= mz) continue;
                const pushX = (mx - Math.abs(dx)) * 0.5 * (dx < 0 ? -1 : 1);
                const pushZ = (mz - Math.abs(dz)) * 0.5 * (dz < 0 ? -1 : 1);
                const wa = b.mass / (a.mass + b.mass), wb = a.mass / (a.mass + b.mass);
                // 攻击中的角色不被推动（保持打击感）
                const aFix = (a.atkDef || a.state === 'charge') ? 0 : 1;
                const bFix = (b.atkDef || b.state === 'charge') ? 0 : 1;
                a.x -= pushX * wa * aFix; a.z -= pushZ * wa * aFix;
                b.x += pushX * wb * bFix; b.z += pushZ * wb * bFix;
                a.z = U.clamp(a.z, GROUND.zMin, GROUND.zPlayMax);
                b.z = U.clamp(b.z, GROUND.zMin, GROUND.zPlayMax);
            }
        }
    }

    updateCamera(dt) {
        const half = VIEW.W / 2 / PPM;
        const L = this.level.length;
        let target = this.player ? this.player.x : half;
        target = U.clamp(target, half, Math.max(half, L - half));
        this.cam.x = U.damp(this.cam.x, target, 6.5, dt);
        this.cam.x = U.clamp(this.cam.x, half, Math.max(half, L - half));
    }

    /* ============================================================
     * 渲染
     * ========================================================== */
    render() {
        const ctx = this.ctx;
        // 最外层缩放：把 800x600 逻辑坐标映射到高分后备缓冲上
        ctx.save();
        ctx.scale(this.renderScale || 1, this.renderScale || 1);

        ctx.save();
        ctx.clearRect(0, 0, VIEW.W, VIEW.H);

        // 屏幕震动
        const shx = this.fx.shakeX, shy = this.fx.shakeY;
        ctx.translate(shx, shy);

        this.scene.draw(ctx, this.cam.x * PPM);

        if (this.state !== ST.TITLE && this.state !== ST.SELECT && this.state !== ST.HELP) {
            this.drawWorld(ctx);
        } else {
            // 标题/选人：展示一名武将立绘
            this.drawIdleHero(ctx);
        }

        this.scene.drawFront(ctx, this.cam.x * PPM);
        this.fx.draw(ctx);
        ctx.restore();

        this.fx.drawFlash(ctx);

        // 界面层
        ctx.save();
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
        ctx.restore();

        // 暗角
        this.drawVignette(ctx);

        ctx.restore(); // 收回最外层缩放
    }

    drawWorld(ctx) {
        const cam = this.cam;

        // 阴影统一先画
        for (const a of this.actors) a.drawShadow(ctx, cam);
        for (const b of this.breakables) {
            Fig.shadow(ctx, VIEW.W / 2 + (b.x - cam.x) * PPM, screenY(b.z), 17 * depthScale(b.z), 0.3, 1);
        }

        // 按纵深排序
        const list = [];
        for (const a of this.actors) if (!a.remove) list.push({ z: a.z, o: a, t: 0 });
        for (const b of this.breakables) if (!b.dead) list.push({ z: b.z - 0.001, o: b, t: 1 });
        for (const it of this.items) if (!it.dead) list.push({ z: it.z - 0.002, o: it, t: 2 });
        for (const p of this.projectiles) if (!p.dead) list.push({ z: p.z, o: p, t: 3 });
        list.sort((a, b) => a.z - b.z);

        for (const e of list) {
            const o = e.o;
            if (o.dead && o.deadT != null && o !== this.player) {
                const k = U.clamp(1 - (o.deadT - 1.5) / 0.9, 0, 1);
                ctx.save(); ctx.globalAlpha = k;
                o.draw(ctx, cam);
                ctx.restore();
            } else {
                o.draw(ctx, cam);
            }
        }

        // 锁屏战斗时画两侧的"战场边界"暗示
        if ((this.waveState === 'fight' || this.bossActive) && this.player) {
            this.drawArenaEdge(ctx);
        }
    }

    drawArenaEdge(ctx) {
        const cam = this.cam;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const edges = [
            { x: this.arena.min, dir: -1 },
            { x: this.arena.max, dir: 1 }
        ];
        for (const e of edges) {
            const sx = VIEW.W / 2 + (e.x - cam.x) * PPM;
            if (sx < -60 || sx > VIEW.W + 60) continue;
            const g = ctx.createLinearGradient(sx, 0, sx + e.dir * 90, 0);
            g.addColorStop(0, 'rgba(255,120,60,0.20)');
            g.addColorStop(1, 'rgba(255,120,60,0)');
            ctx.fillStyle = g;
            ctx.fillRect(Math.min(sx, sx + e.dir * 90), 0, 90, VIEW.H);
        }
        ctx.restore();
    }

    /** 标题 / 选人界面的武将展示 */
    drawIdleHero(ctx) {
        const key = this.state === ST.SELECT ? Object.keys(HERO_KIT)[this.selectIndex] : 'guanyu';
        const look = LOOKS[key];
        const t = this.ui.t;
        ctx.save();
        ctx.translate(VIEW.W / 2, VIEW.H - 92);
        const k = this.state === ST.TITLE ? 132 : 108;
        ctx.scale(k, k);
        ctx.translate(0, -FOOT_OFF);
        const pose = Fig.blend(Fig.idle(t * 0.8), Fig.idle(t * 0.8 + 0.1), 0.5);
        Fig.draw(ctx, look, Fig.solve(pose), { time: t });
        ctx.restore();
    }

    drawVignette(ctx) {
        ctx.save();
        const g = ctx.createRadialGradient(VIEW.W / 2, VIEW.H / 2, VIEW.H * 0.42, VIEW.W / 2, VIEW.H / 2, VIEW.H * 0.95);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, VIEW.W, VIEW.H);
        ctx.restore();
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
    if (!canvas) {
        window.__lastErr = 'gameCanvas not found';
        return;
    }
    const game = new Game(canvas);
    window.GAME = game;
    game.start();
}
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startGameApp);
} else {
    startGameApp();
}

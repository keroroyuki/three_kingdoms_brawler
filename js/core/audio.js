/* ============================================================
 * 三国战纪 · 音频引擎（纯 WebAudio 合成，无外部资源）
 * 音效 + 五声音阶国风 BGM
 * ============================================================ */
'use strict';

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.sfxBus = null;
        this.musicBus = null;
        this.ready = false;
        this.muted = false;
        this.noiseBuffer = null;
        this._musicTimer = null;
        this._musicStep = 0;
        this._track = null;
    }

    init() {
        if (this.ready) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.ctx.destination);

        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 0.85;
        this.sfxBus.connect(this.master);

        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.26;
        this.musicBus.connect(this.master);

        // 预生成噪声
        const len = this.ctx.sampleRate * 1.2;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuffer = buf;

        this.ready = true;
    }

    resume() {
        if (!this.ready) this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    /** 窗口失焦时挂起，避免切走后 BGM 继续响；任意按键会经 resume() 自动恢复 */
    suspend() {
        if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
    }

    setMuted(m) {
        this.muted = m;
        if (this.master) this.master.gain.value = m ? 0 : 0.7;
    }

    _t() { return this.ctx.currentTime; }

    /* ---------------- 基础音源 ---------------- */
    _osc(type, freq, t0, dur, gain, bus, detune = 0) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t0);
        if (detune) o.detune.setValueAtTime(detune, t0);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(bus || this.sfxBus);
        o.start(t0); o.stop(t0 + dur + 0.02);
        return { o, g };
    }

    _noise(t0, dur, gain, filterType, f0, f1, q = 1) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const flt = this.ctx.createBiquadFilter();
        flt.type = filterType || 'bandpass';
        flt.frequency.setValueAtTime(f0, t0);
        if (f1 != null) flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
        flt.Q.value = q;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(flt); flt.connect(g); g.connect(this.sfxBus);
        src.start(t0, Math.random() * 0.4); src.stop(t0 + dur + 0.02);
        return { src, g, flt };
    }

    /* ---------------- 音效 ---------------- */
    play(name, opts = {}) {
        if (!this.ready || this.muted) return;
        const t = this._t();
        const vol = (opts.volume != null ? opts.volume : 1);
        switch (name) {
            case 'swing': // 挥砍风声
                this._noise(t, 0.16, 0.16 * vol, 'bandpass', 1800, 500, 1.2);
                break;
            case 'swingHeavy':
                this._noise(t, 0.26, 0.22 * vol, 'bandpass', 1200, 260, 1.0);
                break;
            case 'hit': // 轻击命中
                this._noise(t, 0.09, 0.30 * vol, 'bandpass', 2600, 900, 0.8);
                this._osc('triangle', 190, t, 0.10, 0.26 * vol);
                break;
            case 'hitHeavy':
                this._noise(t, 0.16, 0.36 * vol, 'bandpass', 1500, 320, 0.7);
                this._osc('sine', 110, t, 0.22, 0.34 * vol);
                this._osc('square', 76, t, 0.16, 0.14 * vol);
                break;
            case 'guard': // 格挡金属声
                this._osc('square', 1750, t, 0.13, 0.13 * vol);
                this._osc('square', 2400, t, 0.09, 0.09 * vol, null, 12);
                this._noise(t, 0.08, 0.16 * vol, 'highpass', 3200, 5200, 0.6);
                break;
            case 'perfectGuard':
                this._osc('sine', 1400, t, 0.28, 0.20 * vol);
                this._osc('sine', 2100, t + 0.03, 0.24, 0.14 * vol);
                this._noise(t, 0.2, 0.14 * vol, 'highpass', 4000, 7000, 0.7);
                break;
            case 'jump':
                this._osc('sine', 300, t, 0.16, 0.16 * vol);
                this._osc('sine', 300, t, 0.16, 0.16 * vol).o.frequency.exponentialRampToValueAtTime(620, t + 0.15);
                break;
            case 'land':
                this._noise(t, 0.11, 0.16 * vol, 'lowpass', 500, 130, 0.8);
                this._osc('sine', 96, t, 0.12, 0.18 * vol);
                break;
            case 'dash':
                this._noise(t, 0.22, 0.16 * vol, 'bandpass', 900, 2400, 2.0);
                break;
            case 'pickup':
                this._osc('square', 660, t, 0.08, 0.13 * vol);
                this._osc('square', 990, t + 0.06, 0.12, 0.13 * vol);
                break;
            case 'heal':
                this._osc('sine', 520, t, 0.14, 0.14 * vol);
                this._osc('sine', 780, t + 0.08, 0.18, 0.14 * vol);
                this._osc('sine', 1040, t + 0.16, 0.22, 0.12 * vol);
                break;
            case 'hurt':
                this._osc('sawtooth', 240, t, 0.16, 0.16 * vol);
                this._osc('sawtooth', 240, t, 0.16, 0.16 * vol).o.frequency.exponentialRampToValueAtTime(120, t + 0.15);
                break;
            case 'ko':
                this._osc('sawtooth', 320, t, 0.5, 0.18 * vol);
                this._osc('sawtooth', 320, t, 0.5, 0.18 * vol).o.frequency.exponentialRampToValueAtTime(60, t + 0.45);
                this._noise(t, 0.4, 0.16 * vol, 'lowpass', 900, 160, 0.7);
                break;
            case 'skill': {
                // 上行五声音阶 + 低频冲击
                const sc = [392, 440, 523, 587, 784];
                sc.forEach((f, i) => this._osc('triangle', f, t + i * 0.045, 0.36, 0.14 * vol));
                this._osc('sine', 80, t, 0.5, 0.26 * vol);
                this._noise(t, 0.4, 0.14 * vol, 'bandpass', 2600, 700, 1.4);
                break;
            }
            case 'fire':
                this._noise(t, 0.3, 0.2 * vol, 'bandpass', 700, 220, 0.9);
                this._osc('sawtooth', 160, t, 0.25, 0.12 * vol);
                break;
            case 'arrow':
                this._noise(t, 0.14, 0.13 * vol, 'highpass', 1800, 3400, 1.0);
                break;
            case 'thunder':
                this._noise(t, 0.55, 0.34 * vol, 'lowpass', 2600, 220, 0.5);
                this._osc('sine', 54, t, 0.5, 0.28 * vol);
                this._osc('sawtooth', 110, t + 0.02, 0.3, 0.12 * vol);
                break;
            case 'summon':
                this._osc('sawtooth', 140, t, 0.42, 0.14 * vol);
                this._osc('sawtooth', 140, t, 0.42, 0.14 * vol).o.frequency.exponentialRampToValueAtTime(420, t + 0.4);
                this._noise(t, 0.4, 0.12 * vol, 'bandpass', 600, 2400, 1.6);
                break;
            case 'bossRoar':
                this._osc('sawtooth', 90, t, 0.8, 0.24 * vol);
                this._osc('sawtooth', 90, t, 0.8, 0.24 * vol).o.frequency.linearRampToValueAtTime(58, t + 0.75);
                this._noise(t, 0.7, 0.16 * vol, 'lowpass', 1400, 300, 0.6);
                break;
            case 'waveClear':
                [523, 659, 784, 1047].forEach((f, i) =>
                    this._osc('triangle', f, t + i * 0.09, 0.34, 0.15 * vol));
                break;
            case 'victory':
                [523, 659, 784, 1047, 1319].forEach((f, i) =>
                    this._osc('triangle', f, t + i * 0.13, 0.6, 0.16 * vol));
                break;
            case 'gameover':
                [523, 466, 392, 311].forEach((f, i) =>
                    this._osc('triangle', f, t + i * 0.22, 0.7, 0.16 * vol));
                break;
            case 'menu':
                this._osc('square', 880, t, 0.05, 0.09 * vol);
                break;
            case 'cursor':
                this._osc('square', 660, t, 0.05, 0.09 * vol);
                break;
            case 'confirm':
                this._osc('square', 660, t, 0.07, 0.11 * vol);
                this._osc('square', 990, t + 0.06, 0.12, 0.11 * vol);
                break;
            case 'coin':
                this._osc('square', 988, t, 0.06, 0.1 * vol);
                this._osc('square', 1319, t + 0.05, 0.14, 0.1 * vol);
                break;
        }
    }

    /* ---------------- BGM ---------------- */
    // 中国五声音阶（宫商角徵羽）
    static SCALE = [0, 2, 4, 7, 9];

    playMusic(trackName) {
        if (!this.ready || this.muted) return;
        if (this._track === trackName) return;
        this.stopMusic();
        this._track = trackName;
        this._musicStep = 0;
        const cfg = AudioEngine.TRACKS[trackName];
        if (!cfg) return;
        this._schedule();
    }

    stopMusic() {
        if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
        this._track = null;
    }

    _schedule() {
        if (!this._track) return;
        const cfg = AudioEngine.TRACKS[this._track];
        const stepMs = 60000 / cfg.bpm / 2; // 八分音符
        const step = this._musicStep++;
        const t = this._t() + 0.05;

        // 旋律（16 步一循环）
        const melody = cfg.melody;
        const n = melody[step % melody.length];
        if (n >= 0) {
            const octave = Math.floor(n / 5);
            const semi = AudioEngine.SCALE[n % 5] + octave * 12 + cfg.root;
            const freq = 440 * Math.pow(2, (semi - 9) / 12);
            this._osc(cfg.wave || 'triangle', freq, t, stepMs / 1000 * 1.7, 0.16, this.musicBus);
            // 五度叠音，增加厚度
            this._osc('sine', freq * 1.5, t, stepMs / 1000 * 1.4, 0.06, this.musicBus);
        }

        // 低音（每 4 步）
        if (step % 4 === 0) {
            const b = cfg.bass[(step / 4) % cfg.bass.length];
            const semi = AudioEngine.SCALE[b % 5] + Math.floor(b / 5) * 12 + cfg.root - 24;
            const freq = 440 * Math.pow(2, (semi - 9) / 12);
            this._osc('sine', freq, t, stepMs / 1000 * 3.4, 0.3, this.musicBus);
        }

        // 鼓点
        const drum = cfg.drum[step % cfg.drum.length];
        if (drum === 1) { // 鼓
            this._noise(t, 0.14, 0.22, 'lowpass', 420, 90, 0.8);
            this._osc('sine', 78, t, 0.14, 0.3, this.musicBus);
        } else if (drum === 2) { // 镲
            this._noise(t, 0.1, 0.1, 'highpass', 5200, 8000, 0.7);
        }

        this._musicTimer = setTimeout(() => this._schedule(), stepMs);
    }

    static TRACKS = {
        plains: {
            bpm: 116, root: 2, wave: 'triangle',
            // -1 表示休止
            melody: [5, -1, 7, 6, 5, -1, 3, 5, 6, -1, 8, 7, 6, 5, 3, -1,
                     6, -1, 8, 9, 8, 7, 6, -1, 5, 3, 5, 6, 5, -1, -1, -1],
            bass: [0, 3, 2, 4, 0, 3, 4, 2],
            drum: [1, 0, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 2, 1, 2]
        },
        fire: {
            bpm: 138, root: -1, wave: 'sawtooth',
            melody: [5, 5, 7, 5, 9, -1, 8, 7, 5, 3, 5, 6, 5, -1, 3, 2,
                     7, 7, 9, 7, 10, -1, 9, 8, 7, 5, 7, 8, 7, -1, 5, -1],
            bass: [0, 0, 4, 3, 0, 0, 2, 4],
            drum: [1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1, 2]
        },
        palace: {
            bpm: 126, root: -3, wave: 'triangle',
            melody: [8, -1, 7, 8, 10, -1, 9, 8, 7, -1, 5, 7, 8, -1, -1, -1,
                     10, -1, 9, 10, 12, -1, 11, 10, 9, 8, 7, 5, 7, -1, -1, -1],
            bass: [0, 0, 3, 2, 0, 4, 3, 1],
            drum: [1, 0, 0, 2, 1, 0, 1, 0, 1, 0, 2, 0, 1, 0, 1, 2]
        },
        boss: {
            bpm: 150, root: -5, wave: 'sawtooth',
            melody: [5, 4, 5, 7, 5, 4, 2, 4, 5, 7, 8, 7, 5, 4, 2, -1,
                     9, 8, 9, 11, 9, 8, 7, 8, 9, 11, 12, 11, 9, 7, 5, -1],
            bass: [0, 0, 0, 1, 0, 0, 4, 3],
            drum: [1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 2, 1, 1]
        }
    };
}

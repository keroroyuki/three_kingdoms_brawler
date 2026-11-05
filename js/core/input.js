/* ============================================================
 * 三国战纪 · 输入管理器
 * 支持：边沿检测、输入缓冲、双击冲刺、手柄
 * ============================================================ */
'use strict';

/**
 * 各动作的输入缓冲时长（秒）。
 * 缓冲越长，硬直/落地途中按下的键越容易在恢复后自动生效。
 * 必杀技是低频高价值操作，给 380ms 容错；连招类保持短缓冲以维持节奏精准。
 */
const INPUT_BUFFER = {
    skill: 0.38,
    jump: 0.18,
    attack: 0.16,
    guard: 0.20,
    dash: 0.18
};

const KEY_MAP = {
    'KeyA': 'left', 'ArrowLeft': 'left',
    'KeyD': 'right', 'ArrowRight': 'right',
    'KeyW': 'up', 'ArrowUp': 'up',
    'KeyS': 'down', 'ArrowDown': 'down',
    'KeyJ': 'attack',
    'KeyK': 'jump',
    'KeyL': 'skill',
    'KeyU': 'skill',
    'Space': 'guard',
    'ShiftLeft': 'dash', 'ShiftRight': 'dash',
    'Enter': 'start', 'NumpadEnter': 'start',
    'Escape': 'pause', 'KeyP': 'pause'
};

/**
 * 标准手柄映射（Xbox 布局；PS 手柄的键位编号一致）。
 * 左摇杆 / 十字键移动，A 攻击、B 跳跃、X 必杀、RB 冲刺、LT 防御。
 */
const PAD_BUTTON = {
    0: 'attack', 1: 'jump', 2: 'skill', 5: 'dash',
    6: 'guard', 8: 'pause', 9: 'start',
    12: 'up', 13: 'down', 14: 'left', 15: 'right'
};
const PAD_DEAD = 0.42;

class InputManager {
    constructor() {
        /** 当前按住 */
        this.held = Object.create(null);
        /** 本帧刚按下 */
        this.pressed = Object.create(null);
        /** 本帧刚松开 */
        this.released = Object.create(null);
        /** 动作缓冲：动作 → 剩余有效时间 */
        this.buffer = Object.create(null);
        /** 各方向上次按下时间，用于双击冲刺 */
        this.lastTap = Object.create(null);
        this.lastTapDir = Object.create(null);
        /** 双击方向（单独存放，避免被 buffer 倒计时污染） */
        this.dashDir = 1;
        /** 手柄上一帧的按键状态，用于边沿检测 */
        this.padPrev = Object.create(null);
        this.time = 0;
        this.enabled = true;
        this._bind();
    }

    _bind() {
        window.addEventListener('keydown', (e) => {
            const action = KEY_MAP[e.code];
            if (!action) return;
            if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
            if (e.repeat) return;
            if (!this.enabled) return;
            this._press(action);
        });

        window.addEventListener('keyup', (e) => {
            const action = KEY_MAP[e.code];
            if (!action) return;
            this.held[action] = false;
            this.released[action] = true;
        });

        window.addEventListener('blur', () => {
            this.held = Object.create(null);
        });

        // 阻止方向键/空格滚动页面
        window.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        }, { passive: false });
    }

    _press(action) {
        if (this.held[action]) return;
        this.held[action] = true;
        this.pressed[action] = true;
        // 输入缓冲窗口：必杀技给更长的容错，避免硬直/落地途中按键被吞
        this.buffer[action] = INPUT_BUFFER[action] || 0.16;

        // 双击检测（仅方向键）
        if (action === 'left' || action === 'right') {
            const dir = action === 'left' ? -1 : 1;
            if (this.lastTapDir[action] === dir && this.time - this.lastTap[action] < 0.26) {
                this.buffer['dash'] = 0.18;
                this.dashDir = dir;
                this.lastTap[action] = -999;
            } else {
                this.lastTap[action] = this.time;
            }
            this.lastTapDir[action] = dir;
        }
    }

    /** 由外部注入按键（虚拟按键 / 手柄） */
    injectDown(action) { if (!this.held[action]) this._press(action); }
    injectUp(action) { if (this.held[action]) { this.held[action] = false; this.released[action] = true; } }

    /**
     * 手柄轮询：浏览器不提供事件，只能在每帧主动读取。
     * 摇杆与十字键合并成同一组方向动作，边沿检测后再走 injectDown，
     * 这样双击冲刺、输入缓冲、菜单导航都能复用键盘那一套逻辑。
     */
    _pollPad() {
        if (!this.enabled || !navigator.getGamepads) return;
        let pad = null;
        try {
            const list = navigator.getGamepads() || [];
            for (let i = 0; i < list.length; i++) {
                if (list[i] && list[i].connected) { pad = list[i]; break; }
            }
        } catch (e) {
            return;
        }
        // 拔掉手柄时要把按住的键放掉，否则角色会一直朝一个方向走
        if (!pad) {
            for (const k in this.padPrev) if (this.padPrev[k]) this.injectUp(k);
            this.padPrev = Object.create(null);
            return;
        }

        const now = Object.create(null);
        for (const i in PAD_BUTTON) {
            const b = pad.buttons[+i];
            now[PAD_BUTTON[i]] = !!(b && (b.pressed || b.value > 0.5));
        }
        const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
        if (ax < -PAD_DEAD) now.left = true;
        if (ax > PAD_DEAD) now.right = true;
        if (ay < -PAD_DEAD) now.up = true;
        if (ay > PAD_DEAD) now.down = true;

        for (const k in now) {
            if (now[k] && !this.padPrev[k]) this.injectDown(k);
            else if (!now[k] && this.padPrev[k]) this.injectUp(k);
        }
        this.padPrev = now;
    }

    isDown(a) { return !!this.held[a]; }
    justPressed(a) { return !!this.pressed[a]; }

    /** 消费缓冲内的动作（命中后清除） */
    consume(a) {
        if (this.buffer[a] > 0) { this.buffer[a] = 0; return true; }
        return false;
    }
    /** 查看但不消费 */
    buffered(a) { return this.buffer[a] > 0; }

    /** 移动向量（已归一化） */
    axis() {
        let x = 0, y = 0;
        if (this.held.left) x -= 1;
        if (this.held.right) x += 1;
        if (this.held.up) y -= 1;
        if (this.held.down) y += 1;
        if (x && y) { const k = Math.SQRT1_2; x *= k; y *= k; }
        return { x, y };
    }

    update(dt) {
        this._pollPad();
        this.time += dt;
        for (const k in this.buffer) {
            if (this.buffer[k] > 0) this.buffer[k] -= dt;
        }
    }

    /** 每帧末尾调用，清理边沿状态 */
    lateUpdate() {
        this.pressed = Object.create(null);
        this.released = Object.create(null);
    }

    /** 清空全部状态（切换场景时用，防止误触发） */
    flush() {
        this.held = Object.create(null);
        this.pressed = Object.create(null);
        this.released = Object.create(null);
        this.buffer = Object.create(null);
    }
}

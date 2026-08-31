/* ============================================================
 * 三国战纪 · 输入管理器
 * 支持：边沿检测、输入缓冲、双击冲刺、手柄
 * ============================================================ */
'use strict';

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
        this.buffer[action] = 0.16; // 160ms 输入缓冲窗口

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

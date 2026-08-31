/* ============================================================
 * 三国战纪 · 全局常量与坐标系统
 *
 * 世界坐标：
 *   x —— 沿关卡前进方向（像素）
 *   z —— 纵深，0 = 最远（画面上方），Z_MAX = 最近（画面下方）
 *   y —— 离地高度，0 = 地面，正值向上（跳跃）
 * ============================================================ */
'use strict';

const VIEW = { W: 800, H: 600 };

/* 地面带：z=0 对应屏幕 y=GROUND.top，z=Z_MAX 对应 GROUND.bottom */
const GROUND = {
    top: 368,
    bottom: 588,
    zMax: 3.40,
    /** 玩家在纵深方向的可活动范围（世界 z 单位） */
    zMin: 0.30,
    zPlayMax: 3.10
};

/** 单位→像素 基准比例（与 Fig.PX 一致，再乘以纵深缩放） */
const PPM = 62;

/** 角色脚底在单位空间的偏移：骨骼原点在胯部，脚底约在 +0.88 */
const FOOT_OFF = 0.88;

/** 纵深 → 屏幕 y */
function screenY(z) {
    return GROUND.top + U.clamp(z / GROUND.zMax, 0, 1.6) * (GROUND.bottom - GROUND.top);
}

/** 纵深 → 缩放（远处小、近处大） */
function depthScale(z) {
    return 0.70 + 0.42 * U.clamp(z / GROUND.zMax, 0, 1.6);
}

/** 实体半径（世界单位，用于互推与命中） */
const BODY_R = 0.36;

const GRAVITY = 30.0;   // 单位/秒²
const DEPTH_EPS = 0.62; // 命中判定的纵深容差

/** 队伍阵营 */
const TEAM = { HERO: 0, FOE: 1 };

/** 全局手感参数（可在暂停菜单调节） */
const TUNE = {
    hitStop: 0.055,       // 命中定格
    hitStopHeavy: 0.105,
    shakeDecay: 6.2,
    comboWindow: 0.34,    // 连击输入窗口（攻击动作结束前）
    guardRegen: 26        // 每秒怒气自然恢复
};

/** 画外边框（锁屏战斗时摄像机推进到的位置） */
const GATE = { lockPad: 250 };

/* ============================================================
 * 三国战纪 · 全局常量与坐标系统（three.js 版）
 *
 * 世界坐标（右手系，与 three.js 一致）：
 *   x —— 沿关卡前进方向
 *   z —— 纵深，0 = 场景最深处，Z_MAX = 最靠近镜头
 *   y —— 离地高度，0 = 地面
 *
 * 原来的伪 3D 投影（PPM / screenY / depthScale）已全部删除，
 * 画面纵深由透视相机真实产生，命中与移动仍沿用同一套世界单位。
 * ============================================================ */
'use strict';

const VIEW = { W: 800, H: 600 };

/* 地面带：玩家可在 zMin..zPlayMax 之间上下走位 */
const GROUND = {
    zMax: 3.40,
    zMin: 0.30,
    zPlayMax: 3.10
};

/** 实体半径（世界单位，用于互推与命中） */
const BODY_R = 0.36;

const GRAVITY = 30.0;   // 单位/秒²
const DEPTH_EPS = 0.62; // 命中判定的纵深容差

/** 队伍阵营 */
const TEAM = { HERO: 0, FOE: 1 };

/** 全局手感参数 */
const TUNE = {
    hitStop: 0.055,
    hitStopHeavy: 0.105,
    shakeDecay: 6.2,
    comboWindow: 0.34,
    guardRegen: 26
};

/** 画外边框（锁屏战斗时摄像机推进到的位置） */
const GATE = { lockPad: 250 };

/* ============================================================
 * 相机：固定俯角的侧视透视。dist 为相机到注视点的距离，
 * 由 fov / dist / pitch 推导出实际机位，保证三关构图一致。
 * ============================================================ */
const CAM = {
    fov: 36,
    dist: 12.6,
    pitch: 25 * Math.PI / 180,
    lookY: 2.0,
    lookZ: 1.80,
    /** 画面可见宽度（世界单位，用于闸门与摄像机边界推导） */
    get halfW() { return Math.tan(this.fov * Math.PI / 360) * (VIEW.W / VIEW.H) * this.dist; },
    get worldW() { return this.halfW * 2; }
};

/** 角色基准身高（脚底到头顶，单位），供 FX 锚点与 UI 使用 */
const CHAR_H = 2.05;

/* ============================================================
 * 调色板：偏汉画的低饱和土色 + 朱红/石青点缀
 * ============================================================ */
const PAL = {
    ink: '#1A120C',
    paper: '#F4E7CE',
    gold: '#E8B44A',
    red: '#B3352B',
    jade: '#3E7A63',
    steel: '#CBD4DA',
    wood: '#6B4A2F'
};

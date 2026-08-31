/* ============================================================
 * 三国战纪 · 关卡数据
 * 每个关卡由若干「闸门波次」构成：走到触发线 → 锁屏 → 清怪 → 解锁前进
 * ============================================================ */
'use strict';

const LEVELS = [
    {
        id: 1,
        name: '第一章 · 涿郡起兵',
        sub: '黄巾举旗，桃园结义',
        theme: 'plains',
        music: 'plains',
        length: 118,
        intro: ['东汉末年，黄巾举旗。', '涿郡郊野，义军初起。'],
        props: [
            { k: 'crate', x: 9.5, z: 1.1 }, { k: 'crate', x: 9.8, z: 2.6, drop: 'baozi' },
            { k: 'urn', x: 27, z: 0.8 }, { k: 'urn', x: 27.4, z: 3.0 },
            { k: 'crate', x: 45, z: 1.6, drop: 'wine' }, { k: 'crate', x: 45.3, z: 2.8 },
            { k: 'urn', x: 63, z: 0.9 }, { k: 'crate', x: 63.4, z: 2.4, drop: 'roast' },
            { k: 'crate', x: 81, z: 1.4 }, { k: 'urn', x: 81.4, z: 2.9, drop: 'gold' }
        ],
        waves: [
            { at: 15, spawn: [{ t: 'soldier', n: 3 }], hint: '黄巾散兵' },
            { at: 32, spawn: [{ t: 'soldier', n: 2 }, { t: 'archer', n: 2 }], hint: '弓手上前' },
            { at: 50, spawn: [{ t: 'soldier', n: 2 }, { t: 'shield', n: 2 }], hint: '刀盾结阵' },
            { at: 68, spawn: [{ t: 'spear', n: 2 }, { t: 'shield', n: 1 }, { t: 'archer', n: 2 }], hint: '长矛压阵' },
            { at: 86, spawn: [{ t: 'cavalry', n: 1 }, { t: 'soldier', n: 3 }, { t: 'archer', n: 1 }], hint: '铁骑突袭' }
        ],
        boss: { at: 104, type: 'zhangjue', title: '天公将军' }
    },
    {
        id: 2,
        name: '第二章 · 博望坡火攻',
        sub: '烈焰焚营，伏兵四起',
        theme: 'fire',
        music: 'fire',
        length: 122,
        intro: ['博望坡上，火光冲天。', '曹军先锋，尽入彀中。'],
        props: [
            { k: 'crate', x: 10, z: 1.5, drop: 'baozi' }, { k: 'urn', x: 10.4, z: 2.7 },
            { k: 'crate', x: 29, z: 0.9 }, { k: 'crate', x: 29.3, z: 2.9, drop: 'wine' },
            { k: 'urn', x: 48, z: 1.8, drop: 'gold' }, { k: 'urn', x: 48.4, z: 3.0 },
            { k: 'crate', x: 67, z: 1.2 }, { k: 'crate', x: 67.3, z: 2.6, drop: 'roast' },
            { k: 'urn', x: 86, z: 1.5 }, { k: 'crate', x: 86.4, z: 2.8, drop: 'scroll' }
        ],
        waves: [
            { at: 15, spawn: [{ t: 'spear', n: 2 }, { t: 'archer', n: 2 }], hint: '前锋哨卡' },
            { at: 33, spawn: [{ t: 'soldier', n: 3 }, { t: 'firemage', n: 1 }], hint: '黄巾术士' },
            { at: 51, spawn: [{ t: 'cavalry', n: 2 }, { t: 'shield', n: 2 }], hint: '铁骑冲阵' },
            { at: 70, spawn: [{ t: 'firemage', n: 2 }, { t: 'spear', n: 2 }, { t: 'archer', n: 1 }], hint: '火矢如雨' },
            { at: 89, spawn: [{ t: 'ironelite', n: 2 }, { t: 'elite', n: 2 }], hint: '精锐尽出' }
        ],
        boss: { at: 108, type: 'zhangbao', title: '地公将军' }
    },
    {
        id: 3,
        name: '第三章 · 洛阳宫城',
        sub: '夜袭宫阙，黄天当立',
        theme: 'palace',
        music: 'palace',
        length: 126,
        intro: ['宫城夜战，火把如龙。', '天魔降世，黄天当立。'],
        props: [
            { k: 'urn', x: 10, z: 1.2, drop: 'wine' }, { k: 'crate', x: 10.3, z: 2.8 },
            { k: 'crate', x: 30, z: 1.6, drop: 'roast' }, { k: 'urn', x: 30.4, z: 2.9 },
            { k: 'crate', x: 50, z: 1.0 }, { k: 'crate', x: 50.3, z: 2.7, drop: 'scroll' },
            { k: 'urn', x: 70, z: 1.8 }, { k: 'urn', x: 70.4, z: 3.0, drop: 'gold' },
            { k: 'crate', x: 90, z: 1.3, drop: 'roast' }, { k: 'urn', x: 90.3, z: 2.6 }
        ],
        waves: [
            { at: 15, spawn: [{ t: 'elite', n: 2 }, { t: 'shield', n: 2 }], hint: '禁卫巡守' },
            { at: 33, spawn: [{ t: 'ironelite', n: 2 }, { t: 'archer', n: 2 }], hint: '铁甲当道' },
            { at: 52, spawn: [{ t: 'cavalry', n: 2 }, { t: 'firemage', n: 2 }, { t: 'elite', n: 1 }], hint: '妖术乱舞' },
            { at: 71, spawn: [{ t: 'ironelite', n: 3 }, { t: 'spear', n: 2 }], hint: '重甲方阵' },
            { at: 92, spawn: [{ t: 'cavalry', n: 2 }, { t: 'ironelite', n: 2 }, { t: 'elite', n: 2 }], hint: '宫门死守' }
        ],
        boss: { at: 112, type: 'tianmo', title: '黄天之主' }
    }
];

/** 每关敌人强度成长 */
const LEVEL_SCALE = [
    { hp: 1.00, atk: 1.00, tokens: 2 },
    { hp: 1.28, atk: 1.22, tokens: 3 },
    { hp: 1.62, atk: 1.45, tokens: 3 }
];

/** 生成波次刷怪表（带入场位置） */
function buildSpawnList(wave, waveX, levelIndex) {
    const list = [];
    let i = 0;
    for (const grp of wave.spawn) {
        for (let k = 0; k < grp.n; k++) {
            const fromFront = (i % 2 === 0);
            list.push({
                type: grp.t,
                x: waveX + (fromFront ? U.rand(5.2, 7.6) : -U.rand(4.6, 6.8)),
                z: U.rand(0.55, 3.05),
                delay: 0.12 * i + U.rand(0, 0.16)
            });
            i++;
        }
    }
    return list;
}

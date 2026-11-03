/* ============================================================
 * 三国战纪 · 角色外观配置（3D 用）
 *
 * 字段说明：
 *   build / body.*      体型缩放（肩宽、四肢粗细、头围）
 *   head                头饰类型：crown 进贤冠 / topknot 发髻 /
 *                       wild 硬发 / helm 银盔 / cap 纶巾 /
 *                       cult 高冠 / mask 獠面 / band 黄巾
 *   face.brow / eye     眉眼样式，决定 Q 版脸的气质
 *   beard               长髯 / 虎须 / 短须
 *   armor / cape        甲胄与披风，缺省即为布衣
 *   weapon / offhand    兵器（见 js/render/weapons.js）
 * ============================================================ */
'use strict';

const LOOKS = {
    /* ===================== 五虎将 / 主角 ===================== */
    liubei: {
        name: '刘备', title: '仁德之主',
        build: 1.0,
        skin: '#F2C9A0', skinDark: '#D0A177',
        robe: '#2E7D32', robeDark: '#1B5E20', robeLight: '#43A047',
        skirt: '#256628', sash: '#C9A227', trim: '#FFD700',
        pants: '#37474F', boot: '#4E342E',
        head: 'crown', hair: '#2B1B12', bandColor: '#FFD700',
        robeStyle: 'long', ribbon: '#C62828',
        weapon: 'jian', offhand: 'jianShort',
        steel: '#DDE3E8', grip: '#6D4C33',
        cape: '#1B5E20',
        // 演义：「两耳垂肩，双手过膝」，面如冠玉，性情温厚
        face: { shape: 'oval', brow: 'gentle', eye: 'gentle', ears: 'long', jaw: 0.30 },
        eyeColor: '#3A2118',
        desc: '双股剑 · 均衡型',
        stats: { hp: 120, atk: 15, spd: 185, reach: 1.05 }
    },
    guanyu: {
        name: '关羽', title: '义薄云天',
        build: 1.12,
        body: { shoulderW: 0.96, torsoW: 0.93, hipW: 0.95, armW: 0.94, legW: 0.95, headR: 0.95 },
        // 面如重枣，唇若涂脂，丹凤眼，卧蚕眉
        skin: '#C4674A', skinDark: '#9C4A32', skinLight: '#DC8A66',
        blush: '#A84E36',
        face: { shape: 'long', brow: 'silkworm', eye: 'phoenix', ears: 'normal', jaw: 0.36 },
        robe: '#1B5E20', robeDark: '#0E3D14', robeLight: '#2E7D32',
        skirt: '#164A1C', sash: '#8D6E63', trim: '#FFD700',
        armor: '#B8860B', armorLight: '#DAA520',
        pants: '#263238', boot: '#3E2723',
        head: 'topknot', hair: '#1A1410', bandColor: '#1B5E20',
        beard: 'long', beardColor: '#1A1410',
        robeStyle: 'long', cape: '#8B0000',
        // 青龙偃月刀：刃带青冷之色，故名「青龙」
        weapon: 'guandao', wood: '#5D4037', steel: '#D9E8EC', steelLight: '#EFF8FA',
        eyeColor: '#241410',
        desc: '青龙偃月刀 · 力量型',
        stats: { hp: 145, atk: 21, spd: 150, reach: 1.45 }
    },
    zhangfei: {
        name: '张飞', title: '万人敌',
        build: 1.20,
        body: { shoulderW: 1.44, torsoW: 1.34, hipW: 1.30, armW: 1.34, legW: 1.30, headR: 1.12 },
        skin: '#D9A066', skinDark: '#B07E49',
        robe: '#263238', robeDark: '#161D21', robeLight: '#37474F',
        skirt: '#1B2429', sash: '#C62828', trim: '#FFD700',
        armor: '#455A64', armorLight: '#607D8B',
        pants: '#1B2429', boot: '#2B1B12',
        head: 'wild', hair: '#14100E', bandColor: '#37474F',
        beard: 'stubble', beardColor: '#14100E',
        robeStyle: 'short',
        weapon: 'spear', steel: '#D6DBE0', tassel: '#C62828',
        // 豹头环眼、燕颔虎须，声若巨雷
        face: { shape: 'square', brow: 'bushy', eye: 'round', ears: 'normal', jaw: 0.46 },
        eyeColor: '#241410',
        desc: '丈八蛇矛 · 爆发型',
        stats: { hp: 160, atk: 24, spd: 138, reach: 1.55 }
    },
    zhaoyun: {
        name: '赵云', title: '常胜将军',
        build: 1.0,
        body: { shoulderW: 1.20, torsoW: 0.94, hipW: 1.02, armW: 1.06, legW: 1.04, headR: 0.96 },
        skin: '#F5CFA8', skinDark: '#D2A67C',
        robe: '#ECEFF1', robeDark: '#B0BEC5', robeLight: '#FFFFFF',
        skirt: '#CFD8DC', sash: '#1976D2', trim: '#C9A227',
        armor: '#CFD8DC', armorLight: '#F5F5F5',
        pants: '#37474F', boot: '#455A64',
        head: 'helm', hair: '#1A1410', plume: '#D32F2F',
        robeStyle: 'short', ribbon: '#1976D2',
        weapon: 'lance', steel: '#E8EDF2', tassel: '#D32F2F', wood: '#4E342E',
        // 白袍银铠的少年将军，浓眉大眼、英气逼人
        face: { shape: 'oval', brow: 'sharp', eye: 'sharp', ears: 'normal', jaw: 0.28 },
        eyeColor: '#2A1710',
        desc: '龙胆亮银枪 · 速度型',
        stats: { hp: 105, atk: 17, spd: 225, reach: 1.40 }
    },
    zhugeliang: {
        name: '诸葛亮', title: '卧龙',
        build: 0.93,
        body: { shoulderW: 0.90, torsoW: 0.86, hipW: 0.92, armW: 0.88, legW: 0.90, headR: 0.95 },
        skin: '#F7D6B0', skinDark: '#D7B088',
        robe: '#E3F2FD', robeDark: '#90CAF9', robeLight: '#FFFFFF',
        skirt: '#BBDEFB', sash: '#5D4037', trim: '#8D6E63',
        pants: '#E3F2FD', boot: '#4E342E',
        head: 'cap', hair: '#2B1B12', bandColor: '#ECEFF1',
        beard: 'goatee', beardColor: '#2B1B12',
        robeStyle: 'long', ribbon: '#B0BEC5',
        weapon: 'fan', magic: '#BFE9FF',
        eyeColor: '#33231A',
        // 「面如冠玉，头戴纶巾，身披鹤氅，飘飘然有神仙之概」
        face: { shape: 'oval', brow: 'refined', eye: 'calm', ears: 'normal', jaw: 0.26 },
        desc: '羽扇 · 远程型',
        stats: { hp: 90, atk: 13, spd: 175, reach: 1.20 }
    },

    /* ===================== 黄巾军 ===================== */
    soldier: {
        name: '黄巾兵',
        build: 0.98, skin: '#DFAE83', skinDark: '#B98A5E',
        robe: '#8D6E63', robeDark: '#5D4037', robeLight: '#A1887F',
        skirt: '#6D4C41', sash: '#C9A227', trim: '#C9A227',
        pants: '#5D4037', boot: '#3E2723',
        head: 'band', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'short',
        face: { shape: 'square', brow: 'bushy', eye: 'normal', ears: 'normal', jaw: 0.44 },
        weapon: 'dao', steel: '#C7CCD1', eyeColor: '#2A1710',
        stats: { hp: 40, atk: 9, spd: 62, reach: 1.0 }
    },
    archer: {
        name: '黄巾弓手',
        build: 0.95,
        body: { shoulderW: 0.92, torsoW: 0.92, hipW: 0.94, armW: 0.92, legW: 0.92, headR: 0.98 },
        skin: '#DFAE83', skinDark: '#B98A5E',
        robe: '#A1887F', robeDark: '#6D4C41', robeLight: '#BCAAA4',
        skirt: '#795548', sash: '#FDD835', trim: '#FDD835',
        pants: '#5D4037', boot: '#3E2723',
        head: 'band', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'short',
        face: { shape: 'oval', brow: 'sharp', eye: 'sharp', ears: 'normal', jaw: 0.30 },
        weapon: 'bow', wood: '#6D4C33', eyeColor: '#2A1710',
        stats: { hp: 32, atk: 11, spd: 70, reach: 0 }
    },
    shield: {
        name: '刀盾兵',
        build: 1.08,
        body: { shoulderW: 1.24, torsoW: 1.20, hipW: 1.22, armW: 1.20, legW: 1.18, headR: 1.06 },
        skin: '#D9A066', skinDark: '#B07E49',
        robe: '#795548', robeDark: '#4E342E', robeLight: '#8D6E63',
        skirt: '#5D4037', sash: '#FDD835', trim: '#C9A227',
        armor: '#8D6E63', armorLight: '#A1887F',
        pants: '#4E342E', boot: '#3E2723',
        head: 'band', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'short',
        face: { shape: 'square', brow: 'bushy', eye: 'normal', ears: 'normal', jaw: 0.50 },
        weapon: 'dao', steel: '#C7CCD1', eyeColor: '#2A1710',
        shieldColor: '#A1887F', shieldBoss: '#C9A227',
        stats: { hp: 66, atk: 12, spd: 55, reach: 0.95 }
    },
    spear: {
        name: '长矛兵',
        build: 1.0, skin: '#DFAE83', skinDark: '#B98A5E',
        robe: '#6D4C41', robeDark: '#4E342E', robeLight: '#8D6E63',
        skirt: '#5D4037', sash: '#FDD835', trim: '#FDD835',
        pants: '#4E342E', boot: '#3E2723',
        head: 'band', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'short',
        weapon: 'lance', steel: '#C7CCD1', tassel: '#FDD835', wood: '#5D4037',
        face: { shape: 'long', brow: 'bushy', eye: 'normal', ears: 'normal', jaw: 0.32 },
        eyeColor: '#2A1710',
        stats: { hp: 52, atk: 14, spd: 66, reach: 1.55 }
    },
    firemage: {
        name: '黄巾术士',
        build: 0.92,
        body: { shoulderW: 0.88, torsoW: 0.88, hipW: 0.92, armW: 0.88, legW: 0.90, headR: 1.00 },
        skin: '#E8BE93', skinDark: '#C29B6E',
        robe: '#5E35B1', robeDark: '#4527A0', robeLight: '#7E57C2',
        skirt: '#512DA8', sash: '#FDD835', trim: '#FDD835',
        pants: '#4527A0', boot: '#311B92',
        head: 'band', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'long',
        face: { shape: 'long', brow: 'refined', eye: 'calm', ears: 'normal', jaw: 0.28 },
        weapon: 'staff', magic: '#FF7043', eyeColor: '#2A1710',
        stats: { hp: 38, atk: 13, spd: 58, reach: 0 }
    },
    cavalry: {
        name: '黄巾铁骑',
        build: 1.05,
        body: { shoulderW: 1.08, torsoW: 1.04, hipW: 1.06, armW: 1.06, legW: 1.04, headR: 1.00 },
        skin: '#DFAE83', skinDark: '#B98A5E',
        robe: '#546E7A', robeDark: '#37474F', robeLight: '#607D8B',
        skirt: '#455A64', sash: '#FDD835', trim: '#FDD835',
        armor: '#78909C', armorLight: '#90A4AE',
        pants: '#37474F', boot: '#263238',
        head: 'helm', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'short',
        face: { shape: 'square', brow: 'sharp', eye: 'sharp', ears: 'normal', jaw: 0.42 },
        weapon: 'lance', steel: '#C7CCD1', tassel: '#FDD835', wood: '#5D4037',
        mount: { body: '#5D4037', mane: '#2B1B12', hoof: '#263238', saddle: '#8B0000' },
        eyeColor: '#2A1710',
        stats: { hp: 58, atk: 17, spd: 92, reach: 1.5 }
    },
    elite: {
        name: '黄巾精锐',
        build: 1.08,
        body: { shoulderW: 1.16, torsoW: 1.14, hipW: 1.16, armW: 1.14, legW: 1.14, headR: 1.04 },
        skin: '#D9A066', skinDark: '#B07E49',
        robe: '#37474F', robeDark: '#1B2429', robeLight: '#455A64',
        skirt: '#263238', sash: '#C9A227', trim: '#C9A227',
        armor: '#8D6E63', armorLight: '#A1887F',
        pants: '#263238', boot: '#1B2429',
        head: 'helm', hair: '#2B1B12', bandColor: '#FDD835', plume: '#FDD835',
        robeStyle: 'short',
        face: { shape: 'long', brow: 'bushy', eye: 'sharp', ears: 'normal', jaw: 0.36 },
        weapon: 'dao', steel: '#D6DBE0', eyeColor: '#2A1710',
        stats: { hp: 78, atk: 16, spd: 78, reach: 1.1 }
    },
    ironelite: {
        name: '铁甲精锐',
        build: 1.18,
        body: { shoulderW: 1.42, torsoW: 1.34, hipW: 1.30, armW: 1.30, legW: 1.28, headR: 1.10 },
        skin: '#D9A066', skinDark: '#B07E49',
        robe: '#455A64', robeDark: '#263238', robeLight: '#546E7A',
        skirt: '#37474F', sash: '#B71C1C', trim: '#C9A227',
        armor: '#90A4AE', armorLight: '#B0BEC5',
        pants: '#263238', boot: '#1B2429',
        head: 'helm', hair: '#2B1B12', plume: '#B71C1C',
        robeStyle: 'short',
        weapon: 'axe', steel: '#D6DBE0',
        face: { shape: 'square', brow: 'bushy', eye: 'round', ears: 'normal', jaw: 0.48 },
        eyeColor: '#2A1710',
        superArmor: true,
        stats: { hp: 105, atk: 20, spd: 62, reach: 1.25 }
    },

    /* ===================== BOSS ===================== */
    zhangjue: {
        name: '张角', title: '天公将军',
        build: 1.12,
        body: { shoulderW: 1.04, torsoW: 1.06, hipW: 1.00, armW: 1.00, legW: 1.00, headR: 1.02 },
        skin: '#E8BE93', skinDark: '#C29B6E',
        robe: '#F9A825', robeDark: '#C17900', robeLight: '#FFD54F',
        skirt: '#E65100', sash: '#4E342E', trim: '#FFD700',
        pants: '#8D6E63', boot: '#4E342E',
        head: 'cult', hair: '#2B1B12', band: '#FFD700', bandColor: '#FFD700',
        robeStyle: 'long', cape: '#E65100', ribbon: '#FFD700',
        face: { shape: 'long', brow: 'silkworm', eye: 'phoenix', ears: 'normal', jaw: 0.32 },
        beard: 'goatee', beardColor: '#2B1B12',
        weapon: 'staff', magic: '#7E57C2', eyeColor: '#241410',
        boss: true, bossScale: 1.52,
        stats: { hp: 420, atk: 20, spd: 78, reach: 1.3 }
    },
    zhangbao: {
        name: '张宝', title: '地公将军',
        build: 1.15,
        body: { shoulderW: 1.30, torsoW: 1.24, hipW: 1.24, armW: 1.24, legW: 1.22, headR: 1.08 },
        skin: '#D9A066', skinDark: '#B07E49',
        robe: '#6A1B9A', robeDark: '#4A148C', robeLight: '#8E24AA',
        skirt: '#4A148C', sash: '#FFD700', trim: '#FFD700',
        armor: '#7B1FA2', armorLight: '#9C27B0',
        pants: '#4A148C', boot: '#1B2429',
        head: 'helm', hair: '#2B1B12', plume: '#D32F2F',
        robeStyle: 'long', cape: '#4A148C',
        beard: 'stubble', beardColor: '#14100E',
        weapon: 'ji', steel: '#D6DBE0', wood: '#3E2723', tassel: '#D32F2F',
        face: { shape: 'square', brow: 'bushy', eye: 'round', ears: 'normal', jaw: 0.44 },
        eyeColor: '#241410',
        boss: true, bossScale: 1.62,
        stats: { hp: 560, atk: 24, spd: 86, reach: 1.5 }
    },
    tianmo: {
        name: '天魔张角', title: '黄天之主',
        build: 1.28,
        body: { shoulderW: 1.30, torsoW: 1.26, hipW: 1.28, armW: 1.26, legW: 1.24, headR: 1.12 },
        skin: '#B39DDB', skinDark: '#7E57C2',
        robe: '#311B92', robeDark: '#1A237E', robeLight: '#5E35B1',
        skirt: '#1A237E', sash: '#FFD700', trim: '#FFD700',
        armor: '#4527A0', armorLight: '#7E57C2',
        pants: '#1A237E', boot: '#0D1B3E',
        head: 'mask', hair: '#1A237E', maskColor: '#E8EAF6', maskMark: '#D50000',
        robeStyle: 'long', cape: '#1A237E', ribbon: '#D50000',
        face: { shape: 'square', brow: 'bushy', eye: 'round', ears: 'normal', jaw: 0.52 },
        weapon: 'staff', magic: '#18FFFF', eyeColor: '#18FFFF',
        boss: true, bossScale: 1.78,
        stats: { hp: 760, atk: 28, spd: 96, reach: 1.5 }
    }
};

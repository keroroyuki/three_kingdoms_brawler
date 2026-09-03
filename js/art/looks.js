/* ============================================================
 * 三国战纪 · 角色外观配置
 * ============================================================ */
'use strict';

const LOOKS = {
    /* ===================== 五虎将 / 主角 ===================== */
    liubei: {
        name: '刘备', title: '仁德之主',
        build: 1.0, skin: '#F2C9A0', skinDark: '#D0A177',
        robe: '#2E7D32', robeDark: '#1B5E20', robeLight: '#43A047',
        skirt: '#256628', sash: '#C9A227', trim: '#FFD700',
        pants: '#37474F', boot: '#4E342E',
        head: 'crown', hair: '#2B1B12', bandColor: '#FFD700',
        robeStyle: 'long', ribbon: '#C62828',
        weapon: 'jian', offhand: 'jianShort',
        steel: '#DDE3E8', grip: '#6D4C33',
        cape: '#1B5E20',
        // 演义：「两耳垂肩，双手过膝，目能自顾其耳，面如冠玉，唇若涂脂」
        // 耳垂长及肩是刘备最鲜明的体貌，故 ears 用 'long'
        face: { shape: 'oval', brow: 'gentle', eye: 'gentle', ears: 'long', jaw: 0.30 },
        desc: '双股剑 · 均衡型',
        stats: { hp: 120, atk: 15, spd: 185, reach: 1.05 }
    },
    guanyu: {
        name: '关羽', title: '义薄云天',
        build: 1.12,
        // 面如重枣：演义载其「面如重枣，唇若涂脂，丹凤眼，卧蚕眉」
        skin: '#C4674A', skinDark: '#9C4A32', skinLight: '#DC8A66',
        blush: '#A84E36',
        // 丹凤眼 + 卧蚕眉 + 长脸，是关公相貌的三要素
        face: { shape: 'long', brow: 'silkworm', eye: 'phoenix', ears: 'normal', jaw: 0.36 },
        robe: '#1B5E20', robeDark: '#0E3D14', robeLight: '#2E7D32',
        skirt: '#164A1C', sash: '#8D6E63', trim: '#FFD700',
        armor: '#B8860B', armorLight: '#DAA520',
        pants: '#263238', boot: '#3E2723',
        head: 'topknot', hair: '#1A1410', bandColor: '#1B5E20',
        beard: 'long', beardColor: '#1A1410',
        robeStyle: 'long', cape: '#8B0000',
        weapon: 'guandao', wood: '#5D4037', steel: '#E0E6EA',
        desc: '青龙偃月刀 · 力量型',
        stats: { hp: 145, atk: 21, spd: 150, reach: 1.45 }
    },
    zhangfei: {
        name: '张飞', title: '万人敌',
        build: 1.20, skin: '#D9A066', skinDark: '#B07E49',
        robe: '#263238', robeDark: '#161D21', robeLight: '#37474F',
        skirt: '#1B2429', sash: '#C62828', trim: '#FFD700',
        armor: '#455A64', armorLight: '#607D8B',
        pants: '#1B2429', boot: '#2B1B12',
        head: 'wild', hair: '#14100E', bandColor: '#37474F',
        beard: 'stubble', beardColor: '#14100E',
        robeStyle: 'short',
        weapon: 'spear', steel: '#D6DBE0', tassel: '#C62828',
        // 演义形象：豹头环眼、燕颔虎须，声若巨雷、势如奔马
        face: { shape: 'square', brow: 'bushy', eye: 'round', ears: 'normal', jaw: 0.46 },
        desc: '丈八蛇矛 · 爆发型',
        stats: { hp: 160, atk: 24, spd: 138, reach: 1.55 }
    },
    zhaoyun: {
        name: '赵云', title: '常胜将军',
        build: 1.0, skin: '#F5CFA8', skinDark: '#D2A67C',
        robe: '#ECEFF1', robeDark: '#B0BEC5', robeLight: '#FFFFFF',
        skirt: '#CFD8DC', sash: '#1976D2', trim: '#C9A227',
        armor: '#CFD8DC', armorLight: '#F5F5F5',
        pants: '#37474F', boot: '#455A64',
        head: 'helm', hair: '#1A1410', plume: '#D32F2F',
        robeStyle: 'short', ribbon: '#1976D2',
        weapon: 'lance', steel: '#E8EDF2', tassel: '#D32F2F', wood: '#4E342E',
        // 演义形象：白袍银铠的少年将军，浓眉大眼、英气逼人
        face: { shape: 'oval', brow: 'sharp', eye: 'sharp', ears: 'normal', jaw: 0.28 },
        desc: '龙胆亮银枪 · 速度型',
        stats: { hp: 105, atk: 17, spd: 225, reach: 1.40 }
    },
    zhugeliang: {
        name: '诸葛亮', title: '卧龙',
        build: 0.93, skin: '#F7D6B0', skinDark: '#D7B088',
        robe: '#E3F2FD', robeDark: '#90CAF9', robeLight: '#FFFFFF',
        skirt: '#BBDEFB', sash: '#5D4037', trim: '#8D6E63',
        pants: '#E3F2FD', boot: '#4E342E',
        head: 'cap', hair: '#2B1B12', bandColor: '#ECEFF1',
        beard: 'goatee', beardColor: '#2B1B12',
        robeStyle: 'long', ribbon: '#B0BEC5',
        weapon: 'fan',
        // 演义：「面如冠玉，头戴纶巾，身披鹤氅，飘飘然有神仙之概」——眉清目秀、从容淡定
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
        // 乌合之众：粗鄙方脸、浓眉浊眼
        face: { shape: 'square', brow: 'bushy', eye: 'normal', ears: 'normal', jaw: 0.44 },
        weapon: 'dao', steel: '#C7CCD1',
        stats: { hp: 40, atk: 9, spd: 62, reach: 1.0 }
    },
    archer: {
        name: '黄巾弓手',
        build: 0.95, skin: '#DFAE83', skinDark: '#B98A5E',
        robe: '#A1887F', robeDark: '#6D4C41', robeLight: '#BCAAA4',
        skirt: '#795548', sash: '#FDD835', trim: '#FDD835',
        pants: '#5D4037', boot: '#3E2723',
        head: 'band', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'short',
        // 弓手：机敏瘦削，眉眼细长
        face: { shape: 'oval', brow: 'sharp', eye: 'sharp', ears: 'normal', jaw: 0.30 },
        weapon: 'bow', wood: '#6D4C33',
        stats: { hp: 32, atk: 11, spd: 70, reach: 0 }
    },
    shield: {
        name: '刀盾兵',
        build: 1.08, skin: '#D9A066', skinDark: '#B07E49',
        robe: '#795548', robeDark: '#4E342E', robeLight: '#8D6E63',
        skirt: '#5D4037', sash: '#FDD835', trim: '#C9A227',
        armor: '#8D6E63', armorLight: '#A1887F',
        pants: '#4E342E', boot: '#3E2723',
        head: 'band', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'short',
        // 刀盾：厚重方面，沉稳木讷
        face: { shape: 'square', brow: 'bushy', eye: 'normal', ears: 'normal', jaw: 0.50 },
        weapon: 'dao', steel: '#C7CCD1',
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
        stats: { hp: 52, atk: 14, spd: 66, reach: 1.55 }
    },
    firemage: {
        name: '黄巾术士',
        build: 0.92, skin: '#E8BE93', skinDark: '#C29B6E',
        robe: '#5E35B1', robeDark: '#4527A0', robeLight: '#7E57C2',
        skirt: '#512DA8', sash: '#FDD835', trim: '#FDD835',
        pants: '#4527A0', boot: '#311B92',
        head: 'band', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'long',
        // 术士：阴鸷长脸，细眉低目
        face: { shape: 'long', brow: 'refined', eye: 'calm', ears: 'normal', jaw: 0.28 },
        weapon: 'staff', magic: '#FF7043',
        stats: { hp: 38, atk: 13, spd: 58, reach: 0 }
    },
    cavalry: {
        name: '黄巾铁骑',
        build: 1.05, skin: '#DFAE83', skinDark: '#B98A5E',
        robe: '#546E7A', robeDark: '#37474F', robeLight: '#607D8B',
        skirt: '#455A64', sash: '#FDD835', trim: '#FDD835',
        armor: '#78909C', armorLight: '#90A4AE',
        pants: '#37474F', boot: '#263238',
        head: 'helm', hair: '#2B1B12', bandColor: '#FDD835',
        robeStyle: 'short',
        // 铁骑：剽悍方脸，剑眉锐目
        face: { shape: 'square', brow: 'sharp', eye: 'sharp', ears: 'normal', jaw: 0.42 },
        weapon: 'lance', steel: '#C7CCD1', tassel: '#FDD835', wood: '#5D4037',
        mount: { body: '#5D4037', mane: '#2B1B12', hoof: '#263238', saddle: '#8B0000' },
        stats: { hp: 58, atk: 17, spd: 92, reach: 1.5 }
    },
    elite: {
        name: '黄巾精锐',
        build: 1.08, skin: '#D9A066', skinDark: '#B07E49',
        robe: '#37474F', robeDark: '#1B2429', robeLight: '#455A64',
        skirt: '#263238', sash: '#C9A227', trim: '#C9A227',
        armor: '#8D6E63', armorLight: '#A1887F',
        pants: '#263238', boot: '#1B2429',
        head: 'helm', hair: '#2B1B12', bandColor: '#FDD835', plume: '#FDD835',
        robeStyle: 'short',
        // 精锐：久经战阵，长脸浓眉、目光如炬
        face: { shape: 'long', brow: 'bushy', eye: 'sharp', ears: 'normal', jaw: 0.36 },
        weapon: 'dao', steel: '#D6DBE0',
        stats: { hp: 78, atk: 16, spd: 78, reach: 1.1 }
    },
    ironelite: {
        name: '铁甲精锐',
        build: 1.18, skin: '#D9A066', skinDark: '#B07E49',
        robe: '#455A64', robeDark: '#263238', robeLight: '#546E7A',
        skirt: '#37474F', sash: '#B71C1C', trim: '#C9A227',
        armor: '#90A4AE', armorLight: '#B0BEC5',
        pants: '#263238', boot: '#1B2429',
        head: 'helm', hair: '#2B1B12', plume: '#B71C1C',
        robeStyle: 'short',
        weapon: 'axe', steel: '#D6DBE0',
        face: { shape: 'square', brow: 'bushy', eye: 'round', ears: 'normal', jaw: 0.48 },
        superArmor: true,
        stats: { hp: 105, atk: 20, spd: 62, reach: 1.25 }
    },

    /* ===================== BOSS ===================== */
    zhangjue: {
        name: '张角', title: '天公将军',
        build: 1.12, skin: '#E8BE93', skinDark: '#C29B6E',
        robe: '#F9A825', robeDark: '#C17900', robeLight: '#FFD54F',
        skirt: '#E65100', sash: '#4E342E', trim: '#FFD700',
        pants: '#8D6E63', boot: '#4E342E',
        head: 'band', hair: '#2B1B12', bandColor: '#FFD700',
        robeStyle: 'long', cape: '#E65100', ribbon: '#FFD700',
        // 天公将军：教主威仪，长脸卧蚕眉、丹凤眼，与其弟张宝的武夫相区分
        face: { shape: 'long', brow: 'silkworm', eye: 'phoenix', ears: 'normal', jaw: 0.32 },
        weapon: 'staff', magic: '#7E57C2',
        boss: true,
        stats: { hp: 420, atk: 20, spd: 78, reach: 1.3 }
    },
    zhangbao: {
        name: '张宝', title: '地公将军',
        build: 1.15, skin: '#D9A066', skinDark: '#B07E49',
        robe: '#6A1B9A', robeDark: '#4A148C', robeLight: '#8E24AA',
        skirt: '#4A148C', sash: '#FFD700', trim: '#FFD700',
        armor: '#7B1FA2', armorLight: '#9C27B0',
        pants: '#4A148C', boot: '#1B2429',
        head: 'helm', hair: '#2B1B12', plume: '#D32F2F',
        robeStyle: 'long', cape: '#4A148C',
        weapon: 'guandao', steel: '#D6DBE0', wood: '#3E2723',
        // 地公将军：张角之弟，凶悍武夫，浓眉环眼
        face: { shape: 'square', brow: 'bushy', eye: 'round', ears: 'normal', jaw: 0.44 },
        boss: true,
        stats: { hp: 560, atk: 24, spd: 86, reach: 1.5 }
    },
    tianmo: {
        name: '天魔张角', title: '黄天之主',
        build: 1.28, skin: '#B39DDB', skinDark: '#7E57C2',
        robe: '#311B92', robeDark: '#1A237E', robeLight: '#5E35B1',
        skirt: '#1A237E', sash: '#FFD700', trim: '#FFD700',
        armor: '#4527A0', armorLight: '#7E57C2',
        pants: '#1A237E', boot: '#0D1B3E',
        head: 'mask', hair: '#1A237E', maskColor: '#E8EAF6', maskMark: '#D50000',
        robeStyle: 'long', cape: '#1A237E', ribbon: '#D50000',
        // 天魔：非人之相，方阔獠面、怒目圆睁
        face: { shape: 'square', brow: 'bushy', eye: 'round', ears: 'normal', jaw: 0.52 },
        weapon: 'staff', magic: '#18FFFF',
        boss: true,
        stats: { hp: 760, atk: 28, spd: 96, reach: 1.5 }
    }
};

/* 坐骑绘制（骑兵） */
Fig.drawMount = function (ctx, look, x, y, facing, scale, time, o) {
    const M = look.mount;
    if (!M) return;
    const t = time || 0;
    const gallop = Math.sin(t * 12);
    const bodyC = M.body, darkC = U.shade(M.body, -0.3);
    const OUT = Fig.OUTLINE;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * scale, scale);

    const legSwing = (ph) => Math.sin(t * 12 + ph) * 0.35;
    // 远侧腿
    [[-0.34, legSwing(0)], [-0.02, legSwing(2.1)]].forEach(([lx, sw]) => {
        ctx.save(); ctx.translate(lx, -0.42); ctx.rotate(sw);
        U.capsule(ctx, 0, 0, 0, 0.20, 0.10, 0.08);
        ctx.fillStyle = darkC; ctx.fill();
        ctx.lineWidth = 0.022; ctx.strokeStyle = OUT; ctx.stroke();
        U.capsule(ctx, 0, 0.18, 0.03, 0.42, 0.075, 0.06);
        ctx.fillStyle = darkC; ctx.fill(); ctx.stroke();
        ctx.restore();
    });

    // 身体
    ctx.beginPath();
    ctx.ellipse(-0.05, -0.62, 0.46, 0.25, -0.05, 0, TAU);
    ctx.fillStyle = bodyC; ctx.fill();
    ctx.lineWidth = 0.028; ctx.strokeStyle = OUT; ctx.stroke();
    // 臀部高光
    ctx.beginPath();
    ctx.ellipse(-0.22, -0.72, 0.20, 0.14, -0.2, 0, TAU);
    ctx.fillStyle = U.rgba('#FFFFFF', 0.10); ctx.fill();

    // 颈 + 头
    ctx.beginPath();
    ctx.moveTo(0.26, -0.72); ctx.lineTo(0.52, -0.96); ctx.lineTo(0.60, -0.82); ctx.lineTo(0.40, -0.58);
    ctx.closePath();
    ctx.fillStyle = bodyC; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0.62, -0.98, 0.19, 0.10, -0.35, 0, TAU);
    ctx.fillStyle = bodyC; ctx.fill(); ctx.stroke();
    // 耳
    ctx.beginPath(); ctx.moveTo(0.52, -1.04); ctx.lineTo(0.55, -1.18); ctx.lineTo(0.60, -1.04);
    ctx.closePath(); ctx.fillStyle = bodyC; ctx.fill(); ctx.stroke();
    // 眼
    ctx.beginPath(); ctx.arc(0.62, -1.00, 0.028, 0, TAU); ctx.fillStyle = '#1A1015'; ctx.fill();
    // 鬃毛
    ctx.beginPath();
    ctx.moveTo(0.30, -0.92);
    for (let i = 0; i < 5; i++) {
        ctx.quadraticCurveTo(0.32 - i * 0.07, -1.00 - Math.sin(t * 9 + i) * 0.02, 0.24 - i * 0.07, -0.80);
    }
    ctx.closePath();
    ctx.fillStyle = M.mane; ctx.fill();

    // 鞍
    ctx.beginPath();
    ctx.ellipse(-0.04, -0.84, 0.20, 0.09, -0.05, 0, TAU);
    ctx.fillStyle = M.saddle; ctx.fill(); ctx.stroke();

    // 尾
    ctx.beginPath();
    ctx.moveTo(-0.48, -0.72);
    ctx.quadraticCurveTo(-0.72, -0.66 + Math.sin(t * 7) * 0.05, -0.78, -0.40 + Math.sin(t * 7 + 1) * 0.06);
    ctx.quadraticCurveTo(-0.62, -0.56, -0.44, -0.60);
    ctx.closePath();
    ctx.fillStyle = M.mane; ctx.fill();

    // 近侧腿
    [[0.30, legSwing(Math.PI)], [0.06, legSwing(Math.PI + 2.1)]].forEach(([lx, sw]) => {
        ctx.save(); ctx.translate(lx, -0.42); ctx.rotate(sw);
        U.capsule(ctx, 0, 0, 0, 0.20, 0.11, 0.09);
        ctx.fillStyle = bodyC; ctx.fill();
        ctx.lineWidth = 0.024; ctx.strokeStyle = OUT; ctx.stroke();
        U.capsule(ctx, 0, 0.18, 0.03, 0.42, 0.085, 0.065);
        ctx.fillStyle = bodyC; ctx.fill(); ctx.stroke();
        // 蹄
        ctx.beginPath(); ctx.ellipse(0.04, 0.43, 0.06, 0.045, 0, 0, TAU);
        ctx.fillStyle = M.hoof; ctx.fill(); ctx.stroke();
        ctx.restore();
    });

    ctx.restore();
};

/* 盾牌绘制（跟随后手） */
Fig.drawShield = function (ctx, look, s, o) {
    if (!look.shieldColor) return;
    ctx.save();
    ctx.translate(s.hdB.x, s.hdB.y);
    ctx.rotate(s.aArmB - Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-0.30, -0.40);
    ctx.quadraticCurveTo(0.18, -0.44, 0.18, 0);
    ctx.quadraticCurveTo(0.18, 0.44, -0.30, 0.40);
    ctx.quadraticCurveTo(-0.40, 0, -0.30, -0.40);
    ctx.closePath();
    ctx.fillStyle = look.shieldColor; ctx.fill();
    ctx.lineWidth = 0.028; ctx.strokeStyle = Fig.OUTLINE; ctx.stroke();
    ctx.beginPath(); ctx.arc(-0.02, 0, 0.11, 0, TAU);
    ctx.fillStyle = look.shieldBoss || '#C9A227'; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.30, -0.14); ctx.lineTo(0.14, -0.16);
    ctx.moveTo(-0.30, 0.14); ctx.lineTo(0.14, 0.16);
    ctx.lineWidth = 0.03; ctx.strokeStyle = U.rgba('#000000', 0.2); ctx.stroke();
    ctx.restore();
};

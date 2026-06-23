// 三国战纪 - Canvas精灵生成器 v5 (攻击/技能/防御动画)
const SpriteGen = {
    createCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return { canvas: c, ctx: c.getContext('2d') };
    },
    px(ctx, x, y, color, s) {
        ctx.fillStyle = color;
        ctx.fillRect(x * s, y * s, s, s);
    },
    row(ctx, x, y, colors, s) {
        colors.forEach((c, i) => { if (c) this.px(ctx, x + i, y, c, s); });
    },
    rect(ctx, x, y, w, h, color, s) {
        ctx.fillStyle = color;
        ctx.fillRect(x * s, y * s, w * s, h * s);
    },
    generateCharacter(config, fw, fh) {
        if (!config || !config.frames || !Array.isArray(config.frames) || config.frames.length === 0) {
            const c = document.createElement('canvas');
            c.width = 64; c.height = 64;
            return c;
        }
        fw = fw || 64; fh = fh || 128;
        const fc = config.frames.length;
        const { canvas, ctx } = this.createCanvas(fw * fc, fh);
        const s = 4;
        for (let f = 0; f < fc; f++) {
            if (typeof config.frames[f] !== 'function') continue;
            ctx.save();
            ctx.translate(f * fw, 0);
            config.frames[f](ctx, s);
            ctx.restore();
        }
        return canvas;
    },

    // ========== 刘备身体模板 ==========
    _lb(ctx, s) {
        this.row(ctx, 4,0,[null,null,null,null,'#FFD700','#FFA500','#FFD700','#FFA500',null,null,null],s);
        this.row(ctx, 3,1,[null,null,null,'#FFD700','#FFF','#FFD700','#FFF','#FFD700',null,null,null],s);
        this.row(ctx, 4,2,[null,null,null,null,'#8B4513','#DAA520','#8B4513',null,null,null,null],s);
        this.row(ctx, 3,3,[null,null,null,'#FFDAB9','#FFDAB9','#FFDAB9','#FFDAB9','#FFDAB9',null,null],s);
        this.row(ctx, 3,4,[null,null,null,'#FFDAB9','#222','#FFDAB9','#222','#FFDAB9',null,null],s);
        this.row(ctx, 3,5,[null,null,null,'#FFDAB9','#E8A0A0','#FFDAB9','#E8A0A0','#FFDAB9',null,null],s);
        this.row(ctx, 3,6,[null,null,null,'#FFDAB9','#FFDAB9','#FFDAB9','#FFDAB9','#FFDAB9',null,null],s);
        this.row(ctx, 4,7,[null,null,null,null,'#222','#222','#222',null,null,null,null],s);
        this.row(ctx, 2,8,[null,null,'#1B5E20','#2E7D32','#388E3C','#388E3C','#2E7D32','#1B5E20',null,null],s);
        this.row(ctx, 2,9,[null,null,'#1B5E20','#2E7D32','#FFD700','#2E7D32','#FFD700','#1B5E20',null,null],s);
        this.row(ctx,2,10,[null,null,'#1B5E20','#2E7D32','#388E3C','#388E3C','#2E7D32','#1B5E20',null,null],s);
        this.row(ctx,2,11,[null,null,'#1B5E20','#2E7D32','#FFFF00','#FFFF00','#2E7D32','#1B5E20',null,null],s);
        this.row(ctx,2,12,[null,null,'#1B5E20','#2E7D32','#388E3C','#388E3C','#2E7D32','#1B5E20',null,null],s);
        this.row(ctx,3,13,[null,null,null,'#1B5E20','#2E7D32','#2E7D32','#1B5E20',null,null,null],s);
    },
    _lbLegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,14,[null,null,null,'#1B5E20','#1B5E20',null,null,'#1B5E20','#1B5E20',null,null],s);
            this.row(ctx,2,15,[null,null,'#1B5E20',null,null,null,null,null,'#1B5E20',null,null],s);
            this.row(ctx,2,16,[null,null,'#1B5E20',null,null,null,null,null,'#1B5E20',null,null],s);
            this.row(ctx,2,17,[null,null,'#8B4513','#8B4513',null,null,null,null,'#8B4513',null,null],s);
            this.row(ctx,2,18,[null,null,'#654321','#654321',null,null,null,null,'#654321',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,14,[null,null,null,'#1B5E20','#1B5E20',null,'#1B5E20','#1B5E20',null,null],s);
            this.row(ctx,3,15,[null,null,null,null,'#1B5E20',null,'#1B5E20',null,null,null],s);
            this.row(ctx,3,16,[null,null,null,null,'#1B5E20',null,'#1B5E20',null,null,null],s);
            this.row(ctx,2,17,[null,null,null,'#8B4513','#8B4513',null,'#8B4513',null,null,null],s);
            this.row(ctx,2,18,[null,null,null,'#654321','#654321',null,'#654321',null,null,null],s);
        } else {
            this.row(ctx,3,14,[null,null,null,'#1B5E20','#1B5E20',null,'#1B5E20','#1B5E20',null,null],s);
            this.row(ctx,3,15,[null,null,null,'#1B5E20',null,null,null,'#1B5E20',null,null],s);
            this.row(ctx,3,16,[null,null,null,'#1B5E20',null,null,null,'#1B5E20',null,null],s);
            this.row(ctx,3,17,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
            this.row(ctx,3,18,[null,null,null,'#654321','#654321',null,'#654321','#654321',null,null],s);
        }
    },
    _lbSwordsIdle(ctx, s) {
        // 右剑斜指前(右下), 左剑斜指后(左下), 各1像素细长
        this.rect(ctx,9,4,1,1,'#FFD700',s);
        this.rect(ctx,10,5,1,1,'#FFF',s);
        this.rect(ctx,11,6,1,1,'#FFF',s);
        this.rect(ctx,12,7,1,1,'#FFF',s);
        this.rect(ctx,13,8,1,1,'#FFF',s);
        this.rect(ctx,14,9,1,1,'#8B4513',s);
        this.rect(ctx,2,5,1,1,'#FFD700',s);
        this.rect(ctx,1,6,1,1,'#FFF',s);
        this.rect(ctx,1,7,1,1,'#FFF',s);
        this.rect(ctx,0,8,1,1,'#FFF',s);
        this.rect(ctx,0,9,1,1,'#8B4513',s);
    },
    _lbSwordsIdle2(ctx, s) {
        this.rect(ctx,9,3,1,1,'#FFD700',s);
        this.rect(ctx,10,4,1,1,'#FFF',s);
        this.rect(ctx,11,5,1,1,'#FFF',s);
        this.rect(ctx,12,6,1,1,'#FFF',s);
        this.rect(ctx,13,7,1,1,'#FFF',s);
        this.rect(ctx,14,8,1,1,'#8B4513',s);
        this.rect(ctx,2,4,1,1,'#FFD700',s);
        this.rect(ctx,1,5,1,1,'#FFF',s);
        this.rect(ctx,1,6,1,1,'#FFF',s);
        this.rect(ctx,0,7,1,1,'#FFF',s);
        this.rect(ctx,0,8,1,1,'#8B4513',s);
    },
    _lbAtkWindup(ctx, s) {
        // 双剑后拉蓄力(左侧) - 斜指右上方
        this.rect(ctx,2,0,1,1,'#FFD700',s);
        this.rect(ctx,1,1,1,1,'#FFF',s);
        this.rect(ctx,1,2,1,1,'#FFF',s);
        this.rect(ctx,0,3,1,1,'#FFF',s);
        this.rect(ctx,0,4,1,1,'#FFF',s);
        this.rect(ctx,0,5,1,1,'#8B4513',s);
        this.rect(ctx,5,0,1,1,'#FFD700',s);
        this.rect(ctx,4,1,1,1,'#FFF',s);
        this.rect(ctx,4,2,1,1,'#FFF',s);
        this.rect(ctx,3,3,1,1,'#FFF',s);
        this.rect(ctx,3,4,1,1,'#FFF',s);
        this.rect(ctx,3,5,1,1,'#8B4513',s);
    },
    _lbAtkStrike(ctx, s) {
        // 双剑向右前方劈砍
        this.rect(ctx,9,4,1,1,'#FFD700',s);
        this.rect(ctx,10,5,1,1,'#FFF',s);
        this.rect(ctx,11,6,1,1,'#FFF',s);
        this.rect(ctx,12,7,1,1,'#FFF',s);
        this.rect(ctx,13,8,1,1,'#FFF',s);
        this.rect(ctx,14,9,1,1,'#8B4513',s);
        this.rect(ctx,10,2,1,1,'#FFD700',s);
        this.rect(ctx,11,3,1,1,'#FFF',s);
        this.rect(ctx,12,4,1,1,'#FFF',s);
        this.rect(ctx,13,5,1,1,'#FFF',s);
        this.rect(ctx,14,6,1,1,'#FFF',s);
        this.rect(ctx,15,7,1,1,'#8B4513',s);
        this.rect(ctx,11,1,1,1,'#FFF',s);
        this.rect(ctx,13,2,1,1,'#FFF',s);
        this.rect(ctx,14,3,1,1,'#FFF',s);
    },
    _lbSkill1(ctx, s) {
        // 双剑交叉蓄能 - 右侧斜指
        this.rect(ctx,8,3,1,1,'#FFD700',s);
        this.rect(ctx,9,4,1,1,'#FFF',s);
        this.rect(ctx,10,5,1,1,'#FFF',s);
        this.rect(ctx,11,6,1,1,'#FFF',s);
        this.rect(ctx,12,7,1,1,'#FFF',s);
        this.rect(ctx,13,8,1,1,'#8B4513',s);
        this.rect(ctx,5,3,1,1,'#FFD700',s);
        this.rect(ctx,4,4,1,1,'#FFF',s);
        this.rect(ctx,3,5,1,1,'#FFF',s);
        this.rect(ctx,3,6,1,1,'#FFF',s);
        this.rect(ctx,2,7,1,1,'#FFF',s);
        this.rect(ctx,2,8,1,1,'#8B4513',s);
        this.rect(ctx,3,4,8,1,'#FFD700',s);
    },
    _lbSkill2(ctx, s) {
        // 双剑左右横斩
        this.rect(ctx,2,4,1,1,'#FFD700',s);
        this.rect(ctx,1,5,1,1,'#FFF',s);
        this.rect(ctx,1,6,1,1,'#FFF',s);
        this.rect(ctx,0,7,1,1,'#FFF',s);
        this.rect(ctx,0,8,1,1,'#FFF',s);
        this.rect(ctx,0,9,1,1,'#8B4513',s);
        this.rect(ctx,9,4,1,1,'#FFD700',s);
        this.rect(ctx,10,5,1,1,'#FFF',s);
        this.rect(ctx,11,6,1,1,'#FFF',s);
        this.rect(ctx,12,7,1,1,'#FFF',s);
        this.rect(ctx,13,8,1,1,'#FFF',s);
        this.rect(ctx,14,9,1,1,'#8B4513',s);
        this.rect(ctx,12,3,1,1,'#FFD700',s);
        this.rect(ctx,13,4,1,1,'#FFF',s);
        this.rect(ctx,14,5,1,1,'#FFF',s);
        this.rect(ctx,15,6,1,1,'#FFF',s);
        this.rect(ctx,15,7,1,1,'#8B4513',s);
        this.rect(ctx,1,5,14,1,'#FFD700',s);
    },
    _lbSkill3(ctx, s) {
        // 双剑前举收招(指向右)
        this.rect(ctx,8,3,1,1,'#FFD700',s);
        this.rect(ctx,9,4,1,1,'#FFF',s);
        this.rect(ctx,10,5,1,1,'#FFF',s);
        this.rect(ctx,11,6,1,1,'#FFF',s);
        this.rect(ctx,12,7,1,1,'#FFF',s);
        this.rect(ctx,13,8,1,1,'#8B4513',s);
        this.rect(ctx,11,2,1,1,'#FFD700',s);
        this.rect(ctx,12,3,1,1,'#FFF',s);
        this.rect(ctx,13,4,1,1,'#FFF',s);
        this.rect(ctx,14,5,1,1,'#FFF',s);
        this.rect(ctx,15,6,1,1,'#FFF',s);
        this.rect(ctx,15,7,1,1,'#8B4513',s);
        this.rect(ctx,5,6,6,1,'#FFD700',s);
    },
    _lbDefend(ctx, s) {
        // 双剑交叉格挡 - 在角色右前方
        this.rect(ctx,10,3,1,1,'#FFD700',s);
        this.rect(ctx,11,4,1,1,'#FFF',s);
        this.rect(ctx,12,5,1,1,'#FFF',s);
        this.rect(ctx,13,6,1,1,'#FFF',s);
        this.rect(ctx,14,7,1,1,'#FFF',s);
        this.rect(ctx,15,8,1,1,'#8B4513',s);
        this.rect(ctx,13,2,1,1,'#FFD700',s);
        this.rect(ctx,12,3,1,1,'#FFF',s);
        this.rect(ctx,11,4,1,1,'#FFF',s);
        this.rect(ctx,11,5,1,1,'#FFF',s);
        this.rect(ctx,10,6,1,1,'#FFF',s);
        this.rect(ctx,10,7,1,1,'#8B4513',s);
        this.rect(ctx,10,5,5,1,'#FFD700',s);
    },

    liuBei() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'idle'); t._lbSwordsIdle(ctx,s); },
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'idle'); t._lbSwordsIdle2(ctx,s); },
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'w1'); t._lbSwordsIdle(ctx,s); },
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'w2'); t._lbSwordsIdle(ctx,s); },
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'idle'); t._lbAtkWindup(ctx,s); },
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'idle'); t._lbAtkStrike(ctx,s); },
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'idle'); t._lbSkill1(ctx,s); },
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'idle'); t._lbSkill2(ctx,s); },
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'idle'); t._lbSkill3(ctx,s); },
                (ctx,s) => { t._lb(ctx,s); t._lbLegs(ctx,s,'idle'); t._lbDefend(ctx,s); },
            ]
        });
    },

    // ========== 关羽身体模板 ==========
    _gy(ctx, s) {
        this.row(ctx,3,0,[null,null,null,'#006400','#008000','#006400','#008000','#006400',null,null],s);
        this.row(ctx,2,1,[null,null,'#006400','#008000','#006400','#008000','#006400','#008000','#006400',null],s);
        this.row(ctx,2,2,[null,null,'#006400','#DC143C','#DC143C','#DC143C','#DC143C','#006400',null,null],s);
        this.row(ctx,3,3,[null,null,null,'#DC143C','#DC143C','#DC143C','#DC143C','#DC143C',null,null],s);
        this.row(ctx,3,4,[null,null,null,'#DC143C','#222','#DC143C','#222','#DC143C',null,null],s);
        this.row(ctx,3,5,[null,null,null,'#DC143C','#DC143C','#DC143C','#DC143C','#DC143C',null,null],s);
        this.row(ctx,4,6,[null,null,null,null,'#222','#222','#222',null,null,null,null],s);
        this.row(ctx,4,7,[null,null,null,null,null,'#222','#222',null,null,null,null],s);
        this.row(ctx,4,8,[null,null,null,null,null,'#222',null,null,null,null,null],s);
        this.row(ctx,2,9,[null,null,'#2E8B57','#3CB371','#2E8B57','#2E8B57','#3CB371','#2E8B57',null,null],s);
        this.row(ctx,2,10,[null,null,'#2E8B57','#FFD700','#2E8B57','#2E8B57','#FFD700','#2E8B57',null,null],s);
        this.row(ctx,2,11,[null,null,'#2E8B57','#3CB371','#2E8B57','#2E8B57','#3CB371','#2E8B57',null,null],s);
        this.row(ctx,2,12,[null,null,'#2E8B57','#FFFF00','#2E8B57','#2E8B57','#FFFF00','#2E8B57',null,null],s);
        this.row(ctx,2,13,[null,null,'#2E8B57','#3CB371','#2E8B57','#2E8B57','#3CB371','#2E8B57',null,null],s);
        this.row(ctx,3,14,[null,null,null,'#2E8B57','#2E8B57','#2E8B57','#2E8B57',null,null,null],s);
    },
    _gyLegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,15,[null,null,null,'#2E8B57','#2E8B57',null,null,'#2E8B57','#2E8B57',null,null],s);
            this.row(ctx,2,16,[null,null,'#2E8B57',null,null,null,null,null,'#2E8B57',null,null],s);
            this.row(ctx,2,17,[null,null,'#8B4513','#8B4513',null,null,null,null,'#8B4513',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,15,[null,null,null,'#2E8B57','#2E8B57',null,'#2E8B57','#2E8B57',null,null],s);
            this.row(ctx,3,16,[null,null,null,null,'#2E8B57',null,'#2E8B57',null,null,null],s);
            this.row(ctx,2,17,[null,null,null,'#8B4513','#8B4513',null,'#8B4513',null,null,null],s);
        } else {
            this.row(ctx,3,15,[null,null,null,'#2E8B57','#2E8B57',null,'#2E8B57','#2E8B57',null,null],s);
            this.row(ctx,3,16,[null,null,null,'#2E8B57',null,null,null,'#2E8B57',null,null],s);
            this.row(ctx,3,17,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
        }
    },
    _gyBladeIdle(ctx, s) {
        // 青龙偃月刀: 长杆向前延伸成刃，向上微曲
        // Handle: diagonal (4,14) to (12,6)
        this.rect(ctx,4,14,1,1,'#8B4513',s);
        this.rect(ctx,5,13,1,1,'#8B4513',s);
        this.rect(ctx,6,12,1,1,'#8B4513',s);
        this.rect(ctx,7,11,1,1,'#8B4513',s);
        this.rect(ctx,8,10,1,1,'#8B4513',s);
        this.rect(ctx,9,9,1,1,'#8B4513',s);
        this.rect(ctx,10,8,1,1,'#8B4513',s);
        this.rect(ctx,11,7,1,1,'#8B4513',s);
        this.rect(ctx,12,6,1,1,'#8B4513',s);
        // Blade: extends from handle, left edge curves inward
        this.rect(ctx,15,1,1,1,'#FFF',s);
        this.rect(ctx,14,2,2,1,'#F0F0FF',s);
        this.rect(ctx,13,3,3,1,'#F0F0FF',s);
        this.rect(ctx,12,4,4,1,'#F0F0FF',s);
        this.rect(ctx,11,5,4,1,'#F0F0FF',s);
        this.rect(ctx,11,6,3,1,'#F0F0FF',s);
        // Edge highlights (right side)
        this.rect(ctx,15,2,1,1,'#FFF',s);
        this.rect(ctx,15,3,1,1,'#FFF',s);
        this.rect(ctx,15,4,1,1,'#FFF',s);
        this.rect(ctx,14,5,1,1,'#FFF',s);
        this.rect(ctx,13,6,1,1,'#FFF',s);
    },
    _gyAtkWindup(ctx, s) {
        // Blade behind head, horns up-left (reversed crescent)
        this.rect(ctx,3,0,4,1,'#F0F0FF',s);
        this.rect(ctx,2,1,3,1,'#F0F0FF',s);
        this.rect(ctx,1,2,5,1,'#F0F0FF',s);
        this.rect(ctx,2,3,3,1,'#F0F0FF',s);
        this.rect(ctx,3,4,4,1,'#F0F0FF',s);
        this.rect(ctx,1,2,1,1,'#FFFFFF',s);
        this.rect(ctx,2,3,1,1,'#FFFFFF',s);
        this.rect(ctx,5,2,1,1,'#8B4513',s);
        this.rect(ctx,6,3,1,1,'#8B4513',s);
        this.rect(ctx,7,4,1,1,'#8B4513',s);
        this.rect(ctx,8,5,1,1,'#8B4513',s);
        this.rect(ctx,9,6,1,1,'#8B4513',s);
        this.rect(ctx,10,7,1,1,'#8B4513',s);
        this.rect(ctx,11,8,1,1,'#8B4513',s);
        this.rect(ctx,12,9,1,1,'#8B4513',s);
    },
    _gyAtkStrike(ctx, s) {
        // Chop down-right: crescent blade angled down
        this.rect(ctx,6,4,5,1,'#F0F0FF',s);   // top
        this.rect(ctx,7,5,4,1,'#F0F0FF',s);
        this.rect(ctx,8,6,3,1,'#F0F0FF',s);
        this.rect(ctx,9,7,2,1,'#F0F0FF',s);   // tip
        this.rect(ctx,7,4,1,1,'#FFFFFF',s);
        this.rect(ctx,8,5,1,1,'#FFFFFF',s);
        this.rect(ctx,9,6,1,1,'#FFFFFF',s);
        // Swing trail
        this.rect(ctx,5,3,4,1,'#E0E0FF',s);
        this.rect(ctx,4,2,3,1,'#E0E0FF',s);
        this.rect(ctx,3,1,2,1,'#E0E0FF',s);
        this.rect(ctx,5,7,1,1,'#8B4513',s);
        this.rect(ctx,4,8,1,1,'#8B4513',s);
        this.rect(ctx,3,9,1,1,'#8B4513',s);
        this.rect(ctx,2,10,1,1,'#8B4513',s);
        this.rect(ctx,1,11,1,1,'#8B4513',s);
        this.rect(ctx,0,12,1,1,'#8B4513',s);
    },
    _gySkill1(ctx, s) {
        // 青龙蓄力: blade pulled back left
        this.rect(ctx,1,0,4,1,'#F0F0FF',s);
        this.rect(ctx,0,1,3,1,'#F0F0FF',s);
        this.rect(ctx,0,2,5,1,'#F0F0FF',s);
        this.rect(ctx,1,3,3,1,'#F0F0FF',s);
        this.rect(ctx,2,4,4,1,'#F0F0FF',s);
        this.rect(ctx,0,2,1,1,'#FFFFFF',s);
        this.rect(ctx,1,3,1,1,'#FFFFFF',s);
        this.rect(ctx,5,2,1,1,'#8B4513',s);
        this.rect(ctx,6,3,1,1,'#8B4513',s);
        this.rect(ctx,7,4,1,1,'#8B4513',s);
        this.rect(ctx,8,5,1,1,'#8B4513',s);
        this.rect(ctx,9,6,1,1,'#8B4513',s);
        this.rect(ctx,10,7,1,1,'#8B4513',s);
        this.rect(ctx,11,8,1,1,'#8B4513',s);
        // Green energy
        this.rect(ctx,1,5,7,1,'#0F0',s);
        this.rect(ctx,2,6,5,1,'#0A0',s);
    },
    _gySkill2(ctx, s) {
        // 青龙偃月斩: wide sweep, crescent horizontal
        this.rect(ctx,5,3,6,1,'#F0F0FF',s);
        this.rect(ctx,6,4,5,1,'#F0F0FF',s);
        this.rect(ctx,7,5,4,1,'#F0F0FF',s);
        this.rect(ctx,8,6,3,1,'#F0F0FF',s);
        this.rect(ctx,6,3,1,1,'#FFFFFF',s);
        this.rect(ctx,7,4,1,1,'#FFFFFF',s);
        this.rect(ctx,8,5,1,1,'#FFFFFF',s);
        this.rect(ctx,6,7,1,1,'#8B4513',s);
        this.rect(ctx,5,8,1,1,'#8B4513',s);
        this.rect(ctx,4,9,1,1,'#8B4513',s);
        this.rect(ctx,3,10,1,1,'#8B4513',s);
        this.rect(ctx,2,11,1,1,'#8B4513',s);
        // Green slash
        this.rect(ctx,0,5,14,1,'#0F0',s);
        this.rect(ctx,1,6,10,1,'#0A0',s);
    },
    _gySkill3(ctx, s) {
        // 收招: blade forward-right, crescent upright
        this.rect(ctx,6,2,6,1,'#F0F0FF',s);
        this.rect(ctx,7,3,5,1,'#F0F0FF',s);
        this.rect(ctx,8,4,4,1,'#F0F0FF',s);
        this.rect(ctx,9,5,3,1,'#F0F0FF',s);
        this.rect(ctx,7,2,1,1,'#FFFFFF',s);
        this.rect(ctx,8,3,1,1,'#FFFFFF',s);
        this.rect(ctx,9,4,1,1,'#FFFFFF',s);
        this.rect(ctx,8,6,1,1,'#8B4513',s);
        this.rect(ctx,7,7,1,1,'#8B4513',s);
        this.rect(ctx,6,8,1,1,'#8B4513',s);
        this.rect(ctx,5,9,1,1,'#8B4513',s);
        this.rect(ctx,4,10,1,1,'#8B4513',s);
        this.rect(ctx,3,11,1,1,'#8B4513',s);
        // Fading green
        this.rect(ctx,4,6,5,1,'#0F0',s);
    },
    _gyDefend(ctx, s) {
        // 刀横架前方: horizontal block, crescent edge up
        this.rect(ctx,13,2,3,1,'#F0F0FF',s);
        this.rect(ctx,12,3,4,1,'#F0F0FF',s);
        this.rect(ctx,11,4,5,1,'#F0F0FF',s);
        this.rect(ctx,12,5,4,1,'#F0F0FF',s);
        this.rect(ctx,13,6,2,1,'#F0F0FF',s);
        this.rect(ctx,15,4,1,1,'#FFFFFF',s);
        this.rect(ctx,14,3,1,1,'#FFFFFF',s);
        this.rect(ctx,14,5,1,1,'#FFFFFF',s);
        this.rect(ctx,10,4,1,1,'#8B4513',s);
        this.rect(ctx,9,4,1,1,'#8B4513',s);
        this.rect(ctx,8,4,1,1,'#8B4513',s);
        this.rect(ctx,7,4,1,1,'#8B4513',s);
        this.rect(ctx,6,4,1,1,'#8B4513',s);
        this.rect(ctx,5,4,1,1,'#8B4513',s);
        this.rect(ctx,4,4,1,1,'#8B4513',s);
        this.rect(ctx,3,4,1,1,'#8B4513',s);
        this.rect(ctx,2,4,1,1,'#8B4513',s);
        this.rect(ctx,1,4,1,1,'#8B4513',s);
    },

    guanYu() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'idle'); t._gyBladeIdle(ctx,s); },
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'idle'); t._gyBladeIdle(ctx,s); },
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'w1'); t._gyBladeIdle(ctx,s); },
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'w2'); t._gyBladeIdle(ctx,s); },
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'idle'); t._gyAtkWindup(ctx,s); },
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'idle'); t._gyAtkStrike(ctx,s); },
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'idle'); t._gySkill1(ctx,s); },
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'idle'); t._gySkill2(ctx,s); },
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'idle'); t._gySkill3(ctx,s); },
                (ctx,s) => { t._gy(ctx,s); t._gyLegs(ctx,s,'idle'); t._gyDefend(ctx,s); },
            ]
        });
    },

    // ========== 张飞身体模板 ==========
    _zf(ctx, s) {
        this.row(ctx,2,0,[null,null,'#000','#1C1C1C','#000','#1C1C1C','#000','#1C1C1C','#000',null],s);
        this.row(ctx,2,1,[null,null,'#000','#1C1C1C','#000','#000','#1C1C1C','#000','#1C1C1C',null],s);
        this.row(ctx,3,2,[null,null,null,'#3D2B1F','#3D2B1F','#3D2B1F','#3D2B1F','#3D2B1F',null,null],s);
        this.row(ctx,3,3,[null,null,null,'#3D2B1F','#FFF','#FFF','#3D2B1F','#3D2B1F',null,null],s);
        this.row(ctx,3,4,[null,null,null,'#3D2B1F','#3D2B1F','#000','#3D2B1F','#000','#3D2B1F',null],s);
        this.row(ctx,3,5,[null,null,null,'#3D2B1F','#3D2B1F','#3D2B1F','#3D2B1F','#3D2B1F',null,null],s);
        this.row(ctx,3,6,[null,null,null,'#000','#000','#000','#000','#000',null,null],s);
        this.row(ctx,4,7,[null,null,null,null,'#000','#000','#000',null,null,null,null],s);
        this.row(ctx,4,8,[null,null,null,null,null,'#000','#000',null,null,null,null],s);
        this.row(ctx,2,9,[null,null,'#1C1C1C','#2F2F2F','#1C1C1C','#1C1C1C','#2F2F2F','#1C1C1C',null,null],s);
        this.row(ctx,2,10,[null,null,'#1C1C1C','#FF4500','#1C1C1C','#1C1C1C','#FF4500','#1C1C1C',null,null],s);
        this.row(ctx,2,11,[null,null,'#1C1C1C','#2F2F2F','#1C1C1C','#1C1C1C','#2F2F2F','#1C1C1C',null,null],s);
        this.row(ctx,2,12,[null,null,'#1C1C1C','#FF4500','#1C1C1C','#1C1C1C','#FF4500','#1C1C1C',null,null],s);
        this.row(ctx,3,13,[null,null,null,'#1C1C1C','#2F2F2F','#2F2F2F','#1C1C1C',null,null,null],s);
    },
    _zfLegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,14,[null,null,null,'#1C1C1C','#1C1C1C',null,null,'#1C1C1C','#1C1C1C',null,null],s);
            this.row(ctx,2,15,[null,null,'#1C1C1C',null,null,null,null,null,'#1C1C1C',null,null],s);
            this.row(ctx,2,16,[null,null,'#1C1C1C',null,null,null,null,null,'#1C1C1C',null,null],s);
            this.row(ctx,2,17,[null,null,'#8B4513','#8B4513',null,null,null,null,'#8B4513',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,14,[null,null,null,'#1C1C1C','#1C1C1C',null,'#1C1C1C','#1C1C1C',null,null],s);
            this.row(ctx,3,15,[null,null,null,null,'#1C1C1C',null,'#1C1C1C',null,null,null],s);
            this.row(ctx,3,16,[null,null,null,null,'#1C1C1C',null,'#1C1C1C',null,null,null],s);
            this.row(ctx,2,17,[null,null,null,'#8B4513','#8B4513',null,'#8B4513',null,null,null],s);
        } else {
            this.row(ctx,3,14,[null,null,null,'#1C1C1C','#1C1C1C',null,'#1C1C1C','#1C1C1C',null,null],s);
            this.row(ctx,3,15,[null,null,null,'#1C1C1C',null,null,null,'#1C1C1C',null,null],s);
            this.row(ctx,3,16,[null,null,null,'#1C1C1C',null,null,null,'#1C1C1C',null,null],s);
            this.row(ctx,3,17,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
        }
    },
    _zfSpearIdle(ctx, s) {
        // 丈八蛇矛: 长杆向前延伸，末尾微平
        // Handle: diagonal (4,14) to (12,6)
        this.rect(ctx,4,14,1,1,'#8B4513',s);
        this.rect(ctx,5,13,1,1,'#8B4513',s);
        this.rect(ctx,6,12,1,1,'#8B4513',s);
        this.rect(ctx,7,11,1,1,'#8B4513',s);
        this.rect(ctx,8,10,1,1,'#8B4513',s);
        this.rect(ctx,9,9,1,1,'#8B4513',s);
        this.rect(ctx,10,8,1,1,'#8B4513',s);
        this.rect(ctx,11,7,1,1,'#8B4513',s);
        this.rect(ctx,12,6,1,1,'#8B4513',s);
        // Blade: extends from handle up-right, flat tip
        this.rect(ctx,14,3,2,1,'#C0C0C0',s);
        this.rect(ctx,13,4,3,1,'#C0C0C0',s);
        this.rect(ctx,12,5,3,1,'#C0C0C0',s);
        this.rect(ctx,12,6,2,1,'#C0C0C0',s);
        // Edge highlights
        this.rect(ctx,15,3,1,1,'#E8E8E8',s);
        this.rect(ctx,15,4,1,1,'#E8E8E8',s);
        this.rect(ctx,14,5,1,1,'#E8E8E8',s);
        this.rect(ctx,13,6,1,1,'#E8E8E8',s);
    },
    _zfAtkWindup(ctx, s) {
        // 蛇矛后拉
        this.rect(ctx,7,1,3,1,'#C0C0C0',s);
        this.rect(ctx,6,2,3,1,'#C0C0C0',s);
        this.rect(ctx,5,3,3,1,'#C0C0C0',s);
        this.rect(ctx,4,4,3,1,'#C0C0C0',s);
        this.rect(ctx,3,5,2,1,'#C0C0C0',s);
        this.rect(ctx,6,2,1,1,'#E8E8E8',s);
        this.rect(ctx,5,3,1,1,'#E8E8E8',s);
        for (let r=5;r<=10;r++) this.rect(ctx,8,r,1,1,'#8B4513',s);
    },
    _zfAtkStrike(ctx, s) {
        // 蛇矛前刺
        this.rect(ctx,0,4,3,1,'#C0C0C0',s);
        this.rect(ctx,0,5,3,1,'#C0C0C0',s);
        this.rect(ctx,1,6,3,1,'#C0C0C0',s);
        this.rect(ctx,2,7,2,1,'#C0C0C0',s);
        this.rect(ctx,3,4,1,1,'#E8E8E8',s);
        this.rect(ctx,3,5,1,1,'#E8E8E8',s);
        for (let r=7;r<=11;r++) this.rect(ctx,4,r,1,1,'#8B4513',s);
    },
    _zfSkill1(ctx, s) {
        // 蛇矛高举，火焰聚集
        this.rect(ctx,5,0,3,1,'#C0C0C0',s);
        this.rect(ctx,4,1,3,1,'#C0C0C0',s);
        this.rect(ctx,5,2,3,1,'#C0C0C0',s);
        this.rect(ctx,6,3,2,1,'#C0C0C0',s);
        this.rect(ctx,3,4,4,1,'#FF4500',s);
        this.rect(ctx,4,5,2,1,'#FF6347',s);
        for (let r=4;r<=8;r++) this.rect(ctx,9,r,1,1,'#8B4513',s);
    },
    _zfSkill2(ctx, s) {
        // 火焰乱刺: 多个矛影
        this.rect(ctx,0,3,3,1,'#C0C0C0',s);
        this.rect(ctx,0,4,3,1,'#C0C0C0',s);
        this.rect(ctx,4,3,3,1,'#C0C0C0',s);
        this.rect(ctx,4,4,3,1,'#C0C0C0',s);
        this.rect(ctx,8,3,3,1,'#C0C0C0',s);
        this.rect(ctx,8,4,3,1,'#C0C0C0',s);
        this.rect(ctx,0,8,12,1,'#FF4500',s);
        this.rect(ctx,1,9,10,1,'#FF6347',s);
    },
    _zfSkill3(ctx, s) {
        // 火焰砸地
        this.rect(ctx,0,6,3,1,'#C0C0C0',s);
        this.rect(ctx,1,7,3,1,'#C0C0C0',s);
        this.rect(ctx,2,8,2,1,'#C0C0C0',s);
        for (let r=9;r<=12;r++) this.rect(ctx,4,r,1,1,'#8B4513',s);
        this.rect(ctx,0,12,12,1,'#FF4500',s);
        this.rect(ctx,1,13,10,1,'#FF6347',s);
    },
    _zfDefend(ctx, s) {
        // 蛇矛竖挡右侧 — 用长杆来挡，不遮人物
        for (let r=3;r<=8;r++) this.rect(ctx,10,r,1,1,'#8B4513',s);
        this.rect(ctx,11,1,1,1,'#C0C0C0',s);
        this.rect(ctx,10,2,2,1,'#C0C0C0',s);
        this.rect(ctx,9,3,1,1,'#C0C0C0',s);
    },

    zhangFei() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'idle'); t._zfSpearIdle(ctx,s); },
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'idle'); t._zfSpearIdle(ctx,s); },
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'w1'); t._zfSpearIdle(ctx,s); },
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'w2'); t._zfSpearIdle(ctx,s); },
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'idle'); t._zfAtkWindup(ctx,s); },
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'idle'); t._zfAtkStrike(ctx,s); },
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'idle'); t._zfSkill1(ctx,s); },
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'idle'); t._zfSkill2(ctx,s); },
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'idle'); t._zfSkill3(ctx,s); },
                (ctx,s) => { t._zf(ctx,s); t._zfLegs(ctx,s,'idle'); t._zfDefend(ctx,s); },
            ]
        });
    },

    // ========== 赵云身体模板 ==========
    _zy(ctx, s) {
        this.row(ctx,3,0,[null,null,null,'#E8E8E8','#FFF','#E8E8E8','#FFF',null,null,null],s);
        this.row(ctx,2,1,[null,null,'#E8E8E8','#FFF','#F00','#FFF','#F00','#FFF','#E8E8E8',null],s);
        this.row(ctx,2,2,[null,null,'#E8E8E8','#FFF','#FFF','#FFF','#FFF','#FFF','#E8E8E8',null],s);
        this.row(ctx,3,3,[null,null,null,'#FFDAB9','#FFDAB9','#FFDAB9','#FFDAB9','#FFDAB9',null,null],s);
        this.row(ctx,3,4,[null,null,null,'#FFDAB9','#000','#FFDAB9','#000','#FFDAB9',null,null],s);
        this.row(ctx,3,5,[null,null,null,'#FFDAB9','#E8A0A0','#FFDAB9','#FFDAB9','#FFDAB9',null,null],s);
        this.row(ctx,2,6,[null,null,'#E8E8E8','#FFF','#E8E8E8','#E8E8E8','#FFF','#E8E8E8',null,null],s);
        this.row(ctx,2,7,[null,null,'#E8E8E8','#4169E1','#FFF','#FFF','#4169E1','#E8E8E8',null,null],s);
        this.row(ctx,2,8,[null,null,'#E8E8E8','#FFF','#E8E8E8','#E8E8E8','#FFF','#E8E8E8',null,null],s);
        this.row(ctx,2,9,[null,null,'#E8E8E8','#4169E1','#FFF','#FFF','#4169E1','#E8E8E8',null,null],s);
        this.row(ctx,2,10,[null,null,'#E8E8E8','#FFF','#E8E8E8','#E8E8E8','#FFF','#E8E8E8',null,null],s);
        this.row(ctx,2,11,[null,null,'#E8E8E8','#FFF','#E8E8E8','#E8E8E8','#FFF','#E8E8E8',null,null],s);
        this.row(ctx,3,12,[null,null,null,'#E8E8E8','#FFF','#FFF','#E8E8E8',null,null,null],s);
    },
    _zyLegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,13,[null,null,null,'#FFF','#FFF',null,null,'#FFF','#FFF',null,null],s);
            this.row(ctx,2,14,[null,null,'#FFF',null,null,null,null,null,'#FFF',null,null],s);
            this.row(ctx,2,15,[null,null,'#E8E8E8',null,null,null,null,null,'#E8E8E8',null,null],s);
            this.row(ctx,2,16,[null,null,'#8B4513','#8B4513',null,null,null,null,'#8B4513',null,null],s);
            this.row(ctx,2,17,[null,null,'#654321','#654321',null,null,null,null,'#654321',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,13,[null,null,null,'#FFF','#FFF',null,'#FFF','#FFF',null,null],s);
            this.row(ctx,3,14,[null,null,null,null,'#FFF',null,'#FFF',null,null,null],s);
            this.row(ctx,3,15,[null,null,null,null,'#E8E8E8',null,'#E8E8E8',null,null,null],s);
            this.row(ctx,2,16,[null,null,null,'#8B4513','#8B4513',null,'#8B4513',null,null,null],s);
            this.row(ctx,2,17,[null,null,null,'#654321','#654321',null,'#654321',null,null,null],s);
        } else {
            this.row(ctx,3,13,[null,null,null,'#FFF','#FFF',null,'#FFF','#FFF',null,null],s);
            this.row(ctx,3,14,[null,null,null,'#FFF',null,null,null,'#FFF',null,null],s);
            this.row(ctx,3,15,[null,null,null,'#E8E8E8',null,null,null,'#E8E8E8',null,null],s);
            this.row(ctx,3,16,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
            this.row(ctx,3,17,[null,null,null,'#654321','#654321',null,'#654321','#654321',null,null],s);
        }
    },
    _zySpearIdle(ctx, s) {
        // 亮银枪: 横握腰际，直指右方（横着拿）
        for (let x=5;x<=10;x++) this.rect(ctx,x,9,1,1,'#2F2F2F',s);
        this.rect(ctx,10,8,1,1,'#FF0000',s);
        this.rect(ctx,10,10,1,1,'#FF0000',s);
        // Sword-like spearhead: sharp single tip at (15,9)
        this.rect(ctx,12,7,2,1,'#F0F0FF',s);
        this.rect(ctx,11,8,4,1,'#F0F0FF',s);
        this.rect(ctx,11,9,5,1,'#F0F0FF',s);
        this.rect(ctx,11,10,4,1,'#F0F0FF',s);
        this.rect(ctx,12,11,2,1,'#F0F0FF',s);
        // Edge highlights on right curve
        this.rect(ctx,13,7,1,1,'#FFF',s);
        this.rect(ctx,14,8,1,1,'#FFF',s);
        this.rect(ctx,15,9,1,1,'#FFF',s);
        this.rect(ctx,14,10,1,1,'#FFF',s);
        this.rect(ctx,13,11,1,1,'#FFF',s);
        this.rect(ctx,11,9,1,1,'#FFD700',s);
    },
    _zyAtkWindup(ctx, s) {
        // 亮银枪后拉蓄力
        for (let x=3;x<=8;x++) this.rect(ctx,x,9,1,1,'#2F2F2F',s);
        this.rect(ctx,8,8,1,1,'#FF0000',s);
        this.rect(ctx,8,10,1,1,'#FF0000',s);
        this.rect(ctx,10,7,2,1,'#F0F0FF',s);
        this.rect(ctx,9,8,3,1,'#F0F0FF',s);
        this.rect(ctx,9,9,3,1,'#F0F0FF',s);
        this.rect(ctx,9,10,3,1,'#F0F0FF',s);
        this.rect(ctx,10,11,2,1,'#F0F0FF',s);
        this.rect(ctx,11,7,1,1,'#FFF',s);
        this.rect(ctx,11,8,1,1,'#FFF',s);
        this.rect(ctx,11,9,1,1,'#FFF',s);
        this.rect(ctx,11,10,1,1,'#FFF',s);
        this.rect(ctx,11,11,1,1,'#FFF',s);
        this.rect(ctx,9,9,1,1,'#FFD700',s);
    },
    _zyAtkStrike(ctx, s) {
        // 亮银枪前刺（向前戳）
        for (let x=5;x<=11;x++) this.rect(ctx,x,9,1,1,'#2F2F2F',s);
        this.rect(ctx,11,8,1,1,'#FF0000',s);
        this.rect(ctx,11,10,1,1,'#FF0000',s);
        this.rect(ctx,14,6,2,1,'#F0F0FF',s);
        this.rect(ctx,12,7,4,1,'#F0F0FF',s);
        this.rect(ctx,12,8,4,1,'#F0F0FF',s);
        this.rect(ctx,12,9,4,1,'#F0F0FF',s);
        this.rect(ctx,12,10,4,1,'#F0F0FF',s);
        this.rect(ctx,12,11,4,1,'#F0F0FF',s);
        this.rect(ctx,14,12,2,1,'#F0F0FF',s);
        this.rect(ctx,15,6,1,1,'#FFF',s);
        this.rect(ctx,15,7,1,1,'#FFF',s);
        this.rect(ctx,15,8,1,1,'#FFF',s);
        this.rect(ctx,15,9,1,1,'#FFF',s);
        this.rect(ctx,15,10,1,1,'#FFF',s);
        this.rect(ctx,15,11,1,1,'#FFF',s);
        this.rect(ctx,15,12,1,1,'#FFF',s);
        this.rect(ctx,12,9,1,1,'#FFD700',s);
    },
    _zySkill1(ctx, s) {
        // 银光起手：银光汇聚
        for (let x=4;x<=9;x++) this.rect(ctx,x,9,1,1,'#2F2F2F',s);
        this.rect(ctx,9,8,1,1,'#FF0000',s);
        this.rect(ctx,9,10,1,1,'#FF0000',s);
        this.rect(ctx,11,7,3,1,'#F0F0FF',s);
        this.rect(ctx,10,8,5,1,'#F0F0FF',s);
        this.rect(ctx,10,9,5,1,'#F0F0FF',s);
        this.rect(ctx,10,10,5,1,'#F0F0FF',s);
        this.rect(ctx,11,11,3,1,'#F0F0FF',s);
        this.rect(ctx,13,7,1,1,'#FFF',s);
        this.rect(ctx,14,8,1,1,'#FFF',s);
        this.rect(ctx,14,9,1,1,'#FFF',s);
        this.rect(ctx,14,10,1,1,'#FFF',s);
        this.rect(ctx,13,11,1,1,'#FFF',s);
        this.rect(ctx,10,9,1,1,'#FFD700',s);
        this.rect(ctx,0,7,12,1,'#FFF',s);
        this.rect(ctx,1,8,10,1,'#E0E0FF',s);
    },
    _zySkill2(ctx, s) {
        // 银光乱舞：水平突刺残影
        for (let x=4;x<=9;x++) this.rect(ctx,x,9,1,1,'#2F2F2F',s);
        this.rect(ctx,4,7,8,1,'#E0E0FF',s);
        this.rect(ctx,4,8,8,1,'#E0E0FF',s);
        this.rect(ctx,4,11,8,1,'#E0E0FF',s);
        this.rect(ctx,4,12,8,1,'#E0E0FF',s);
        this.rect(ctx,0,6,12,1,'#FFF',s);
        this.rect(ctx,0,9,12,1,'#E0E0FF',s);
    },
    _zySkill3(ctx, s) {
        // 银光终结：全力前刺，银光大盛
        for (let x=5;x<=12;x++) this.rect(ctx,x,9,1,1,'#2F2F2F',s);
        this.rect(ctx,12,8,1,1,'#FF0000',s);
        this.rect(ctx,12,10,1,1,'#FF0000',s);
        this.rect(ctx,15,5,1,1,'#FFF',s);
        this.rect(ctx,13,6,3,1,'#F0F0FF',s);
        this.rect(ctx,11,7,5,1,'#F0F0FF',s);
        this.rect(ctx,13,8,3,1,'#F0F0FF',s);
        this.rect(ctx,10,9,6,1,'#F0F0FF',s);
        this.rect(ctx,13,10,3,1,'#F0F0FF',s);
        this.rect(ctx,11,11,5,1,'#F0F0FF',s);
        this.rect(ctx,13,12,3,1,'#F0F0FF',s);
        this.rect(ctx,15,13,1,1,'#FFF',s);
        this.rect(ctx,0,6,12,1,'#FFF',s);
        this.rect(ctx,0,11,12,1,'#C0C0C0',s);
    },
    _zyDefend(ctx, s) {
        // 亮银枪竖挡右侧 — 长杆来挡，不遮人物
        for (let r=3;r<=8;r++) this.rect(ctx,10,r,1,1,'#2F2F2F',s);
        this.rect(ctx,11,1,2,1,'#F0F0FF',s);
        this.rect(ctx,10,2,3,1,'#F0F0FF',s);
        this.rect(ctx,10,0,1,1,'#FFF',s);
        this.rect(ctx,11,0,1,1,'#FFD700',s);
    },

    zhaoYun() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'idle'); t._zySpearIdle(ctx,s); },
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'idle'); t._zySpearIdle(ctx,s); },
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'w1'); t._zySpearIdle(ctx,s); },
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'w2'); t._zySpearIdle(ctx,s); },
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'idle'); t._zyAtkWindup(ctx,s); },
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'idle'); t._zyAtkStrike(ctx,s); },
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'idle'); t._zySkill1(ctx,s); },
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'idle'); t._zySkill2(ctx,s); },
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'idle'); t._zySkill3(ctx,s); },
                (ctx,s) => { t._zy(ctx,s); t._zyLegs(ctx,s,'idle'); t._zyDefend(ctx,s); },
            ]
        });
    },

    // ========== 诸葛亮身体模板 ==========
    _zgl(ctx, s) {
        this.row(ctx,3,0,[null,null,null,'#87CEEB','#E8E8E8','#87CEEB',null,null,null],s);
        this.row(ctx,2,1,[null,null,'#87CEEB','#E8E8E8','#FFF','#E8E8E8','#87CEEB',null,null],s);
        this.row(ctx,3,2,[null,null,null,'#FFDAB9','#FFDAB9','#FFDAB9','#FFDAB9','#FFDAB9',null,null],s);
        this.row(ctx,3,3,[null,null,null,'#FFDAB9','#000','#FFDAB9','#000','#FFDAB9',null,null],s);
        this.row(ctx,3,4,[null,null,null,'#FFDAB9','#E8A0A0','#FFDAB9','#FFDAB9','#FFDAB9',null,null],s);
        this.row(ctx,3,5,[null,null,null,'#FFDAB9','#87CEEB','#87CEEB','#FFDAB9',null,null],s);
        this.row(ctx,2,6,[null,null,'#87CEEB','#B0E0E6','#87CEEB','#87CEEB','#B0E0E6','#87CEEB',null,null],s);
        this.row(ctx,2,7,[null,null,'#87CEEB','#B0E0E6','#87CEEB','#87CEEB','#B0E0E6','#87CEEB',null,null],s);
        this.row(ctx,2,8,[null,null,'#B0E0E6','#87CEEB','#87CEEB','#87CEEB','#87CEEB','#B0E0E6',null,null],s);
        this.row(ctx,2,9,[null,null,'#B0E0E6','#87CEEB','#FFD700','#FFD700','#87CEEB','#B0E0E6',null,null],s);
        this.row(ctx,2,10,[null,null,'#87CEEB','#B0E0E6','#87CEEB','#87CEEB','#B0E0E6','#87CEEB',null,null],s);
        this.row(ctx,2,11,[null,null,'#87CEEB','#B0E0E6','#87CEEB','#87CEEB','#B0E0E6','#87CEEB',null,null],s);
        this.row(ctx,3,12,[null,null,null,'#87CEEB','#B0E0E6','#B0E0E6','#87CEEB',null,null,null],s);
    },
    _zglLegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,13,[null,null,null,'#87CEEB','#87CEEB',null,null,'#87CEEB','#87CEEB',null,null],s);
            this.row(ctx,2,14,[null,null,'#87CEEB',null,null,null,null,null,'#87CEEB',null,null],s);
            this.row(ctx,2,15,[null,null,'#6B8E9E',null,null,null,null,null,'#6B8E9E',null,null],s);
            this.row(ctx,2,16,[null,null,'#8B4513','#8B4513',null,null,null,null,'#8B4513',null,null],s);
            this.row(ctx,2,17,[null,null,'#654321','#654321',null,null,null,null,'#654321',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,13,[null,null,null,'#87CEEB','#87CEEB',null,'#87CEEB','#87CEEB',null,null],s);
            this.row(ctx,3,14,[null,null,null,null,'#87CEEB',null,'#87CEEB',null,null,null],s);
            this.row(ctx,3,15,[null,null,null,null,'#6B8E9E',null,'#6B8E9E',null,null,null],s);
            this.row(ctx,2,16,[null,null,null,'#8B4513','#8B4513',null,'#8B4513',null,null,null],s);
            this.row(ctx,2,17,[null,null,null,'#654321','#654321',null,'#654321',null,null,null],s);
        } else {
            this.row(ctx,3,13,[null,null,null,'#87CEEB','#87CEEB',null,'#87CEEB','#87CEEB',null,null],s);
            this.row(ctx,3,14,[null,null,null,'#87CEEB',null,null,null,'#87CEEB',null,null],s);
            this.row(ctx,3,15,[null,null,null,'#6B8E9E',null,null,null,'#6B8E9E',null,null],s);
            this.row(ctx,3,16,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
            this.row(ctx,3,17,[null,null,null,'#654321','#654321',null,'#654321','#654321',null,null],s);
        }
    },
    _zglFanIdle(ctx, s) {
        this.rect(ctx,9,4,2,1,'#FFF5EE',s);
        this.rect(ctx,8,5,4,1,'#FFF5EE',s);
        this.rect(ctx,7,6,5,1,'#E8D8C8',s);
        this.rect(ctx,7,7,5,1,'#FFF5EE',s);
        this.rect(ctx,8,8,3,1,'#FFF5EE',s);
        this.rect(ctx,9,5,1,1,'#D2B48C',s);
        this.rect(ctx,8,6,1,1,'#D2B48C',s);
        this.rect(ctx,10,6,1,1,'#D2B48C',s);
        this.rect(ctx,9,8,1,1,'#8B4513',s);
    },
    _zglAtkWindup(ctx, s) {
        this.rect(ctx,11,2,3,1,'#FFF5EE',s);
        this.rect(ctx,9,3,6,1,'#FFF5EE',s);
        this.rect(ctx,8,4,8,1,'#FFF5EE',s);
        this.rect(ctx,7,5,9,1,'#E8D8C8',s);
        this.rect(ctx,7,6,9,1,'#FFF5EE',s);
        this.rect(ctx,8,7,7,1,'#FFF5EE',s);
        this.rect(ctx,9,8,5,1,'#FFF5EE',s);
        for (let x=8;x<=13;x+=2) this.rect(ctx,x,4,1,3,'#D2B48C',s);
        this.rect(ctx,9,8,1,1,'#8B4513',s);
        this.rect(ctx,12,1,3,1,'#E0F0FF',s);
        this.rect(ctx,14,3,1,1,'#E0F0FF',s);
        this.rect(ctx,14,7,1,1,'#E0F0FF',s);
    },
    _zglAtkStrike(ctx, s) {
        this.rect(ctx,12,2,3,1,'#FFF5EE',s);
        this.rect(ctx,10,3,6,1,'#FFF5EE',s);
        this.rect(ctx,9,4,8,1,'#FFF5EE',s);
        this.rect(ctx,8,5,9,1,'#E8D8C8',s);
        this.rect(ctx,8,6,9,1,'#FFF5EE',s);
        this.rect(ctx,9,7,7,1,'#FFF5EE',s);
        this.rect(ctx,10,8,5,1,'#FFF5EE',s);
        for (let x=9;x<=14;x+=2) this.rect(ctx,x,4,1,3,'#D2B48C',s);
        this.rect(ctx,10,8,1,1,'#8B4513',s);
        this.rect(ctx,13,1,3,1,'#E0F0FF',s);
        this.rect(ctx,15,3,1,1,'#E0F0FF',s);
        this.rect(ctx,15,6,1,1,'#E0F0FF',s);
        this.rect(ctx,14,9,2,1,'#E0F0FF',s);
        this.rect(ctx,15,4,1,1,'#B0E0FF',s);
        this.rect(ctx,15,5,1,1,'#B0E0FF',s);
    },
    _zglSkill1(ctx, s) {
        this.rect(ctx,10,1,5,1,'#FFF5EE',s);
        this.rect(ctx,8,2,8,1,'#FFF5EE',s);
        this.rect(ctx,7,3,10,1,'#FFF5EE',s);
        this.rect(ctx,6,4,11,1,'#E8D8C8',s);
        this.rect(ctx,6,5,11,1,'#FFF5EE',s);
        this.rect(ctx,7,6,9,1,'#FFF5EE',s);
        this.rect(ctx,8,7,7,1,'#FFF5EE',s);
        this.rect(ctx,10,8,3,1,'#8B4513',s);
        for (let x=7;x<=15;x+=2) this.rect(ctx,x,3,1,3,'#D2B48C',s);
        this.rect(ctx,12,0,4,1,'#E0F0FF',s);
        this.rect(ctx,15,2,1,3,'#B0E0FF',s);
        this.rect(ctx,14,6,2,1,'#E0F0FF',s);
        this.rect(ctx,6,7,2,1,'#E0F0FF',s);
    },
    _zglSkill2(ctx, s) {
        this.rect(ctx,12,2,3,1,'#FFF5EE',s);
        this.rect(ctx,10,3,6,1,'#FFF5EE',s);
        this.rect(ctx,9,4,8,1,'#FFF5EE',s);
        this.rect(ctx,8,5,9,1,'#E8D8C8',s);
        this.rect(ctx,8,6,9,1,'#FFF5EE',s);
        this.rect(ctx,9,7,7,1,'#FFF5EE',s);
        this.rect(ctx,10,8,5,1,'#FFF5EE',s);
        this.rect(ctx,0,4,4,1,'#B0E0FF',s);
        this.rect(ctx,0,6,4,1,'#B0E0FF',s);
        this.rect(ctx,0,8,4,1,'#B0E0FF',s);
        this.rect(ctx,0,0,16,1,'#E0F0FF',s);
    },
    _zglSkill3(ctx, s) {
        this.rect(ctx,10,1,5,1,'#FFF5EE',s);
        this.rect(ctx,8,2,8,1,'#FFF5EE',s);
        this.rect(ctx,7,3,10,1,'#FFF5EE',s);
        this.rect(ctx,6,4,11,1,'#E8D8C8',s);
        this.rect(ctx,6,5,11,1,'#FFF5EE',s);
        this.rect(ctx,7,6,10,1,'#FFF5EE',s);
        this.rect(ctx,9,7,7,1,'#FFF5EE',s);
        this.rect(ctx,0,1,16,2,'#E0F0FF',s);
        this.rect(ctx,0,4,16,1,'#B0E0FF',s);
        this.rect(ctx,0,7,16,2,'#E0F0FF',s);
        this.rect(ctx,0,10,16,1,'#B0E0FF',s);
    },
    _zglDefend(ctx, s) {
        this.rect(ctx,8,4,4,1,'#FFF5EE',s);
        this.rect(ctx,7,5,6,1,'#FFF5EE',s);
        this.rect(ctx,7,6,6,1,'#E8D8C8',s);
        this.rect(ctx,8,7,4,1,'#FFF5EE',s);
        this.rect(ctx,7,5,1,1,'#D2B48C',s);
        this.rect(ctx,12,5,1,3,'#D2B48C',s);
        this.rect(ctx,8,8,2,1,'#8B4513',s);
    },

    zhugeLiang() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'idle'); t._zglFanIdle(ctx,s); },
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'idle'); t._zglFanIdle(ctx,s); },
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'w1'); t._zglFanIdle(ctx,s); },
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'w2'); t._zglFanIdle(ctx,s); },
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'idle'); t._zglAtkWindup(ctx,s); },
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'idle'); t._zglAtkStrike(ctx,s); },
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'idle'); t._zglSkill1(ctx,s); },
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'idle'); t._zglSkill2(ctx,s); },
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'idle'); t._zglSkill3(ctx,s); },
                (ctx,s) => { t._zgl(ctx,s); t._zglLegs(ctx,s,'idle'); t._zglDefend(ctx,s); },
            ]
        });
    },

    // ========== 第二关敌人（博望坡） ==========
    // 黄巾精英兵
    _hjEliteBody(ctx, s, fc) {
        this.row(ctx,2,0,[null,null,'#FF8C00','#FFD700','#FF4500','#FFD700','#FF8C00',null,null],s);
        this.row(ctx,2,1,[null,null,'#FFD700','#FF8C00','#FFD700','#FF8C00','#FFD700',null,null],s);
        this.row(ctx,3,2,[null,null,null,'#C68000','#C68000','#C68000','#C68000',null,null,null],s);
        this.row(ctx,4,3,[null,null,null,null,fc,fc,fc,fc,null,null],s);
        this.row(ctx,4,4,[null,null,null,null,fc,'#222','#222',fc,null,null],s);
        this.row(ctx,4,5,[null,null,null,null,fc,fc,fc,fc,null,null],s);
        this.row(ctx,2,6,[null,null,'#FF4500','#FF8C00','#FFD700','#FFD700','#FF8C00','#FF4500',null,null],s);
        this.row(ctx,2,7,[null,null,'#CC3700','#FF4500','#CC3700','#CC3700','#FF4500','#CC3700',null,null],s);
        this.row(ctx,3,8,[null,null,null,'#CC3700','#CC3700','#CC3700','#CC3700',null,null,null],s);
    },
    _hjEliteLegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,9,[null,null,null,'#8B4513','#8B4513',null,null,'#8B4513','#8B4513',null,null],s);
            this.row(ctx,3,10,[null,null,null,'#8B4513',null,null,null,null,'#8B4513',null,null],s);
            this.row(ctx,2,11,[null,null,'#FF8C00',null,null,null,null,null,'#FF8C00',null,null],s);
            this.row(ctx,2,12,[null,null,'#654321','#654321',null,null,null,null,'#654321',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,9,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
            this.row(ctx,3,10,[null,null,null,null,'#8B4513',null,'#8B4513',null,null,null],s);
            this.row(ctx,2,11,[null,null,null,'#FF8C00',null,null,'#FF8C00',null,null,null],s);
            this.row(ctx,2,12,[null,null,null,'#654321','#654321',null,'#654321',null,null,null],s);
        } else {
            this.row(ctx,3,9,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
            this.row(ctx,3,10,[null,null,null,'#8B4513',null,null,null,'#8B4513',null,null],s);
            this.row(ctx,3,11,[null,null,null,'#FF8C00','#FF8C00',null,'#FF8C00','#FF8C00',null,null],s);
            this.row(ctx,3,12,[null,null,null,'#654321','#654321',null,'#654321','#654321',null,null],s);
        }
    },
    _hjEliteWeapon(ctx, s, atk) {
        if (atk) {
            // 大斧劈砍
            this.rect(ctx,11,2,3,1,'#C0C0C0',s);
            this.rect(ctx,10,3,4,1,'#C0C0C0',s);
            this.rect(ctx,9,4,4,1,'#A0A0A0',s);
            this.rect(ctx,8,5,3,1,'#8B4513',s);
        } else {
            // 大斧待机
            this.rect(ctx,9,2,2,1,'#C0C0C0',s);
            this.rect(ctx,8,3,3,1,'#C0C0C0',s);
            this.rect(ctx,8,4,3,1,'#A0A0A0',s);
            this.rect(ctx,9,5,2,1,'#8B4513',s);
        }
    },
    huangjinElite() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._hjEliteBody(ctx,s,'#D2691E'); t._hjEliteLegs(ctx,s,'idle'); t._hjEliteWeapon(ctx,s,0); },
                (ctx,s) => { t._hjEliteBody(ctx,s,'#D2691E'); t._hjEliteLegs(ctx,s,'idle'); },
                (ctx,s) => { t._hjEliteBody(ctx,s,'#D2691E'); t._hjEliteLegs(ctx,s,'w1'); t._hjEliteWeapon(ctx,s,0); },
                (ctx,s) => { t._hjEliteBody(ctx,s,'#D2691E'); t._hjEliteLegs(ctx,s,'idle'); t._hjEliteWeapon(ctx,s,1); },
            ]
        });
    },

    // 黄巾火术士
    _fmBody(ctx, s, fc) {
        this.row(ctx,3,0,[null,null,null,'#8B0000','#A00000','#A00000','#8B0000',null,null,null],s);
        this.row(ctx,2,1,[null,null,'#8B0000','#A00000','#000','#000','#A00000','#8B0000',null,null],s);
        this.row(ctx,3,2,[null,null,null,'#A00000','#800000','#800000','#A00000',null,null,null],s);
        this.row(ctx,4,3,[null,null,null,null,fc,fc,fc,fc,null,null],s);
        this.row(ctx,4,4,[null,null,null,null,fc,'#FF0','#FF0',fc,null,null],s);
        this.row(ctx,4,5,[null,null,null,null,fc,fc,fc,fc,null,null],s);
        this.row(ctx,2,6,[null,null,'#8B0000','#A00000','#8B0000','#8B0000','#A00000','#8B0000',null,null],s);
        this.row(ctx,2,7,[null,null,'#A00000','#FF4500','#8B0000','#8B0000','#FF4500','#A00000',null,null],s);
        this.row(ctx,2,8,[null,null,'#A00000','#8B0000','#8B0000','#8B0000','#8B0000','#A00000',null,null],s);
        this.row(ctx,3,9,[null,null,null,'#A00000','#8B0000','#8B0000','#A00000',null,null,null],s);
    },
    _fmLegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,10,[null,null,null,'#8B0000','#8B0000',null,null,'#8B0000','#8B0000',null,null],s);
            this.row(ctx,3,11,[null,null,null,'#8B0000',null,null,null,null,'#8B0000',null,null],s);
            this.row(ctx,2,12,[null,null,'#8B0000',null,null,null,null,null,'#8B0000',null,null],s);
            this.row(ctx,2,13,[null,null,'#654321','#654321',null,null,null,null,'#654321',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,10,[null,null,null,'#8B0000','#8B0000',null,'#8B0000','#8B0000',null,null],s);
            this.row(ctx,3,11,[null,null,null,null,'#8B0000',null,'#8B0000',null,null,null],s);
            this.row(ctx,2,12,[null,null,null,'#8B0000',null,null,'#8B0000',null,null,null],s);
            this.row(ctx,2,13,[null,null,null,'#654321','#654321',null,'#654321',null,null,null],s);
        } else {
            this.row(ctx,3,10,[null,null,null,'#8B0000','#8B0000',null,'#8B0000','#8B0000',null,null],s);
            this.row(ctx,3,11,[null,null,null,'#8B0000',null,null,null,'#8B0000',null,null],s);
            this.row(ctx,3,12,[null,null,null,'#8B0000','#8B0000',null,'#8B0000','#8B0000',null,null],s);
            this.row(ctx,3,13,[null,null,null,'#654321','#654321',null,'#654321','#654321',null,null],s);
        }
    },
    _fmStaff(ctx, s, atk) {
        if (atk) {
            // 法杖高举，火焰聚集
            this.rect(ctx,11,0,2,1,'#8B4513',s);
            this.rect(ctx,10,1,2,1,'#8B4513',s);
            this.rect(ctx,9,2,2,1,'#8B4513',s);
            this.rect(ctx,10,3,1,1,'#8B4513',s);
            // 火焰
            this.rect(ctx,9,0,5,1,'#FF4500',s);
            this.rect(ctx,10,-1,3,1,'#FFD700',s);
        } else {
            // 法杖斜持
            this.rect(ctx,10,2,2,1,'#8B4513',s);
            this.rect(ctx,11,3,2,1,'#8B4513',s);
            this.rect(ctx,7,5,3,1,'#8B4513',s);
            this.rect(ctx,8,6,2,1,'#8B4513',s);
            // 火焰微光
            this.rect(ctx,11,1,2,1,'#FF4500',s);
            this.rect(ctx,12,2,1,1,'#FFD700',s);
        }
    },
    huangjinFireMage() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._fmBody(ctx,s,'#D2691E'); t._fmLegs(ctx,s,'idle'); t._fmStaff(ctx,s,0); },
                (ctx,s) => { t._fmBody(ctx,s,'#D2691E'); t._fmLegs(ctx,s,'idle'); t._fmStaff(ctx,s,0); },
                (ctx,s) => { t._fmBody(ctx,s,'#D2691E'); t._fmLegs(ctx,s,'w1'); t._fmStaff(ctx,s,0); },
                (ctx,s) => { t._fmBody(ctx,s,'#D2691E'); t._fmLegs(ctx,s,'idle'); t._fmStaff(ctx,s,1); },
            ]
        });
    },

    // 黄巾骑兵
    _cvBody(ctx, s, fc) {
        // Rider upper body
        this.row(ctx,3,1,[null,null,null,'#DAA520','#FFD700','#DAA520','#DAA520',null,null,null],s);
        this.row(ctx,4,2,[null,null,null,null,fc,fc,'#000','#000',fc,null,null],s);
        this.row(ctx,4,3,[null,null,null,null,fc,fc,fc,fc,fc,null,null],s);
        this.row(ctx,3,4,[null,null,null,'#DAA520','#DAA520','#DAA520','#FFD700','#DAA520',null,null],s);
        // Horse body
        this.row(ctx,2,5,[null,null,'#8B4513','#A0522D','#8B4513','#8B4513','#A0522D','#8B4513',null,null],s);
        this.row(ctx,2,6,[null,null,'#8B4513','#A0522D','#8B4513','#8B4513','#A0522D','#8B4513',null,null],s);
        this.row(ctx,2,7,[null,null,'#A0522D','#8B4513','#8B4513','#8B4513','#8B4513','#A0522D',null,null],s);
        this.row(ctx,3,8,[null,null,null,'#8B4513','#A0522D','#A0522D','#8B4513',null,null,null],s);
    },
    _cvLegs(ctx, s, type) {
        if (type === 'w1') {
            // Horse legs trot
            this.row(ctx,3,9,[null,null,null,'#654321','#654321',null,null,'#654321','#654321',null,null],s);
            this.row(ctx,2,10,[null,null,'#654321',null,null,null,null,null,'#654321',null,null],s);
            this.row(ctx,3,11,[null,null,null,null,null,'#654321','#654321',null,null,null],s);
            this.row(ctx,2,12,[null,null,null,null,null,null,null,'#654321',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,9,[null,null,null,'#654321','#654321',null,'#654321','#654321',null,null],s);
            this.row(ctx,3,10,[null,null,null,null,'#654321',null,'#654321',null,null,null],s);
            this.row(ctx,2,11,[null,null,'#654321',null,null,null,null,'#654321',null,null],s);
            this.row(ctx,3,12,[null,null,null,'#654321',null,null,null,null,null,null],s);
        } else {
            this.row(ctx,3,9,[null,null,null,'#654321','#654321',null,'#654321','#654321',null,null],s);
            this.row(ctx,3,10,[null,null,null,'#654321',null,null,null,'#654321',null,null],s);
            this.row(ctx,3,11,[null,null,null,null,'#654321','#654321',null,null,null,null],s);
            this.row(ctx,3,12,[null,null,null,null,null,'#654321','#654321',null,null,null],s);
        }
    },
    _cvWeapon(ctx, s, atk) {
        if (atk) {
            // 骑兵冲锋枪
            this.rect(ctx,13,2,2,1,'#C0C0C0',s);
            this.rect(ctx,11,3,4,1,'#C0C0C0',s);
            this.rect(ctx,10,4,4,1,'#8B4513',s);
        } else {
            this.rect(ctx,11,3,3,1,'#C0C0C0',s);
            this.rect(ctx,10,4,3,1,'#8B4513',s);
        }
    },
    huangjinCavalry() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._cvBody(ctx,s,'#D2691E'); t._cvLegs(ctx,s,'idle'); t._cvWeapon(ctx,s,0); },
                (ctx,s) => { t._cvBody(ctx,s,'#D2691E'); t._cvLegs(ctx,s,'idle'); },
                (ctx,s) => { t._cvBody(ctx,s,'#D2691E'); t._cvLegs(ctx,s,'w1'); t._cvWeapon(ctx,s,0); },
                (ctx,s) => { t._cvBody(ctx,s,'#D2691E'); t._cvLegs(ctx,s,'idle'); t._cvWeapon(ctx,s,1); },
            ]
        });
    },

    // ========== BOSS 张宝（第二关） ==========
    _zbBody(ctx, s, fc) {
        this.row(ctx,3,0,[null,null,null,'#006400','#008000','#006400','#006400',null,null,null],s);
        this.row(ctx,2,1,[null,null,'#006400','#008000','#FFD700','#008000','#006400',null,null],s);
        this.row(ctx,2,2,[null,null,'#008000','#FFD700','#FFD700','#FFD700','#008000',null,null],s);
        this.row(ctx,3,3,[null,null,null,fc,fc,fc,fc,null,null],s);
        this.row(ctx,3,4,[null,null,null,fc,'#FF0',fc,'#FF0',fc,null,null],s);
        this.row(ctx,3,5,[null,null,null,fc,fc,fc,fc,null,null],s);
        this.row(ctx,2,6,[null,null,'#006400','#008000','#006400','#006400','#008000','#006400',null,null],s);
        this.row(ctx,2,7,[null,null,'#006400','#008000','#FFD700','#FFD700','#008000','#006400',null,null],s);
        this.row(ctx,2,8,[null,null,'#008000','#006400','#008000','#008000','#006400','#008000',null,null],s);
        this.row(ctx,2,9,[null,null,'#006400','#008000','#006400','#006400','#008000','#006400',null,null],s);
        this.row(ctx,2,10,[null,null,'#006400','#008000','#FFD700','#FFD700','#008000','#006400',null,null],s);
        this.row(ctx,3,11,[null,null,null,'#006400','#008000','#008000','#006400',null,null,null],s);
    },
    _zbLegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,12,[null,null,null,'#006400','#006400',null,null,'#006400','#006400',null,null],s);
            this.row(ctx,2,13,[null,null,'#006400',null,null,null,null,null,'#006400',null,null],s);
            this.row(ctx,2,14,[null,null,'#004400',null,null,null,null,null,'#004400',null,null],s);
            this.row(ctx,2,15,[null,null,'#8B4513','#8B4513',null,null,null,null,'#8B4513',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,12,[null,null,null,'#006400','#006400',null,'#006400','#006400',null,null],s);
            this.row(ctx,3,13,[null,null,null,null,'#006400',null,'#006400',null,null,null],s);
            this.row(ctx,2,14,[null,null,null,'#004400',null,null,'#004400',null,null,null],s);
            this.row(ctx,2,15,[null,null,null,'#8B4513','#8B4513',null,'#8B4513',null,null,null],s);
        } else {
            this.row(ctx,3,12,[null,null,null,'#006400','#006400',null,'#006400','#006400',null,null],s);
            this.row(ctx,3,13,[null,null,null,'#006400',null,null,null,'#006400',null,null],s);
            this.row(ctx,3,14,[null,null,null,'#004400','#004400',null,'#004400','#004400',null,null],s);
            this.row(ctx,3,15,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
        }
    },
    _zbWeapon(ctx, s, type) {
        if (type === 'atk') {
            // 火符攻击 - 火焰爆发
            this.rect(ctx,10,2,2,1,'#FF4500',s);
            this.rect(ctx,9,3,4,1,'#FF4500',s);
            this.rect(ctx,10,4,3,1,'#FFD700',s);
            this.rect(ctx,8,0,6,2,'#FF4500',s);
            this.rect(ctx,9,-1,4,1,'#FFD700',s);
        } else if (type === 'skill') {
            // 风符 - 旋风
            this.rect(ctx,2,2,4,1,'#E0F0FF',s);
            this.rect(ctx,1,3,6,1,'#B0E0FF',s);
            this.rect(ctx,0,4,8,1,'#E0F0FF',s);
            this.rect(ctx,2,5,4,1,'#B0E0FF',s);
        } else {
            // 拂尘待机
            this.rect(ctx,9,2,2,1,'#8B4513',s);
            this.rect(ctx,10,3,1,1,'#8B4513',s);
            this.rect(ctx,8,4,3,1,'#FFF5EE',s);
            this.rect(ctx,7,5,4,1,'#FFF5EE',s);
            this.rect(ctx,8,6,2,1,'#FFF5EE',s);
        }
    },
    zhangBao() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._zbBody(ctx,s,'#D2691E'); t._zbLegs(ctx,s,'idle'); t._zbWeapon(ctx,s,'idle'); },
                (ctx,s) => { t._zbBody(ctx,s,'#D2691E'); },
                (ctx,s) => { t._zbBody(ctx,s,'#D2691E'); t._zbLegs(ctx,s,'w1'); t._zbWeapon(ctx,s,'idle'); },
                (ctx,s) => { t._zbBody(ctx,s,'#800000'); t._zbLegs(ctx,s,'idle'); t._zbWeapon(ctx,s,'atk'); },
                (ctx,s) => { t._zbBody(ctx,s,'#FF0'); t._zbLegs(ctx,s,'idle'); t._zbWeapon(ctx,s,'skill');
                    this.rect(ctx,0,0,16,1,'#E0F0FF',s);
                    this.rect(ctx,0,15,16,1,'#B0E0FF',s); },
                (ctx,s) => { t._zbBody(ctx,s,'#800000'); },
            ]
        });
    },

    // ========== 敌人身体模板 ==========
    _hjBody(ctx, s, faceColor) {
        this.row(ctx,3,1,[null,null,null,'#DAA520','#FFD700','#DAA520','#FFD700','#DAA520',null,null],s);
        this.row(ctx,2,2,[null,null,'#DAA520','#FFD700','#FFD700','#FFD700','#FFD700','#DAA520','#DAA520',null],s);
        this.row(ctx,4,3,[null,null,null,null,faceColor,faceColor,faceColor,faceColor,null,null],s);
        this.row(ctx,4,4,[null,null,null,null,faceColor,'#222','#222',faceColor,null,null],s);
        this.row(ctx,4,5,[null,null,null,null,faceColor,faceColor,faceColor,faceColor,null,null],s);
        this.row(ctx,3,6,[null,null,null,'#DAA520','#B8860B','#DAA520','#B8860B','#DAA520',null,null],s);
        this.row(ctx,3,7,[null,null,null,'#DAA520','#DAA520','#DAA520','#DAA520','#DAA520',null,null],s);
        this.row(ctx,3,8,[null,null,null,'#B8860B','#DAA520','#DAA520','#DAA520','#B8860B',null,null],s);
    },
    _hjLegs(ctx, s, type, bootColor) {
        if (type === 'w1') {
            this.row(ctx,4,9,[null,null,null,null,bootColor,bootColor,null,null,bootColor,bootColor,null],s);
            this.row(ctx,3,10,[null,null,null,bootColor,null,null,null,null,null,bootColor,null],s);
            this.row(ctx,3,11,[null,null,null,'#654321','#654321',null,null,null,'#654321',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,4,9,[null,null,null,null,bootColor,bootColor,null,bootColor,bootColor,null,null],s);
            this.row(ctx,4,10,[null,null,null,null,null,bootColor,null,bootColor,null,null,null],s);
            this.row(ctx,3,11,[null,null,null,null,'#654321','#654321',null,'#654321',null,null,null],s);
        } else {
            this.row(ctx,4,9,[null,null,null,null,bootColor,bootColor,null,bootColor,bootColor,null,null],s);
            this.row(ctx,4,10,[null,null,null,null,bootColor,null,null,null,bootColor,null,null],s);
            this.row(ctx,4,11,[null,null,null,null,'#654321','#654321',null,'#654321','#654321',null,null],s);
        }
    },

    // 黄巾兵
    huangjinSoldier() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._hjBody(ctx,s,'#D2691E'); t._hjLegs(ctx,s,'idle','#8B4513');
                    this.row(ctx,10,4,[null,null,'#808080',null,null,null,null,null,null,null,null,null],s);
                    this.row(ctx,10,5,[null,null,'#A0A0A0',null,null,null,null,null,null,null,null,null],s);
                    this.row(ctx,10,6,[null,null,'#808080','#8B4513',null,null,null,null,null,null,null,null],s);
                    this.row(ctx,10,7,[null,null,null,'#8B4513',null,null,null,null,null,null,null,null],s);
                },
                (ctx,s) => { t._hjBody(ctx,s,'#D2691E'); t._hjLegs(ctx,s,'w1','#8B4513'); },
                (ctx,s) => { t._hjBody(ctx,s,'#D2691E'); t._hjLegs(ctx,s,'w2','#8B4513'); },
                (ctx,s) => { t._hjBody(ctx,s,'#D2691E'); t._hjLegs(ctx,s,'idle','#8B4513');
                    this.rect(ctx,8,4,3,1,'#808080',s);
                    this.rect(ctx,9,5,2,1,'#A0A0A0',s);
                    this.rect(ctx,8,6,3,1,'#8B4513',s);
                },
            ]
        });
    },

    // 黄巾弓箭手
    huangjinArcher() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._hjBody(ctx,s,'#A0522D'); t._hjLegs(ctx,s,'idle','#654321');
                    for (let r=2;r<=6;r+=2) this.row(ctx,10,r,[null,'#8B4513',null,null,null,null,null,null,null,null,null,null],s);
                    for (let r=3;r<=5;r+=2) this.row(ctx,10,r,[null,null,'#8B4513',null,null,null,null,null,null,null,null,null],s);
                },
                (ctx,s) => { t._hjBody(ctx,s,'#A0522D'); t._hjLegs(ctx,s,'w1','#654321'); },
                (ctx,s) => { t._hjBody(ctx,s,'#A0522D'); t._hjLegs(ctx,s,'w2','#654321'); },
                (ctx,s) => { t._hjBody(ctx,s,'#A0522D'); t._hjLegs(ctx,s,'idle','#654321');
                    for (let r=2;r<=6;r+=2) this.row(ctx,10,r,[null,'#8B4513',null,null,null,null,null,null,null,null,null,null],s);
                    for (let r=3;r<=5;r+=2) this.row(ctx,10,r,[null,null,'#8B4513','#FFF',null,null,null,null,null,null,null,null],s);
                },
            ]
        });
    },

    // 黄巾刀盾兵
    huangjinShield() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._hjBody(ctx,s,'#D2691E'); t._hjLegs(ctx,s,'idle','#8B4513');
                    this.rect(ctx,0,5,3,4,'#8B4513',s);
                    this.rect(ctx,1,6,1,2,'#FFD700',s);
                    this.row(ctx,10,4,[null,null,'#808080',null,null,null,null,null,null,null,null,null],s);
                    this.row(ctx,10,5,[null,null,'#A0A0A0',null,null,null,null,null,null,null,null,null],s);
                },
                (ctx,s) => { t._hjBody(ctx,s,'#D2691E'); t._hjLegs(ctx,s,'w1','#8B4513'); },
                (ctx,s) => { t._hjBody(ctx,s,'#D2691E'); t._hjLegs(ctx,s,'w2','#8B4513'); },
                (ctx,s) => { t._hjBody(ctx,s,'#D2691E'); t._hjLegs(ctx,s,'idle','#8B4513');
                    this.rect(ctx,0,4,4,4,'#8B4513',s);
                    this.rect(ctx,1,5,2,2,'#FFD700',s);
                },
            ]
        });
    },

    // 黄巾长矛兵
    huangjinSpear() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._hjBody(ctx,s,'#A0522D'); t._hjLegs(ctx,s,'idle','#8B4513');
                    this.rect(ctx,9,1,2,1,'#C0C0C0',s);
                    for (let r=2;r<=8;r++) this.row(ctx,10,r,[null,null,'#8B4513',null,null,null,null,null,null,null,null,null],s);
                },
                (ctx,s) => { t._hjBody(ctx,s,'#A0522D'); t._hjLegs(ctx,s,'w1','#8B4513'); },
                (ctx,s) => { t._hjBody(ctx,s,'#A0522D'); t._hjLegs(ctx,s,'w2','#8B4513'); },
                (ctx,s) => { t._hjBody(ctx,s,'#A0522D'); t._hjLegs(ctx,s,'idle','#8B4513');
                    this.rect(ctx,8,3,4,1,'#C0C0C0',s);
                    this.rect(ctx,9,4,3,1,'#8B4513',s);
                    this.rect(ctx,9,5,2,1,'#8B4513',s);
                },
            ]
        });
    },

    // ========== BOSS 张角身体模板 ==========
    _zjBody(ctx, s, faceEyeColor) {
        this.row(ctx,4,0,[null,null,null,null,null,'#FFD700','#FFD700',null,null,null,null,null],s);
        this.row(ctx,3,1,[null,null,null,null,'#FFD700','#FFA500','#FFD700','#FFA500',null,null,null],s);
        this.row(ctx,3,2,[null,null,null,null,'#FFA500','#FFD700','#FFA500','#FFD700','#FFA500',null],s);
        this.row(ctx,3,3,[null,null,null,'#FFE4C4','#FFE4C4','#FFE4C4','#FFE4C4','#FFE4C4',null,null],s);
        this.row(ctx,3,4,[null,null,null,'#FFE4C4',faceEyeColor,'#FFE4C4',faceEyeColor,'#FFE4C4',null,null],s);
        this.row(ctx,3,5,[null,null,null,'#FFE4C4','#800000','#FFE4C4','#800000','#FFE4C4',null,null],s);
        this.row(ctx,2,6,[null,null,'#FFD700','#FFA500','#FFD700','#FFD700','#FFA500','#FFD700',null,null],s);
        this.row(ctx,2,7,[null,null,'#FFD700','#F00','#FFD700','#FFD700','#F00','#FFD700',null,null],s);
        this.row(ctx,2,8,[null,null,'#FFD700','#FFA500','#FFD700','#FFD700','#FFA500','#FFD700',null,null],s);
        this.row(ctx,2,9,[null,null,'#FFA500','#FFD700','#FFA500','#FFA500','#FFD700','#FFA500',null,null],s);
        this.row(ctx,2,10,[null,null,'#FFD700','#FFA500','#FFD700','#FFD700','#FFA500','#FFD700',null,null],s);
        this.row(ctx,3,11,[null,null,null,'#FFD700','#FFA500','#FFA500','#FFA500','#FFD700',null,null],s);
        this.row(ctx,3,12,[null,null,null,'#FFD700','#FFD700',null,'#FFD700','#FFD700',null,null],s);
        this.row(ctx,3,13,[null,null,null,'#FFA500','#8B4513','#8B4513','#FFA500',null,null],s);
        this.row(ctx,3,14,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
    },
    _zjStaff(ctx, s) {
        this.rect(ctx,10,2,1,9,'#8B4513',s);
        this.row(ctx,10,2,[null,null,null,null,null,null,null,null,null,null,'#FF0','#F00'],s);
    },

    zhangJue() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => {
                    t._zjBody(ctx,s,'#F00');
                    t._zjStaff(ctx,s);
                },
                (ctx,s) => {
                    t._zjBody(ctx,s,'#F00');
                },
                (ctx,s) => {
                    t._zjBody(ctx,s,'#F00');
                    this.row(ctx,3,12,[null,null,null,null,'#FFD700','#FFD700',null,null,null,null],s);
                    this.row(ctx,2,13,[null,null,'#FFA500',null,null,null,null,null,'#FFA500',null,null],s);
                },
                (ctx,s) => {
                    t._zjBody(ctx,s,'#800000');
                    t._zjStaff(ctx,s);
                    this.rect(ctx,8,3,4,2,'#F00',s);
                    this.rect(ctx,9,2,2,4,'#FF0',s);
                },
                (ctx,s) => {
                    t._zjBody(ctx,s,'#FF0');
                    t._zjStaff(ctx,s);
                    this.rect(ctx,0,0,14,1,'#FF0',s);
                    this.rect(ctx,0,11,14,1,'#FF0',s);
                    this.rect(ctx,0,3,1,6,'#FFD700',s);
                },
                (ctx,s) => {
                    t._zjBody(ctx,s,'#800000');
                    this.row(ctx,3,3,[null,null,null,'#800000','#800000','#FFE4C4','#800000','#800000',null,null],s);
                },
            ]
        });
    },

    // ========== 第三关敌人（最终战-洛阳宫城） ==========
    // 铁甲精英
    _ieBody(ctx, s, fc) {
        this.row(ctx,2,0,[null,null,'#333','#555','#777','#555','#333',null,null],s);
        this.row(ctx,2,1,[null,null,'#555','#777','#FFD700','#777','#555',null,null],s);
        this.row(ctx,2,2,[null,null,'#333','#555','#FFD700','#555','#333',null,null],s);
        this.row(ctx,3,3,[null,null,null,fc,fc,fc,fc,null,null,null],s);
        this.row(ctx,3,4,[null,null,null,fc,'#F00',fc,'#F00',fc,null,null],s);
        this.row(ctx,3,5,[null,null,null,fc,fc,fc,fc,null,null,null],s);
        this.row(ctx,2,6,[null,null,'#333','#555','#777','#555','#333',null,null],s);
        this.row(ctx,2,7,[null,null,'#555','#777','#555','#555','#777','#555',null,null],s);
        this.row(ctx,2,8,[null,null,'#333','#555','#555','#555','#555','#333',null,null],s);
        this.row(ctx,2,9,[null,null,'#555','#777','#FFD700','#777','#555',null,null],s);
        this.row(ctx,3,10,[null,null,null,'#333','#555','#555','#333',null,null,null],s);
    },
    _ieLegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,11,[null,null,null,'#333','#333',null,null,'#333','#333',null,null],s);
            this.row(ctx,2,12,[null,null,'#333',null,null,null,null,null,'#333',null,null],s);
            this.row(ctx,2,13,[null,null,'#555',null,null,null,null,null,'#555',null,null],s);
            this.row(ctx,2,14,[null,null,'#8B4513','#8B4513',null,null,null,null,'#8B4513',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,11,[null,null,null,'#333','#333',null,'#333','#333',null,null],s);
            this.row(ctx,3,12,[null,null,null,null,'#333',null,'#333',null,null,null],s);
            this.row(ctx,2,13,[null,null,null,'#555',null,null,'#555',null,null,null],s);
            this.row(ctx,2,14,[null,null,null,'#8B4513','#8B4513',null,'#8B4513',null,null,null],s);
        } else {
            this.row(ctx,3,11,[null,null,null,'#333','#333',null,'#333','#333',null,null],s);
            this.row(ctx,3,12,[null,null,null,'#333',null,null,null,'#333',null,null],s);
            this.row(ctx,3,13,[null,null,null,'#555','#555',null,'#555','#555',null,null],s);
            this.row(ctx,3,14,[null,null,null,'#8B4513','#8B4513',null,'#8B4513','#8B4513',null,null],s);
        }
    },
    _ieWeapon(ctx, s, atk) {
        if (atk) {
            this.rect(ctx,10,3,4,1,'#C0C0C0',s);
            this.rect(ctx,9,4,5,1,'#A0A0A0',s);
            this.rect(ctx,8,5,5,1,'#FFD700',s);
            this.rect(ctx,9,6,3,1,'#8B4513',s);
        } else {
            this.rect(ctx,8,4,3,1,'#C0C0C0',s);
            this.rect(ctx,8,5,3,1,'#A0A0A0',s);
            this.rect(ctx,9,6,2,1,'#8B4513',s);
            // Shield
            this.rect(ctx,2,4,2,4,'#333',s);
            this.rect(ctx,2,5,3,2,'#FFD700',s);
        }
    },
    ironElite() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._ieBody(ctx,s,'#D2691E'); t._ieLegs(ctx,s,'idle'); t._ieWeapon(ctx,s,0); },
                (ctx,s) => { t._ieBody(ctx,s,'#D2691E'); t._ieLegs(ctx,s,'idle'); },
                (ctx,s) => { t._ieBody(ctx,s,'#D2691E'); t._ieLegs(ctx,s,'w1'); t._ieWeapon(ctx,s,0); },
                (ctx,s) => { t._ieBody(ctx,s,'#D2691E'); t._ieLegs(ctx,s,'idle'); t._ieWeapon(ctx,s,1); },
            ]
        });
    },

    // ========== 最终BOSS 天魔·张角 ==========
    _tmBody(ctx, s, fc, eyeColor) {
        this.row(ctx,3,0,[null,null,null,'#2a0a2a','#3a0a3a','#2a0a2a','#2a0a2a',null,null,null],s);
        this.row(ctx,2,1,[null,null,'#3a0a3a','#5a0a5a',eyeColor,'#5a0a5a','#3a0a3a',null,null],s);
        this.row(ctx,2,2,[null,null,'#2a0a2a','#3a0a3a',eyeColor,'#3a0a3a','#2a0a2a',null,null],s);
        this.row(ctx,3,3,[null,null,null,fc,fc,fc,fc,null,null,null],s);
        this.row(ctx,3,4,[null,null,null,fc,'#F00',fc,'#F00',fc,null,null],s);
        this.row(ctx,3,5,[null,null,null,fc,fc,fc,fc,null,null,null],s);
        this.row(ctx,1,6,[null,'#2a0a2a','#3a0a3a','#5a0a5a','#3a0a3a','#2a0a2a',null,null],s);
        this.row(ctx,2,7,[null,null,'#2a0a2a','#3a0a3a','#5a0a5a','#3a0a3a','#2a0a2a',null,null],s);
        this.row(ctx,2,8,[null,null,'#3a0a3a','#5a0a5a','#3a0a3a','#5a0a5a','#3a0a3a',null,null],s);
        this.row(ctx,2,9,[null,null,'#2a0a2a','#5a0a5a','#F00','#5a0a5a','#2a0a2a',null,null],s);
        this.row(ctx,2,10,[null,null,'#3a0a3a','#2a0a2a','#3a0a3a','#2a0a2a','#3a0a3a',null,null],s);
        this.row(ctx,2,11,[null,null,'#2a0a2a','#3a0a3a','#5a0a5a','#3a0a3a','#2a0a2a',null,null],s);
        this.row(ctx,3,12,[null,null,null,'#2a0a2a','#3a0a3a','#3a0a3a','#2a0a2a',null,null,null],s);
    },
    _tmLlegs(ctx, s, type) {
        if (type === 'w1') {
            this.row(ctx,3,13,[null,null,null,'#2a0a2a','#2a0a2a',null,null,'#2a0a2a','#2a0a2a',null,null],s);
            this.row(ctx,2,14,[null,null,'#2a0a2a',null,null,null,null,null,'#2a0a2a',null,null],s);
            this.row(ctx,2,15,[null,null,'#1a0a1a',null,null,null,null,null,'#1a0a1a',null,null],s);
            this.row(ctx,2,16,[null,null,'#000','#000',null,null,null,null,'#000',null,null],s);
        } else if (type === 'w2') {
            this.row(ctx,3,13,[null,null,null,'#2a0a2a','#2a0a2a',null,'#2a0a2a','#2a0a2a',null,null],s);
            this.row(ctx,3,14,[null,null,null,null,'#2a0a2a',null,'#2a0a2a',null,null,null],s);
            this.row(ctx,2,15,[null,null,null,'#1a0a1a',null,null,'#1a0a1a',null,null,null],s);
            this.row(ctx,2,16,[null,null,null,'#000','#000',null,'#000',null,null,null],s);
        } else {
            this.row(ctx,3,13,[null,null,null,'#2a0a2a','#2a0a2a',null,'#2a0a2a','#2a0a2a',null,null],s);
            this.row(ctx,3,14,[null,null,null,'#2a0a2a',null,null,null,'#2a0a2a',null,null],s);
            this.row(ctx,3,15,[null,null,null,'#1a0a1a','#1a0a1a',null,'#1a0a1a','#1a0a1a',null,null],s);
            this.row(ctx,3,16,[null,null,null,'#000','#000',null,'#000','#000',null,null],s);
        }
    },
    _tmWeapon(ctx, s, type) {
        if (type === 'atk') {
            // 暗影冲击
            this.rect(ctx,8,2,6,1,'#8B008B',s);
            this.rect(ctx,7,3,8,1,'#6A0DAD',s);
            this.rect(ctx,6,4,10,1,'#8B008B',s);
            this.rect(ctx,7,5,8,1,'#F00',s);
            this.rect(ctx,0,0,6,2,'#6A0DAD',s);
            this.rect(ctx,0,6,6,2,'#8B008B',s);
        } else if (type === 'skill') {
            // 天魔降临
            this.rect(ctx,0,0,16,1,'#8B008B',s);
            this.rect(ctx,0,2,16,1,'#6A0DAD',s);
            this.rect(ctx,0,4,16,1,'#F00',s);
            this.rect(ctx,0,7,16,1,'#8B008B',s);
            this.rect(ctx,0,10,16,1,'#6A0DAD',s);
            this.rect(ctx,0,12,16,1,'#F00',s);
        } else {
            // 法杖待机
            this.rect(ctx,9,1,2,4,'#4a0a4a',s);
            this.rect(ctx,8,5,3,1,'#8B008B',s);
            this.rect(ctx,10,6,1,1,'#6A0DAD',s);
            // Dark aura
            this.rect(ctx,7,0,5,1,'#6A0DAD',s);
            this.rect(ctx,8,-1,3,1,'#8B008B',s);
        }
    },
    tianmoZhangJue() {
        const t = this;
        return this.generateCharacter({
            frames: [
                (ctx,s) => { t._tmBody(ctx,s,'#D2691E','#F00'); t._tmLlegs(ctx,s,'idle'); t._tmWeapon(ctx,s,'idle'); },
                (ctx,s) => { t._tmBody(ctx,s,'#D2691E','#FF0'); },
                (ctx,s) => { t._tmBody(ctx,s,'#D2691E','#F00'); t._tmLlegs(ctx,s,'w1'); t._tmWeapon(ctx,s,'idle'); },
                (ctx,s) => { t._tmBody(ctx,s,'#800000','#F00'); t._tmLlegs(ctx,s,'idle'); t._tmWeapon(ctx,s,'atk'); },
                (ctx,s) => { t._tmBody(ctx,s,'#FF0','#F00'); t._tmLlegs(ctx,s,'idle'); t._tmWeapon(ctx,s,'skill'); },
                (ctx,s) => { t._tmBody(ctx,s,'#800000','#F00'); },
            ]
        });
    }
};

window.SpriteGen = SpriteGen;

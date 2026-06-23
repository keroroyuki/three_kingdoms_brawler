// 三国战纪 - 关卡管理器 v2
class LevelManager {
    constructor(game) {
        this.game = game;
        this.currentLevel = 1;
        this.currentSection = 0;
        this.sections = [];
        this.sectionTriggered = [];
        this.areaNameTimer = 0;
        this.areaName = '';
    }

    loadLevel(level) {
        this.currentLevel = level;
        this.currentSection = 0;
        this.sectionTriggered = [];
        
        this.sections = this.getLevelSections(level);
    }

    getLevelSections(level) {
        if (level === 1) {
            return [
                {
                    name: '涿郡城外',
                    startX: 50,
                    endX: 600,
                    enemies: [
                        { type: 'soldier', x: 350, y: 350 },
                        { type: 'soldier', x: 450, y: 360 },
                        { type: 'soldier', x: 550, y: 340 }
                    ],
                    items: [
                        { type: 'smallBaozi', x: 300, y: 380 }
                    ]
                },
                {
                    name: '黄巾军营地',
                    startX: 600,
                    endX: 1200,
                    enemies: [
                        { type: 'soldier', x: 750, y: 350 },
                        { type: 'archer', x: 850, y: 360 },
                        { type: 'soldier', x: 950, y: 340 },
                        { type: 'shield', x: 1100, y: 350 }
                    ],
                    items: [
                        { type: 'bigBaozi', x: 700, y: 380 },
                        { type: 'wine', x: 1050, y: 380 }
                    ]
                },
                {
                    name: '山寨大门',
                    startX: 1200,
                    endX: 1800,
                    enemies: [
                        { type: 'shield', x: 1350, y: 350 },
                        { type: 'spear', x: 1450, y: 360 },
                        { type: 'soldier', x: 1550, y: 340 },
                        { type: 'soldier', x: 1650, y: 350 },
                        { type: 'archer', x: 1750, y: 360 }
                    ],
                    items: [
                        { type: 'smallBaozi', x: 1300, y: 380 },
                        { type: 'chicken', x: 1600, y: 380 }
                    ]
                },
                {
                    name: '山寨内部',
                    startX: 1800,
                    endX: 2400,
                    enemies: [
                        { type: 'shield', x: 1950, y: 350 },
                        { type: 'spear', x: 2050, y: 360 },
                        { type: 'soldier', x: 2150, y: 340 },
                        { type: 'soldier', x: 2250, y: 350 },
                        { type: 'shield', x: 2350, y: 360 }
                    ],
                    items: [
                        { type: 'bigBaozi', x: 1900, y: 380 },
                        { type: 'wine', x: 2200, y: 380 }
                    ]
                },
                {
                    name: '张角老巢 - BOSS战',
                    startX: 2400,
                    endX: 3200,
                    enemies: [
                        { type: 'zhangjue', x: 2800, y: 320 }
                    ],
                    items: [
                        { type: 'chicken', x: 2500, y: 380 },
                        { type: 'bigBaozi', x: 2600, y: 380 }
                    ],
                    isBoss: true
                }
            ];
        } else if (level === 2) {
            return [
                {
                    name: '博望坡入口',
                    startX: 50,
                    endX: 700,
                    enemies: [
                        { type: 'soldier', x: 300, y: 350 },
                        { type: 'soldier', x: 450, y: 360 },
                        { type: 'elite', x: 600, y: 340 }
                    ],
                    items: [
                        { type: 'smallBaozi', x: 200, y: 380 },
                        { type: 'wine', x: 500, y: 380 }
                    ]
                },
                {
                    name: '燃烧的树林',
                    startX: 700,
                    endX: 1400,
                    enemies: [
                        { type: 'firemage', x: 850, y: 350 },
                        { type: 'soldier', x: 950, y: 360 },
                        { type: 'elite', x: 1100, y: 340 },
                        { type: 'firemage', x: 1250, y: 350 }
                    ],
                    items: [
                        { type: 'bigBaozi', x: 800, y: 380 },
                        { type: 'chicken', x: 1200, y: 380 }
                    ]
                },
                {
                    name: '火攻阵',
                    startX: 1400,
                    endX: 2100,
                    enemies: [
                        { type: 'elite', x: 1550, y: 350 },
                        { type: 'firemage', x: 1650, y: 360 },
                        { type: 'cavalry', x: 1800, y: 340 },
                        { type: 'soldier', x: 1900, y: 350 },
                        { type: 'elite', x: 2000, y: 360 }
                    ],
                    items: [
                        { type: 'smallBaozi', x: 1500, y: 380 },
                        { type: 'wine', x: 1850, y: 380 },
                        { type: 'bigBaozi', x: 2050, y: 380 }
                    ]
                },
                {
                    name: '博望坡峡谷',
                    startX: 2100,
                    endX: 2800,
                    enemies: [
                        { type: 'cavalry', x: 2250, y: 350 },
                        { type: 'firemage', x: 2350, y: 360 },
                        { type: 'elite', x: 2450, y: 340 },
                        { type: 'cavalry', x: 2550, y: 350 },
                        { type: 'firemage', x: 2650, y: 360 }
                    ],
                    items: [
                        { type: 'chicken', x: 2200, y: 380 },
                        { type: 'bigBaozi', x: 2600, y: 380 }
                    ]
                },
                {
                    name: '张宝 - BOSS战',
                    startX: 2800,
                    endX: 3600,
                    enemies: [
                        { type: 'zhangbao', x: 3200, y: 320 }
                    ],
                    items: [
                        { type: 'chicken', x: 2900, y: 380 },
                        { type: 'bigBaozi', x: 3050, y: 380 }
                    ],
                    isBoss: true
                }
            ];
        } else if (level === 3) {
            return [
                {
                    name: '洛阳城门',
                    startX: 50,
                    endX: 800,
                    enemies: [
                        { type: 'elite', x: 300, y: 350 },
                        { type: 'elite', x: 500, y: 360 },
                        { type: 'elite', x: 700, y: 340 }
                    ],
                    items: [
                        { type: 'bigBaozi', x: 200, y: 370 },
                        { type: 'wine', x: 550, y: 370 }
                    ]
                },
                {
                    name: '宫城外围',
                    startX: 800,
                    endX: 1600,
                    enemies: [
                        { type: 'ironelite', x: 950, y: 350 },
                        { type: 'cavalry', x: 1050, y: 360 },
                        { type: 'elite', x: 1250, y: 340 },
                        { type: 'ironelite', x: 1450, y: 350 }
                    ],
                    items: [
                        { type: 'bigBaozi', x: 900, y: 370 },
                        { type: 'chicken', x: 1350, y: 370 }
                    ]
                },
                {
                    name: '禁宫回廊',
                    startX: 1600,
                    endX: 2400,
                    enemies: [
                        { type: 'ironelite', x: 1750, y: 350 },
                        { type: 'firemage', x: 1850, y: 360 },
                        { type: 'cavalry', x: 2000, y: 340 },
                        { type: 'elite', x: 2100, y: 350 },
                        { type: 'ironelite', x: 2250, y: 360 }
                    ],
                    items: [
                        { type: 'smallBaozi', x: 1700, y: 370 },
                        { type: 'wine', x: 2050, y: 370 },
                        { type: 'chicken', x: 2200, y: 370 }
                    ]
                },
                {
                    name: '大殿前庭',
                    startX: 2400,
                    endX: 3200,
                    enemies: [
                        { type: 'ironelite', x: 2550, y: 350 },
                        { type: 'cavalry', x: 2650, y: 360 },
                        { type: 'firemage', x: 2750, y: 340 },
                        { type: 'ironelite', x: 2850, y: 350 },
                        { type: 'cavalry', x: 3000, y: 360 }
                    ],
                    items: [
                        { type: 'chicken', x: 2500, y: 370 },
                        { type: 'bigBaozi', x: 2900, y: 370 },
                        { type: 'wine', x: 3100, y: 370 }
                    ]
                },
                {
                    name: '天魔张角 - 最终BOSS',
                    startX: 3200,
                    endX: 4000,
                    enemies: [
                        { type: 'tianmo', x: 3600, y: 310 }
                    ],
                    items: [
                        { type: 'chicken', x: 3300, y: 370 },
                        { type: 'bigBaozi', x: 3450, y: 370 }
                    ],
                    isBoss: true
                }
            ];
        }
        return [];
    }

    checkProgress() {
        if (!this.game.player) return;
        
        const playerX = this.game.player.x;
        
        for (let i = 0; i < this.sections.length; i++) {
            const section = this.sections[i];
            
            if (playerX >= section.startX && playerX < section.endX && !this.sectionTriggered[i]) {
                this.triggerSection(i);
                break;
            }
        }
        
        // 检查BOSS是否被击败
        if (this.currentSection === this.sections.length - 1) {
            const bossSection = this.sections[this.currentSection];
            if (bossSection.isBoss && this.sectionTriggered[this.currentSection]) {
                const bossTypes = ['zhangjue', 'zhangbao', 'tianmo'];
                const boss = this.game.enemies.find(e => bossTypes.includes(e.type));
                if (!boss) {
                    this.game.victory();
                }
            }
        }
    }

    triggerSection(index) {
        this.currentSection = index;
        this.sectionTriggered[index] = true;
        
        const section = this.sections[index];
        
        // 显示区域名称
        this.showAreaName(section.name);
        
        // 生成敌人
        section.enemies.forEach(enemy => {
            this.game.spawnEnemy(enemy.type, enemy.x, enemy.y);
        });
        
        // 生成道具
        section.items.forEach(item => {
            this.game.spawnItem(item.type, item.x, item.y);
        });
    }

    showAreaName(name) {
        this.areaName = name;
        this.areaNameTimer = 2.5;
    }

    updateAreaName(dt) {
        if (this.areaNameTimer > 0) {
            this.areaNameTimer -= dt;
        }
    }

    renderAreaName(ctx) {
        if (this.areaNameTimer <= 0) return;
        
        const alpha = Math.min(1, this.areaNameTimer / 0.5);
        const scale = 1 + (1 - alpha) * 0.2;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // 背景条
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(200, 280, 400, 60);
        
        // 边框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(200, 280, 400, 60);
        
        // 文字
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.areaName, 400, 320);
        
        ctx.restore();
    }
}

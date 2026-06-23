// 三国战纪 Web版 - 游戏核心引擎 v2
class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.gameState = 'menu';
        this.currentLevel = 1;
        this.score = 0;
        this.lives = 3;
        
        this.keys = {};
        this.setupInput();
        
        this.player = null;
        this.enemies = [];
        this.items = [];
        this.particles = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        
        this.cameraX = 0;
        this.levelWidth = 3200;
        this.currentCharacter = 'liubei';
        
        // 背景层
        this.bgLayers = [];
        this.groundY = 400;
        
        // 精灵数据
        this.spriteData = {};
        
        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.loadAssets();
    }

    loadAssets() {
        const gen = window.SpriteGen;
        
        this.spriteData = {
            liubei: gen.liuBei(),
            guanyu: gen.guanYu(),
            zhangfei: gen.zhangFei(),
            zhaoyun: gen.zhaoYun(),
            zhugeliang: gen.zhugeLiang(),
            soldier: gen.huangjinSoldier(),
            archer: gen.huangjinArcher(),
            shield: gen.huangjinShield(),
            spear: gen.huangjinSpear(),
            elite: gen.huangjinElite(),
            firemage: gen.huangjinFireMage(),
            cavalry: gen.huangjinCavalry(),
            zhangjue: gen.zhangJue(),
            zhangbao: gen.zhangBao(),
            tianmo: gen.tianmoZhangJue(),
            ironelite: gen.ironElite()
        };
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ') e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    start() {
        this.gameState = 'menu';
        this.gameLoop(0);
    }

    gameLoop(timestamp) {
        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;
        
        this.update();
        this.render();
        
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update() {
        switch(this.gameState) {
            case 'menu':
                this.updateMenu();
                break;
            case 'characterSelect':
                this.updateCharacterSelect();
                break;
            case 'playing':
                this.updatePlaying();
                break;
            case 'victory':
                if (this.keys['enter']) {
                    if (this.currentLevel < 3) {
                        this.startGame(this.currentLevel + 1);
                    } else {
                        this.gameState = 'menu';
                    }
                    this.keys['enter'] = false;
                }
                break;
            case 'gameover':
                if (this.keys['enter']) {
                    this.gameState = 'menu';
                    this.keys['enter'] = false;
                }
                break;
        }
    }

    updateMenu() {
        if (this.keys['enter']) {
            this.gameState = 'characterSelect';
            this.keys['enter'] = false;
        }
    }

    updateCharacterSelect() {
        const charList = ['liubei', 'guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang'];
        let idx = charList.indexOf(this.currentCharacter);
        
        if (this.keys['1']) this.currentCharacter = 'liubei';
        if (this.keys['2']) this.currentCharacter = 'guanyu';
        if (this.keys['3']) this.currentCharacter = 'zhangfei';
        if (this.keys['4']) this.currentCharacter = 'zhaoyun';
        if (this.keys['5']) this.currentCharacter = 'zhugeliang';
        
        if (this.keys['a'] || this.keys['arrowleft']) {
            idx = (idx - 1 + charList.length) % charList.length;
            this.currentCharacter = charList[idx];
            this.keys['a'] = false;
            this.keys['arrowleft'] = false;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            idx = (idx + 1) % charList.length;
            this.currentCharacter = charList[idx];
            this.keys['d'] = false;
            this.keys['arrowright'] = false;
        }
        
        if (this.keys['enter']) {
            this.startGame();
            this.keys['enter'] = false;
        }
    }

    startGame(level) {
        this.gameState = 'playing';
        this.currentLevel = level || 1;
        this.score = 0;
        this.lives = 3;
        this.cameraX = 0;
        this.levelWidth = this.currentLevel === 3 ? 4000 : this.currentLevel === 2 ? 3600 : 3200;
        
        this.player = new Player(
            100, 350,
            this.currentCharacter,
            {
                liubei: this.spriteData.liubei,
                guanyu: this.spriteData.guanyu,
                zhangfei: this.spriteData.zhangfei,
                zhaoyun: this.spriteData.zhaoyun,
                zhugeliang: this.spriteData.zhugeliang
            }
        );
        this.player.maxX = this.levelWidth;
        
        this.enemies = [];
        this.items = [];
        this.particles = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        
        this.levelManager = new LevelManager(this);
        this.levelManager.loadLevel(this.currentLevel);
    }

    updatePlaying() {
        if (!this.player) return;
        
        // 更新玩家
        this.player.update(this.keys, this.deltaTime);
        
        // 更新相机
        this.updateCamera();
        
        // 更新敌人
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(this.player, this.deltaTime);
            
            if (enemy.health <= 0) {
                this.score += enemy.scoreValue;
                this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#FF4444', 15);
                this.dropItem(enemy);
                return false;
            }
            return true;
        });
        
        // 更新道具
        this.items = this.items.filter(item => {
            item.update(this.deltaTime);
            if (this.checkCollision(this.player, item)) {
                this.player.collectItem(item);
                this.spawnParticles(item.x, item.y, '#00FF00', 8);
                return false;
            }
            return item.active;
        });
        
        // 更新粒子
        this.particles = this.particles.filter(p => {
            p.update(this.deltaTime);
            return p.life > 0;
        });
        
        // 更新弹幕（诸葛亮的风刃）
        this.projectiles = this.projectiles.filter(p => {
            p.update(this.deltaTime);
            return p.active;
        });
        
        // 更新敌人弹幕（火术士、张宝）
        this.enemyProjectiles = this.enemyProjectiles.filter(p => {
            p.update(this.deltaTime);
            return p.active;
        });
        
        // 敌人弹幕碰撞玩家
        this.checkEnemyProjectileHit();
        
        // 弹幕碰撞敌人
        this.checkProjectileHit();
        
        // 检查玩家攻击敌人
        this.checkPlayerAttack();
        
        // 检查敌人攻击玩家
        this.checkEnemyAttack();
        
        // 检查关卡进度
        this.levelManager.checkProgress();
        
        // 检查玩家死亡
        if (this.player.health <= 0) {
            this.lives--;
            if (this.lives <= 0) {
                this.gameState = 'gameover';
            } else {
                this.player.respawn(100, 350);
            }
        }
    }

    updateCamera() {
        const targetX = this.player.x - 300;
        this.cameraX += (targetX - this.cameraX) * 0.1;
        this.cameraX = Math.max(0, Math.min(this.cameraX, this.levelWidth - 800));
    }

    checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    checkPlayerAttack() {
        if (!this.player.attacking || !this.player.attackHitbox) return;
        
        // 诸葛亮远程攻击：生成风刃弹幕
        if (this.player.character === 'zhugeliang') {
            // 只在攻击帧切换时生成（避免连发）
            const p = this.player;
            if (p.state === 'attack' && Math.floor(p.stateTimer / 0.2) === 1) {
                this.projectiles.push(new Projectile(
                    p.facing === 1 ? p.x + p.width : p.x - 20,
                    p.y + 50,
                    p.facing,
                    350,
                    p.attackPower
                ));
            }
            return;
        }
        
        // 近战攻击判定
        this.enemies.forEach(enemy => {
            if (this.player.attackHitEnemies.has(enemy)) return;
            
            if (this.checkCollision(this.player.attackHitbox, enemy)) {
                enemy.takeDamage(this.player.attackPower);
                this.player.attackHitEnemies.add(enemy);
                this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#FFD700', 10);
                
                // 击退效果
                enemy.x += this.player.facing * 30;
            }
        });
    }

    checkProjectileHit() {
        this.projectiles = this.projectiles.filter(p => {
            if (!p.active) return false;
            
            let hit = false;
            this.enemies.forEach(enemy => {
                if (hit) return;
                // Check collision with enemy
                if (p.x < enemy.x + enemy.width &&
                    p.x + p.width > enemy.x &&
                    p.y < enemy.y + enemy.height &&
                    p.y + p.height > enemy.y) {
                    enemy.takeDamage(p.attackPower);
                    this.spawnParticles(p.x, p.y, '#B0E0FF', 8);
                    hit = true;
                    p.active = false;
                }
            });
            return !hit;
        });
    }

    checkEnemyAttack() {
        this.enemies.forEach(enemy => {
            if (!enemy.attacking) return;
            
            // 远程敌人：生成弹幕
            if (enemy.ranged || enemy.type === 'zhangbao' || enemy.type === 'tianmo') {
                const proj = new EnemyProjectile(
                    enemy.x + enemy.width * 0.5,
                    enemy.y + 40,
                    enemy.facing,
                    200,
                    enemy.attackPower
                );
                this.enemyProjectiles.push(proj);
                enemy.attacking = false;
                return;
            }
            
            const attackBox = {
                x: enemy.facing === 1 ? enemy.x + enemy.width : enemy.x - 40,
                y: enemy.y,
                width: 40,
                height: enemy.height
            };
            
            if (this.checkCollision(attackBox, this.player)) {
                this.player.takeDamage(enemy.attackPower);
                enemy.attacking = false;
            }
        });
    }

    checkEnemyProjectileHit() {
        this.enemyProjectiles = this.enemyProjectiles.filter(p => {
            if (!p.active) return false;
            if (this.checkCollision(p, this.player)) {
                this.player.takeDamage(p.attackPower);
                this.spawnParticles(p.x, p.y, '#FF4500', 6);
                return false;
            }
            return true;
        });
    }

    dropItem(enemy) {
        const rand = Math.random();
        let type = null;
        
        if (rand < 0.3) type = 'smallBaozi';
        else if (rand < 0.4) type = 'bigBaozi';
        else if (rand < 0.45) type = 'chicken';
        else if (rand < 0.5) type = 'wine';
        
        if (type) {
            this.spawnItem(type, enemy.x, enemy.y + 20);
        }
    }

    spawnParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    spawnEnemy(type, x, y) {
        const configs = {
            soldier: { health: 30, attack: 8, speed: 50, score: 100, width: 64, height: 128 },
            archer: { health: 25, attack: 12, speed: 30, score: 150, width: 64, height: 128 },
            shield: { health: 50, attack: 10, speed: 40, score: 200, width: 64, height: 128 },
            spear: { health: 35, attack: 15, speed: 45, score: 175, width: 64, height: 128 },
            elite: { health: 60, attack: 18, speed: 55, score: 250, width: 64, height: 128 },
            firemage: { health: 35, attack: 15, speed: 25, score: 200, width: 64, height: 128, ranged: true },
            cavalry: { health: 50, attack: 20, speed: 120, score: 300, width: 64, height: 128, charge: true },
            zhangjue: { health: 300, attack: 25, speed: 60, score: 1000, width: 80, height: 160 },
            zhangbao: { health: 400, attack: 30, speed: 70, score: 1200, width: 80, height: 160 },
            ironelite: { health: 80, attack: 22, speed: 45, score: 350, width: 64, height: 128 },
            tianmo: { health: 500, attack: 35, speed: 80, score: 2000, width: 80, height: 160, ranged: true }
        };
        
        const config = configs[type];
        const spriteUrl = this.spriteData[type];
        
        const enemy = new Enemy(x, y, type, spriteUrl, config, this.levelWidth);
        this.enemies.push(enemy);
    }

    spawnItem(type, x, y) {
        const item = new Item(x, y, type);
        this.items.push(item);
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        switch(this.gameState) {
            case 'menu':
                this.renderMenu();
                break;
            case 'characterSelect':
                this.renderCharacterSelect();
                break;
            case 'playing':
                this.renderPlaying();
                break;
            case 'victory':
                this.renderVictory();
                break;
            case 'gameover':
                this.renderGameOver();
                break;
        }
    }

    renderMenu() {
        // 渐变背景
        const grad = this.ctx.createLinearGradient(0, 0, 0, 600);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(0.5, '#16213e');
        grad.addColorStop(1, '#0f3460');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, 800, 600);
        
        // 装饰线条
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(50, 50, 700, 500);
        this.ctx.strokeRect(60, 60, 680, 480);
        
        // 标题
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 72px "Microsoft YaHei", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('三国战纪', 400, 180);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
        this.ctx.fillText('Web版', 400, 230);
        
        // 副标题
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
        this.ctx.fillText('第一关: 黄巾之乱', 400, 280);
        
        // 提示
        this.ctx.fillStyle = '#AAA';
        this.ctx.font = '24px "Microsoft YaHei", sans-serif';
        this.ctx.fillText('按 Enter 开始游戏', 400, 400);
        
        this.ctx.font = '18px "Microsoft YaHei", sans-serif';
        this.ctx.fillText('WASD 移动 | J 攻击 | K 技能 | 空格 防御', 400, 480);
        
        // 版本信息
        this.ctx.fillStyle = '#555';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('v1.0', 750, 580);
    }

    renderCharacterSelect() {
        // 背景
        const grad = this.ctx.createLinearGradient(0, 0, 0, 600);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#0f3460');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, 800, 600);
        
        // 标题
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('选择角色', 400, 80);
        
        // 角色列表
        const characters = [
            { key: 'liubei', num: '1', name: '刘备', desc: '均衡型', hp: 100, atk: 15, spd: '快' },
            { key: 'guanyu', num: '2', name: '关羽', desc: '力量型', hp: 120, atk: 20, spd: '中' },
            { key: 'zhangfei', num: '3', name: '张飞', desc: '爆发型', hp: 130, atk: 22, spd: '慢' },
            { key: 'zhaoyun', num: '4', name: '赵云', desc: '速度型', hp: 90, atk: 18, spd: '极快' },
            { key: 'zhugeliang', num: '5', name: '诸葛亮', desc: '远程型', hp: 80, atk: 12, spd: '中' }
        ];
        
        characters.forEach((char, i) => {
            const x = 20 + i * 155;
            const y = 140;
            const isSelected = this.currentCharacter === char.key;
            
            // 选中框
            if (isSelected) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
                this.ctx.fillRect(x - 10, y - 10, 160, 280);
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(x - 10, y - 10, 160, 280);
            }
            
            // 角色预览
            const sprite = this.spriteData[char.key];
            if (sprite) {
                this.ctx.drawImage(sprite, 0, 0, 64, 128, x + 30, y, 100, 128);
            }
            
            // 名字
            this.ctx.fillStyle = isSelected ? '#FFD700' : '#FFF';
            this.ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
            this.ctx.fillText(`${char.num}. ${char.name}`, x + 70, y + 145);
            
            // 描述
            this.ctx.fillStyle = '#AAA';
            this.ctx.font = '16px "Microsoft YaHei", sans-serif';
            this.ctx.fillText(char.desc, x + 70, y + 175);
            
            // 属性
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`HP: ${char.hp}`, x + 70, y + 205);
            this.ctx.fillText(`攻击: ${char.atk}`, x + 70, y + 225);
            this.ctx.fillText(`速度: ${char.spd}`, x + 70, y + 245);
        });
        
        // 提示
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '20px "Microsoft YaHei", sans-serif';
        this.ctx.fillText('按数字键选择，Enter 确认', 400, 520);
    }

    renderPlaying() {
        this.renderBackground();
        
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        
        // 渲染道具
        this.items.forEach(item => item.render(this.ctx));
        
        // 渲染敌人
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        
        // 渲染玩家
        if (this.player) {
            this.player.render(this.ctx);
        }
        
        // 渲染粒子
        this.particles.forEach(p => p.render(this.ctx));
        
        // 渲染弹幕
        this.projectiles.forEach(p => p.render(this.ctx));
        // 渲染敌人弹幕
        this.enemyProjectiles.forEach(p => p.render(this.ctx));
        
        this.ctx.restore();
        
        // 渲染HUD
        this.renderHUD();
        
        // 渲染区域名称
        if (this.levelManager) {
            this.levelManager.updateAreaName(this.deltaTime);
            this.levelManager.renderAreaName(this.ctx);
        }
    }

    renderBackground() {
        if (this.currentLevel === 3) {
            this.renderL3Background();
        } else if (this.currentLevel === 2) {
            this.renderL2Background();
        } else {
            this.renderL1Background();
        }
    }

    renderL1Background() {
        const ctx = this.ctx;
        const cam = this.cameraX;
        
        // 天空渐变
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 400);
        skyGrad.addColorStop(0, '#87CEEB');
        skyGrad.addColorStop(0.3, '#98D8EF');
        skyGrad.addColorStop(0.7, '#B4E4FF');
        skyGrad.addColorStop(1, '#D4F1FF');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, 800, 400);
        
        // 远山 (视差)
        ctx.fillStyle = '#5D8A68';
        for (let i = 0; i < 8; i++) {
            const x = i * 250 - (cam * 0.1) % 250;
            ctx.beginPath();
            ctx.moveTo(x, 300);
            ctx.lineTo(x + 125, 180);
            ctx.lineTo(x + 250, 300);
            ctx.fill();
        }
        
        // 中景山
        ctx.fillStyle = '#4A7C59';
        for (let i = 0; i < 10; i++) {
            const x = i * 200 - (cam * 0.3) % 200;
            ctx.beginPath();
            ctx.moveTo(x, 350);
            ctx.lineTo(x + 100, 250);
            ctx.lineTo(x + 200, 350);
            ctx.fill();
        }
        
        // 近景树
        ctx.fillStyle = '#2D5A3D';
        for (let i = 0; i < 15; i++) {
            const x = i * 150 - (cam * 0.5) % 150;
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 45, 320, 10, 40);
            ctx.fillStyle = '#2D5A3D';
            ctx.beginPath();
            ctx.arc(x + 50, 310, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 地面
        const groundGrad = ctx.createLinearGradient(0, 360, 0, 600);
        groundGrad.addColorStop(0, '#5D8A68');
        groundGrad.addColorStop(0.1, '#4A7C59');
        groundGrad.addColorStop(0.3, '#8B5E3C');
        groundGrad.addColorStop(1, '#6B4226');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, 360, 800, 240);
        
        // 草地纹理
        ctx.fillStyle = '#3D6B4A';
        for (let i = 0; i < 50; i++) {
            const x = (i * 20 - cam * 0.8) % 800;
            ctx.fillRect(x, 365, 3, 8);
            ctx.fillRect(x + 7, 368, 3, 6);
            ctx.fillRect(x + 14, 363, 3, 10);
        }
        
        // 地面细节
        ctx.fillStyle = '#6B4226';
        for (let i = 0; i < 30; i++) {
            const x = (i * 30 - cam) % 800;
            ctx.fillRect(x, 420, 15, 3);
            ctx.fillRect(x + 10, 450, 10, 2);
        }
        
        // 营地元素
        this.renderCampElements(ctx, cam);
    }

    renderL2Background() {
        const ctx = this.ctx;
        const cam = this.cameraX;
        
        // 夜空 - 火光照耀
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 400);
        skyGrad.addColorStop(0, '#1a0a0a');
        skyGrad.addColorStop(0.3, '#2a1010');
        skyGrad.addColorStop(0.6, '#3a1515');
        skyGrad.addColorStop(1, '#4a2020');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, 800, 400);
        
        // 远山剪影
        ctx.fillStyle = '#1a0a0a';
        for (let i = 0; i < 10; i++) {
            const x = i * 200 - (cam * 0.1) % 200;
            ctx.beginPath();
            ctx.moveTo(x, 350);
            ctx.lineTo(x + 100, 220);
            ctx.lineTo(x + 200, 350);
            ctx.fill();
        }
        
        // 燃烧的树 (中景)
        for (let i = 0; i < 12; i++) {
            const x = i * 180 - (cam * 0.3) % 180;
            // 树干 (焦黑)
            ctx.fillStyle = '#2a0a0a';
            ctx.fillRect(x + 35, 280, 12, 60);
            // 树冠 (燃烧)
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.arc(x + 40, 270, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(x + 42, 268, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(x + 44, 266, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 近景燃烧残骸
        for (let i = 0; i < 8; i++) {
            const x = i * 250 - (cam * 0.5) % 250;
            // 烧毁的木架
            ctx.fillStyle = '#1a0505';
            ctx.fillRect(x + 10, 330, 25, 40);
            ctx.fillRect(x + 35, 340, 5, 30);
            // 火焰
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(x + 15, 325, 5, 10);
            ctx.fillRect(x + 25, 320, 5, 15);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x + 17, 327, 3, 5);
            ctx.fillRect(x + 27, 322, 3, 8);
        }
        
        // 地面 - 焦土
        const groundGrad = ctx.createLinearGradient(0, 360, 0, 600);
        groundGrad.addColorStop(0, '#1a0a0a');
        groundGrad.addColorStop(0.2, '#2a1510');
        groundGrad.addColorStop(0.5, '#3a2015');
        groundGrad.addColorStop(1, '#2a1510');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, 360, 800, 240);
        
        // 地面的余烬
        ctx.fillStyle = '#FF4500';
        for (let i = 0; i < 40; i++) {
            const x = (i * 25 - cam * 0.8) % 800;
            if (Math.sin(i * 3.7 + Date.now() / 300) > 0.2) {
                ctx.fillRect(x, 370 + (i % 5) * 15, 3, 3);
            }
        }
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 20; i++) {
            const x = (i * 50 - cam * 0.8) % 800;
            if (Math.sin(i * 2.3 + Date.now() / 400) > 0.5) {
                ctx.fillRect(x, 375 + (i % 4) * 20, 2, 2);
            }
        }
        
        // 战场元素
        this.renderL2CampElements(ctx, cam);
    }

    renderL2CampElements(ctx, cam) {
        // 破损战旗
        const flags = [400, 1100, 2000];
        flags.forEach(fx => {
            const x = fx - cam;
            if (x > -50 && x < 850) {
                ctx.fillStyle = '#2a0a0a';
                ctx.fillRect(x, 300, 3, 80);
                ctx.fillStyle = '#8B0000';
                ctx.beginPath();
                ctx.moveTo(x + 3, 300);
                ctx.lineTo(x + 30, 310);
                ctx.lineTo(x + 3, 325);
                ctx.fill();
            }
        });
        
        // 燃烧的马车
        const carts = [700, 1600, 2500];
        carts.forEach(cx => {
            const x = cx - cam;
            if (x > -80 && x < 880) {
                ctx.fillStyle = '#3a1510';
                ctx.fillRect(x, 350, 45, 25);
                ctx.fillStyle = '#1a0505';
                ctx.fillRect(x + 5, 350, 35, 3);
                // 轮子
                ctx.beginPath();
                ctx.arc(x + 12, 380, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + 33, 380, 8, 0, Math.PI * 2);
                ctx.fill();
                // 火焰
                ctx.fillStyle = '#FF4500';
                ctx.fillRect(x + 15, 340, 8, 12);
                ctx.fillRect(x + 25, 335, 8, 15);
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(x + 18, 342, 4, 6);
                ctx.fillRect(x + 28, 338, 4, 8);
            }
        });
        
        // 木栅栏
        for (let i = 0; i < 6; i++) {
            const x = i * 300 + 100 - cam;
            if (x > -20 && x < 820) {
                ctx.fillStyle = '#2a0a0a';
                ctx.fillRect(x, 340, 6, 35);
                ctx.fillRect(x - 10, 345, 26, 4);
            }
        }
    }

    renderL3Background() {
        const ctx = this.ctx;
        const cam = this.cameraX;
        
        // 深夜皇宫 - 深紫夜空
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 400);
        skyGrad.addColorStop(0, '#0a0015');
        skyGrad.addColorStop(0.3, '#150025');
        skyGrad.addColorStop(0.6, '#200030');
        skyGrad.addColorStop(1, '#300040');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, 800, 400);
        
        // 满月
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(600, 80, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFACD';
        ctx.beginPath();
        ctx.arc(600, 80, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,215,0,0.1)';
        ctx.beginPath();
        ctx.arc(600, 80, 55, 0, Math.PI * 2);
        ctx.fill();
        
        // 远山剪影
        ctx.fillStyle = '#0a0015';
        for (let i = 0; i < 12; i++) {
            const x = i * 180 - (cam * 0.08) % 180;
            ctx.beginPath();
            ctx.moveTo(x, 350);
            ctx.lineTo(x + 90, 200);
            ctx.lineTo(x + 180, 350);
            ctx.fill();
        }
        
        // 宫殿轮廓 (中景)
        ctx.fillStyle = '#1a0025';
        for (let i = 0; i < 8; i++) {
            const x = i * 280 - (cam * 0.2) % 280;
            // 宫殿屋顶
            ctx.beginPath();
            ctx.moveTo(x, 350);
            ctx.lineTo(x + 30, 240);
            ctx.lineTo(x + 80, 220);
            ctx.lineTo(x + 130, 240);
            ctx.lineTo(x + 160, 350);
            ctx.fill();
            // 柱子
            ctx.fillStyle = '#2a0035';
            ctx.fillRect(x + 35, 260, 6, 90);
            ctx.fillRect(x + 80, 260, 6, 90);
            ctx.fillRect(x + 119, 260, 6, 90);
            ctx.fillStyle = '#1a0025';
        }
        
        // 近景宫墙
        ctx.fillStyle = '#2a0035';
        for (let i = 0; i < 10; i++) {
            const x = i * 200 - (cam * 0.4) % 200;
            ctx.fillRect(x, 300, 200, 60);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x, 298, 200, 3);
            ctx.fillStyle = '#2a0035';
        }
        
        // 宫墙上的火把
        for (let i = 0; i < 8; i++) {
            const x = i * 250 - (cam * 0.6) % 250 + 50;
            // 火把杆
            ctx.fillStyle = '#333';
            ctx.fillRect(x + 8, 290, 4, 25);
            // 火焰
            ctx.fillStyle = '#FF4500';
            ctx.fillRect(x + 6, 285, 8, 10);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(x + 8, 287, 4, 6);
            // 照明光晕
            ctx.fillStyle = 'rgba(255,69,0,0.08)';
            ctx.fillRect(x - 15, 275, 50, 40);
        }
        
        // 地面 - 皇宫石砖
        const groundGrad = ctx.createLinearGradient(0, 360, 0, 600);
        groundGrad.addColorStop(0, '#1a0025');
        groundGrad.addColorStop(0.2, '#2a0035');
        groundGrad.addColorStop(0.5, '#3a0045');
        groundGrad.addColorStop(1, '#2a0035');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, 360, 800, 240);
        
        // 地面砖缝
        ctx.fillStyle = '#1a0025';
        for (let i = 0; i < 20; i++) {
            const x = (i * 50 - cam * 0.8) % 800;
            ctx.fillRect(x, 370, 30, 2);
            ctx.fillRect(x + 10, 400, 30, 2);
            ctx.fillRect(x + 5, 440, 30, 2);
        }
        
        // 紫色暗影浮动 (最终BOSS氛围)
        ctx.fillStyle = 'rgba(138,43,226,0.04)';
        for (let i = 0; i < 8; i++) {
            const x = (i * 120 - cam * 0.3 + Date.now() * 0.01 * i) % 800;
            ctx.fillRect(x, 350 + Math.sin(Date.now() / 500 + i) * 20, 60, 30);
        }
    }

    renderCampElements(ctx, cam) {
        const tents = [500, 1200, 2000];
        tents.forEach(tentX => {
            const x = tentX - cam;
            if (x > -100 && x < 900) {
                ctx.fillStyle = '#DAA520';
                ctx.beginPath();
                ctx.moveTo(x, 380);
                ctx.lineTo(x + 50, 320);
                ctx.lineTo(x + 100, 380);
                ctx.fill();
                ctx.fillStyle = '#8B4513';
                ctx.beginPath();
                ctx.moveTo(x + 35, 380);
                ctx.lineTo(x + 50, 340);
                ctx.lineTo(x + 65, 380);
                ctx.fill();
            }
        });
        const flags = [300, 900, 1500, 2100];
        flags.forEach(flagX => {
            const x = flagX - cam;
            if (x > -50 && x < 850) {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x, 280, 4, 100);
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.moveTo(x + 4, 280);
                ctx.lineTo(x + 40, 290);
                ctx.lineTo(x + 4, 300);
                ctx.fill();
                ctx.fillStyle = '#8B4513';
                ctx.font = 'bold 14px serif';
                ctx.fillText('黄', x + 12, 296);
            }
        });
        const crates = [400, 800, 1400, 1800, 2400];
        crates.forEach(crateX => {
            const x = crateX - cam;
            if (x > -30 && x < 830) {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x, 365, 25, 20);
                ctx.strokeStyle = '#654321';
                ctx.strokeRect(x, 365, 25, 20);
            }
        });
    }

    renderHUD() {
        const ctx = this.ctx;
        
        // HUD背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 800, 80);
        
        // 血条
        ctx.fillStyle = '#333';
        ctx.fillRect(15, 15, 200, 25);
        
        const hpPercent = this.player.health / this.player.maxHealth;
        const hpColor = hpPercent > 0.5 ? '#FF0000' : hpPercent > 0.25 ? '#FF6600' : '#FF0000';
        ctx.fillStyle = hpColor;
        ctx.fillRect(17, 17, 196 * hpPercent, 21);
        
        // 血条高光
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(17, 17, 196 * hpPercent, 8);
        
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`HP: ${this.player.health}/${this.player.maxHealth}`, 25, 32);
        
        // 分数
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
        ctx.fillText(`分数: ${this.score}`, 25, 65);
        
        // 生命
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.fillText(`生命: ${this.lives}`, 250, 65);
        
        // 关卡名
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
        const levelNames = {1: '第一关: 黄巾之乱', 2: '第二关: 博望坡之战', 3: '最终关: 洛阳宫城'};
        ctx.fillText(levelNames[this.currentLevel] || '关卡', 785, 30);
        
        // 技能冷却
        if (this.player.skillCooldown > 0) {
            ctx.fillStyle = '#FF6666';
            ctx.font = '16px Arial';
            ctx.fillText(`技能冷却: ${Math.ceil(this.player.skillCooldown)}s`, 785, 55);
        } else {
            ctx.fillStyle = '#66FF66';
            ctx.font = '16px Arial';
            ctx.fillText('技能就绪', 785, 55);
        }
        
        // 小地图
        this.renderMinimap(ctx);
    }

    renderMinimap(ctx) {
        const mapX = 600;
        const mapY = 90;
        const mapW = 180;
        const mapH = 30;
        
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(mapX, mapY, mapW, mapH);
        
        // 玩家位置
        const playerPos = (this.player.x / this.levelWidth) * mapW;
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(mapX + playerPos - 2, mapY + 10, 4, 10);
        
        // 敌人位置
        this.enemies.forEach(enemy => {
            const enemyPos = (enemy.x / this.levelWidth) * mapW;
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(mapX + enemyPos - 1, mapY + 12, 3, 6);
        });
        
        // 关卡进度
        ctx.strokeStyle = '#FFF';
        ctx.strokeRect(mapX, mapY, mapW, mapH);
    }

    renderVictory() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, 800, 600);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 72px "Microsoft YaHei", sans-serif';
        this.ctx.textAlign = 'center';
        
        if (this.currentLevel === 3) {
            this.ctx.fillText('通关!', 400, 180);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
            this.ctx.fillText('天魔张角已被消灭!', 400, 260);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
            this.ctx.fillText('天下太平，三国战纪终', 400, 330);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
            this.ctx.fillText(`最终分数: ${this.score}`, 400, 400);
            this.ctx.fillStyle = '#AAA';
            this.ctx.font = '22px "Microsoft YaHei", sans-serif';
            this.ctx.fillText('感谢游玩! 按 Enter 返回主菜单', 400, 500);
        } else if (this.currentLevel === 2) {
            this.ctx.fillText('胜利!', 400, 200);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
            this.ctx.fillText('博望坡大火, 敌军溃败!', 400, 280);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
            this.ctx.fillText(`分数: ${this.score}`, 400, 350);
            this.ctx.fillStyle = '#66FF66';
            this.ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
            this.ctx.fillText('按 Enter 前往最终关: 洛阳宫城', 400, 440);
        } else {
            this.ctx.fillText('胜利!', 400, 200);
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
            this.ctx.fillText('黄巾之乱已平定!', 400, 280);
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
            this.ctx.fillText(`分数: ${this.score}`, 400, 350);
            this.ctx.fillStyle = '#66FF66';
            this.ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
            this.ctx.fillText('按 Enter 前往第二关: 博望坡之战', 400, 440);
        }
    }

    renderGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.fillRect(0, 0, 800, 600);
        
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = 'bold 72px "Microsoft YaHei", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('游戏结束', 400, 250);
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
        this.ctx.fillText(`最终分数: ${this.score}`, 400, 350);
        
        this.ctx.fillStyle = '#FFF';
        this.ctx.font = '24px "Microsoft YaHei", sans-serif';
        this.ctx.fillText('按 Enter 重新开始', 400, 450);
    }

    victory() {
        this.gameState = 'victory';
    }
}

// 粒子类
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;
        this.life = 1;
        this.decay = Math.random() * 2 + 1;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay * dt;
    }

    render(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// 弹幕类（诸葛亮风刃）
class Projectile {
    constructor(x, y, direction, speed, attackPower) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = speed;
        this.attackPower = attackPower;
        this.width = 20;
        this.height = 10;
        this.active = true;
        this.life = 3;
        this.timer = 0;
    }

    update(dt) {
        this.x += this.speed * this.direction * dt;
        this.timer += dt;
        this.life -= dt;
        if (this.life <= 0) this.active = false;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.direction, 1);
        // 风刃：青白色弧形
        ctx.fillStyle = '#B0E0FF';
        ctx.fillRect(0, 2, 16, 4);
        ctx.fillRect(2, 1, 12, 6);
        ctx.fillRect(4, 0, 8, 8);
        ctx.fillStyle = '#E0F0FF';
        ctx.fillRect(3, 2, 10, 4);
        ctx.fillRect(5, 3, 6, 2);
        // 拖尾
        const trailAlpha = Math.max(0, 0.4 - this.timer * 0.1);
        ctx.globalAlpha = trailAlpha;
        ctx.fillStyle = '#B0E0FF';
        ctx.fillRect(-6, 2, 6, 4);
        ctx.fillRect(-10, 3, 4, 2);
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// 敌人弹幕类（火术士火球、张宝法术）
class EnemyProjectile {
    constructor(x, y, direction, speed, attackPower) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.speed = speed;
        this.attackPower = attackPower;
        this.width = 16;
        this.height = 12;
        this.active = true;
        this.life = 4;
        this.timer = 0;
    }

    update(dt) {
        this.x += this.speed * this.direction * dt;
        this.y += Math.sin(this.timer * 4) * 30 * dt;
        this.timer += dt;
        this.life -= dt;
        if (this.life <= 0) this.active = false;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.direction, 1);
        // 火球
        ctx.fillStyle = '#FF4500';
        ctx.fillRect(2, 2, 12, 8);
        ctx.fillRect(0, 3, 16, 6);
        ctx.fillRect(4, 0, 8, 12);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(4, 3, 8, 6);
        ctx.fillRect(6, 1, 4, 10);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(6, 4, 4, 4);
        // 拖尾火花
        const trailAlpha = Math.max(0, 0.5 - this.timer * 0.05);
        ctx.globalAlpha = trailAlpha;
        ctx.fillStyle = '#FF4500';
        ctx.fillRect(-6, 4, 6, 4);
        ctx.fillRect(-12, 5, 6, 2);
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// 初始化
window.addEventListener('load', () => {
    window.game = new GameEngine('gameCanvas');
    window.game.start();
});

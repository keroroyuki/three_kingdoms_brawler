// 三国战纪 - 玩家角色类 v2
class Player {
    constructor(x, y, character, sprites) {
        this.x = x;
        this.y = y;
        this.width = 64;
        this.height = 128;
        this.character = character;
        
        // 角色属性
        const stats = {
            liubei: { health: 100, attack: 15, speed: 180, skillCooldown: 5 },
            guanyu: { health: 120, attack: 20, speed: 150, skillCooldown: 6 },
            zhangfei: { health: 130, attack: 22, speed: 130, skillCooldown: 7 },
            zhaoyun: { health: 90, attack: 18, speed: 220, skillCooldown: 4 },
            zhugeliang: { health: 80, attack: 12, speed: 160, skillCooldown: 5 }
        };
        
        const stat = stats[character];
        this.health = stat.health;
        this.maxHealth = stat.health;
        this.attackPower = stat.attack;
        this.baseAttack = stat.attack;
        this.speed = stat.speed;
        this.skillCooldownMax = stat.skillCooldown;
        this.skillCooldown = 0;
        
        // 精灵
        this.sprites = sprites;
        this.spriteData = this.loadSprites(sprites);
        
        // 状态
        this.facing = 1;
        this.state = 'idle'; // idle, walk, attack, skill, hurt, defend
        this.stateTimer = 0;
        this.stateDuration = 0;
        
        // 动画
        this.animFrame = 0;
        this.animTimer = 0;
        this.animInterval = 0.15;
        
        // 物理
        this.velocityX = 0;
        this.velocityY = 0;
        this.groundY = y; // 当前地面位置
        
        // 攻击
        this.attacking = false;
        this.attackHitbox = null;
        this.attackHitEnemies = new Set();
        
        // 防御
        this.defending = false;
        
        // 受击
        this.hurtTimer = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
        
        // 地图边界
        this.minY = 300;
        this.maxY = 360;
        this.maxX = 3600;
    }

    loadSprites(sprites) {
        return { ...sprites };
    }

    update(keys, deltaTime) {
        // 受击恢复
        if (this.hurtTimer > 0) {
            this.hurtTimer -= deltaTime;
            if (this.hurtTimer <= 0) {
                this.state = 'idle';
                this.invincible = true;
                this.invincibleTimer = 0.5;
            }
        }
        
        // 无敌时间
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= deltaTime;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }
        
        // 攻击状态
        if (this.state === 'attack' || this.state === 'skill') {
            this.stateTimer += deltaTime;
            if (this.stateTimer >= this.stateDuration) {
                this.state = 'idle';
                this.attacking = false;
                this.attackHitEnemies.clear();
            }
        }
        
        // 技能冷却
        if (this.skillCooldown > 0) {
            this.skillCooldown -= deltaTime;
        }
        
        // 移动输入 (如果不在攻击/受击状态)
        if (this.state !== 'attack' && this.state !== 'skill' && this.hurtTimer <= 0) {
            this.velocityX = 0;
            this.velocityY = 0;
            
            // 左右移动
            if (keys['a'] || keys['arrowleft']) {
                this.velocityX = -this.speed;
                this.facing = -1;
            }
            if (keys['d'] || keys['arrowright']) {
                this.velocityX = this.speed;
                this.facing = 1;
            }
            
            // 上下移动 (代替跳跃)
            if (keys['w'] || keys['arrowup']) {
                this.velocityY = -this.speed;
            }
            if (keys['s'] || keys['arrowdown']) {
                this.velocityY = this.speed;
            }
            
            // 防御
            this.defending = keys[' '];
            
            // 攻击
            if (keys['j'] && this.state !== 'attack') {
                this.startAttack();
            }
            
            // 技能
            if (keys['k'] && this.skillCooldown <= 0 && this.state !== 'skill') {
                this.useSkill();
            }
            
            // 更新状态 (如果刚刚发动攻击/技能则跳过)
            if (this.state !== 'attack' && this.state !== 'skill') {
                if (this.velocityX !== 0 || this.velocityY !== 0) {
                    this.state = 'walk';
                } else if (!this.defending) {
                    this.state = 'idle';
                } else {
                    this.state = 'defend';
                }
            }
        }
        
        // 应用移动
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // 边界限制
        this.x = Math.max(0, Math.min(this.x, this.maxX - this.width));
        this.y = Math.max(this.minY, Math.min(this.y, this.maxY));
        
        // 动画更新
        this.animTimer += deltaTime;
        if (this.animTimer >= this.animInterval) {
            this.animFrame++;
            this.animTimer = 0;
        }
    }

    startAttack() {
        this.state = 'attack';
        this.stateTimer = 0;
        this.stateDuration = 0.4;
        this.attacking = true;
        this.animFrame = 0;
        this.attackHitEnemies.clear();
        
        // 设置攻击判定框（从上往下劈）
        this.attackHitbox = {
            x: this.facing === 1 ? this.x + this.width - 20 : this.x - 40,
            y: this.y - 20,
            width: 60,
            height: this.height + 20
        };
    }

    useSkill() {
        this.state = 'skill';
        this.stateTimer = 0;
        this.stateDuration = 0.6;
        this.attacking = true;
        this.animFrame = 0;
        this.attackPower = Math.floor(this.baseAttack * 1.8);
        this.skillCooldown = this.skillCooldownMax;
        this.attackHitEnemies.clear();
        
        // 技能范围更大
        this.attackHitbox = {
            x: this.facing === 1 ? this.x - 20 : this.x - 70,
            y: this.y - 20,
            width: 100,
            height: this.height + 40
        };
        
        setTimeout(() => {
            this.attackPower = this.baseAttack;
        }, 600);
    }

    takeDamage(damage) {
        if (this.invincible || this.hurtTimer > 0) return;
        
        if (this.defending) {
            damage = Math.floor(damage * 0.3);
        }
        
        this.health -= damage;
        this.health = Math.max(0, this.health);
        
        this.state = 'hurt';
        this.hurtTimer = 0.3;
        this.attacking = false;
    }

    collectItem(item) {
        switch(item.type) {
            case 'smallBaozi':
                this.health = Math.min(this.maxHealth, this.health + 20);
                break;
            case 'bigBaozi':
                this.health = Math.min(this.maxHealth, this.health + 50);
                break;
            case 'chicken':
                this.health = Math.min(this.maxHealth, this.health + 100);
                break;
            case 'wine':
                this.baseAttack = Math.floor(this.baseAttack * 1.3);
                setTimeout(() => { this.baseAttack = this.attackPower; }, 10000);
                break;
        }
    }

    respawn(x, y) {
        this.x = x;
        this.y = y;
        this.health = this.maxHealth;
        this.state = 'idle';
        this.invincible = true;
        this.invincibleTimer = 2;
    }

    getSpriteFrame() {
        const sprite = this.spriteData[this.character];
        if (!sprite) return null;
        
        let frame = 0;
        switch(this.state) {
            case 'idle':
                frame = this.animFrame % 2 === 0 ? 0 : 1;
                break;
            case 'walk':
                frame = 2 + (this.animFrame % 2);
                break;
            case 'attack':
                frame = 4 + Math.min(1, Math.floor(this.stateTimer / 0.2));
                break;
            case 'skill':
                frame = 6 + Math.min(2, Math.floor(this.stateTimer / 0.2));
                break;
            case 'hurt':
                frame = 0;
                break;
            case 'defend':
                frame = 9;
                break;
        }
        return { sprite, frame, frameWidth: 64, frameHeight: 128 };
    }

    render(ctx) {
        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
            return;
        }
        
        const spriteInfo = this.getSpriteFrame();
        
        if (spriteInfo) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y);
            
            // 受击后仰倾斜 + 闪烁
            if (this.hurtTimer > 0) {
                const tiltAngle = 0.08 * Math.sin(Date.now() / 60);
                ctx.rotate(tiltAngle);
                ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 80);
            }
            
            ctx.scale(this.facing, 1);
            
            ctx.drawImage(
                spriteInfo.sprite,
                spriteInfo.frame * spriteInfo.frameWidth, 0,
                spriteInfo.frameWidth, spriteInfo.frameHeight,
                -this.width / 2, 0,
                this.width, this.height
            );
            
            ctx.restore();
        }
        
        // 技能特效叠加(弱化圆圈,让剑可见)
        if (this.state === 'skill') {
            ctx.save();
            const progress = this.stateTimer / 0.6;
            ctx.globalAlpha = (1 - progress) * 0.15;
            ctx.fillStyle = '#FFD700';
            if (this.character === 'liubei') ctx.fillStyle = '#FFD700';
            else if (this.character === 'guanyu') ctx.fillStyle = '#00FF00';
            else if (this.character === 'zhangfei') ctx.fillStyle = '#FF4500';
            else if (this.character === 'zhaoyun') ctx.fillStyle = '#E0E0FF';
            else if (this.character === 'zhugeliang') ctx.fillStyle = '#B0E0FF';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 20 + progress * 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// 三国战纪 - 敌人类 v2
class Enemy {
    constructor(x, y, type, spriteUrl, config, levelWidth) {
        this.x = x;
        this.y = y;
        this.width = config.width;
        this.height = config.height;
        this.type = type;
        
        // 加载精灵
        this.sprite = spriteUrl;
        
        // 属性
        this.health = config.health;
        this.maxHealth = config.health;
        this.attackPower = config.attack;
        this.speed = config.speed;
        this.scoreValue = config.score;
        
        // 状态
        this.facing = -1;
        this.state = 'idle'; // idle, walk, attack, hurt
        this.stateTimer = 0;
        this.attacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 1.5;
        
        // 动画
        this.animFrame = 0;
        this.animTimer = 0;
        this.animInterval = 0.2;
        
        // 物理
        this.velocityX = 0;
        
        // AI
        this.detectionRange = 350;
        this.attackRange = config.ranged ? 250 : 70;
        this.ranged = config.ranged || false;
        this.charge = config.charge || false;
        this.boss = type === 'zhangjue' || type === 'zhangbao' || type === 'tianmo';
        this.patrolDir = 1;
        this.patrolTimer = 0;
        this.patrolDuration = 2 + Math.random();
        this.chargeSpeed = 0;
        this.chargeDir = 0;
        
        // 受击
        this.hurtTimer = 0;
        this.flashTimer = 0;
        this.levelWidth = levelWidth || 3200;
    }

    update(player, deltaTime) {
        // 受击恢复
        if (this.hurtTimer > 0) {
            this.hurtTimer -= deltaTime;
            if (this.hurtTimer <= 0) {
                this.state = 'idle';
            }
        }
        
        // 攻击冷却
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }
        
        // 朝向玩家
        this.facing = player.x > this.x ? 1 : -1;
        
        // AI行为
        if (this.hurtTimer <= 0 && this.state !== 'attack') {
            const dist = Math.abs(this.x - player.x);
            
            if (this.charge && dist < this.detectionRange) {
                // 骑兵：冲锋
                this.state = 'walk';
                const chargeSpeed = this.speed * 1.8;
                this.velocityX = this.facing * chargeSpeed;
            } else if (dist < this.attackRange && this.attackTimer <= 0) {
                // 攻击
                this.state = 'attack';
                this.attacking = true;
                this.stateTimer = 0;
                this.velocityX = 0;
            } else if (dist < this.detectionRange) {
                // 追击
                this.state = 'walk';
                if (this.ranged && dist < this.attackRange * 0.7) {
                    // 远程敌人保持距离（后退）
                    this.velocityX = -this.facing * this.speed * 0.5;
                } else {
                    this.velocityX = this.facing * this.speed;
                }
            } else {
                // 巡逻
                this.state = 'walk';
                this.patrolTimer += deltaTime;
                if (this.patrolTimer >= this.patrolDuration) {
                    this.patrolDir *= -1;
                    this.patrolTimer = 0;
                    this.patrolDuration = 1.5 + Math.random();
                }
                this.velocityX = this.patrolDir * this.speed * 0.5;
            }
        }
        
        // 攻击持续
        if (this.state === 'attack') {
            this.stateTimer += deltaTime;
            if (this.stateTimer >= 0.4) {
                this.state = 'idle';
                this.attacking = false;
                this.attackTimer = this.attackCooldown;
            }
        }
        
        // 应用移动
        this.x += this.velocityX * deltaTime;
        
        // 边界
        this.x = Math.max(0, Math.min(this.x, this.levelWidth - this.width));
        
        // 闪光
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
        }
        
        // 动画
        this.animTimer += deltaTime;
        if (this.animTimer >= this.animInterval) {
            this.animFrame++;
            this.animTimer = 0;
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        this.state = 'hurt';
        this.hurtTimer = 0.2;
        this.flashTimer = 0.2;
        this.velocityX = 0;
    }

    getSpriteFrame() {
        if (!this.sprite) return null;
        
        let frame = 0;
        if (this.boss) {
            switch(this.state) {
                case 'idle':
                    frame = this.animFrame % 2;
                    break;
                case 'walk':
                    frame = 2;
                    break;
                case 'attack':
                    frame = 3;
                    break;
                case 'hurt':
                    frame = 5;
                    break;
            }
        } else {
            switch(this.state) {
                case 'idle':
                case 'walk':
                    frame = this.animFrame % 2;
                    break;
                case 'attack':
                    frame = 3;
                    break;
                case 'hurt':
                    frame = 2;
                    break;
            }
        }
        return frame;
    }

    render(ctx) {
        const frame = this.getSpriteFrame();
        
        if (frame !== null) {
            ctx.save();
            
            // 受击闪烁
            if (this.flashTimer > 0) {
                ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 50) * 0.5;
            }
            
            ctx.translate(this.x + this.width / 2, this.y);
            ctx.scale(this.facing, 1);
            
            ctx.drawImage(
                this.sprite,
                frame * 64, 0, 64, 128,
                -this.width / 2, 0,
                this.width, this.height
            );
            
            ctx.restore();
        }
        
        // 血条
        if (this.health < this.maxHealth) {
            const barW = 40;
            const barH = 4;
            const barX = this.x + (this.width - barW) / 2;
            const barY = this.y - 8;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barW, barH);
            
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(barX, barY, barW * (this.health / this.maxHealth), barH);
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, barH);
        }
    }
}

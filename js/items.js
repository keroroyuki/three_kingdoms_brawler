// 三国战纪 - 道具类 v2
class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.type = type;
        this.active = true;
        
        this.bobTimer = Math.random() * Math.PI * 2;
        this.bobSpeed = 3;
        this.bobAmount = 5;
        this.baseY = y;
        
        this.colors = {
            smallBaozi: { main: '#FFF', accent: '#FFE4B5', highlight: '#FFFACD' },
            bigBaozi: { main: '#FFF', accent: '#FFD700', highlight: '#FFEC8B' },
            chicken: { main: '#D2691E', accent: '#8B4513', highlight: '#DEB887' },
            wine: { main: '#8B4513', accent: '#A0522D', highlight: '#D2691E' }
        };
    }

    update(deltaTime) {
        this.bobTimer += deltaTime * this.bobSpeed;
        this.y = this.baseY + Math.sin(this.bobTimer) * this.bobAmount;
    }

    render(ctx) {
        const c = this.colors[this.type] || this.colors.smallBaozi;
        
        ctx.save();
        
        // 光晕效果
        ctx.globalAlpha = 0.3 + Math.sin(this.bobTimer * 2) * 0.2;
        ctx.fillStyle = c.highlight;
        ctx.beginPath();
        ctx.arc(this.x + 16, this.y + 16, 18, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
        
        switch(this.type) {
            case 'smallBaozi':
                // 小包子
                ctx.fillStyle = c.main;
                ctx.beginPath();
                ctx.arc(this.x + 16, this.y + 18, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = c.accent;
                ctx.beginPath();
                ctx.arc(this.x + 16, this.y + 16, 8, 0, Math.PI * 2);
                ctx.fill();
                // 顶部褶皱
                ctx.fillStyle = c.main;
                ctx.beginPath();
                ctx.arc(this.x + 16, this.y + 12, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'bigBaozi':
                // 大包子
                ctx.fillStyle = c.main;
                ctx.beginPath();
                ctx.arc(this.x + 16, this.y + 18, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = c.accent;
                ctx.beginPath();
                ctx.arc(this.x + 16, this.y + 16, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = c.highlight;
                ctx.beginPath();
                ctx.arc(this.x + 14, this.y + 13, 4, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'chicken':
                // 鸡腿
                ctx.fillStyle = c.highlight;
                ctx.beginPath();
                ctx.ellipse(this.x + 16, this.y + 14, 8, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = c.main;
                ctx.beginPath();
                ctx.ellipse(this.x + 16, this.y + 16, 7, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                // 骨头
                ctx.fillStyle = '#FFF';
                ctx.fillRect(this.x + 14, this.y + 22, 4, 8);
                ctx.beginPath();
                ctx.arc(this.x + 14, this.y + 30, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(this.x + 18, this.y + 30, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'wine':
                // 酒壶
                ctx.fillStyle = c.main;
                ctx.fillRect(this.x + 10, this.y + 12, 12, 16);
                ctx.fillStyle = c.accent;
                ctx.beginPath();
                ctx.arc(this.x + 16, this.y + 12, 7, 0, Math.PI * 2);
                ctx.fill();
                // 壶嘴
                ctx.fillStyle = c.main;
                ctx.fillRect(this.x + 22, this.y + 8, 6, 4);
                // 高光
                ctx.fillStyle = c.highlight;
                ctx.fillRect(this.x + 12, this.y + 14, 3, 8);
                break;
        }
        
        ctx.restore();
    }
}

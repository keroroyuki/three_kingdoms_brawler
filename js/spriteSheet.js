// 三国战纪 - 精灵动画系统
class SpriteSheet {
    constructor(image, frameWidth, frameHeight, frameCount) {
        this.image = image;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameCount = frameCount;
        this.currentFrame = 0;
        this.timer = 0;
        this.frameInterval = 0.15;
        this.playing = true;
    }

    update(dt) {
        if (!this.playing) return;
        this.timer += dt;
        if (this.timer >= this.frameInterval) {
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
            this.timer = 0;
        }
    }

    reset() {
        this.currentFrame = 0;
        this.timer = 0;
    }

    setFrame(frame) {
        this.currentFrame = frame;
    }

    draw(ctx, x, y, facing = 1, scale = 1) {
        ctx.save();
        ctx.translate(x + this.frameWidth * scale / 2, y);
        ctx.scale(facing, 1);
        ctx.drawImage(
            this.image,
            this.currentFrame * this.frameWidth, 0,
            this.frameWidth, this.frameHeight,
            -this.frameWidth * scale / 2, 0,
            this.frameWidth * scale, this.frameHeight * scale
        );
        ctx.restore();
    }
}

window.SpriteSheet = SpriteSheet;

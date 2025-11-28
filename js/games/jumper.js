/**
 * 跳一跳游戏
 * 休闲跳跃游戏
 */
import { audio } from '../audio.js';

export class Jumper {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 玩家
        this.player = {
            x: 100,
            y: 0,
            size: 20,
            jumping: false,
            power: 0,
            maxPower: 100,
            velocityX: 0,
            velocityY: 0,
            squish: 1,
            onPlatform: null
        };

        // 平台
        this.platforms = [];
        this.currentPlatformIndex = 0;

        // 相机
        this.cameraX = 0;
        this.cameraY = 0;

        // 游戏状态
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.isGameOver = false;
        this.charging = false;

        // 物理参数
        this.gravity = 0.3;
        this.jumpMultiplier = 0.12;

        // 粒子效果
        this.particles = [];

        this.init();
    }

    init() {
        this.generatePlatforms();
        this.player.onPlatform = this.platforms[0];
        this.player.x = this.platforms[0].x + this.platforms[0].width / 2;
        this.player.y = this.platforms[0].y - this.player.size;
    }

    /**
     * 生成平台
     */
    generatePlatforms() {
        this.platforms = [];
        
        // 第一个平台
        this.platforms.push({
            x: 80,
            y: this.height - 80,
            width: 60,
            height: 40,
            color: this.randomColor(),
            type: 'normal'
        });

        // 生成更多平台
        for (let i = 1; i < 50; i++) {
            this.addPlatform();
        }
    }

    /**
     * 添加新平台
     */
    addPlatform() {
        const last = this.platforms[this.platforms.length - 1];
        const distance = 80 + Math.random() * 80 * this.difficulty.speed;
        const direction = Math.random() < 0.5 ? 1 : -1;
        
        const width = 40 + Math.random() * 40;
        const height = 30 + Math.random() * 20;

        let newX = last.x + last.width / 2 + distance * direction - width / 2;
        
        // 确保在屏幕范围内
        newX = Math.max(20, Math.min(this.width - 20 - width, newX));

        // 随机类型
        let type = 'normal';
        let color = this.randomColor();
        
        if (Math.random() < 0.1) {
            type = 'bonus';
            color = '#ffcc00';
        } else if (Math.random() < 0.05) {
            type = 'small';
            color = '#ff6666';
        }

        this.platforms.push({
            x: newX,
            y: last.y - 20 - Math.random() * 30,
            width: type === 'small' ? 25 : width,
            height,
            color,
            type
        });
    }

    /**
     * 随机颜色
     */
    randomColor() {
        const colors = ['#4ecdc4', '#ff6b6b', '#45b7aa', '#96ceb4', 
                       '#ffeaa7', '#dfe6e9', '#81ecec', '#fab1a0'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) {
            if (keysPressed.a) {
                this.restart();
            }
            return;
        }

        // 蓄力
        if (keys.a || keys.b) {
            if (!this.charging && !this.player.jumping) {
                this.charging = true;
                this.player.power = 0;
            }
            if (this.charging) {
                this.player.power = Math.min(this.player.maxPower, 
                    this.player.power + deltaTime * 0.15);
                this.player.squish = 1 - this.player.power / this.player.maxPower * 0.3;
            }
        } else if (this.charging) {
            // 释放跳跃
            this.jump();
            this.charging = false;
        }

        // 跳跃中
        if (this.player.jumping) {
            this.player.velocityY += this.gravity;
            this.player.x += this.player.velocityX;
            this.player.y += this.player.velocityY;

            // 旋转效果
            this.player.squish = 1;

            // 检测落地
            this.checkLanding();
        }

        // 更新相机
        this.updateCamera();

        // 更新粒子
        this.updateParticles(deltaTime);

        // 检查掉落
        if (this.player.y > this.cameraY + this.height + 50) {
            this.gameOver();
        }
    }

    /**
     * 跳跃
     */
    jump() {
        if (this.player.jumping) return;

        const power = this.player.power;
        this.player.jumping = true;
        this.player.squish = 1;

        // 计算跳跃方向（朝向下一个平台）
        const nextPlatform = this.platforms[this.currentPlatformIndex + 1];
        if (nextPlatform) {
            const dx = (nextPlatform.x + nextPlatform.width / 2) - this.player.x;
            const direction = dx > 0 ? 1 : -1;
            
            this.player.velocityX = power * this.jumpMultiplier * direction;
            this.player.velocityY = -power * this.jumpMultiplier * 1.5;
        }

        this.player.power = 0;
        audio.playSelect();

        // 添加跳跃粒子
        this.addParticles(this.player.x, this.player.y + this.player.size, 5);
    }

    /**
     * 检测落地
     */
    checkLanding() {
        if (this.player.velocityY <= 0) return;

        for (let i = 0; i < this.platforms.length; i++) {
            const platform = this.platforms[i];
            
            // 检查是否在平台上方落下
            if (this.player.y + this.player.size >= platform.y &&
                this.player.y + this.player.size <= platform.y + platform.height + this.player.velocityY &&
                this.player.x >= platform.x - 5 &&
                this.player.x <= platform.x + platform.width + 5) {
                
                // 落地
                this.player.y = platform.y - this.player.size;
                this.player.velocityX = 0;
                this.player.velocityY = 0;
                this.player.jumping = false;
                this.player.onPlatform = platform;

                // 计分
                if (i > this.currentPlatformIndex) {
                    const jumps = i - this.currentPlatformIndex;
                    
                    // 精准落地检测
                    const centerDist = Math.abs(this.player.x - (platform.x + platform.width / 2));
                    const isPerfect = centerDist < 5;
                    
                    if (isPerfect) {
                        this.combo++;
                        this.score += 10 * jumps * (1 + this.combo * 0.5);
                        audio.playClear();
                        this.addParticles(this.player.x, this.player.y, 10, '#ffcc00');
                    } else {
                        this.combo = 0;
                        this.score += 10 * jumps;
                        audio.playEat();
                    }

                    if (this.combo > this.maxCombo) {
                        this.maxCombo = this.combo;
                    }

                    // 奖励平台
                    if (platform.type === 'bonus') {
                        this.score += 50;
                        this.addParticles(platform.x + platform.width/2, platform.y, 15, '#ffcc00');
                    }

                    this.currentPlatformIndex = i;

                    // 生成更多平台
                    while (this.platforms.length < this.currentPlatformIndex + 10) {
                        this.addPlatform();
                    }
                }

                this.addParticles(this.player.x, this.player.y + this.player.size, 5);
                return;
            }
        }
    }

    /**
     * 更新相机
     */
    updateCamera() {
        const targetX = this.player.x - this.width / 2;
        const targetY = this.player.y - this.height / 2;

        this.cameraX += (targetX - this.cameraX) * 0.1;
        this.cameraY += (targetY - this.cameraY) * 0.1;
    }

    /**
     * 添加粒子
     */
    addParticles(x, y, count, color = '#ffffff') {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4 - 2,
                life: 1,
                color,
                size: 3 + Math.random() * 3
            });
        }
    }

    /**
     * 更新粒子
     */
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life -= deltaTime * 0.003;
            p.size *= 0.98;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 游戏结束
     */
    gameOver() {
        this.isGameOver = true;
        audio.playGameOver();
    }

    /**
     * 重新开始
     */
    restart() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.isGameOver = false;
        this.charging = false;
        this.currentPlatformIndex = 0;
        this.particles = [];
        this.player.power = 0;
        this.player.squish = 1;
        this.player.jumping = false;
        this.cameraX = 0;
        this.cameraY = 0;
        this.init();
    }

    /**
     * 渲染
     */
    render() {
        // 背景渐变
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 保存状态并应用相机变换
        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // 绘制平台
        for (let i = 0; i < this.platforms.length; i++) {
            this.drawPlatform(this.platforms[i], i === this.currentPlatformIndex + 1);
        }

        // 绘制粒子
        for (const p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;

        // 绘制玩家
        this.drawPlayer();

        // 恢复状态
        this.ctx.restore();

        // UI（固定位置）
        this.renderUI();

        // 蓄力条
        if (this.charging) {
            this.drawPowerBar();
        }

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 40);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`Score: ${Math.floor(this.score)}`, this.width / 2, this.height / 2);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Max Combo: ${this.maxCombo}`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 70);
        }
    }

    /**
     * 绘制平台
     */
    drawPlatform(platform, isNext) {
        const { x, y, width, height, color, type } = platform;

        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x + 3, y + 3, width, height);

        // 平台主体
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x, y, width, 4);

        // 下一个平台指示
        if (isNext) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
            this.ctx.setLineDash([]);
        }

        // 奖励平台特效
        if (type === 'bonus') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('★', x + width / 2, y + height / 2 + 4);
        }
    }

    /**
     * 绘制玩家
     */
    drawPlayer() {
        const { x, y, size, squish } = this.player;

        // 影子
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + size + 3, size * 0.6, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 身体
        this.ctx.fillStyle = '#3498db';
        const bodyHeight = size * squish;
        const bodyWidth = size * (2 - squish);
        
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + size - bodyHeight/2, bodyWidth/2, bodyHeight/2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 眼睛
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x - 4, y + size - bodyHeight/2 - 2, 4, 0, Math.PI * 2);
        this.ctx.arc(x + 4, y + size - bodyHeight/2 - 2, 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x - 3, y + size - bodyHeight/2 - 1, 2, 0, Math.PI * 2);
        this.ctx.arc(x + 5, y + size - bodyHeight/2 - 1, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制蓄力条
     */
    drawPowerBar() {
        const barWidth = 100;
        const barHeight = 10;
        const x = (this.width - barWidth) / 2;
        const y = this.height - 40;

        // 背景
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x, y, barWidth, barHeight);

        // 蓄力量
        const fillWidth = (this.player.power / this.player.maxPower) * barWidth;
        const hue = 120 - (this.player.power / this.player.maxPower) * 120;
        this.ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
        this.ctx.fillRect(x, y, fillWidth, barHeight);

        // 边框
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${Math.floor(this.score)}`, 15, 30);

        // 连击
        if (this.combo > 0) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.fillText(`COMBO x${this.combo}`, 15, 50);
        }

        // 提示
        if (!this.player.jumping && !this.charging) {
            this.ctx.fillStyle = '#888888';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('按住 A 蓄力，松开跳跃', this.width / 2, this.height - 15);
        }
    }
}

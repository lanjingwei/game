/**
 * 打砖块游戏
 * 彩虹色砖块阵列的彩色版本
 */
import { audio } from '../audio.js';

export class Breakout {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 挡板
        this.paddle = {
            x: this.width / 2,
            y: this.height - 25,
            width: 60,
            height: 10,
            speed: 5
        };

        // 球
        this.ball = {
            x: this.width / 2,
            y: this.height - 45,
            radius: 6,
            vx: 0,
            vy: 0,
            speed: 4 * difficulty.speed,
            attached: true
        };

        // 砖块
        this.bricks = [];
        this.brickRows = 6;
        this.brickCols = 10;
        this.brickWidth = 30;
        this.brickHeight = 12;
        this.brickPadding = 2;
        this.brickOffsetX = 10;
        this.brickOffsetY = 40;

        // 彩虹色
        this.rainbowColors = [
            '#ff4444', // 红
            '#ff8844', // 橙
            '#ffcc44', // 黄
            '#44ff44', // 绿
            '#44aaff', // 蓝
            '#aa44ff'  // 紫
        ];

        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.isGameOver = false;
        this.combo = 0;
        this.comboTimer = 0;

        // 粒子效果
        this.particles = [];

        // 道具
        this.powerUps = [];
        this.activePowerUps = {};

        this.init();
    }

    init() {
        this.createBricks();
    }

    /**
     * 创建砖块
     */
    createBricks() {
        this.bricks = [];

        for (let row = 0; row < this.brickRows; row++) {
            for (let col = 0; col < this.brickCols; col++) {
                const x = this.brickOffsetX + col * (this.brickWidth + this.brickPadding);
                const y = this.brickOffsetY + row * (this.brickHeight + this.brickPadding);

                // 某些砖块有特殊属性
                let health = 1;
                let type = 'normal';
                
                if (this.level > 1 && Math.random() < 0.2) {
                    health = 2;
                    type = 'strong';
                }
                if (this.level > 2 && Math.random() < 0.1) {
                    health = 999;
                    type = 'indestructible';
                }

                this.bricks.push({
                    x, y,
                    width: this.brickWidth,
                    height: this.brickHeight,
                    color: this.rainbowColors[row % this.rainbowColors.length],
                    health,
                    type,
                    points: (this.brickRows - row) * 10
                });
            }
        }
    }

    /**
     * 发射球
     */
    launchBall() {
        if (this.ball.attached) {
            this.ball.attached = false;
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 4;
            this.ball.vx = Math.cos(angle) * this.ball.speed;
            this.ball.vy = Math.sin(angle) * this.ball.speed;
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) return;

        // 连击计时器
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.combo = 0;
            }
        }

        // 挡板移动
        if (keys.left) {
            this.paddle.x -= this.paddle.speed;
        }
        if (keys.right) {
            this.paddle.x += this.paddle.speed;
        }

        // 挡板边界
        const halfPaddle = this.paddle.width / 2;
        this.paddle.x = Math.max(halfPaddle, Math.min(this.width - halfPaddle, this.paddle.x));

        // 发射球
        if ((keysPressed.a || keysPressed.b) && this.ball.attached) {
            this.launchBall();
            audio.playSelect();
        }

        // 球跟随挡板
        if (this.ball.attached) {
            this.ball.x = this.paddle.x;
            this.ball.y = this.paddle.y - this.ball.radius - this.paddle.height / 2;
            return;
        }

        // 更新球位置
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // 球与墙壁碰撞
        if (this.ball.x - this.ball.radius < 0) {
            this.ball.x = this.ball.radius;
            this.ball.vx = -this.ball.vx;
            audio.playBounce();
        }
        if (this.ball.x + this.ball.radius > this.width) {
            this.ball.x = this.width - this.ball.radius;
            this.ball.vx = -this.ball.vx;
            audio.playBounce();
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.y = this.ball.radius;
            this.ball.vy = -this.ball.vy;
            audio.playBounce();
        }

        // 球落出屏幕
        if (this.ball.y > this.height + this.ball.radius) {
            this.lives--;
            this.combo = 0;
            
            if (this.lives <= 0) {
                this.isGameOver = true;
            } else {
                this.ball.attached = true;
                this.ball.x = this.paddle.x;
                this.ball.y = this.paddle.y - this.ball.radius - this.paddle.height / 2;
                audio.playHit();
            }
            return;
        }

        // 球与挡板碰撞
        if (this.ball.vy > 0 &&
            this.ball.y + this.ball.radius > this.paddle.y - this.paddle.height / 2 &&
            this.ball.y - this.ball.radius < this.paddle.y + this.paddle.height / 2 &&
            this.ball.x > this.paddle.x - this.paddle.width / 2 &&
            this.ball.x < this.paddle.x + this.paddle.width / 2) {
            
            // 根据击中位置改变反弹角度
            const hitPos = (this.ball.x - this.paddle.x) / (this.paddle.width / 2);
            const angle = hitPos * Math.PI / 3 - Math.PI / 2;
            
            const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
            this.ball.vx = Math.cos(angle) * speed;
            this.ball.vy = Math.sin(angle) * speed;
            
            // 确保球向上移动
            if (this.ball.vy > 0) this.ball.vy = -this.ball.vy;
            
            this.ball.y = this.paddle.y - this.paddle.height / 2 - this.ball.radius;
            audio.playBounce();
        }

        // 球与砖块碰撞
        for (let i = this.bricks.length - 1; i >= 0; i--) {
            const brick = this.bricks[i];
            if (this.checkBrickCollision(brick)) {
                // 反弹
                this.handleBrickCollision(brick);
                
                // 伤害砖块
                brick.health--;
                
                if (brick.health <= 0) {
                    // 增加分数和连击
                    this.combo++;
                    this.comboTimer = 2000;
                    this.score += brick.points * this.combo;
                    
                    // 创建粒子效果
                    this.createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
                    
                    // 可能掉落道具
                    if (Math.random() < 0.1) {
                        this.spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
                    }
                    
                    this.bricks.splice(i, 1);
                    audio.playBreak();
                } else {
                    audio.playHit();
                }
                
                break; // 一次只处理一个碰撞
            }
        }

        // 更新粒子
        this.updateParticles(deltaTime);

        // 更新道具
        this.updatePowerUps(deltaTime);

        // 检查是否清空所有砖块
        const destructibleBricks = this.bricks.filter(b => b.type !== 'indestructible');
        if (destructibleBricks.length === 0) {
            this.level++;
            this.ball.attached = true;
            this.ball.speed += 0.2;
            this.createBricks();
            audio.playLevelUp();
        }
    }

    /**
     * 检查球与砖块碰撞
     */
    checkBrickCollision(brick) {
        const closestX = Math.max(brick.x, Math.min(this.ball.x, brick.x + brick.width));
        const closestY = Math.max(brick.y, Math.min(this.ball.y, brick.y + brick.height));
        const distX = this.ball.x - closestX;
        const distY = this.ball.y - closestY;
        return (distX * distX + distY * distY) < (this.ball.radius * this.ball.radius);
    }

    /**
     * 处理砖块碰撞反弹
     */
    handleBrickCollision(brick) {
        const ballLeft = this.ball.x - this.ball.radius;
        const ballRight = this.ball.x + this.ball.radius;
        const ballTop = this.ball.y - this.ball.radius;
        const ballBottom = this.ball.y + this.ball.radius;

        const overlapLeft = ballRight - brick.x;
        const overlapRight = brick.x + brick.width - ballLeft;
        const overlapTop = ballBottom - brick.y;
        const overlapBottom = brick.y + brick.height - ballTop;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
            this.ball.vx = -this.ball.vx;
        } else {
            this.ball.vy = -this.ball.vy;
        }
    }

    /**
     * 创建粒子效果
     */
    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color,
                life: 300,
                size: 2 + Math.random() * 2
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
            p.vy += 0.1; // 重力
            p.life -= deltaTime;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 生成道具
     */
    spawnPowerUp(x, y) {
        const types = ['expand', 'shrink', 'fast', 'slow', 'life'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const colors = {
            expand: '#44ff44',
            shrink: '#ff4444',
            fast: '#ffaa44',
            slow: '#44aaff',
            life: '#ff44ff'
        };

        this.powerUps.push({
            x, y,
            type,
            color: colors[type],
            width: 10,
            height: 6,
            vy: 1
        });
    }

    /**
     * 更新道具
     */
    updatePowerUps(deltaTime) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const pu = this.powerUps[i];
            pu.y += pu.vy;

            // 落出屏幕
            if (pu.y > this.height) {
                this.powerUps.splice(i, 1);
                continue;
            }

            // 与挡板碰撞
            if (pu.y + pu.height > this.paddle.y - this.paddle.height / 2 &&
                pu.y < this.paddle.y + this.paddle.height / 2 &&
                pu.x + pu.width / 2 > this.paddle.x - this.paddle.width / 2 &&
                pu.x - pu.width / 2 < this.paddle.x + this.paddle.width / 2) {
                
                this.applyPowerUp(pu.type);
                this.powerUps.splice(i, 1);
                audio.playEat();
            }
        }
    }

    /**
     * 应用道具效果
     */
    applyPowerUp(type) {
        switch (type) {
            case 'expand':
                this.paddle.width = Math.min(50, this.paddle.width + 10);
                break;
            case 'shrink':
                this.paddle.width = Math.max(15, this.paddle.width - 10);
                break;
            case 'fast':
                this.ball.speed = Math.min(5, this.ball.speed + 0.5);
                // 重新计算速度方向
                const currentSpeed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
                if (currentSpeed > 0) {
                    this.ball.vx = (this.ball.vx / currentSpeed) * this.ball.speed;
                    this.ball.vy = (this.ball.vy / currentSpeed) * this.ball.speed;
                }
                break;
            case 'slow':
                this.ball.speed = Math.max(1.5, this.ball.speed - 0.5);
                const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
                if (speed > 0) {
                    this.ball.vx = (this.ball.vx / speed) * this.ball.speed;
                    this.ball.vy = (this.ball.vy / speed) * this.ball.speed;
                }
                break;
            case 'life':
                this.lives = Math.min(5, this.lives + 1);
                break;
        }
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 星空背景效果
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 30; i++) {
            const x = (i * 37 + Date.now() / 100) % this.width;
            const y = (i * 23) % this.height;
            this.ctx.fillRect(x, y, 1, 1);
        }

        // 渲染砖块
        for (const brick of this.bricks) {
            this.drawBrick(brick);
        }

        // 渲染粒子
        for (const p of this.particles) {
            const alpha = p.life / 300;
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        this.ctx.globalAlpha = 1;

        // 渲染道具
        for (const pu of this.powerUps) {
            this.drawPowerUp(pu);
        }

        // 渲染挡板
        this.drawPaddle();

        // 渲染球
        this.drawBall();

        // UI
        this.renderUI();
    }

    /**
     * 绘制砖块（带3D效果）
     */
    drawBrick(brick) {
        const { x, y, width, height, color, type, health } = brick;

        if (type === 'indestructible') {
            // 不可摧毁砖块
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(x, y, width, height);
            this.ctx.fillStyle = '#888888';
            this.ctx.fillRect(x + 1, y + 1, width - 2, 2);
            return;
        }

        // 主体颜色
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);

        // 高光（顶部和左侧）
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.fillRect(x, y, width, 1);
        this.ctx.fillRect(x, y, 1, height);

        // 阴影（底部和右侧）
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x, y + height - 1, width, 1);
        this.ctx.fillRect(x + width - 1, y, 1, height);

        // 内部渐变光泽
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x + 1, y + 1, width - 2, height - 2);

        // 强化砖块标记
        if (type === 'strong' && health > 1) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.fillRect(x + width / 2 - 2, y + height / 2 - 1, 4, 2);
        }
    }

    /**
     * 绘制挡板
     */
    drawPaddle() {
        const { x, y, width, height } = this.paddle;
        const left = x - width / 2;
        const top = y - height / 2;

        // 主体
        const gradient = this.ctx.createLinearGradient(left, top, left, top + height);
        gradient.addColorStop(0, '#4488ff');
        gradient.addColorStop(0.5, '#2266dd');
        gradient.addColorStop(1, '#1144aa');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(left, top, width, height, 2);
        this.ctx.fill();

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(left + 2, top, width - 4, 2);

        // 边缘发光
        this.ctx.shadowColor = '#4488ff';
        this.ctx.shadowBlur = 5;
        this.ctx.strokeStyle = '#66aaff';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(left, top, width, height, 2);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    /**
     * 绘制球
     */
    drawBall() {
        const { x, y, radius } = this.ball;

        // 球体
        const gradient = this.ctx.createRadialGradient(x - 1, y - 1, 0, x, y, radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#ffcccc');
        gradient.addColorStop(1, '#ff6666');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 发光效果
        this.ctx.shadowColor = '#ff6666';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    /**
     * 绘制道具
     */
    drawPowerUp(pu) {
        const { x, y, width, height, color, type } = pu;

        // 背景
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width / 2, y - height / 2, width, height);

        // 图标
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '5px monospace';
        this.ctx.textAlign = 'center';
        const icons = { expand: '◄►', shrink: '►◄', fast: '»', slow: '«', life: '♥' };
        this.ctx.fillText(icons[type], x, y + 2);
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 10, 20);

        // 连击
        if (this.combo > 1) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`x${this.combo} COMBO!`, 10, this.height - 10);
        }

        // 关卡
        this.ctx.fillStyle = '#88ff88';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LV.${this.level}`, this.width / 2, 20);

        // 生命
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`♥ ${this.lives}`, this.width - 10, 20);

        // 难度
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(this.difficulty.name, this.width - 10, this.height - 10);

        // 发射提示
        if (this.ball.attached) {
            this.ctx.fillStyle = '#aaaaaa';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            const blink = Math.floor(Date.now() / 500) % 2;
            if (blink) {
                this.ctx.fillText('按 A 发射', this.width / 2, this.height - 55);
            }
        }
    }
}

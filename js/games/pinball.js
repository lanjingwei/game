/**
 * 弹珠台游戏
 * 经典弹球游戏
 */
import { audio } from '../audio.js';

export class Pinball {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 弹珠
        this.ball = {
            x: width / 2,
            y: height - 80,
            vx: 0,
            vy: 0,
            radius: 8,
            active: false
        };

        // 发射器
        this.launcher = {
            x: width - 25,
            power: 0,
            maxPower: 20,
            charging: false
        };

        // 挡板（左右）
        this.leftFlipper = {
            x: 60,
            y: height - 50,
            length: 45,
            angle: 0.3,
            targetAngle: 0.3,
            speed: 0.5
        };
        this.rightFlipper = {
            x: width - 60,
            y: height - 50,
            length: 45,
            angle: Math.PI - 0.3,
            targetAngle: Math.PI - 0.3,
            speed: 0.5
        };

        // 障碍物和目标
        this.bumpers = [];
        this.targets = [];
        this.walls = [];

        // 游戏状态
        this.score = 0;
        this.balls = 3;
        this.isGameOver = false;
        this.multiplier = 1;

        // 物理
        this.gravity = 0.15;
        this.friction = 0.99;

        this.init();
    }

    init() {
        this.createObstacles();
    }

    /**
     * 创建障碍物
     */
    createObstacles() {
        // 弹球器（圆形）
        this.bumpers = [
            { x: this.width / 2, y: 100, radius: 25, value: 100, hits: 0 },
            { x: this.width / 2 - 60, y: 150, radius: 20, value: 50, hits: 0 },
            { x: this.width / 2 + 60, y: 150, radius: 20, value: 50, hits: 0 },
            { x: this.width / 2, y: 200, radius: 18, value: 75, hits: 0 }
        ];

        // 目标（可击打）
        this.targets = [
            { x: 30, y: 120, width: 8, height: 30, active: true, value: 200 },
            { x: this.width - 38, y: 120, width: 8, height: 30, active: true, value: 200 },
            { x: 50, y: 80, width: 30, height: 8, active: true, value: 150 },
            { x: this.width - 80, y: 80, width: 30, height: 8, active: true, value: 150 }
        ];

        // 斜坡墙
        this.walls = [
            // 左上斜坡
            { x1: 0, y1: 60, x2: 50, y2: 100 },
            // 右上斜坡
            { x1: this.width, y1: 60, x2: this.width - 50, y2: 100 },
            // 左下斜坡
            { x1: 0, y1: this.height - 100, x2: 40, y2: this.height - 60 },
            // 右下斜坡
            { x1: this.width, y1: this.height - 100, x2: this.width - 40, y2: this.height - 60 }
        ];
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

        // 发射
        if (!this.ball.active) {
            if (keys.a || keys.down) {
                this.launcher.charging = true;
                this.launcher.power = Math.min(
                    this.launcher.maxPower,
                    this.launcher.power + 0.5
                );
            } else if (this.launcher.charging) {
                this.launchBall();
            }
            return;
        }

        // 左挡板
        if (keys.left) {
            this.leftFlipper.targetAngle = -0.5;
        } else {
            this.leftFlipper.targetAngle = 0.3;
        }

        // 右挡板
        if (keys.right) {
            this.rightFlipper.targetAngle = Math.PI + 0.5;
        } else {
            this.rightFlipper.targetAngle = Math.PI - 0.3;
        }

        // 更新挡板角度
        this.updateFlipper(this.leftFlipper);
        this.updateFlipper(this.rightFlipper);

        // 物理更新
        this.ball.vy += this.gravity;
        this.ball.vx *= this.friction;
        this.ball.vy *= this.friction;

        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // 碰撞检测
        this.checkWallCollision();
        this.checkBumperCollision();
        this.checkTargetCollision();
        this.checkFlipperCollision(this.leftFlipper);
        this.checkFlipperCollision(this.rightFlipper);
        this.checkSlopeCollision();

        // 检查球是否掉落
        if (this.ball.y > this.height + 20) {
            this.loseBall();
        }
    }

    /**
     * 发射球
     */
    launchBall() {
        this.ball.active = true;
        this.ball.x = this.launcher.x;
        this.ball.y = this.height - 80;
        this.ball.vx = -2 + Math.random() * 0.5;
        this.ball.vy = -this.launcher.power;
        this.launcher.power = 0;
        this.launcher.charging = false;
        audio.playSelect();
    }

    /**
     * 更新挡板
     */
    updateFlipper(flipper) {
        const diff = flipper.targetAngle - flipper.angle;
        flipper.angle += diff * flipper.speed;
    }

    /**
     * 检查墙壁碰撞
     */
    checkWallCollision() {
        // 左右墙
        if (this.ball.x - this.ball.radius < 0) {
            this.ball.x = this.ball.radius;
            this.ball.vx = -this.ball.vx * 0.8;
            audio.playHit();
        }
        if (this.ball.x + this.ball.radius > this.width - 30) { // 发射通道
            if (this.ball.y < this.height - 100) {
                this.ball.x = this.width - 30 - this.ball.radius;
                this.ball.vx = -this.ball.vx * 0.8;
                audio.playHit();
            }
        }
        if (this.ball.x + this.ball.radius > this.width) {
            this.ball.x = this.width - this.ball.radius;
            this.ball.vx = -this.ball.vx * 0.8;
        }

        // 顶部
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.y = this.ball.radius;
            this.ball.vy = -this.ball.vy * 0.8;
            audio.playHit();
        }
    }

    /**
     * 检查弹球器碰撞
     */
    checkBumperCollision() {
        for (const bumper of this.bumpers) {
            const dx = this.ball.x - bumper.x;
            const dy = this.ball.y - bumper.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = this.ball.radius + bumper.radius;

            if (dist < minDist) {
                // 反弹
                const angle = Math.atan2(dy, dx);
                const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
                const newSpeed = Math.max(speed, 8);

                this.ball.vx = Math.cos(angle) * newSpeed;
                this.ball.vy = Math.sin(angle) * newSpeed;

                // 移开
                this.ball.x = bumper.x + Math.cos(angle) * (minDist + 1);
                this.ball.y = bumper.y + Math.sin(angle) * (minDist + 1);

                // 得分
                this.score += bumper.value * this.multiplier;
                bumper.hits++;
                
                if (bumper.hits >= 5) {
                    bumper.hits = 0;
                    this.multiplier = Math.min(5, this.multiplier + 1);
                }

                audio.playClear();
            }
        }
    }

    /**
     * 检查目标碰撞
     */
    checkTargetCollision() {
        for (const target of this.targets) {
            if (!target.active) continue;

            if (this.ball.x + this.ball.radius > target.x &&
                this.ball.x - this.ball.radius < target.x + target.width &&
                this.ball.y + this.ball.radius > target.y &&
                this.ball.y - this.ball.radius < target.y + target.height) {
                
                target.active = false;
                this.score += target.value * this.multiplier;
                
                // 反弹
                if (target.width > target.height) {
                    this.ball.vy = -this.ball.vy;
                } else {
                    this.ball.vx = -this.ball.vx;
                }

                audio.playExplosion();

                // 检查是否所有目标都击中
                if (this.targets.every(t => !t.active)) {
                    this.score += 1000;
                    this.multiplier = Math.min(5, this.multiplier + 1);
                    // 重置目标
                    for (const t of this.targets) {
                        t.active = true;
                    }
                    audio.playLevelUp();
                }
            }
        }
    }

    /**
     * 检查挡板碰撞
     */
    checkFlipperCollision(flipper) {
        const endX = flipper.x + Math.cos(flipper.angle) * flipper.length;
        const endY = flipper.y + Math.sin(flipper.angle) * flipper.length;

        // 简化的线段碰撞检测
        const dx = endX - flipper.x;
        const dy = endY - flipper.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len;
        const ny = dx / len;

        // 球到线段的距离
        const ballToPivotX = this.ball.x - flipper.x;
        const ballToPivotY = this.ball.y - flipper.y;
        
        const dot = (ballToPivotX * dx + ballToPivotY * dy) / len;
        
        if (dot >= 0 && dot <= len) {
            const closestX = flipper.x + (dx / len) * dot;
            const closestY = flipper.y + (dy / len) * dot;
            
            const distX = this.ball.x - closestX;
            const distY = this.ball.y - closestY;
            const dist = Math.sqrt(distX * distX + distY * distY);

            if (dist < this.ball.radius + 5) {
                // 计算反弹
                const flipperSpeed = (flipper.targetAngle - flipper.angle) * 20;
                
                this.ball.vx = nx * 8 + flipperSpeed * nx;
                this.ball.vy = ny * 8 + flipperSpeed * 0.5;
                
                // 确保向上
                if (this.ball.vy > 0) {
                    this.ball.vy = -Math.abs(this.ball.vy);
                }

                // 移开
                this.ball.x = closestX + nx * (this.ball.radius + 6);
                this.ball.y = closestY + ny * (this.ball.radius + 6);

                audio.playHit();
            }
        }
    }

    /**
     * 检查斜坡碰撞
     */
    checkSlopeCollision() {
        for (const wall of this.walls) {
            const dx = wall.x2 - wall.x1;
            const dy = wall.y2 - wall.y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            const t = Math.max(0, Math.min(1,
                ((this.ball.x - wall.x1) * dx + (this.ball.y - wall.y1) * dy) / (len * len)
            ));
            
            const closestX = wall.x1 + t * dx;
            const closestY = wall.y1 + t * dy;
            
            const distX = this.ball.x - closestX;
            const distY = this.ball.y - closestY;
            const dist = Math.sqrt(distX * distX + distY * distY);

            if (dist < this.ball.radius) {
                // 法向量
                const nx = distX / dist;
                const ny = distY / dist;
                
                // 反射
                const dot = this.ball.vx * nx + this.ball.vy * ny;
                this.ball.vx -= 2 * dot * nx;
                this.ball.vy -= 2 * dot * ny;
                
                // 移开
                this.ball.x = closestX + nx * (this.ball.radius + 1);
                this.ball.y = closestY + ny * (this.ball.radius + 1);

                audio.playHit();
            }
        }
    }

    /**
     * 丢失球
     */
    loseBall() {
        this.balls--;
        this.multiplier = 1;
        
        if (this.balls <= 0) {
            this.isGameOver = true;
            audio.playGameOver();
        } else {
            this.ball.active = false;
            this.ball.x = this.launcher.x;
            this.ball.y = this.height - 80;
            this.ball.vx = 0;
            this.ball.vy = 0;
            audio.playExplosion();
        }
    }

    /**
     * 重新开始
     */
    restart() {
        this.score = 0;
        this.balls = 3;
        this.multiplier = 1;
        this.isGameOver = false;
        this.ball.active = false;
        this.ball.x = this.launcher.x;
        this.ball.y = this.height - 80;
        this.launcher.power = 0;
        
        for (const target of this.targets) {
            target.active = true;
        }
        for (const bumper of this.bumpers) {
            bumper.hits = 0;
        }
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 发射通道
        this.ctx.fillStyle = '#0f0f1a';
        this.ctx.fillRect(this.width - 30, 0, 30, this.height);

        // 斜坡墙
        this.ctx.strokeStyle = '#4a4a6a';
        this.ctx.lineWidth = 4;
        for (const wall of this.walls) {
            this.ctx.beginPath();
            this.ctx.moveTo(wall.x1, wall.y1);
            this.ctx.lineTo(wall.x2, wall.y2);
            this.ctx.stroke();
        }

        // 弹球器
        for (const bumper of this.bumpers) {
            this.drawBumper(bumper);
        }

        // 目标
        for (const target of this.targets) {
            if (target.active) {
                this.ctx.fillStyle = '#ff6b6b';
                this.ctx.fillRect(target.x, target.y, target.width, target.height);
            }
        }

        // 挡板
        this.drawFlipper(this.leftFlipper);
        this.drawFlipper(this.rightFlipper);

        // 球
        if (this.ball.active) {
            this.drawBall();
        }

        // 发射器
        this.drawLauncher();

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 20);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`Score: ${this.score}`, this.width / 2, this.height / 2 + 15);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 50);
        }
    }

    /**
     * 绘制弹球器
     */
    drawBumper(bumper) {
        const pulse = 1 + Math.sin(Date.now() * 0.01 + bumper.hits) * 0.1;
        
        // 外圈
        this.ctx.fillStyle = '#ff4757';
        this.ctx.beginPath();
        this.ctx.arc(bumper.x, bumper.y, bumper.radius * pulse, 0, Math.PI * 2);
        this.ctx.fill();

        // 内圈
        this.ctx.fillStyle = '#ff6b81';
        this.ctx.beginPath();
        this.ctx.arc(bumper.x, bumper.y, bumper.radius * 0.6 * pulse, 0, Math.PI * 2);
        this.ctx.fill();

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(bumper.x - bumper.radius * 0.3, bumper.y - bumper.radius * 0.3, 
                    bumper.radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制挡板
     */
    drawFlipper(flipper) {
        const endX = flipper.x + Math.cos(flipper.angle) * flipper.length;
        const endY = flipper.y + Math.sin(flipper.angle) * flipper.length;

        this.ctx.strokeStyle = '#00d9ff';
        this.ctx.lineWidth = 12;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(flipper.x, flipper.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // 枢轴点
        this.ctx.fillStyle = '#00a8cc';
        this.ctx.beginPath();
        this.ctx.arc(flipper.x, flipper.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制球
     */
    drawBall() {
        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x + 2, this.ball.y + 2, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 球体
        const gradient = this.ctx.createRadialGradient(
            this.ball.x - 2, this.ball.y - 2, 0,
            this.ball.x, this.ball.y, this.ball.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#c0c0c0');
        gradient.addColorStop(1, '#808080');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制发射器
     */
    drawLauncher() {
        const x = this.launcher.x;
        const y = this.height - 30;

        // 发射杆
        const pullBack = this.launcher.power * 2;
        this.ctx.fillStyle = '#ff9f43';
        this.ctx.fillRect(x - 8, y - 20 + pullBack, 16, 20);

        // 弹簧
        this.ctx.strokeStyle = '#888888';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const sy = y + i * 8 + pullBack;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 6, sy);
            this.ctx.lineTo(x + 6, sy + 4);
            this.ctx.stroke();
        }

        // 待发射的球
        if (!this.ball.active) {
            this.ctx.fillStyle = '#c0c0c0';
            this.ctx.beginPath();
            this.ctx.arc(x, this.height - 80, this.ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.score}`, 10, 25);

        // 倍率
        if (this.multiplier > 1) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`x${this.multiplier}`, 10, 42);
        }

        // 剩余球数
        this.ctx.fillStyle = '#c0c0c0';
        for (let i = 0; i < this.balls; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.width - 50 + i * 18, 20, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 操作提示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        if (!this.ball.active) {
            this.ctx.fillText('按住A蓄力发射', this.width / 2 - 15, this.height - 10);
        } else {
            this.ctx.fillText('←左板 →右板', this.width / 2 - 15, this.height - 10);
        }
    }
}

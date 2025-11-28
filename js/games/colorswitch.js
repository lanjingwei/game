/**
 * 颜色切换游戏
 * 颜色匹配跳跃游戏
 */
import { audio } from '../audio.js';

export class ColorSwitch {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 颜色
        this.colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];

        // 球
        this.ball = {
            x: width / 2,
            y: height - 100,
            radius: 12,
            vy: 0,
            colorIndex: 0
        };

        // 物理
        this.gravity = 0.3;
        this.jumpPower = -9;

        // 障碍物
        this.obstacles = [];
        this.stars = [];
        this.colorSwitchers = [];

        // 相机
        this.cameraY = 0;
        this.targetCameraY = 0;

        // 游戏状态
        this.score = 0;
        this.isGameOver = false;
        this.started = false;

        this.initLevel();
    }

    /**
     * 初始化关卡
     */
    initLevel() {
        this.obstacles = [];
        this.stars = [];
        this.colorSwitchers = [];

        let y = this.height - 200;

        // 生成障碍物
        for (let i = 0; i < 20; i++) {
            y -= 150 + Math.random() * 50;
            
            const type = Math.floor(Math.random() * 3);
            
            if (type === 0) {
                // 旋转圆环
                this.obstacles.push({
                    type: 'ring',
                    x: this.width / 2,
                    y,
                    radius: 50,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (0.02 + Math.random() * 0.02) * this.difficulty.speed * (Math.random() > 0.5 ? 1 : -1)
                });
            } else if (type === 1) {
                // 横向移动条
                this.obstacles.push({
                    type: 'bar',
                    x: this.width / 2,
                    y,
                    width: 200,
                    height: 20,
                    moveX: 0,
                    moveSpeed: (1 + Math.random()) * this.difficulty.speed
                });
            } else {
                // 旋转方块
                this.obstacles.push({
                    type: 'square',
                    x: this.width / 2,
                    y,
                    size: 80,
                    rotation: 0,
                    rotSpeed: (0.02 + Math.random() * 0.01) * this.difficulty.speed * (Math.random() > 0.5 ? 1 : -1)
                });
            }

            // 星星
            this.stars.push({
                x: this.width / 2,
                y: y,
                collected: false
            });

            // 颜色切换器
            this.colorSwitchers.push({
                x: this.width / 2,
                y: y + 70,
                rotation: 0
            });
        }
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

        // 开始游戏
        if (!this.started) {
            if (keysPressed.a) {
                this.started = true;
                this.ball.vy = this.jumpPower;
                audio.playSelect();
            }
            return;
        }

        // 跳跃
        if (keysPressed.a) {
            this.ball.vy = this.jumpPower;
            audio.playSelect();
        }

        // 重力
        this.ball.vy += this.gravity;
        this.ball.y += this.ball.vy;

        // 相机跟随
        this.targetCameraY = Math.min(0, this.height / 2 - this.ball.y);
        this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;

        // 更新障碍物
        for (const obs of this.obstacles) {
            if (obs.type === 'ring' || obs.type === 'square') {
                obs.rotation += obs.rotSpeed;
            } else if (obs.type === 'bar') {
                obs.moveX += obs.moveSpeed;
                if (Math.abs(obs.moveX) > 50) {
                    obs.moveSpeed *= -1;
                }
            }
        }

        // 更新颜色切换器
        for (const switcher of this.colorSwitchers) {
            switcher.rotation += 0.05;
        }

        // 碰撞检测
        this.checkCollisions();

        // 检查掉落
        if (this.ball.y - this.cameraY > this.height + 50) {
            this.gameOver();
        }
    }

    /**
     * 碰撞检测
     */
    checkCollisions() {
        const ballY = this.ball.y;

        // 检查星星
        for (const star of this.stars) {
            if (star.collected) continue;
            
            const dist = Math.sqrt(
                Math.pow(this.ball.x - star.x, 2) +
                Math.pow(this.ball.y - star.y, 2)
            );

            if (dist < 25) {
                star.collected = true;
                this.score++;
                audio.playEat();
            }
        }

        // 检查颜色切换器
        for (const switcher of this.colorSwitchers) {
            const dist = Math.sqrt(
                Math.pow(this.ball.x - switcher.x, 2) +
                Math.pow(this.ball.y - switcher.y, 2)
            );

            if (dist < 20) {
                this.ball.colorIndex = (this.ball.colorIndex + 1) % this.colors.length;
                switcher.y = -9999; // 移除
                audio.playClear();
            }
        }

        // 检查障碍物碰撞
        for (const obs of this.obstacles) {
            if (Math.abs(this.ball.y - obs.y) > 100) continue;

            if (obs.type === 'ring') {
                this.checkRingCollision(obs);
            } else if (obs.type === 'bar') {
                this.checkBarCollision(obs);
            } else if (obs.type === 'square') {
                this.checkSquareCollision(obs);
            }
        }
    }

    /**
     * 检查圆环碰撞
     */
    checkRingCollision(ring) {
        const dist = Math.sqrt(
            Math.pow(this.ball.x - ring.x, 2) +
            Math.pow(this.ball.y - ring.y, 2)
        );

        // 在圆环区域内
        if (dist > ring.radius - 15 && dist < ring.radius + 15) {
            // 计算球在圆环上的角度
            const ballAngle = Math.atan2(this.ball.y - ring.y, this.ball.x - ring.x);
            const adjustedAngle = ballAngle - ring.rotation;
            
            // 根据角度确定颜色区域
            let colorIndex = Math.floor(((adjustedAngle + Math.PI) / (Math.PI * 2)) * 4) % 4;
            if (colorIndex < 0) colorIndex += 4;

            if (colorIndex !== this.ball.colorIndex) {
                this.gameOver();
            }
        }
    }

    /**
     * 检查横条碰撞
     */
    checkBarCollision(bar) {
        const barX = bar.x + bar.moveX;
        
        if (Math.abs(this.ball.y - bar.y) < bar.height / 2 + this.ball.radius &&
            Math.abs(this.ball.x - barX) < bar.width / 2) {
            
            // 确定碰撞的颜色区域
            const segmentWidth = bar.width / 4;
            const relativeX = this.ball.x - (barX - bar.width / 2);
            const colorIndex = Math.floor(relativeX / segmentWidth);

            if (colorIndex !== this.ball.colorIndex) {
                this.gameOver();
            }
        }
    }

    /**
     * 检查方块碰撞
     */
    checkSquareCollision(square) {
        const dist = Math.sqrt(
            Math.pow(this.ball.x - square.x, 2) +
            Math.pow(this.ball.y - square.y, 2)
        );

        const halfSize = square.size / 2;

        if (dist > halfSize - 15 && dist < halfSize + 15) {
            const ballAngle = Math.atan2(this.ball.y - square.y, this.ball.x - square.x);
            const adjustedAngle = ballAngle - square.rotation;
            
            let colorIndex = Math.floor(((adjustedAngle + Math.PI) / (Math.PI * 2)) * 4) % 4;
            if (colorIndex < 0) colorIndex += 4;

            if (colorIndex !== this.ball.colorIndex) {
                this.gameOver();
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
        this.ball.x = this.width / 2;
        this.ball.y = this.height - 100;
        this.ball.vy = 0;
        this.ball.colorIndex = 0;
        this.score = 0;
        this.cameraY = 0;
        this.targetCameraY = 0;
        this.isGameOver = false;
        this.started = false;
        this.initLevel();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();
        this.ctx.translate(0, this.cameraY);

        // 颜色切换器
        for (const switcher of this.colorSwitchers) {
            this.drawColorSwitcher(switcher);
        }

        // 障碍物
        for (const obs of this.obstacles) {
            if (obs.type === 'ring') {
                this.drawRing(obs);
            } else if (obs.type === 'bar') {
                this.drawBar(obs);
            } else if (obs.type === 'square') {
                this.drawSquare(obs);
            }
        }

        // 星星
        for (const star of this.stars) {
            if (!star.collected) {
                this.drawStar(star);
            }
        }

        // 球
        this.drawBall();

        this.ctx.restore();

        // UI
        this.renderUI();

        // 开始提示
        if (!this.started) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 20px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('颜色切换', this.width / 2, this.height / 2 - 20);

            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 开始', this.width / 2, this.height / 2 + 20);
        }

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 30);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2 + 10);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 50);
        }
    }

    /**
     * 绘制圆环
     */
    drawRing(ring) {
        this.ctx.save();
        this.ctx.translate(ring.x, ring.y);
        this.ctx.rotate(ring.rotation);

        const arcAngle = Math.PI / 2;
        
        for (let i = 0; i < 4; i++) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ring.radius, i * arcAngle, (i + 1) * arcAngle);
            this.ctx.lineWidth = 12;
            this.ctx.strokeStyle = this.colors[i];
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /**
     * 绘制横条
     */
    drawBar(bar) {
        const barX = bar.x + bar.moveX;
        const segmentWidth = bar.width / 4;

        for (let i = 0; i < 4; i++) {
            this.ctx.fillStyle = this.colors[i];
            this.ctx.fillRect(
                barX - bar.width / 2 + i * segmentWidth,
                bar.y - bar.height / 2,
                segmentWidth,
                bar.height
            );
        }
    }

    /**
     * 绘制方块
     */
    drawSquare(square) {
        this.ctx.save();
        this.ctx.translate(square.x, square.y);
        this.ctx.rotate(square.rotation);

        const half = square.size / 2;
        const thickness = 12;

        // 四条边
        this.ctx.fillStyle = this.colors[0];
        this.ctx.fillRect(-half, -half, square.size, thickness);
        
        this.ctx.fillStyle = this.colors[1];
        this.ctx.fillRect(half - thickness, -half, thickness, square.size);
        
        this.ctx.fillStyle = this.colors[2];
        this.ctx.fillRect(-half, half - thickness, square.size, thickness);
        
        this.ctx.fillStyle = this.colors[3];
        this.ctx.fillRect(-half, -half, thickness, square.size);

        this.ctx.restore();
    }

    /**
     * 绘制星星
     */
    drawStar(star) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const x = star.x + Math.cos(angle) * 10;
            const y = star.y + Math.sin(angle) * 10;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * 绘制颜色切换器
     */
    drawColorSwitcher(switcher) {
        this.ctx.save();
        this.ctx.translate(switcher.x, switcher.y);
        this.ctx.rotate(switcher.rotation);

        const radius = 12;
        
        for (let i = 0; i < 4; i++) {
            this.ctx.fillStyle = this.colors[i];
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, i * Math.PI / 2, (i + 1) * Math.PI / 2);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    /**
     * 绘制球
     */
    drawBall() {
        this.ctx.fillStyle = this.colors[this.ball.colorIndex];
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x - 4, this.ball.y - 4, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.score}`, this.width / 2, 35);
    }
}

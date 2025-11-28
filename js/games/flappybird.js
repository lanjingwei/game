/**
 * Flappy Bird游戏
 * 经典休闲游戏
 */
import { audio } from '../audio.js';

export class FlappyBird {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 小鸟
        this.bird = {
            x: 80,
            y: height / 2,
            vy: 0,
            radius: 12,
            angle: 0,
            flapFrame: 0
        };

        // 物理参数
        this.gravity = 0.4 * difficulty.speed;
        this.jumpPower = -7;
        this.maxFallSpeed = 10;

        // 管道
        this.pipes = [];
        this.pipeWidth = 40;
        this.pipeGap = 100 - difficulty.speed * 10;
        this.pipeSpeed = 2 * difficulty.speed;
        this.pipeSpawnTimer = 0;
        this.pipeSpawnInterval = 2000 / difficulty.speed;

        // 地面
        this.groundY = height - 40;
        this.groundScroll = 0;

        // 游戏状态
        this.score = 0;
        this.bestScore = 0;
        this.isGameOver = false;
        this.started = false;

        // 云朵装饰
        this.clouds = [];
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * width,
                y: 30 + Math.random() * 80,
                size: 20 + Math.random() * 30,
                speed: 0.3 + Math.random() * 0.3
            });
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) {
            if (keysPressed.a || keysPressed.b) {
                this.restart();
            }
            return;
        }

        // 开始游戏
        if (!this.started) {
            if (keysPressed.a || keysPressed.b) {
                this.started = true;
                this.flap();
            }
            // 小鸟待机动画
            this.bird.y = this.height / 2 + Math.sin(Date.now() * 0.005) * 10;
            return;
        }

        // 跳跃
        if (keysPressed.a || keysPressed.b) {
            this.flap();
        }

        // 重力
        this.bird.vy += this.gravity;
        this.bird.vy = Math.min(this.maxFallSpeed, this.bird.vy);
        this.bird.y += this.bird.vy;

        // 小鸟角度
        this.bird.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.bird.vy * 0.1));

        // 翅膀动画
        this.bird.flapFrame += deltaTime * 0.02;

        // 碰撞检测 - 天花板和地面
        if (this.bird.y - this.bird.radius < 0) {
            this.bird.y = this.bird.radius;
            this.bird.vy = 0;
        }
        if (this.bird.y + this.bird.radius > this.groundY) {
            this.gameOver();
            return;
        }

        // 生成管道
        this.pipeSpawnTimer += deltaTime;
        if (this.pipeSpawnTimer >= this.pipeSpawnInterval) {
            this.pipeSpawnTimer = 0;
            this.spawnPipe();
        }

        // 更新管道
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;

            // 计分
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                audio.playEat();
            }

            // 碰撞检测
            if (this.checkPipeCollision(pipe)) {
                this.gameOver();
                return;
            }

            // 移除离开屏幕的管道
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
        }

        // 更新地面滚动
        this.groundScroll -= this.pipeSpeed;
        if (this.groundScroll <= -20) {
            this.groundScroll = 0;
        }

        // 更新云朵
        for (const cloud of this.clouds) {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.size < 0) {
                cloud.x = this.width + cloud.size;
                cloud.y = 30 + Math.random() * 80;
            }
        }
    }

    /**
     * 拍打翅膀
     */
    flap() {
        this.bird.vy = this.jumpPower;
        this.bird.flapFrame = 0;
        audio.playSelect();
    }

    /**
     * 生成管道
     */
    spawnPipe() {
        const minHeight = 40;
        const maxHeight = this.groundY - this.pipeGap - 40;
        const topHeight = minHeight + Math.random() * (maxHeight - minHeight);

        this.pipes.push({
            x: this.width,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            passed: false
        });
    }

    /**
     * 检查管道碰撞
     */
    checkPipeCollision(pipe) {
        const birdLeft = this.bird.x - this.bird.radius;
        const birdRight = this.bird.x + this.bird.radius;
        const birdTop = this.bird.y - this.bird.radius;
        const birdBottom = this.bird.y + this.bird.radius;

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + this.pipeWidth;

        // 检查是否在管道的x范围内
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // 检查是否碰到上管道或下管道
            if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
                return true;
            }
        }

        return false;
    }

    /**
     * 游戏结束
     */
    gameOver() {
        this.isGameOver = true;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
        }
        audio.playGameOver();
    }

    /**
     * 重新开始
     */
    restart() {
        this.bird.y = this.height / 2;
        this.bird.vy = 0;
        this.bird.angle = 0;
        this.pipes = [];
        this.score = 0;
        this.isGameOver = false;
        this.started = false;
        this.pipeSpawnTimer = 0;
    }

    /**
     * 渲染
     */
    render() {
        // 天空背景
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
        skyGradient.addColorStop(0, '#4dc9ff');
        skyGradient.addColorStop(1, '#87ceeb');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.width, this.groundY);

        // 云朵
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (const cloud of this.clouds) {
            this.drawCloud(cloud.x, cloud.y, cloud.size);
        }

        // 管道
        for (const pipe of this.pipes) {
            this.drawPipe(pipe);
        }

        // 地面
        this.drawGround();

        // 小鸟
        this.drawBird();

        // UI
        this.renderUI();

        // 开始提示
        if (!this.started && !this.isGameOver) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('按 A 开始', this.width / 2, this.height / 2 + 60);
            
            // 闪烁效果
            if (Math.floor(Date.now() / 500) % 2) {
                this.ctx.fillText('▲', this.width / 2, this.height / 2 + 30);
            }
        }

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 30);

            this.ctx.font = '18px monospace';
            this.ctx.fillText(`Score: ${this.score}`, this.width / 2, this.height / 2 + 10);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.fillText(`Best: ${this.bestScore}`, this.width / 2, this.height / 2 + 40);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 80);
        }
    }

    /**
     * 绘制云朵
     */
    drawCloud(x, y, size) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.4, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制管道
     */
    drawPipe(pipe) {
        const x = pipe.x;
        const w = this.pipeWidth;

        // 上管道
        const gradient1 = this.ctx.createLinearGradient(x, 0, x + w, 0);
        gradient1.addColorStop(0, '#73bf2e');
        gradient1.addColorStop(0.3, '#8cd948');
        gradient1.addColorStop(0.7, '#8cd948');
        gradient1.addColorStop(1, '#5a9c24');
        
        this.ctx.fillStyle = gradient1;
        this.ctx.fillRect(x, 0, w, pipe.topHeight);
        
        // 上管道头部
        this.ctx.fillRect(x - 3, pipe.topHeight - 20, w + 6, 20);

        // 下管道
        const gradient2 = this.ctx.createLinearGradient(x, 0, x + w, 0);
        gradient2.addColorStop(0, '#73bf2e');
        gradient2.addColorStop(0.3, '#8cd948');
        gradient2.addColorStop(0.7, '#8cd948');
        gradient2.addColorStop(1, '#5a9c24');
        
        this.ctx.fillStyle = gradient2;
        this.ctx.fillRect(x, pipe.bottomY, w, this.groundY - pipe.bottomY);
        
        // 下管道头部
        this.ctx.fillRect(x - 3, pipe.bottomY, w + 6, 20);

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x + 3, 0, 5, pipe.topHeight);
        this.ctx.fillRect(x + 3, pipe.bottomY, 5, this.groundY - pipe.bottomY);
    }

    /**
     * 绘制地面
     */
    drawGround() {
        // 地面主体
        this.ctx.fillStyle = '#ded895';
        this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

        // 草地
        this.ctx.fillStyle = '#5eb438';
        this.ctx.fillRect(0, this.groundY, this.width, 10);

        // 地面纹理
        this.ctx.fillStyle = '#c9bc7a';
        for (let x = this.groundScroll; x < this.width + 20; x += 20) {
            this.ctx.fillRect(x, this.groundY + 15, 10, 5);
            this.ctx.fillRect(x + 10, this.groundY + 25, 10, 5);
        }
    }

    /**
     * 绘制小鸟
     */
    drawBird() {
        const { x, y, angle, radius, flapFrame } = this.bird;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        // 身体
        const bodyGradient = this.ctx.createRadialGradient(-2, -2, 0, 0, 0, radius);
        bodyGradient.addColorStop(0, '#ffe066');
        bodyGradient.addColorStop(1, '#f4c430');
        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, radius, radius * 0.9, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 翅膀
        const wingY = Math.sin(flapFrame * 3) * 4;
        this.ctx.fillStyle = '#e6b800';
        this.ctx.beginPath();
        this.ctx.ellipse(-5, wingY, 8, 5, -0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // 眼睛（白色部分）
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(5, -3, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // 瞳孔
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(7, -2, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // 眼睛高光
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(8, -3, 1, 0, Math.PI * 2);
        this.ctx.fill();

        // 嘴巴
        this.ctx.fillStyle = '#ff6b35';
        this.ctx.beginPath();
        this.ctx.moveTo(radius - 2, 0);
        this.ctx.lineTo(radius + 8, 2);
        this.ctx.lineTo(radius - 2, 5);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数（带阴影）
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 36px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.score.toString(), this.width / 2 + 2, 52);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(this.score.toString(), this.width / 2, 50);

        // 难度
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.difficulty.name, this.width - 10, 20);
    }
}

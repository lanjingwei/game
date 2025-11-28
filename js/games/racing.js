/**
 * 极速赛车游戏
 * 带道路标线和速度感的彩色版本
 */
import { audio } from '../audio.js';

export class Racing {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 赛道设置
        this.roadWidth = 160;
        this.roadX = (this.width - this.roadWidth) / 2;
        this.laneCount = 3;
        this.laneWidth = this.roadWidth / this.laneCount;

        // 玩家
        this.playerLane = 1;
        this.playerX = this.roadX + this.laneWidth * this.playerLane + this.laneWidth / 2;
        this.playerY = this.height - 50;
        this.playerWidth = 28;
        this.playerHeight = 44;
        this.targetX = this.playerX;

        // 游戏状态
        this.score = 0;
        this.distance = 0;
        this.speed = 3 * difficulty.speed;
        this.maxSpeed = 8 * difficulty.speed;
        this.isGameOver = false;

        // 障碍物
        this.obstacles = [];
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnInterval = 1500 / difficulty.speed;

        // 道路标线
        this.roadLines = [];
        this.lineSpacing = 30;

        // 速度线效果
        this.speedLines = [];

        // 碰撞闪烁
        this.hitFlash = 0;

        this.init();
    }

    init() {
        // 初始化道路标线
        for (let y = 0; y < this.height + this.lineSpacing; y += this.lineSpacing) {
            this.roadLines.push(y);
        }

        // 初始化速度线
        for (let i = 0; i < 10; i++) {
            this.speedLines.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                length: Math.random() * 10 + 5
            });
        }

        audio.startEngine();
    }

    /**
     * 生成障碍物
     */
    spawnObstacle() {
        const lane = Math.floor(Math.random() * this.laneCount);
        const types = ['car', 'car', 'car', 'truck', 'oil'];
        const type = types[Math.floor(Math.random() * types.length)];

        let obstacle = {
            lane,
            x: this.roadX + this.laneWidth * lane + this.laneWidth / 2,
            y: -60,
            type,
            width: type === 'truck' ? 32 : 24,
            height: type === 'truck' ? 56 : 40,
            color: this.randomCarColor()
        };

        // 检查是否与其他障碍物重叠
        const tooClose = this.obstacles.some(obs => 
            Math.abs(obs.lane - lane) === 0 && obs.y < 50
        );

        if (!tooClose) {
            this.obstacles.push(obstacle);
        }
    }

    /**
     * 随机车辆颜色
     */
    randomCarColor() {
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ffffff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) {
            audio.stopEngine();
            return;
        }

        // 加速/减速
        if (keys.up) {
            this.speed = Math.min(this.maxSpeed, this.speed + 0.1);
        } else if (keys.down) {
            this.speed = Math.max(2, this.speed - 0.1);
        }

        // 左右移动
        if (keysPressed.left && this.playerLane > 0) {
            this.playerLane--;
            this.targetX = this.roadX + this.laneWidth * this.playerLane + this.laneWidth / 2;
            audio.playMove();
        }
        if (keysPressed.right && this.playerLane < this.laneCount - 1) {
            this.playerLane++;
            this.targetX = this.roadX + this.laneWidth * this.playerLane + this.laneWidth / 2;
            audio.playMove();
        }

        // 平滑移动
        this.playerX += (this.targetX - this.playerX) * 0.2;

        // 更新道路标线
        for (let i = 0; i < this.roadLines.length; i++) {
            this.roadLines[i] += this.speed;
            if (this.roadLines[i] > this.height + this.lineSpacing) {
                this.roadLines[i] -= this.height + this.lineSpacing;
            }
        }

        // 更新速度线
        for (const line of this.speedLines) {
            line.y += this.speed * 1.5;
            if (line.y > this.height) {
                line.y = -line.length;
                line.x = Math.random() * this.width;
            }
        }

        // 生成障碍物
        this.obstacleSpawnTimer += deltaTime;
        if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
            this.obstacleSpawnTimer = 0;
            this.spawnObstacle();
            // 随着速度增加，生成更快
            this.obstacleSpawnInterval = Math.max(500, 1500 / this.speed);
        }

        // 更新障碍物
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.y += this.speed;

            // 移除离开屏幕的障碍物
            if (obs.y > this.height + 50) {
                this.obstacles.splice(i, 1);
                this.score += 10;
                continue;
            }

            // 碰撞检测
            if (this.checkCollision(obs)) {
                if (obs.type === 'oil') {
                    // 油污只是减速
                    this.speed = Math.max(2, this.speed - 1);
                    this.obstacles.splice(i, 1);
                    audio.playHit();
                } else {
                    this.isGameOver = true;
                    audio.playExplosion();
                }
            }
        }

        // 更新分数
        this.distance += this.speed;
        if (this.distance >= 100) {
            this.score += Math.floor(this.distance / 100);
            this.distance %= 100;
        }

        // 更新引擎声音
        audio.updateEngine(this.speed * 10);

        // 碰撞闪烁
        if (this.hitFlash > 0) {
            this.hitFlash -= deltaTime;
        }
    }

    /**
     * 碰撞检测
     */
    checkCollision(obstacle) {
        const playerLeft = this.playerX - this.playerWidth / 2;
        const playerRight = this.playerX + this.playerWidth / 2;
        const playerTop = this.playerY - this.playerHeight / 2;
        const playerBottom = this.playerY + this.playerHeight / 2;

        const obsLeft = obstacle.x - obstacle.width / 2;
        const obsRight = obstacle.x + obstacle.width / 2;
        const obsTop = obstacle.y - obstacle.height / 2;
        const obsBottom = obstacle.y + obstacle.height / 2;

        return playerLeft < obsRight && playerRight > obsLeft &&
               playerTop < obsBottom && playerBottom > obsTop;
    }

    /**
     * 渲染
     */
    render() {
        // 背景（草地）
        this.ctx.fillStyle = '#1a3d1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 速度线效果
        if (this.speed > 4) {
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${(this.speed - 4) / 10})`;
            this.ctx.lineWidth = 1;
            for (const line of this.speedLines) {
                this.ctx.beginPath();
                this.ctx.moveTo(line.x, line.y);
                this.ctx.lineTo(line.x, line.y + line.length * (this.speed / 5));
                this.ctx.stroke();
            }
        }

        // 道路
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(this.roadX, 0, this.roadWidth, this.height);

        // 道路边缘（红白相间）
        for (let y = 0; y < this.height; y += 10) {
            const offset = Math.floor(y / 10) % 2;
            this.ctx.fillStyle = offset ? '#ff0000' : '#ffffff';
            this.ctx.fillRect(this.roadX - 3, y, 3, 10);
            this.ctx.fillRect(this.roadX + this.roadWidth, y, 3, 10);
        }

        // 道路中线（虚线）
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        
        for (let i = 1; i < this.laneCount; i++) {
            const lineX = this.roadX + i * this.laneWidth;
            this.ctx.beginPath();
            for (const y of this.roadLines) {
                this.ctx.moveTo(lineX, y);
                this.ctx.lineTo(lineX, y + 15);
            }
            this.ctx.stroke();
        }
        this.ctx.setLineDash([]);

        // 渲染障碍物
        for (const obs of this.obstacles) {
            this.drawObstacle(obs);
        }

        // 渲染玩家车辆
        if (!this.isGameOver) {
            this.drawCar(this.playerX, this.playerY, this.playerWidth, this.playerHeight, '#00aaff', true);
        } else {
            // 爆炸效果
            this.drawExplosion(this.playerX, this.playerY);
        }

        // UI
        this.renderUI();
    }

    /**
     * 绘制车辆
     */
    drawCar(x, y, width, height, color, isPlayer) {
        const left = x - width / 2;
        const top = y - height / 2;

        // 车身主体
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(left, top, width, height, 3);
        this.ctx.fill();

        // 车顶
        this.ctx.fillStyle = this.adjustColor(color, -30);
        this.ctx.fillRect(left + 2, top + height * 0.3, width - 4, height * 0.35);

        // 挡风玻璃
        this.ctx.fillStyle = isPlayer ? '#88ddff' : '#444444';
        this.ctx.fillRect(left + 3, top + height * (isPlayer ? 0.1 : 0.5), width - 6, height * 0.15);

        // 车灯
        if (isPlayer) {
            // 前灯
            this.ctx.fillStyle = '#ffff88';
            this.ctx.fillRect(left + 1, top + 1, 3, 2);
            this.ctx.fillRect(left + width - 4, top + 1, 3, 2);
        } else {
            // 尾灯
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fillRect(left + 1, top + height - 3, 3, 2);
            this.ctx.fillRect(left + width - 4, top + height - 3, 3, 2);
        }

        // 轮子
        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(left - 1, top + 3, 2, 4);
        this.ctx.fillRect(left + width - 1, top + 3, 2, 4);
        this.ctx.fillRect(left - 1, top + height - 7, 2, 4);
        this.ctx.fillRect(left + width - 1, top + height - 7, 2, 4);

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(left + 1, top + 1, width - 2, 2);
    }

    /**
     * 绘制障碍物
     */
    drawObstacle(obs) {
        if (obs.type === 'oil') {
            // 油污
            this.ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
            this.ctx.beginPath();
            this.ctx.ellipse(obs.x, obs.y, 10, 6, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 反光
            this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            this.ctx.beginPath();
            this.ctx.ellipse(obs.x - 3, obs.y - 2, 3, 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (obs.type === 'truck') {
            // 卡车
            this.drawTruck(obs.x, obs.y, obs.width, obs.height, obs.color);
        } else {
            // 普通车
            this.drawCar(obs.x, obs.y, obs.width, obs.height, obs.color, false);
        }
    }

    /**
     * 绘制卡车
     */
    drawTruck(x, y, width, height, color) {
        const left = x - width / 2;
        const top = y - height / 2;

        // 货箱
        this.ctx.fillStyle = color;
        this.ctx.fillRect(left, top, width, height * 0.7);

        // 驾驶室
        this.ctx.fillStyle = this.adjustColor(color, 20);
        this.ctx.fillRect(left + 1, top + height * 0.7, width - 2, height * 0.3);

        // 尾灯
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(left + 1, top + 1, 3, 2);
        this.ctx.fillRect(left + width - 4, top + 1, 3, 2);

        // 轮子
        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(left - 1, top + 5, 2, 5);
        this.ctx.fillRect(left + width - 1, top + 5, 2, 5);
        this.ctx.fillRect(left - 1, top + height - 8, 2, 5);
        this.ctx.fillRect(left + width - 1, top + height - 8, 2, 5);
    }

    /**
     * 绘制爆炸效果
     */
    drawExplosion(x, y) {
        const time = Date.now() % 1000;
        const radius = 15 + Math.sin(time / 50) * 5;

        // 外层火焰
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#ffff00');
        gradient.addColorStop(0.6, '#ff8800');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 碎片
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time / 200;
            const dist = 10 + Math.sin(time / 100 + i) * 5;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fillRect(px - 2, py - 2, 4, 4);
        }
    }

    /**
     * 调整颜色亮度
     */
    adjustColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
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

        // 速度表
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('SPEED', 10, 45);

        // 速度条背景
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(10, 50, 60, 10);

        // 速度条
        const speedPercent = this.speed / this.maxSpeed;
        const speedColor = speedPercent > 0.8 ? '#ff4444' : speedPercent > 0.5 ? '#ffaa00' : '#44ff44';
        this.ctx.fillStyle = speedColor;
        this.ctx.fillRect(10, 50, 60 * speedPercent, 10);

        // 难度
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.difficulty.name, this.width - 10, 20);
    }

    /**
     * 清理
     */
    cleanup() {
        audio.stopEngine();
    }
}

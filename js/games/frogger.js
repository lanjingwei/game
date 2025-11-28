/**
 * 青蛙过河游戏
 * 经典街机游戏
 */
import { audio } from '../audio.js';

export class Frogger {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        this.cellSize = 24;
        this.cols = Math.floor(width / this.cellSize);
        this.rows = 12;
        this.offsetY = (height - this.rows * this.cellSize) / 2;

        // 玩家青蛙
        this.player = {
            x: Math.floor(this.cols / 2),
            y: this.rows - 1,
            targetX: Math.floor(this.cols / 2),
            targetY: this.rows - 1,
            moving: false,
            direction: 3, // 0右 1下 2左 3上
            jumpProgress: 0
        };

        // 车辆
        this.cars = [];
        this.carRows = [10, 9, 8, 7, 6]; // 马路行

        // 原木和乌龟
        this.logs = [];
        this.logRows = [4, 3, 2, 1]; // 河流行

        // 安全区
        this.safeZones = [11, 5, 0]; // 起点、中间、终点行
        this.homes = []; // 终点的家
        this.homesReached = 0;

        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.isGameOver = false;
        this.timer = 60000; // 60秒时间限制
        this.maxTimer = 60000;

        // 移动冷却
        this.moveCooldown = 0;

        this.init();
    }

    init() {
        this.generateLevel();
    }

    /**
     * 生成关卡
     */
    generateLevel() {
        this.cars = [];
        this.logs = [];
        this.homes = [];

        // 生成车辆
        const carConfigs = [
            { row: 10, count: 3, speed: 1.5, length: 1, direction: 1 },
            { row: 9, count: 2, speed: 2.5, length: 2, direction: -1 },
            { row: 8, count: 3, speed: 1.8, length: 1, direction: 1 },
            { row: 7, count: 2, speed: 3, length: 1, direction: -1 },
            { row: 6, count: 2, speed: 2, length: 2, direction: 1 }
        ];

        for (const cfg of carConfigs) {
            const spacing = this.cols / cfg.count;
            for (let i = 0; i < cfg.count; i++) {
                this.cars.push({
                    x: i * spacing + Math.random() * spacing * 0.5,
                    row: cfg.row,
                    speed: cfg.speed * this.difficulty.speed * cfg.direction,
                    length: cfg.length,
                    color: this.randomCarColor()
                });
            }
        }

        // 生成原木和乌龟
        const logConfigs = [
            { row: 4, count: 3, speed: 1.2, length: 3, type: 'log', direction: 1 },
            { row: 3, count: 3, speed: 1.5, length: 2, type: 'turtle', direction: -1 },
            { row: 2, count: 2, speed: 2, length: 4, type: 'log', direction: 1 },
            { row: 1, count: 3, speed: 1.8, length: 2, type: 'turtle', direction: -1 }
        ];

        for (const cfg of logConfigs) {
            const spacing = this.cols / cfg.count;
            for (let i = 0; i < cfg.count; i++) {
                this.logs.push({
                    x: i * spacing + Math.random() * spacing * 0.3,
                    row: cfg.row,
                    speed: cfg.speed * this.difficulty.speed * cfg.direction,
                    length: cfg.length,
                    type: cfg.type,
                    sinkTimer: cfg.type === 'turtle' ? Math.random() * 3000 : 0,
                    sinking: false
                });
            }
        }

        // 生成终点家
        const homeSpacing = this.cols / 5;
        for (let i = 0; i < 5; i++) {
            this.homes.push({
                x: homeSpacing * i + homeSpacing / 2,
                reached: false
            });
        }
    }

    randomCarColor() {
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) return;

        // 时间限制
        this.timer -= deltaTime;
        if (this.timer <= 0) {
            this.die();
            this.timer = this.maxTimer;
        }

        // 移动冷却
        if (this.moveCooldown > 0) {
            this.moveCooldown -= deltaTime;
        }

        // 处理跳跃动画
        if (this.player.moving) {
            this.player.jumpProgress += deltaTime / 150;
            if (this.player.jumpProgress >= 1) {
                this.player.x = this.player.targetX;
                this.player.y = this.player.targetY;
                this.player.moving = false;
                this.player.jumpProgress = 0;
            }
        }

        // 输入处理
        if (!this.player.moving && this.moveCooldown <= 0) {
            if (keysPressed.up || keysPressed.a) {
                this.tryMove(0, -1, 3);
            } else if (keysPressed.down) {
                this.tryMove(0, 1, 1);
            } else if (keysPressed.left) {
                this.tryMove(-1, 0, 2);
            } else if (keysPressed.right) {
                this.tryMove(1, 0, 0);
            }
        }

        // 更新车辆
        for (const car of this.cars) {
            car.x += car.speed * deltaTime / 100;
            // 循环
            if (car.x > this.cols + car.length) car.x = -car.length;
            if (car.x < -car.length) car.x = this.cols + car.length;
        }

        // 更新原木和乌龟
        for (const log of this.logs) {
            log.x += log.speed * deltaTime / 100;
            // 循环
            if (log.x > this.cols + log.length) log.x = -log.length;
            if (log.x < -log.length) log.x = this.cols + log.length;

            // 乌龟下沉
            if (log.type === 'turtle') {
                log.sinkTimer -= deltaTime;
                if (log.sinkTimer <= 0) {
                    log.sinking = !log.sinking;
                    log.sinkTimer = log.sinking ? 1500 : 3000;
                }
            }
        }

        // 检查碰撞（玩家不在移动时）
        if (!this.player.moving) {
            this.checkCollisions();
        }
    }

    /**
     * 尝试移动
     */
    tryMove(dx, dy, dir) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        if (newX < 0 || newX >= this.cols || newY < 0 || newY >= this.rows) {
            return;
        }

        this.player.targetX = newX;
        this.player.targetY = newY;
        this.player.moving = true;
        this.player.direction = dir;
        this.player.jumpProgress = 0;
        this.moveCooldown = 100;
        
        audio.playSelect();
    }

    /**
     * 检查碰撞
     */
    checkCollisions() {
        const px = this.player.x;
        const py = this.player.y;

        // 检查是否在马路上
        if (this.carRows.includes(py)) {
            for (const car of this.cars) {
                if (car.row === py) {
                    if (px >= car.x - 0.3 && px <= car.x + car.length + 0.3) {
                        this.die();
                        return;
                    }
                }
            }
        }

        // 检查是否在河流中
        if (this.logRows.includes(py)) {
            let onLog = false;
            let logSpeed = 0;

            for (const log of this.logs) {
                if (log.row === py && !log.sinking) {
                    if (px >= log.x - 0.3 && px <= log.x + log.length - 0.5) {
                        onLog = true;
                        logSpeed = log.speed;
                        break;
                    }
                }
            }

            if (onLog) {
                // 跟随原木移动
                this.player.x += logSpeed * 16 / 100;
                this.player.targetX = this.player.x;
                
                // 检查是否掉出屏幕
                if (this.player.x < 0 || this.player.x >= this.cols) {
                    this.die();
                }
            } else {
                // 掉入河中
                this.die();
            }
        }

        // 检查是否到达终点
        if (py === 0) {
            let reachedHome = false;
            for (const home of this.homes) {
                if (!home.reached && Math.abs(px - home.x) < 1.2) {
                    home.reached = true;
                    this.homesReached++;
                    this.score += 100 + Math.floor(this.timer / 1000) * 10;
                    audio.playClear();
                    reachedHome = true;
                    
                    // 重置玩家位置
                    this.resetPlayer();
                    
                    // 检查是否全部到达
                    if (this.homesReached >= 5) {
                        this.level++;
                        this.homesReached = 0;
                        this.generateLevel();
                        audio.playLevelUp();
                    }
                    break;
                }
            }
            
            if (!reachedHome) {
                // 撞到终点边缘
                this.die();
            }
        }
    }

    /**
     * 死亡
     */
    die() {
        this.lives--;
        audio.playExplosion();

        if (this.lives <= 0) {
            this.isGameOver = true;
        } else {
            this.resetPlayer();
        }
    }

    /**
     * 重置玩家位置
     */
    resetPlayer() {
        this.player.x = Math.floor(this.cols / 2);
        this.player.y = this.rows - 1;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
        this.player.moving = false;
        this.timer = this.maxTimer;
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 绘制各行
        for (let row = 0; row < this.rows; row++) {
            const y = this.offsetY + row * this.cellSize;
            
            if (row === 0) {
                // 终点区域
                this.ctx.fillStyle = '#004400';
                this.ctx.fillRect(0, y, this.width, this.cellSize);
                
                // 家
                for (const home of this.homes) {
                    const hx = home.x * this.cellSize;
                    if (home.reached) {
                        this.ctx.fillStyle = '#00ff00';
                    } else {
                        this.ctx.fillStyle = '#002200';
                    }
                    this.ctx.fillRect(hx - 10, y + 2, 20, this.cellSize - 4);
                }
            } else if (this.logRows.includes(row)) {
                // 河流
                this.ctx.fillStyle = '#0044aa';
                this.ctx.fillRect(0, y, this.width, this.cellSize);
            } else if (row === 5) {
                // 中间安全区
                this.ctx.fillStyle = '#884488';
                this.ctx.fillRect(0, y, this.width, this.cellSize);
            } else if (this.carRows.includes(row)) {
                // 马路
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(0, y, this.width, this.cellSize);
                
                // 道路标线
                this.ctx.strokeStyle = '#888888';
                this.ctx.setLineDash([10, 10]);
                this.ctx.beginPath();
                this.ctx.moveTo(0, y + this.cellSize / 2);
                this.ctx.lineTo(this.width, y + this.cellSize / 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            } else if (row === this.rows - 1) {
                // 起点安全区
                this.ctx.fillStyle = '#884488';
                this.ctx.fillRect(0, y, this.width, this.cellSize);
            }
        }

        // 绘制原木和乌龟
        for (const log of this.logs) {
            this.drawLog(log);
        }

        // 绘制车辆
        for (const car of this.cars) {
            this.drawCar(car);
        }

        // 绘制青蛙
        this.drawFrog();

        // UI
        this.renderUI();
    }

    /**
     * 绘制原木
     */
    drawLog(log) {
        const x = log.x * this.cellSize;
        const y = this.offsetY + log.row * this.cellSize;
        const w = log.length * this.cellSize;

        if (log.type === 'log') {
            // 原木
            this.ctx.fillStyle = '#8b4513';
            this.ctx.fillRect(x, y + 3, w - 4, this.cellSize - 6);
            
            // 木纹
            this.ctx.fillStyle = '#a0522d';
            for (let i = 0; i < log.length; i++) {
                this.ctx.fillRect(x + i * this.cellSize + 5, y + 5, 3, this.cellSize - 10);
            }
        } else {
            // 乌龟
            if (log.sinking) {
                this.ctx.globalAlpha = 0.3;
            }
            
            for (let i = 0; i < log.length; i++) {
                const tx = x + i * this.cellSize + this.cellSize / 2;
                const ty = y + this.cellSize / 2;
                
                // 龟壳
                this.ctx.fillStyle = '#228b22';
                this.ctx.beginPath();
                this.ctx.ellipse(tx, ty, 10, 8, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 头
                this.ctx.fillStyle = '#32cd32';
                this.ctx.beginPath();
                this.ctx.arc(tx + 8, ty, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.globalAlpha = 1;
        }
    }

    /**
     * 绘制车辆
     */
    drawCar(car) {
        const x = car.x * this.cellSize;
        const y = this.offsetY + car.row * this.cellSize;
        const w = car.length * this.cellSize;

        // 车身
        this.ctx.fillStyle = car.color;
        this.ctx.fillRect(x + 2, y + 4, w - 4, this.cellSize - 8);

        // 车窗
        this.ctx.fillStyle = '#88ccff';
        this.ctx.fillRect(x + 6, y + 6, w * 0.3, this.cellSize - 12);

        // 车轮
        this.ctx.fillStyle = '#222222';
        this.ctx.fillRect(x + 4, y + this.cellSize - 6, 6, 4);
        this.ctx.fillRect(x + w - 12, y + this.cellSize - 6, 6, 4);
    }

    /**
     * 绘制青蛙
     */
    drawFrog() {
        let x, y;
        
        if (this.player.moving) {
            // 跳跃动画
            const progress = this.player.jumpProgress;
            const startX = this.player.x * this.cellSize + this.cellSize / 2;
            const startY = this.offsetY + this.player.y * this.cellSize + this.cellSize / 2;
            const endX = this.player.targetX * this.cellSize + this.cellSize / 2;
            const endY = this.offsetY + this.player.targetY * this.cellSize + this.cellSize / 2;
            
            x = startX + (endX - startX) * progress;
            y = startY + (endY - startY) * progress - Math.sin(progress * Math.PI) * 15;
        } else {
            x = this.player.x * this.cellSize + this.cellSize / 2;
            y = this.offsetY + this.player.y * this.cellSize + this.cellSize / 2;
        }

        // 身体
        this.ctx.fillStyle = '#00cc00';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, 10, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 眼睛
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x - 5, y - 6, 4, 0, Math.PI * 2);
        this.ctx.arc(x + 5, y - 6, 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x - 5, y - 5, 2, 0, Math.PI * 2);
        this.ctx.arc(x + 5, y - 5, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // 腿
        this.ctx.fillStyle = '#00aa00';
        const legOffset = this.player.moving ? Math.sin(this.player.jumpProgress * Math.PI) * 4 : 0;
        
        // 后腿
        this.ctx.beginPath();
        this.ctx.ellipse(x - 10, y + 4 + legOffset, 6, 4, -0.3, 0, Math.PI * 2);
        this.ctx.ellipse(x + 10, y + 4 + legOffset, 6, 4, 0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 10, 18);

        // 关卡
        this.ctx.fillStyle = '#00ffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LV.${this.level}`, this.width / 2, 18);

        // 生命
        this.ctx.fillStyle = '#00ff00';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`♥ ${this.lives}`, this.width - 10, 18);

        // 时间条
        const timerWidth = 100;
        const timerX = (this.width - timerWidth) / 2;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(timerX, this.height - 15, timerWidth, 8);
        
        const timePercent = this.timer / this.maxTimer;
        this.ctx.fillStyle = timePercent > 0.3 ? '#00ff00' : '#ff0000';
        this.ctx.fillRect(timerX, this.height - 15, timerWidth * timePercent, 8);

        // 家的进度
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`HOME: ${this.homesReached}/5`, 10, this.height - 5);
    }
}

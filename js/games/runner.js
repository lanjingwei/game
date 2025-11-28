/**
 * 跑酷游戏
 * 无尽奔跑游戏
 */
import { audio } from '../audio.js';

export class Runner {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 地面
        this.groundY = height - 50;

        // 玩家
        this.player = {
            x: 60,
            y: this.groundY,
            width: 24,
            height: 36,
            vy: 0,
            jumping: false,
            ducking: false,
            frame: 0,
            doubleJump: false
        };

        // 物理参数
        this.gravity = 0.8;
        this.jumpPower = -14;

        // 障碍物
        this.obstacles = [];
        this.obstacleTimer = 0;
        this.obstacleInterval = 1500;
        this.minInterval = 800;

        // 金币
        this.coins = [];
        this.coinTimer = 0;

        // 背景元素
        this.clouds = [];
        this.buildings = [];
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * width,
                y: 30 + Math.random() * 60,
                size: 30 + Math.random() * 30
            });
            this.buildings.push({
                x: i * 80,
                height: 40 + Math.random() * 80,
                width: 50 + Math.random() * 30
            });
        }

        // 游戏状态
        this.score = 0;
        this.coinCount = 0;
        this.distance = 0;
        this.speed = 5 * difficulty.speed;
        this.maxSpeed = 12;
        this.isGameOver = false;

        // 地面滚动
        this.groundOffset = 0;
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

        // 增加速度
        this.speed = Math.min(this.maxSpeed, this.speed + deltaTime * 0.0001);
        this.distance += this.speed;

        // 更新玩家
        this.updatePlayer(deltaTime, keys, keysPressed);

        // 更新障碍物
        this.updateObstacles(deltaTime);

        // 更新金币
        this.updateCoins(deltaTime);

        // 更新背景
        this.updateBackground(deltaTime);

        // 碰撞检测
        this.checkCollisions();

        // 更新分数
        this.score = Math.floor(this.distance / 10) + this.coinCount * 10;
    }

    /**
     * 更新玩家
     */
    updatePlayer(deltaTime, keys, keysPressed) {
        // 跳跃
        if ((keysPressed.a || keysPressed.up) && !this.player.ducking) {
            if (!this.player.jumping) {
                this.player.jumping = true;
                this.player.vy = this.jumpPower;
                this.player.doubleJump = true;
                audio.playSelect();
            } else if (this.player.doubleJump) {
                this.player.vy = this.jumpPower * 0.8;
                this.player.doubleJump = false;
                audio.playSelect();
            }
        }

        // 下蹲
        if (keys.down && !this.player.jumping) {
            this.player.ducking = true;
            this.player.height = 20;
        } else {
            this.player.ducking = false;
            this.player.height = 36;
        }

        // 快速下落
        if (keys.down && this.player.jumping) {
            this.player.vy += 1;
        }

        // 重力
        if (this.player.jumping) {
            this.player.vy += this.gravity;
            this.player.y += this.player.vy;

            // 着地
            if (this.player.y >= this.groundY) {
                this.player.y = this.groundY;
                this.player.jumping = false;
                this.player.vy = 0;
            }
        }

        // 动画帧
        this.player.frame += deltaTime * 0.015;
    }

    /**
     * 更新障碍物
     */
    updateObstacles(deltaTime) {
        // 生成障碍物
        this.obstacleTimer += deltaTime;
        const interval = Math.max(this.minInterval, this.obstacleInterval - this.speed * 50);
        
        if (this.obstacleTimer >= interval) {
            this.obstacleTimer = 0;
            this.spawnObstacle();
        }

        // 移动障碍物
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed;

            if (obs.x + obs.width < 0) {
                this.obstacles.splice(i, 1);
            }
        }
    }

    /**
     * 生成障碍物
     */
    spawnObstacle() {
        const types = ['cactus', 'bird', 'rock', 'spike'];
        const type = types[Math.floor(Math.random() * types.length)];

        let obstacle = {
            x: this.width + 50,
            type
        };

        if (type === 'cactus') {
            obstacle.y = this.groundY;
            obstacle.width = 20;
            obstacle.height = 35 + Math.random() * 20;
        } else if (type === 'bird') {
            // 飞行的鸟，需要下蹲或跳跃躲避
            obstacle.y = this.groundY - 30 - Math.random() * 40;
            obstacle.width = 30;
            obstacle.height = 20;
            obstacle.frame = 0;
        } else if (type === 'rock') {
            obstacle.y = this.groundY;
            obstacle.width = 25 + Math.random() * 15;
            obstacle.height = 20 + Math.random() * 10;
        } else if (type === 'spike') {
            obstacle.y = this.groundY;
            obstacle.width = 30;
            obstacle.height = 20;
        }

        this.obstacles.push(obstacle);
    }

    /**
     * 更新金币
     */
    updateCoins(deltaTime) {
        // 生成金币
        this.coinTimer += deltaTime;
        if (this.coinTimer >= 2000) {
            this.coinTimer = 0;
            if (Math.random() < 0.7) {
                const height = Math.random() < 0.5 ? 0 : 50 + Math.random() * 40;
                for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
                    this.coins.push({
                        x: this.width + i * 25,
                        y: this.groundY - 20 - height,
                        collected: false
                    });
                }
            }
        }

        // 移动金币
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.x -= this.speed;

            if (coin.x < -20) {
                this.coins.splice(i, 1);
            }
        }
    }

    /**
     * 更新背景
     */
    updateBackground(deltaTime) {
        // 地面
        this.groundOffset -= this.speed;
        if (this.groundOffset <= -20) {
            this.groundOffset = 0;
        }

        // 云朵
        for (const cloud of this.clouds) {
            cloud.x -= this.speed * 0.2;
            if (cloud.x + cloud.size < 0) {
                cloud.x = this.width + cloud.size;
                cloud.y = 30 + Math.random() * 60;
            }
        }

        // 建筑
        for (const building of this.buildings) {
            building.x -= this.speed * 0.5;
            if (building.x + building.width < 0) {
                building.x = this.width;
                building.height = 40 + Math.random() * 80;
            }
        }
    }

    /**
     * 碰撞检测
     */
    checkCollisions() {
        const playerBox = {
            x: this.player.x - this.player.width / 2 + 5,
            y: this.player.y - this.player.height + 5,
            width: this.player.width - 10,
            height: this.player.height - 10
        };

        // 障碍物碰撞
        for (const obs of this.obstacles) {
            const obsBox = {
                x: obs.x,
                y: obs.y - obs.height,
                width: obs.width,
                height: obs.height
            };

            if (this.boxCollision(playerBox, obsBox)) {
                this.gameOver();
                return;
            }
        }

        // 金币收集
        for (const coin of this.coins) {
            if (coin.collected) continue;

            const dx = this.player.x - coin.x;
            const dy = (this.player.y - this.player.height / 2) - coin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 25) {
                coin.collected = true;
                this.coinCount++;
                audio.playEat();
            }
        }
    }

    /**
     * 盒子碰撞
     */
    boxCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
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
        this.player.y = this.groundY;
        this.player.vy = 0;
        this.player.jumping = false;
        this.player.ducking = false;
        this.obstacles = [];
        this.coins = [];
        this.score = 0;
        this.coinCount = 0;
        this.distance = 0;
        this.speed = 5 * this.difficulty.speed;
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.isGameOver = false;
    }

    /**
     * 渲染
     */
    render() {
        // 天空背景
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
        skyGradient.addColorStop(0, '#87ceeb');
        skyGradient.addColorStop(1, '#e0f0ff');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.width, this.groundY);

        // 云朵
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (const cloud of this.clouds) {
            this.drawCloud(cloud);
        }

        // 建筑
        for (const building of this.buildings) {
            this.drawBuilding(building);
        }

        // 地面
        this.drawGround();

        // 金币
        for (const coin of this.coins) {
            if (!coin.collected) {
                this.drawCoin(coin);
            }
        }

        // 障碍物
        for (const obs of this.obstacles) {
            this.drawObstacle(obs);
        }

        // 玩家
        this.drawPlayer();

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 30);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2 + 5);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`金币: ${this.coinCount}`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 65);
        }
    }

    /**
     * 绘制云朵
     */
    drawCloud(cloud) {
        this.ctx.beginPath();
        this.ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
        this.ctx.arc(cloud.x + cloud.size * 0.4, cloud.y - cloud.size * 0.2, cloud.size * 0.4, 0, Math.PI * 2);
        this.ctx.arc(cloud.x + cloud.size * 0.8, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制建筑
     */
    drawBuilding(building) {
        this.ctx.fillStyle = '#a0a0b0';
        this.ctx.fillRect(building.x, this.groundY - building.height, building.width, building.height);

        // 窗户
        this.ctx.fillStyle = '#6080a0';
        for (let y = 0; y < building.height - 15; y += 20) {
            for (let x = 5; x < building.width - 10; x += 15) {
                this.ctx.fillRect(building.x + x, this.groundY - building.height + 10 + y, 8, 12);
            }
        }
    }

    /**
     * 绘制地面
     */
    drawGround() {
        // 地面
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

        // 草地
        this.ctx.fillStyle = '#228b22';
        this.ctx.fillRect(0, this.groundY, this.width, 8);

        // 纹理
        this.ctx.fillStyle = '#654321';
        for (let x = this.groundOffset; x < this.width + 20; x += 20) {
            this.ctx.fillRect(x, this.groundY + 15, 10, 3);
        }
    }

    /**
     * 绘制金币
     */
    drawCoin(coin) {
        const pulse = Math.sin(Date.now() * 0.01) * 2;
        
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.arc(coin.x, coin.y + pulse, 10, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffec8b';
        this.ctx.beginPath();
        this.ctx.arc(coin.x - 2, coin.y - 2 + pulse, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制障碍物
     */
    drawObstacle(obs) {
        if (obs.type === 'cactus') {
            this.ctx.fillStyle = '#228b22';
            this.ctx.fillRect(obs.x + obs.width/2 - 5, obs.y - obs.height, 10, obs.height);
            this.ctx.fillRect(obs.x, obs.y - obs.height + 10, obs.width, 8);
            
            // 刺
            this.ctx.fillStyle = '#1a6b1a';
            for (let i = 0; i < obs.height; i += 8) {
                this.ctx.fillRect(obs.x + obs.width/2 - 7, obs.y - obs.height + i, 3, 3);
                this.ctx.fillRect(obs.x + obs.width/2 + 4, obs.y - obs.height + i, 3, 3);
            }
        } else if (obs.type === 'bird') {
            obs.frame = (obs.frame || 0) + 0.2;
            const wingY = Math.sin(obs.frame) * 5;

            this.ctx.fillStyle = '#4a4a4a';
            this.ctx.beginPath();
            this.ctx.ellipse(obs.x + obs.width/2, obs.y - obs.height/2, obs.width/2, obs.height/3, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // 翅膀
            this.ctx.beginPath();
            this.ctx.moveTo(obs.x + 5, obs.y - obs.height/2);
            this.ctx.lineTo(obs.x - 5, obs.y - obs.height/2 + wingY);
            this.ctx.lineTo(obs.x + 10, obs.y - obs.height/2);
            this.ctx.fill();

            // 眼睛
            this.ctx.fillStyle = '#ff0000';
            this.ctx.beginPath();
            this.ctx.arc(obs.x + obs.width - 8, obs.y - obs.height/2 - 2, 3, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (obs.type === 'rock') {
            this.ctx.fillStyle = '#696969';
            this.ctx.beginPath();
            this.ctx.moveTo(obs.x, obs.y);
            this.ctx.lineTo(obs.x + obs.width * 0.3, obs.y - obs.height);
            this.ctx.lineTo(obs.x + obs.width * 0.7, obs.y - obs.height * 0.8);
            this.ctx.lineTo(obs.x + obs.width, obs.y);
            this.ctx.fill();
        } else if (obs.type === 'spike') {
            this.ctx.fillStyle = '#808080';
            for (let i = 0; i < 3; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x + i * 10, obs.y);
                this.ctx.lineTo(obs.x + i * 10 + 5, obs.y - obs.height);
                this.ctx.lineTo(obs.x + i * 10 + 10, obs.y);
                this.ctx.fill();
            }
        }
    }

    /**
     * 绘制玩家
     */
    drawPlayer() {
        const { x, y, width, height, ducking, jumping, frame } = this.player;

        // 身体
        this.ctx.fillStyle = '#ff6b35';
        
        if (ducking) {
            // 下蹲
            this.ctx.fillRect(x - width/2, y - height, width, height);
        } else {
            // 正常/跳跃
            this.ctx.fillRect(x - width/2, y - height, width, height);
            
            // 头
            this.ctx.fillStyle = '#ffcc88';
            this.ctx.beginPath();
            this.ctx.arc(x, y - height + 10, 10, 0, Math.PI * 2);
            this.ctx.fill();

            // 眼睛
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(x + 3, y - height + 8, 2, 0, Math.PI * 2);
            this.ctx.fill();

            // 腿部动画
            if (!jumping) {
                const legOffset = Math.sin(frame) * 5;
                this.ctx.fillStyle = '#333333';
                this.ctx.fillRect(x - 8, y - 10, 6, 10 + legOffset);
                this.ctx.fillRect(x + 2, y - 10, 6, 10 - legOffset);
            }
        }
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.score}`, 12, 28);

        // 金币
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.arc(this.width - 50, 20, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#333333';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${this.coinCount}`, this.width - 12, 25);

        // 提示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('A/↑跳跃 ↓下蹲', this.width / 2, this.height - 5);
    }
}

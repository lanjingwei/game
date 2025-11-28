/**
 * 炸弹人游戏
 * 经典街机游戏
 */
import { audio } from '../audio.js';

export class Bomberman {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        this.cellSize = 20;
        this.cols = 15;
        this.rows = 13;
        this.offsetX = (width - this.cols * this.cellSize) / 2;
        this.offsetY = (height - this.rows * this.cellSize) / 2 + 10;

        // 玩家
        this.player = {
            x: 1, y: 1,
            speed: 2.5,
            bombCount: 1,
            bombPower: 2,
            maxBombs: 1,
            direction: 0,
            animFrame: 0,
            invincible: 0
        };

        // 地图 (0空 1硬墙 2软墙)
        this.map = [];

        // 炸弹和爆炸
        this.bombs = [];
        this.explosions = [];
        this.items = [];

        // 敌人
        this.enemies = [];
        this.maxEnemies = 3 + Math.floor(difficulty.speed);

        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.isGameOver = false;
        this.victory = false;

        this.init();
    }

    init() {
        this.generateMap();
        this.spawnEnemies();
    }

    /**
     * 生成地图
     */
    generateMap() {
        this.map = [];
        
        for (let y = 0; y < this.rows; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.cols; x++) {
                // 边界和固定障碍物（棋盘格状）
                if (x === 0 || x === this.cols - 1 || y === 0 || y === this.rows - 1) {
                    this.map[y][x] = 1; // 硬墙
                } else if (x % 2 === 0 && y % 2 === 0) {
                    this.map[y][x] = 1; // 硬墙（棋盘格）
                } else {
                    // 随机软墙
                    if (Math.random() < 0.4) {
                        this.map[y][x] = 2; // 软墙
                    } else {
                        this.map[y][x] = 0; // 空地
                    }
                }
            }
        }

        // 清除玩家出生点周围
        this.map[1][1] = 0;
        this.map[1][2] = 0;
        this.map[2][1] = 0;

        // 清除敌人可能的出生点
        this.map[this.rows - 2][this.cols - 2] = 0;
        this.map[this.rows - 2][this.cols - 3] = 0;
        this.map[this.rows - 3][this.cols - 2] = 0;
    }

    /**
     * 生成敌人
     */
    spawnEnemies() {
        this.enemies = [];
        const enemyCount = this.maxEnemies + this.level - 1;

        for (let i = 0; i < enemyCount; i++) {
            let x, y;
            let attempts = 0;
            
            do {
                x = Math.floor(Math.random() * (this.cols - 2)) + 1;
                y = Math.floor(Math.random() * (this.rows - 2)) + 1;
                attempts++;
            } while ((this.map[y][x] !== 0 || (x < 4 && y < 4)) && attempts < 100);

            if (attempts < 100) {
                this.enemies.push({
                    x: x,
                    y: y,
                    realX: x,
                    realY: y,
                    direction: Math.floor(Math.random() * 4),
                    speed: 1 + Math.random() * 0.5 * this.difficulty.speed,
                    moveTimer: 0,
                    changeTimer: Math.random() * 2000,
                    type: Math.random() < 0.3 ? 'smart' : 'normal'
                });
            }
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver || this.victory) return;

        // 更新玩家
        this.updatePlayer(deltaTime, keys, keysPressed);

        // 更新炸弹
        this.updateBombs(deltaTime);

        // 更新爆炸
        this.updateExplosions(deltaTime);

        // 更新敌人
        this.updateEnemies(deltaTime);

        // 更新道具
        this.updateItems(deltaTime);

        // 检查胜利
        if (this.enemies.length === 0) {
            this.score += 1000;
            this.level++;
            if (this.level > 10) {
                this.victory = true;
            } else {
                this.generateMap();
                this.spawnEnemies();
                this.player.x = 1;
                this.player.y = 1;
                audio.playLevelUp();
            }
        }
    }

    /**
     * 更新玩家
     */
    updatePlayer(deltaTime, keys, keysPressed) {
        // 无敌时间
        if (this.player.invincible > 0) {
            this.player.invincible -= deltaTime;
        }

        // 移动
        let dx = 0, dy = 0;
        if (keys.left) { dx = -1; this.player.direction = 2; }
        if (keys.right) { dx = 1; this.player.direction = 0; }
        if (keys.up) { dy = -1; this.player.direction = 3; }
        if (keys.down) { dy = 1; this.player.direction = 1; }

        if (dx !== 0 || dy !== 0) {
            const speed = this.player.speed * deltaTime / 100;
            const newX = this.player.x + dx * speed;
            const newY = this.player.y + dy * speed;

            // 碰撞检测
            if (this.canMoveTo(newX, this.player.y)) {
                this.player.x = newX;
            }
            if (this.canMoveTo(this.player.x, newY)) {
                this.player.y = newY;
            }

            // 动画
            this.player.animFrame += deltaTime * 0.01;
        }

        // 放置炸弹
        if (keysPressed.a || keysPressed.b) {
            this.placeBomb();
        }
    }

    /**
     * 检查是否可以移动到指定位置
     */
    canMoveTo(x, y) {
        const margin = 0.3;
        const corners = [
            { x: x - margin, y: y - margin },
            { x: x + margin, y: y - margin },
            { x: x - margin, y: y + margin },
            { x: x + margin, y: y + margin }
        ];

        for (const corner of corners) {
            const gridX = Math.floor(corner.x);
            const gridY = Math.floor(corner.y);
            
            if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) {
                return false;
            }
            
            if (this.map[gridY][gridX] !== 0) {
                return false;
            }

            // 检查炸弹碰撞
            for (const bomb of this.bombs) {
                if (gridX === bomb.x && gridY === bomb.y) {
                    // 如果玩家已经在炸弹格子里，允许离开
                    const playerGridX = Math.floor(this.player.x);
                    const playerGridY = Math.floor(this.player.y);
                    if (playerGridX !== bomb.x || playerGridY !== bomb.y) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
     * 放置炸弹
     */
    placeBomb() {
        const gridX = Math.round(this.player.x);
        const gridY = Math.round(this.player.y);

        // 检查当前炸弹数量
        const playerBombs = this.bombs.filter(b => b.isPlayer).length;
        if (playerBombs >= this.player.maxBombs) return;

        // 检查该位置是否已有炸弹
        for (const bomb of this.bombs) {
            if (bomb.x === gridX && bomb.y === gridY) return;
        }

        this.bombs.push({
            x: gridX,
            y: gridY,
            timer: 3000,
            power: this.player.bombPower,
            isPlayer: true
        });

        audio.playSelect();
    }

    /**
     * 更新炸弹
     */
    updateBombs(deltaTime) {
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            bomb.timer -= deltaTime;

            if (bomb.timer <= 0) {
                this.explode(bomb);
                this.bombs.splice(i, 1);
            }
        }
    }

    /**
     * 爆炸
     */
    explode(bomb) {
        audio.playExplosion();

        // 中心爆炸
        this.explosions.push({
            x: bomb.x,
            y: bomb.y,
            timer: 500,
            center: true
        });

        // 四个方向
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        
        for (const [dx, dy] of directions) {
            for (let i = 1; i <= bomb.power; i++) {
                const ex = bomb.x + dx * i;
                const ey = bomb.y + dy * i;

                if (ex < 0 || ex >= this.cols || ey < 0 || ey >= this.rows) break;
                
                if (this.map[ey][ex] === 1) break; // 硬墙阻挡
                
                if (this.map[ey][ex] === 2) {
                    // 软墙被炸毁
                    this.map[ey][ex] = 0;
                    this.explosions.push({ x: ex, y: ey, timer: 500 });
                    
                    // 随机掉落道具
                    if (Math.random() < 0.3) {
                        this.spawnItem(ex, ey);
                    }
                    break;
                }

                this.explosions.push({
                    x: ex,
                    y: ey,
                    timer: 500,
                    end: i === bomb.power
                });

                // 检查是否引爆其他炸弹
                for (const other of this.bombs) {
                    if (other.x === ex && other.y === ey) {
                        other.timer = 0;
                    }
                }
            }
        }

        // 检查爆炸范围内的敌人和玩家
        this.checkExplosionHits(bomb);
    }

    /**
     * 生成道具
     */
    spawnItem(x, y) {
        const types = ['bomb', 'power', 'speed'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.items.push({
            x, y, type,
            timer: 15000 // 15秒后消失
        });
    }

    /**
     * 检查爆炸命中
     */
    checkExplosionHits(bomb) {
        const hitPositions = [[bomb.x, bomb.y]];
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        
        for (const [dx, dy] of directions) {
            for (let i = 1; i <= bomb.power; i++) {
                const ex = bomb.x + dx * i;
                const ey = bomb.y + dy * i;
                if (ex < 0 || ex >= this.cols || ey < 0 || ey >= this.rows) break;
                if (this.map[ey][ex] === 1) break;
                hitPositions.push([ex, ey]);
                if (this.map[ey][ex] === 2) break;
            }
        }

        // 检查敌人
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const ex = Math.round(enemy.x);
            const ey = Math.round(enemy.y);
            
            for (const [hx, hy] of hitPositions) {
                if (ex === hx && ey === hy) {
                    this.enemies.splice(i, 1);
                    this.score += 100;
                    break;
                }
            }
        }

        // 检查玩家
        if (this.player.invincible <= 0) {
            const px = Math.round(this.player.x);
            const py = Math.round(this.player.y);
            
            for (const [hx, hy] of hitPositions) {
                if (px === hx && py === hy) {
                    this.playerHit();
                    break;
                }
            }
        }
    }

    /**
     * 更新爆炸
     */
    updateExplosions(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].timer -= deltaTime;
            
            if (this.explosions[i].timer <= 0) {
                this.explosions.splice(i, 1);
            }
        }

        // 检查玩家是否在爆炸中
        if (this.player.invincible <= 0) {
            const px = Math.round(this.player.x);
            const py = Math.round(this.player.y);
            
            for (const exp of this.explosions) {
                if (exp.x === px && exp.y === py) {
                    this.playerHit();
                    break;
                }
            }
        }
    }

    /**
     * 更新敌人
     */
    updateEnemies(deltaTime) {
        for (const enemy of this.enemies) {
            // 方向改变计时
            enemy.changeTimer -= deltaTime;
            if (enemy.changeTimer <= 0) {
                enemy.direction = Math.floor(Math.random() * 4);
                enemy.changeTimer = 1000 + Math.random() * 2000;
                
                // 智能敌人追踪玩家
                if (enemy.type === 'smart' && Math.random() < 0.5) {
                    const dx = this.player.x - enemy.x;
                    const dy = this.player.y - enemy.y;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        enemy.direction = dx > 0 ? 0 : 2;
                    } else {
                        enemy.direction = dy > 0 ? 1 : 3;
                    }
                }
            }

            // 移动
            const speed = enemy.speed * deltaTime / 100;
            let dx = 0, dy = 0;
            
            if (enemy.direction === 0) dx = speed;
            else if (enemy.direction === 1) dy = speed;
            else if (enemy.direction === 2) dx = -speed;
            else if (enemy.direction === 3) dy = -speed;

            const newX = enemy.x + dx;
            const newY = enemy.y + dy;

            if (this.canEnemyMoveTo(newX, newY)) {
                enemy.x = newX;
                enemy.y = newY;
            } else {
                enemy.direction = Math.floor(Math.random() * 4);
            }

            // 与玩家碰撞
            if (this.player.invincible <= 0) {
                const dist = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y);
                if (dist < 0.8) {
                    this.playerHit();
                }
            }
        }
    }

    /**
     * 敌人移动检测
     */
    canEnemyMoveTo(x, y) {
        const margin = 0.3;
        const corners = [
            { x: x - margin, y: y - margin },
            { x: x + margin, y: y - margin },
            { x: x - margin, y: y + margin },
            { x: x + margin, y: y + margin }
        ];

        for (const corner of corners) {
            const gridX = Math.floor(corner.x);
            const gridY = Math.floor(corner.y);
            
            if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) {
                return false;
            }
            
            if (this.map[gridY][gridX] !== 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * 更新道具
     */
    updateItems(deltaTime) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.timer -= deltaTime;
            
            if (item.timer <= 0) {
                this.items.splice(i, 1);
                continue;
            }

            // 检查玩家拾取
            const dist = Math.abs(item.x - this.player.x) + Math.abs(item.y - this.player.y);
            if (dist < 0.7) {
                if (item.type === 'bomb') {
                    this.player.maxBombs++;
                } else if (item.type === 'power') {
                    this.player.bombPower++;
                } else if (item.type === 'speed') {
                    this.player.speed += 0.5;
                }
                
                this.score += 50;
                this.items.splice(i, 1);
                audio.playEat();
            }
        }
    }

    /**
     * 玩家受伤
     */
    playerHit() {
        this.lives--;
        this.player.invincible = 2000;
        audio.playExplosion();

        if (this.lives <= 0) {
            this.isGameOver = true;
        } else {
            this.player.x = 1;
            this.player.y = 1;
        }
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#1a472a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 地图
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const px = this.offsetX + x * this.cellSize;
                const py = this.offsetY + y * this.cellSize;
                
                if (this.map[y][x] === 0) {
                    // 空地
                    this.ctx.fillStyle = '#3d8b3d';
                    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
                } else if (this.map[y][x] === 1) {
                    // 硬墙
                    this.ctx.fillStyle = '#555555';
                    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
                    this.ctx.fillStyle = '#777777';
                    this.ctx.fillRect(px + 1, py + 1, this.cellSize - 2, 3);
                } else if (this.map[y][x] === 2) {
                    // 软墙
                    this.ctx.fillStyle = '#3d8b3d';
                    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
                    this.ctx.fillStyle = '#8b4513';
                    this.ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
                    this.ctx.fillStyle = '#a0522d';
                    this.ctx.fillRect(px + 3, py + 3, this.cellSize - 6, 2);
                }
            }
        }

        // 道具
        for (const item of this.items) {
            this.drawItem(item);
        }

        // 炸弹
        for (const bomb of this.bombs) {
            this.drawBomb(bomb);
        }

        // 爆炸
        for (const exp of this.explosions) {
            this.drawExplosion(exp);
        }

        // 敌人
        for (const enemy of this.enemies) {
            this.drawEnemy(enemy);
        }

        // 玩家
        if (this.player.invincible <= 0 || Math.floor(this.player.invincible / 100) % 2 === 0) {
            this.drawPlayer();
        }

        // UI
        this.renderUI();

        // 胜利画面
        if (this.victory) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('YOU WIN!', this.width / 2, this.height / 2);
        }
    }

    /**
     * 绘制道具
     */
    drawItem(item) {
        const px = this.offsetX + item.x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + item.y * this.cellSize + this.cellSize / 2;
        
        // 闪烁效果
        if (item.timer < 3000 && Math.floor(item.timer / 200) % 2) return;

        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(px, py, 7, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.font = 'bold 10px monospace';
        this.ctx.textAlign = 'center';
        
        if (item.type === 'bomb') {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fillText('B', px, py + 4);
        } else if (item.type === 'power') {
            this.ctx.fillStyle = '#ff8800';
            this.ctx.fillText('P', px, py + 4);
        } else if (item.type === 'speed') {
            this.ctx.fillStyle = '#4488ff';
            this.ctx.fillText('S', px, py + 4);
        }
    }

    /**
     * 绘制炸弹
     */
    drawBomb(bomb) {
        const px = this.offsetX + bomb.x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + bomb.y * this.cellSize + this.cellSize / 2;
        const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.1;

        // 炸弹本体
        this.ctx.fillStyle = '#222222';
        this.ctx.beginPath();
        this.ctx.arc(px, py, 7 * pulse, 0, Math.PI * 2);
        this.ctx.fill();

        // 引线
        this.ctx.strokeStyle = '#888888';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(px, py - 7);
        this.ctx.lineTo(px + 3, py - 10);
        this.ctx.stroke();

        // 火花
        if (bomb.timer < 1000 || Math.floor(Date.now() / 100) % 2) {
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.beginPath();
            this.ctx.arc(px + 3, py - 11, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    /**
     * 绘制爆炸
     */
    drawExplosion(exp) {
        const px = this.offsetX + exp.x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + exp.y * this.cellSize + this.cellSize / 2;
        const alpha = exp.timer / 500;

        const gradient = this.ctx.createRadialGradient(px, py, 0, px, py, this.cellSize / 2);
        gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 150, 50, ${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(255, 50, 0, ${alpha * 0.5})`);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            this.offsetX + exp.x * this.cellSize,
            this.offsetY + exp.y * this.cellSize,
            this.cellSize,
            this.cellSize
        );
    }

    /**
     * 绘制敌人
     */
    drawEnemy(enemy) {
        const px = this.offsetX + enemy.x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + enemy.y * this.cellSize + this.cellSize / 2;

        // 身体
        this.ctx.fillStyle = enemy.type === 'smart' ? '#ff6666' : '#aa44aa';
        this.ctx.beginPath();
        this.ctx.arc(px, py, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // 眼睛
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(px - 3, py - 2, 3, 0, Math.PI * 2);
        this.ctx.arc(px + 3, py - 2, 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(px - 2, py - 2, 1.5, 0, Math.PI * 2);
        this.ctx.arc(px + 4, py - 2, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制玩家
     */
    drawPlayer() {
        const px = this.offsetX + this.player.x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + this.player.y * this.cellSize + this.cellSize / 2;

        // 身体
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(px, py, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // 脸
        this.ctx.fillStyle = '#ffcc88';
        this.ctx.beginPath();
        this.ctx.arc(px, py - 2, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // 眼睛
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(px - 2, py - 3, 1, 0, Math.PI * 2);
        this.ctx.arc(px + 2, py - 3, 1, 0, Math.PI * 2);
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
        this.ctx.fillStyle = '#ff4444';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`♥ ${this.lives}`, this.width - 10, 18);

        // 炸弹信息
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`BOMB:${this.player.maxBombs} POW:${this.player.bombPower}`, 10, this.height - 5);

        // 敌人数量
        this.ctx.fillStyle = '#ff6666';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`ENEMY: ${this.enemies.length}`, this.width - 10, this.height - 5);
    }
}

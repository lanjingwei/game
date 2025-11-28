/**
 * 坦克大战游戏
 * 带爆炸火焰动画的彩色版本
 */
import { audio } from '../audio.js';

export class Tank {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 游戏区域设置
        this.cellSize = 16;
        this.cols = Math.floor(this.width / this.cellSize);
        this.rows = Math.floor(this.height / this.cellSize);

        // 玩家坦克
        this.player = {
            x: this.width / 2,
            y: this.height - 40,
            direction: 0, // 0上 1右 2下 3左
            speed: 2,
            size: 24,
            color: '#44aa44',
            shootCooldown: 0
        };

        // 敌人
        this.enemies = [];
        this.maxEnemies = 3 + Math.floor(difficulty.speed);
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 3000 / difficulty.speed;

        // 子弹
        this.bullets = [];
        this.bulletSpeed = 5;
        this.shootCooldown = 300;

        // 障碍物/墙壁
        this.walls = [];
        this.base = { x: this.width / 2, y: this.height - 20, size: 24 };

        // 爆炸效果
        this.explosions = [];

        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;

        // 无敌时间
        this.invincibleTime = 0;

        this.init();
    }

    init() {
        this.generateWalls();
        this.spawnEnemies(2);
    }

    /**
     * 生成墙壁
     */
    generateWalls() {
        // 随机生成砖墙
        const patterns = [
            // 横墙
            [[0,0], [1,0], [2,0], [3,0]],
            // 竖墙
            [[0,0], [0,1], [0,2]],
            // L形
            [[0,0], [1,0], [0,1], [0,2]],
            // T形
            [[0,0], [1,0], [2,0], [1,1]]
        ];

        const wallPositions = [
            { x: 30, y: 30 },
            { x: 100, y: 30 },
            { x: 60, y: 50 },
            { x: 30, y: 80 },
            { x: 110, y: 80 },
            { x: 70, y: 100 }
        ];

        for (const pos of wallPositions) {
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            for (const [dx, dy] of pattern) {
                const wall = {
                    x: pos.x + dx * this.cellSize,
                    y: pos.y + dy * this.cellSize,
                    width: this.cellSize,
                    height: this.cellSize,
                    type: Math.random() > 0.3 ? 'brick' : 'steel',
                    health: Math.random() > 0.3 ? 2 : 999
                };
                // 避免在基地或玩家位置生成
                if (wall.y < this.height - 40) {
                    this.walls.push(wall);
                }
            }
        }

        // 保护基地的墙
        for (let i = -2; i <= 2; i++) {
            this.walls.push({
                x: this.base.x + i * this.cellSize,
                y: this.base.y - 15,
                width: this.cellSize,
                height: this.cellSize,
                type: 'brick',
                health: 2
            });
        }
    }

    /**
     * 生成敌人
     */
    spawnEnemies(count) {
        const spawnPoints = [
            { x: 20, y: 15 },
            { x: this.width / 2, y: 15 },
            { x: this.width - 20, y: 15 }
        ];

        for (let i = 0; i < count && this.enemies.length < this.maxEnemies; i++) {
            const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
            const type = Math.random();
            
            let enemy;
            if (type < 0.5) {
                // 普通坦克
                enemy = {
                    x: spawn.x,
                    y: spawn.y,
                    direction: 2,
                    speed: 0.8 * this.difficulty.speed,
                    size: 10,
                    color: '#aa4444',
                    health: 1,
                    shootCooldown: 0,
                    moveTimer: 0,
                    type: 'normal'
                };
            } else if (type < 0.8) {
                // 快速坦克
                enemy = {
                    x: spawn.x,
                    y: spawn.y,
                    direction: 2,
                    speed: 1.5 * this.difficulty.speed,
                    size: 9,
                    color: '#44aaaa',
                    health: 1,
                    shootCooldown: 0,
                    moveTimer: 0,
                    type: 'fast'
                };
            } else {
                // 重型坦克
                enemy = {
                    x: spawn.x,
                    y: spawn.y,
                    direction: 2,
                    speed: 0.5 * this.difficulty.speed,
                    size: 12,
                    color: '#aaaa44',
                    health: 3,
                    shootCooldown: 0,
                    moveTimer: 0,
                    type: 'heavy'
                };
            }
            this.enemies.push(enemy);
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) return;

        // 无敌时间
        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime;
        }

        // 玩家移动
        this.updatePlayer(deltaTime, keys, keysPressed);

        // 更新敌人
        this.updateEnemies(deltaTime);

        // 更新子弹
        this.updateBullets(deltaTime);

        // 更新爆炸效果
        this.updateExplosions(deltaTime);

        // 生成敌人
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval && this.enemies.length < this.maxEnemies) {
            this.enemySpawnTimer = 0;
            this.spawnEnemies(1);
        }
    }

    /**
     * 更新玩家
     */
    updatePlayer(deltaTime, keys, keysPressed) {
        // 射击冷却
        if (this.player.shootCooldown > 0) {
            this.player.shootCooldown -= deltaTime;
        }

        // 移动
        let dx = 0, dy = 0;
        if (keys.up) {
            this.player.direction = 0;
            dy = -this.player.speed;
        } else if (keys.down) {
            this.player.direction = 2;
            dy = this.player.speed;
        } else if (keys.left) {
            this.player.direction = 3;
            dx = -this.player.speed;
        } else if (keys.right) {
            this.player.direction = 1;
            dx = this.player.speed;
        }

        // 碰撞检测
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        if (!this.checkTankCollision(newX, newY, this.player.size, null)) {
            // 边界检测
            this.player.x = Math.max(this.player.size / 2, Math.min(this.width - this.player.size / 2, newX));
            this.player.y = Math.max(this.player.size / 2, Math.min(this.height - this.player.size / 2, newY));
        }

        // 射击
        if ((keysPressed.a || keysPressed.b) && this.player.shootCooldown <= 0) {
            this.shoot(this.player, true);
            this.player.shootCooldown = this.shootCooldown;
        }
    }

    /**
     * 更新敌人
     */
    updateEnemies(deltaTime) {
        for (const enemy of this.enemies) {
            // 射击冷却
            if (enemy.shootCooldown > 0) {
                enemy.shootCooldown -= deltaTime;
            }

            // AI移动
            enemy.moveTimer -= deltaTime;
            if (enemy.moveTimer <= 0) {
                enemy.moveTimer = 500 + Math.random() * 1000;
                
                // 随机改变方向或朝向玩家/基地
                if (Math.random() < 0.3) {
                    // 朝向玩家
                    const dx = this.player.x - enemy.x;
                    const dy = this.player.y - enemy.y;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        enemy.direction = dx > 0 ? 1 : 3;
                    } else {
                        enemy.direction = dy > 0 ? 2 : 0;
                    }
                } else if (Math.random() < 0.3) {
                    // 朝向基地
                    enemy.direction = 2;
                } else {
                    // 随机方向
                    enemy.direction = Math.floor(Math.random() * 4);
                }
            }

            // 移动
            const dirVectors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
            const [vx, vy] = dirVectors[enemy.direction];
            const newX = enemy.x + vx * enemy.speed;
            const newY = enemy.y + vy * enemy.speed;

            if (!this.checkTankCollision(newX, newY, enemy.size, enemy)) {
                enemy.x = Math.max(enemy.size / 2, Math.min(this.width - enemy.size / 2, newX));
                enemy.y = Math.max(enemy.size / 2, Math.min(this.height - enemy.size / 2, newY));
            } else {
                // 撞墙时随机改变方向
                enemy.direction = Math.floor(Math.random() * 4);
            }

            // 射击
            if (enemy.shootCooldown <= 0 && Math.random() < 0.02) {
                this.shoot(enemy, false);
                enemy.shootCooldown = 1000;
            }
        }
    }

    /**
     * 坦克碰撞检测
     */
    checkTankCollision(x, y, size, exclude) {
        const halfSize = size / 2;

        // 墙壁碰撞
        for (const wall of this.walls) {
            if (x - halfSize < wall.x + wall.width &&
                x + halfSize > wall.x &&
                y - halfSize < wall.y + wall.height &&
                y + halfSize > wall.y) {
                return true;
            }
        }

        // 其他坦克碰撞
        const tanks = [this.player, ...this.enemies];
        for (const tank of tanks) {
            if (tank === exclude) continue;
            const dx = x - tank.x;
            const dy = y - tank.y;
            const minDist = (size + tank.size) / 2;
            if (dx * dx + dy * dy < minDist * minDist) {
                return true;
            }
        }

        return false;
    }

    /**
     * 射击
     */
    shoot(tank, isPlayer) {
        const dirVectors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        const [vx, vy] = dirVectors[tank.direction];

        this.bullets.push({
            x: tank.x + vx * (tank.size / 2 + 3),
            y: tank.y + vy * (tank.size / 2 + 3),
            vx: vx * this.bulletSpeed,
            vy: vy * this.bulletSpeed,
            isPlayer,
            size: 3
        });

        audio.playShoot();
    }

    /**
     * 更新子弹
     */
    updateBullets(deltaTime) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // 边界检测
            if (bullet.x < 0 || bullet.x > this.width || bullet.y < 0 || bullet.y > this.height) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 墙壁碰撞
            let hitWall = false;
            for (let j = this.walls.length - 1; j >= 0; j--) {
                const wall = this.walls[j];
                if (bullet.x > wall.x && bullet.x < wall.x + wall.width &&
                    bullet.y > wall.y && bullet.y < wall.y + wall.height) {
                    hitWall = true;
                    wall.health--;
                    if (wall.health <= 0) {
                        this.walls.splice(j, 1);
                        this.addExplosion(wall.x + wall.width / 2, wall.y + wall.height / 2, 'small');
                    }
                    break;
                }
            }

            if (hitWall) {
                this.bullets.splice(i, 1);
                audio.playHit();
                continue;
            }

            // 玩家子弹击中敌人
            if (bullet.isPlayer) {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    if (dx * dx + dy * dy < (enemy.size / 2) * (enemy.size / 2)) {
                        enemy.health--;
                        this.bullets.splice(i, 1);
                        
                        if (enemy.health <= 0) {
                            this.enemies.splice(j, 1);
                            this.addExplosion(enemy.x, enemy.y, 'large');
                            this.score += enemy.type === 'heavy' ? 300 : enemy.type === 'fast' ? 200 : 100;
                            audio.playExplosion();
                        } else {
                            audio.playHit();
                        }
                        break;
                    }
                }
            } else {
                // 敌人子弹击中玩家
                if (this.invincibleTime <= 0) {
                    const dx = bullet.x - this.player.x;
                    const dy = bullet.y - this.player.y;
                    if (dx * dx + dy * dy < (this.player.size / 2) * (this.player.size / 2)) {
                        this.bullets.splice(i, 1);
                        this.lives--;
                        this.invincibleTime = 2000;
                        this.addExplosion(this.player.x, this.player.y, 'large');
                        audio.playExplosion();
                        
                        if (this.lives <= 0) {
                            this.isGameOver = true;
                        } else {
                            // 重生
                            this.player.x = this.width / 2;
                            this.player.y = this.height - 20;
                        }
                        continue;
                    }
                }

                // 击中基地
                const baseDx = bullet.x - this.base.x;
                const baseDy = bullet.y - this.base.y;
                if (baseDx * baseDx + baseDy * baseDy < (this.base.size / 2) * (this.base.size / 2)) {
                    this.addExplosion(this.base.x, this.base.y, 'large');
                    audio.playExplosion();
                    this.isGameOver = true;
                }
            }
        }
    }

    /**
     * 添加爆炸效果
     */
    addExplosion(x, y, size) {
        this.explosions.push({
            x, y,
            size: size === 'large' ? 15 : 8,
            maxSize: size === 'large' ? 20 : 12,
            life: 300,
            maxLife: 300
        });
    }

    /**
     * 更新爆炸效果
     */
    updateExplosions(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.life -= deltaTime;
            if (exp.life <= 0) {
                this.explosions.splice(i, 1);
            }
        }
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 渲染墙壁
        for (const wall of this.walls) {
            this.drawWall(wall);
        }

        // 渲染基地
        this.drawBase();

        // 渲染敌人
        for (const enemy of this.enemies) {
            this.drawTank(enemy, false);
        }

        // 渲染玩家
        if (!this.isGameOver) {
            const flash = this.invincibleTime > 0 && Math.floor(this.invincibleTime / 100) % 2;
            if (!flash) {
                this.drawTank(this.player, true);
            }
        }

        // 渲染子弹
        for (const bullet of this.bullets) {
            this.ctx.fillStyle = bullet.isPlayer ? '#ffff00' : '#ff8800';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 渲染爆炸
        for (const exp of this.explosions) {
            this.drawExplosion(exp);
        }

        // UI
        this.renderUI();
    }

    /**
     * 绘制坦克
     */
    drawTank(tank, isPlayer) {
        const { x, y, size, direction, color, type } = tank;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(direction * Math.PI / 2);

        // 履带
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(-size/2 - 2, -size/2, 3, size);
        this.ctx.fillRect(size/2 - 1, -size/2, 3, size);

        // 履带纹理
        this.ctx.fillStyle = '#222222';
        for (let i = 0; i < 4; i++) {
            const ty = -size/2 + 2 + i * (size/4);
            this.ctx.fillRect(-size/2 - 2, ty, 3, 2);
            this.ctx.fillRect(size/2 - 1, ty, 3, 2);
        }

        // 车身
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-size/2 + 1, -size/2 + 1, size - 2, size - 2);

        // 车身高光
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.fillRect(-size/2 + 2, -size/2 + 2, size - 4, 3);

        // 炮塔
        const turretSize = size * 0.5;
        this.ctx.fillStyle = isPlayer ? '#66cc66' : this.adjustColor(color, 20);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, turretSize / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // 炮管
        this.ctx.fillStyle = isPlayer ? '#88ee88' : this.adjustColor(color, 30);
        this.ctx.fillRect(-1.5, -size/2 - 3, 3, size/2);

        // 重型坦克标记
        if (type === 'heavy') {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(-2, -2, 4, 4);
        }

        this.ctx.restore();
    }

    /**
     * 绘制墙壁
     */
    drawWall(wall) {
        if (wall.type === 'brick') {
            // 砖墙
            this.ctx.fillStyle = '#aa5533';
            this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            
            // 砖缝
            this.ctx.strokeStyle = '#663322';
            this.ctx.lineWidth = 0.5;
            this.ctx.strokeRect(wall.x, wall.y, wall.width/2, wall.height/2);
            this.ctx.strokeRect(wall.x + wall.width/2, wall.y + wall.height/2, wall.width/2, wall.height/2);
        } else {
            // 钢墙
            this.ctx.fillStyle = '#888888';
            this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            
            // 金属光泽
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(wall.x, wall.y, wall.width, 2);
            this.ctx.fillRect(wall.x, wall.y, 2, wall.height);
        }
    }

    /**
     * 绘制基地
     */
    drawBase() {
        const { x, y, size } = this.base;

        // 基地外框
        this.ctx.fillStyle = '#444444';
        this.ctx.fillRect(x - size/2 - 2, y - size/2 - 2, size + 4, size + 4);

        // 基地内部
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.fillRect(x - size/2, y - size/2, size, size);

        // 旗帜图案
        this.ctx.fillStyle = '#ff4444';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 2, y - size/2 + 2);
        this.ctx.lineTo(x + 4, y - size/2 + 5);
        this.ctx.lineTo(x - 2, y - size/2 + 8);
        this.ctx.closePath();
        this.ctx.fill();

        // 旗杆
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x - 3, y - size/2 + 2, 1, size - 4);
    }

    /**
     * 绘制爆炸效果
     */
    drawExplosion(exp) {
        const progress = 1 - exp.life / exp.maxLife;
        const currentSize = exp.size + (exp.maxSize - exp.size) * progress;

        // 外层火焰
        const gradient = this.ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, currentSize);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${1 - progress})`);
        gradient.addColorStop(0.3, `rgba(255, 200, 50, ${0.8 - progress * 0.8})`);
        gradient.addColorStop(0.6, `rgba(255, 100, 0, ${0.6 - progress * 0.6})`);
        gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(exp.x, exp.y, currentSize, 0, Math.PI * 2);
        this.ctx.fill();

        // 火花
        if (progress < 0.5) {
            this.ctx.fillStyle = '#ffff00';
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + progress * 5;
                const dist = currentSize * (0.5 + progress);
                const px = exp.x + Math.cos(angle) * dist;
                const py = exp.y + Math.sin(angle) * dist;
                this.ctx.fillRect(px - 1, py - 1, 2, 2);
            }
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

        // 生命
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, 10, 40);

        // 敌人数量
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`ENEMY: ${this.enemies.length}`, this.width - 10, 20);

        // 难度
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(this.difficulty.name, this.width - 10, 40);
    }
}

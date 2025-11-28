/**
 * 太空侵略者游戏
 * 经典街机射击游戏
 */
import { audio } from '../audio.js';

export class SpaceInvaders {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 玩家飞船
        this.player = {
            x: width / 2,
            y: height - 30,
            width: 30,
            height: 16,
            speed: 3
        };

        // 子弹
        this.bullets = [];
        this.bulletSpeed = 6;
        this.canShoot = true;
        this.shootCooldown = 0;

        // 敌人
        this.enemies = [];
        this.enemyBullets = [];
        this.enemyDirection = 1;
        this.enemySpeed = 0.5 * difficulty.speed;
        this.enemyDropAmount = 10;
        this.enemyShootChance = 0.002 * difficulty.speed;

        // 掩体
        this.barriers = [];

        // UFO
        this.ufo = null;
        this.ufoTimer = 0;
        this.ufoInterval = 15000;

        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.isGameOver = false;

        this.init();
    }

    init() {
        this.createEnemies();
        this.createBarriers();
    }

    /**
     * 创建敌人阵列
     */
    createEnemies() {
        this.enemies = [];
        const rows = 5;
        const cols = 11;
        const enemyWidth = 22;
        const enemyHeight = 16;
        const padding = 6;
        const startX = (this.width - (cols * (enemyWidth + padding))) / 2;
        const startY = 50;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let type, points;
                if (row === 0) {
                    type = 'squid';
                    points = 30;
                } else if (row < 3) {
                    type = 'crab';
                    points = 20;
                } else {
                    type = 'octopus';
                    points = 10;
                }

                this.enemies.push({
                    x: startX + col * (enemyWidth + padding),
                    y: startY + row * (enemyHeight + padding),
                    width: enemyWidth,
                    height: enemyHeight,
                    type,
                    points,
                    frame: 0
                });
            }
        }
    }

    /**
     * 创建掩体
     */
    createBarriers() {
        this.barriers = [];
        const barrierCount = 4;
        const barrierWidth = 36;
        const barrierHeight = 24;
        const spacing = (this.width - barrierCount * barrierWidth) / (barrierCount + 1);

        for (let i = 0; i < barrierCount; i++) {
            const barrier = {
                x: spacing + i * (barrierWidth + spacing),
                y: this.height - 70,
                blocks: []
            };

            // 创建掩体的像素块
            for (let by = 0; by < 6; by++) {
                for (let bx = 0; bx < 9; bx++) {
                    // 掩体形状（拱形）
                    if (by < 4 || (bx < 2 || bx > 6)) {
                        if (by === 0 && (bx === 0 || bx === 8)) continue;
                        barrier.blocks.push({
                            x: bx * 4,
                            y: by * 4,
                            alive: true
                        });
                    }
                }
            }

            this.barriers.push(barrier);
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

        // 玩家移动
        if (keys.left) {
            this.player.x -= this.player.speed;
            if (this.player.x < this.player.width / 2) {
                this.player.x = this.player.width / 2;
            }
        }
        if (keys.right) {
            this.player.x += this.player.speed;
            if (this.player.x > this.width - this.player.width / 2) {
                this.player.x = this.width - this.player.width / 2;
            }
        }

        // 射击冷却
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }

        // 射击
        if ((keysPressed.a || keysPressed.b) && this.shootCooldown <= 0) {
            this.bullets.push({
                x: this.player.x,
                y: this.player.y - this.player.height / 2,
                width: 3,
                height: 10
            });
            this.shootCooldown = 500;
            audio.playShoot();
        }

        // 更新子弹
        this.updateBullets();

        // 更新敌人
        this.updateEnemies(deltaTime);

        // 更新敌人子弹
        this.updateEnemyBullets();

        // 更新UFO
        this.updateUFO(deltaTime);

        // 检查胜利
        if (this.enemies.length === 0) {
            this.level++;
            this.enemySpeed += 0.2;
            this.createEnemies();
            this.createBarriers();
            audio.playLevelUp();
        }
    }

    /**
     * 更新子弹
     */
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.y -= this.bulletSpeed;

            // 超出屏幕
            if (bullet.y < 0) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 检查与敌人的碰撞
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.checkCollision(bullet, enemy)) {
                    this.score += enemy.points;
                    this.enemies.splice(j, 1);
                    this.bullets.splice(i, 1);
                    audio.playExplosion();
                    break;
                }
            }

            // 检查与UFO的碰撞
            if (this.ufo && this.checkCollision(bullet, this.ufo)) {
                this.score += this.ufo.points;
                this.ufo = null;
                this.bullets.splice(i, 1);
                audio.playExplosion();
                continue;
            }

            // 检查与掩体的碰撞
            this.checkBarrierCollision(bullet, i, this.bullets);
        }
    }

    /**
     * 更新敌人
     */
    updateEnemies(deltaTime) {
        if (this.enemies.length === 0) return;

        // 动画帧
        for (const enemy of this.enemies) {
            enemy.frame = Math.floor(Date.now() / 500) % 2;
        }

        // 找到边界
        let leftMost = this.width;
        let rightMost = 0;
        let bottomMost = 0;

        for (const enemy of this.enemies) {
            if (enemy.x < leftMost) leftMost = enemy.x;
            if (enemy.x + enemy.width > rightMost) rightMost = enemy.x + enemy.width;
            if (enemy.y + enemy.height > bottomMost) bottomMost = enemy.y + enemy.height;
        }

        // 检查是否需要改变方向
        let needDrop = false;
        if (rightMost >= this.width - 10 && this.enemyDirection > 0) {
            this.enemyDirection = -1;
            needDrop = true;
        } else if (leftMost <= 10 && this.enemyDirection < 0) {
            this.enemyDirection = 1;
            needDrop = true;
        }

        // 移动敌人
        for (const enemy of this.enemies) {
            enemy.x += this.enemySpeed * this.enemyDirection;
            if (needDrop) {
                enemy.y += this.enemyDropAmount;
            }
        }

        // 检查是否到达底部
        if (bottomMost >= this.player.y - 20) {
            this.gameOver();
            return;
        }

        // 敌人射击
        for (const enemy of this.enemies) {
            if (Math.random() < this.enemyShootChance) {
                this.enemyBullets.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height,
                    width: 3,
                    height: 8
                });
            }
        }
    }

    /**
     * 更新敌人子弹
     */
    updateEnemyBullets() {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.y += 3;

            // 超出屏幕
            if (bullet.y > this.height) {
                this.enemyBullets.splice(i, 1);
                continue;
            }

            // 检查与玩家的碰撞
            if (this.checkCollision(bullet, {
                x: this.player.x - this.player.width / 2,
                y: this.player.y - this.player.height / 2,
                width: this.player.width,
                height: this.player.height
            })) {
                this.lives--;
                this.enemyBullets.splice(i, 1);
                audio.playExplosion();

                if (this.lives <= 0) {
                    this.gameOver();
                }
                continue;
            }

            // 检查与掩体的碰撞
            this.checkBarrierCollision(bullet, i, this.enemyBullets);
        }
    }

    /**
     * 更新UFO
     */
    updateUFO(deltaTime) {
        this.ufoTimer += deltaTime;

        if (!this.ufo && this.ufoTimer >= this.ufoInterval) {
            this.ufoTimer = 0;
            this.ufo = {
                x: -30,
                y: 30,
                width: 30,
                height: 14,
                speed: 2,
                points: [50, 100, 150, 300][Math.floor(Math.random() * 4)]
            };
        }

        if (this.ufo) {
            this.ufo.x += this.ufo.speed;
            if (this.ufo.x > this.width + 30) {
                this.ufo = null;
            }
        }
    }

    /**
     * 检查碰撞
     */
    checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    /**
     * 检查掩体碰撞
     */
    checkBarrierCollision(bullet, bulletIndex, bulletArray) {
        for (const barrier of this.barriers) {
            for (let k = barrier.blocks.length - 1; k >= 0; k--) {
                const block = barrier.blocks[k];
                if (!block.alive) continue;

                const bx = barrier.x + block.x;
                const by = barrier.y + block.y;

                if (bullet.x >= bx && bullet.x <= bx + 4 &&
                    bullet.y >= by && bullet.y <= by + 4) {
                    block.alive = false;
                    bulletArray.splice(bulletIndex, 1);
                    return true;
                }
            }
        }
        return false;
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
        this.lives = 3;
        this.level = 1;
        this.isGameOver = false;
        this.bullets = [];
        this.enemyBullets = [];
        this.enemySpeed = 0.5 * this.difficulty.speed;
        this.enemyDirection = 1;
        this.ufo = null;
        this.player.x = this.width / 2;
        this.init();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // UFO
        if (this.ufo) {
            this.drawUFO();
        }

        // 敌人
        for (const enemy of this.enemies) {
            this.drawEnemy(enemy);
        }

        // 掩体
        for (const barrier of this.barriers) {
            this.drawBarrier(barrier);
        }

        // 玩家
        this.drawPlayer();

        // 子弹
        this.ctx.fillStyle = '#ffffff';
        for (const bullet of this.bullets) {
            this.ctx.fillRect(bullet.x - 1, bullet.y, bullet.width, bullet.height);
        }

        // 敌人子弹
        this.ctx.fillStyle = '#ff6666';
        for (const bullet of this.enemyBullets) {
            this.ctx.fillRect(bullet.x - 1, bullet.y, bullet.width, bullet.height);
        }

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff0000';
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
     * 绘制玩家
     */
    drawPlayer() {
        const x = this.player.x;
        const y = this.player.y;

        this.ctx.fillStyle = '#00ff00';
        
        // 炮台
        this.ctx.fillRect(x - 2, y - 12, 4, 8);
        
        // 机身
        this.ctx.fillRect(x - 12, y - 4, 24, 8);
        this.ctx.fillRect(x - 15, y, 30, 6);
    }

    /**
     * 绘制敌人
     */
    drawEnemy(enemy) {
        const { x, y, type, frame } = enemy;
        
        this.ctx.fillStyle = type === 'squid' ? '#ff00ff' : 
                            type === 'crab' ? '#00ffff' : '#ffff00';

        if (type === 'squid') {
            // 鱿鱼外星人
            if (frame === 0) {
                this.ctx.fillRect(x + 8, y, 6, 4);
                this.ctx.fillRect(x + 4, y + 4, 14, 4);
                this.ctx.fillRect(x + 2, y + 8, 18, 4);
                this.ctx.fillRect(x + 2, y + 12, 4, 4);
                this.ctx.fillRect(x + 16, y + 12, 4, 4);
            } else {
                this.ctx.fillRect(x + 8, y, 6, 4);
                this.ctx.fillRect(x + 4, y + 4, 14, 4);
                this.ctx.fillRect(x + 2, y + 8, 18, 4);
                this.ctx.fillRect(x + 6, y + 12, 4, 4);
                this.ctx.fillRect(x + 12, y + 12, 4, 4);
            }
        } else if (type === 'crab') {
            // 螃蟹外星人
            this.ctx.fillRect(x + 4, y, 14, 4);
            this.ctx.fillRect(x + 2, y + 4, 18, 4);
            this.ctx.fillRect(x, y + 8, 22, 4);
            if (frame === 0) {
                this.ctx.fillRect(x, y + 12, 4, 4);
                this.ctx.fillRect(x + 18, y + 12, 4, 4);
            } else {
                this.ctx.fillRect(x + 4, y + 12, 4, 4);
                this.ctx.fillRect(x + 14, y + 12, 4, 4);
            }
        } else {
            // 章鱼外星人
            this.ctx.fillRect(x + 6, y, 10, 4);
            this.ctx.fillRect(x + 2, y + 4, 18, 4);
            this.ctx.fillRect(x, y + 8, 22, 4);
            if (frame === 0) {
                this.ctx.fillRect(x + 2, y + 12, 6, 4);
                this.ctx.fillRect(x + 14, y + 12, 6, 4);
            } else {
                this.ctx.fillRect(x, y + 12, 6, 4);
                this.ctx.fillRect(x + 16, y + 12, 6, 4);
            }
        }
    }

    /**
     * 绘制UFO
     */
    drawUFO() {
        const { x, y } = this.ufo;
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(x + 10, y, 10, 4);
        this.ctx.fillRect(x + 4, y + 4, 22, 4);
        this.ctx.fillRect(x, y + 8, 30, 4);
        this.ctx.fillRect(x + 4, y + 12, 6, 2);
        this.ctx.fillRect(x + 20, y + 12, 6, 2);
    }

    /**
     * 绘制掩体
     */
    drawBarrier(barrier) {
        this.ctx.fillStyle = '#00ff00';
        for (const block of barrier.blocks) {
            if (block.alive) {
                this.ctx.fillRect(barrier.x + block.x, barrier.y + block.y, 4, 4);
            }
        }
    }

    /**
     * 渲染UI
     */
    renderUI() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 10, 20);

        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LEVEL ${this.level}`, this.width / 2, 20);

        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#00ff00';
        for (let i = 0; i < this.lives; i++) {
            this.ctx.fillRect(this.width - 20 - i * 25, 10, 20, 10);
        }
    }
}

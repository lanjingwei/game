/**
 * 飞机大战游戏
 * 经典纵版射击游戏
 */
import { audio } from '../audio.js';

export class Aircraft {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 玩家飞机
        this.player = {
            x: width / 2,
            y: height - 50,
            width: 32,
            height: 40,
            speed: 4,
            fireRate: 200,
            fireTimer: 0,
            powerLevel: 1,
            invincible: 0,
            bombs: 3
        };

        // 子弹
        this.bullets = [];
        this.enemyBullets = [];

        // 敌机
        this.enemies = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1500 / difficulty.speed;

        // 道具
        this.powerups = [];

        // 爆炸效果
        this.explosions = [];

        // 背景星星
        this.stars = [];
        for (let i = 0; i < 50; i++) {
            this.stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                speed: 1 + Math.random() * 2,
                size: 1 + Math.random() * 2
            });
        }

        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.isGameOver = false;
        this.bossActive = false;
        this.boss = null;
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

        // 更新背景
        this.updateStars(deltaTime);

        // 玩家移动
        if (keys.left) this.player.x -= this.player.speed;
        if (keys.right) this.player.x += this.player.speed;
        if (keys.up) this.player.y -= this.player.speed;
        if (keys.down) this.player.y += this.player.speed;

        // 边界限制
        this.player.x = Math.max(this.player.width/2, Math.min(this.width - this.player.width/2, this.player.x));
        this.player.y = Math.max(this.player.height/2, Math.min(this.height - this.player.height/2, this.player.y));

        // 无敌时间
        if (this.player.invincible > 0) {
            this.player.invincible -= deltaTime;
        }

        // 自动射击
        this.player.fireTimer += deltaTime;
        if (this.player.fireTimer >= this.player.fireRate) {
            this.player.fireTimer = 0;
            this.playerShoot();
        }

        // 使用炸弹
        if (keysPressed.b && this.player.bombs > 0) {
            this.useBomb();
        }

        // 更新子弹
        this.updateBullets(deltaTime);

        // 更新敌人
        this.updateEnemies(deltaTime);

        // 更新道具
        this.updatePowerups(deltaTime);

        // 更新爆炸
        this.updateExplosions(deltaTime);

        // 更新BOSS
        if (this.boss) {
            this.updateBoss(deltaTime);
        }

        // 生成敌人
        if (!this.bossActive) {
            this.spawnTimer += deltaTime;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.spawnEnemy();
            }
        }

        // 检查关卡进度
        if (this.score >= this.level * 2000 && !this.bossActive && !this.boss) {
            this.spawnBoss();
        }
    }

    /**
     * 玩家射击
     */
    playerShoot() {
        const { x, y, powerLevel } = this.player;

        if (powerLevel >= 1) {
            this.bullets.push({ x, y: y - 20, vx: 0, vy: -10, damage: 1 });
        }
        if (powerLevel >= 2) {
            this.bullets.push({ x: x - 10, y: y - 15, vx: -1, vy: -10, damage: 1 });
            this.bullets.push({ x: x + 10, y: y - 15, vx: 1, vy: -10, damage: 1 });
        }
        if (powerLevel >= 3) {
            this.bullets.push({ x: x - 20, y: y - 10, vx: -2, vy: -9, damage: 1 });
            this.bullets.push({ x: x + 20, y: y - 10, vx: 2, vy: -9, damage: 1 });
        }

        audio.playShoot();
    }

    /**
     * 使用炸弹
     */
    useBomb() {
        this.player.bombs--;
        audio.playExplosion();

        // 清除所有敌人子弹
        this.enemyBullets = [];

        // 伤害所有敌人
        for (const enemy of this.enemies) {
            enemy.hp -= 50;
            this.score += 10;
        }

        if (this.boss) {
            this.boss.hp -= 100;
        }

        // 屏幕闪白效果
        this.explosions.push({
            x: this.width / 2,
            y: this.height / 2,
            radius: this.width,
            timer: 300,
            type: 'bomb'
        });
    }

    /**
     * 生成敌人
     */
    spawnEnemy() {
        const types = ['small', 'medium', 'shooter'];
        const type = types[Math.floor(Math.random() * types.length)];

        let enemy = {
            x: 30 + Math.random() * (this.width - 60),
            y: -30,
            type,
            hp: 1,
            speed: 2,
            shootTimer: 0,
            pattern: Math.floor(Math.random() * 3)
        };

        if (type === 'small') {
            enemy.width = 24;
            enemy.height = 24;
            enemy.hp = 1;
            enemy.speed = 3 * this.difficulty.speed;
            enemy.points = 100;
        } else if (type === 'medium') {
            enemy.width = 36;
            enemy.height = 32;
            enemy.hp = 3;
            enemy.speed = 2 * this.difficulty.speed;
            enemy.points = 200;
        } else if (type === 'shooter') {
            enemy.width = 28;
            enemy.height = 28;
            enemy.hp = 2;
            enemy.speed = 1.5 * this.difficulty.speed;
            enemy.points = 150;
            enemy.canShoot = true;
        }

        this.enemies.push(enemy);
    }

    /**
     * 生成BOSS
     */
    spawnBoss() {
        this.bossActive = true;
        this.boss = {
            x: this.width / 2,
            y: -80,
            width: 100,
            height: 60,
            hp: 50 + this.level * 20,
            maxHp: 50 + this.level * 20,
            speed: 1,
            direction: 1,
            shootTimer: 0,
            phase: 0,
            entering: true
        };
        audio.playLevelUp();
    }

    /**
     * 更新背景星星
     */
    updateStars(deltaTime) {
        for (const star of this.stars) {
            star.y += star.speed;
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
            }
        }
    }

    /**
     * 更新子弹
     */
    updateBullets(deltaTime) {
        // 玩家子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            if (bullet.y < -10) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 检查与敌人碰撞
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.checkCollision(bullet, enemy, 4)) {
                    enemy.hp -= bullet.damage;
                    this.bullets.splice(i, 1);

                    if (enemy.hp <= 0) {
                        this.score += enemy.points;
                        this.addExplosion(enemy.x, enemy.y);
                        
                        // 随机掉落道具
                        if (Math.random() < 0.15) {
                            this.spawnPowerup(enemy.x, enemy.y);
                        }
                        
                        this.enemies.splice(j, 1);
                        audio.playExplosion();
                    } else {
                        audio.playHit();
                    }
                    break;
                }
            }

            // 检查与BOSS碰撞
            if (this.boss && !this.boss.entering) {
                if (this.checkCollision(bullet, this.boss, 4)) {
                    this.boss.hp -= bullet.damage;
                    this.bullets.splice(i, 1);
                    audio.playHit();

                    if (this.boss.hp <= 0) {
                        this.score += 2000 * this.level;
                        this.addExplosion(this.boss.x, this.boss.y, 'big');
                        this.boss = null;
                        this.bossActive = false;
                        this.level++;
                        audio.playLevelUp();
                    }
                }
            }
        }

        // 敌人子弹
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            if (bullet.y > this.height + 10 || bullet.y < -10 ||
                bullet.x < -10 || bullet.x > this.width + 10) {
                this.enemyBullets.splice(i, 1);
                continue;
            }

            // 检查与玩家碰撞
            if (this.player.invincible <= 0) {
                if (this.checkCollision(bullet, this.player, 4)) {
                    this.playerHit();
                    this.enemyBullets.splice(i, 1);
                }
            }
        }
    }

    /**
     * 更新敌人
     */
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // 移动模式
            if (enemy.pattern === 0) {
                enemy.y += enemy.speed;
            } else if (enemy.pattern === 1) {
                enemy.y += enemy.speed;
                enemy.x += Math.sin(enemy.y * 0.05) * 2;
            } else {
                enemy.y += enemy.speed * 0.8;
                enemy.x += Math.cos(enemy.y * 0.03) * 3;
            }

            // 边界
            enemy.x = Math.max(enemy.width/2, Math.min(this.width - enemy.width/2, enemy.x));

            // 射击
            if (enemy.canShoot) {
                enemy.shootTimer += deltaTime;
                if (enemy.shootTimer >= 1500) {
                    enemy.shootTimer = 0;
                    this.enemyBullets.push({
                        x: enemy.x,
                        y: enemy.y + enemy.height/2,
                        vx: 0,
                        vy: 4
                    });
                }
            }

            // 移出屏幕
            if (enemy.y > this.height + 50) {
                this.enemies.splice(i, 1);
                continue;
            }

            // 与玩家碰撞
            if (this.player.invincible <= 0) {
                if (this.checkCollision(enemy, this.player, 10)) {
                    this.playerHit();
                    this.addExplosion(enemy.x, enemy.y);
                    this.enemies.splice(i, 1);
                }
            }
        }
    }

    /**
     * 更新BOSS
     */
    updateBoss(deltaTime) {
        if (this.boss.entering) {
            this.boss.y += 1;
            if (this.boss.y >= 60) {
                this.boss.entering = false;
            }
            return;
        }

        // 左右移动
        this.boss.x += this.boss.speed * this.boss.direction;
        if (this.boss.x >= this.width - this.boss.width/2) {
            this.boss.direction = -1;
        } else if (this.boss.x <= this.boss.width/2) {
            this.boss.direction = 1;
        }

        // 射击
        this.boss.shootTimer += deltaTime;
        const shootInterval = this.boss.hp < this.boss.maxHp / 2 ? 500 : 800;
        
        if (this.boss.shootTimer >= shootInterval) {
            this.boss.shootTimer = 0;
            
            // 不同阶段不同弹幕
            if (this.boss.hp < this.boss.maxHp / 3) {
                // 扇形弹幕
                for (let i = -2; i <= 2; i++) {
                    this.enemyBullets.push({
                        x: this.boss.x,
                        y: this.boss.y + this.boss.height/2,
                        vx: i * 1.5,
                        vy: 4
                    });
                }
            } else if (this.boss.hp < this.boss.maxHp / 2) {
                // 三向弹幕
                this.enemyBullets.push({ x: this.boss.x, y: this.boss.y + this.boss.height/2, vx: 0, vy: 5 });
                this.enemyBullets.push({ x: this.boss.x - 30, y: this.boss.y + this.boss.height/2, vx: -1, vy: 4 });
                this.enemyBullets.push({ x: this.boss.x + 30, y: this.boss.y + this.boss.height/2, vx: 1, vy: 4 });
            } else {
                // 单向弹幕
                this.enemyBullets.push({
                    x: this.boss.x,
                    y: this.boss.y + this.boss.height/2,
                    vx: 0,
                    vy: 5
                });
            }
        }
    }

    /**
     * 更新道具
     */
    updatePowerups(deltaTime) {
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            powerup.y += 2;

            if (powerup.y > this.height + 20) {
                this.powerups.splice(i, 1);
                continue;
            }

            // 检查与玩家碰撞
            if (this.checkCollision(powerup, this.player, 15)) {
                if (powerup.type === 'power') {
                    this.player.powerLevel = Math.min(3, this.player.powerLevel + 1);
                } else if (powerup.type === 'bomb') {
                    this.player.bombs = Math.min(5, this.player.bombs + 1);
                } else if (powerup.type === 'life') {
                    this.lives++;
                }
                this.powerups.splice(i, 1);
                audio.playEat();
            }
        }
    }

    /**
     * 生成道具
     */
    spawnPowerup(x, y) {
        const types = ['power', 'power', 'bomb', 'life'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.powerups.push({ x, y, type, width: 20, height: 20 });
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
    }

    /**
     * 添加爆炸
     */
    addExplosion(x, y, type = 'normal') {
        this.explosions.push({
            x, y,
            radius: type === 'big' ? 60 : 30,
            timer: 300,
            type
        });
    }

    /**
     * 碰撞检测
     */
    checkCollision(a, b, margin = 0) {
        const ax = a.x - (a.width || 8) / 2;
        const ay = a.y - (a.height || 8) / 2;
        const aw = a.width || 8;
        const ah = a.height || 8;

        const bx = b.x - b.width / 2 + margin;
        const by = b.y - b.height / 2 + margin;
        const bw = b.width - margin * 2;
        const bh = b.height - margin * 2;

        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    /**
     * 玩家受伤
     */
    playerHit() {
        this.lives--;
        this.player.invincible = 2000;
        this.player.powerLevel = 1;
        audio.playExplosion();

        if (this.lives <= 0) {
            this.isGameOver = true;
            audio.playGameOver();
        }
    }

    /**
     * 重新开始
     */
    restart() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.isGameOver = false;
        this.bossActive = false;
        this.boss = null;
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.powerups = [];
        this.explosions = [];
        this.player.x = this.width / 2;
        this.player.y = this.height - 50;
        this.player.powerLevel = 1;
        this.player.bombs = 3;
        this.player.invincible = 0;
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#0a0a1e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 星星
        for (const star of this.stars) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + star.size * 0.2})`;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        // 道具
        for (const powerup of this.powerups) {
            this.drawPowerup(powerup);
        }

        // 敌人
        for (const enemy of this.enemies) {
            this.drawEnemy(enemy);
        }

        // BOSS
        if (this.boss) {
            this.drawBoss();
        }

        // 玩家
        if (this.player.invincible <= 0 || Math.floor(this.player.invincible / 100) % 2 === 0) {
            this.drawPlayer();
        }

        // 子弹
        this.ctx.fillStyle = '#00ffff';
        for (const bullet of this.bullets) {
            this.ctx.fillRect(bullet.x - 2, bullet.y - 5, 4, 10);
        }

        // 敌人子弹
        this.ctx.fillStyle = '#ff6666';
        for (const bullet of this.enemyBullets) {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 爆炸
        for (const exp of this.explosions) {
            this.drawExplosion(exp);
        }

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff4444';
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
        const { x, y } = this.player;

        // 机身
        this.ctx.fillStyle = '#3498db';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 20);
        this.ctx.lineTo(x - 15, y + 15);
        this.ctx.lineTo(x, y + 5);
        this.ctx.lineTo(x + 15, y + 15);
        this.ctx.closePath();
        this.ctx.fill();

        // 机翼
        this.ctx.fillStyle = '#2980b9';
        this.ctx.fillRect(x - 18, y, 36, 8);

        // 尾焰
        const flameSize = 5 + Math.random() * 5;
        this.ctx.fillStyle = '#ff6b35';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 5, y + 15);
        this.ctx.lineTo(x, y + 15 + flameSize);
        this.ctx.lineTo(x + 5, y + 15);
        this.ctx.fill();
    }

    /**
     * 绘制敌人
     */
    drawEnemy(enemy) {
        const { x, y, type, width, height } = enemy;

        if (type === 'small') {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + height/2);
            this.ctx.lineTo(x - width/2, y - height/2);
            this.ctx.lineTo(x + width/2, y - height/2);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (type === 'medium') {
            this.ctx.fillStyle = '#9b59b6';
            this.ctx.fillRect(x - width/2, y - height/2, width, height);
            this.ctx.fillStyle = '#8e44ad';
            this.ctx.fillRect(x - width/3, y - height/2 - 5, width * 0.66, 10);
        } else {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.beginPath();
            this.ctx.arc(x, y, width/2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#e67e22';
            this.ctx.fillRect(x - 4, y + height/3, 8, 10);
        }
    }

    /**
     * 绘制BOSS
     */
    drawBoss() {
        const { x, y, width, height, hp, maxHp } = this.boss;

        // 主体
        this.ctx.fillStyle = '#c0392b';
        this.ctx.fillRect(x - width/2, y - height/2, width, height);

        // 装饰
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(x - width/2 + 10, y - height/2, 15, height);
        this.ctx.fillRect(x + width/2 - 25, y - height/2, 15, height);

        // 炮台
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(x - 15, y + height/2 - 5, 30, 15);
        this.ctx.fillRect(x - 40, y, 20, 20);
        this.ctx.fillRect(x + 20, y, 20, 20);

        // 血条
        const barWidth = 80;
        const barHeight = 6;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x - barWidth/2, y - height/2 - 15, barWidth, barHeight);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(x - barWidth/2, y - height/2 - 15, barWidth * (hp / maxHp), barHeight);
    }

    /**
     * 绘制道具
     */
    drawPowerup(powerup) {
        const { x, y, type } = powerup;
        const pulse = Math.sin(Date.now() * 0.01) * 2;

        if (type === 'power') {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('P', x, y + 5 + pulse);
        } else if (type === 'bomb') {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('B', x, y + 5 + pulse);
        } else {
            this.ctx.fillStyle = '#2ecc71';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('♥', x, y + 5 + pulse);
        }
    }

    /**
     * 绘制爆炸
     */
    drawExplosion(exp) {
        const progress = 1 - exp.timer / 300;
        const radius = exp.radius * progress;

        if (exp.type === 'bomb') {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
            const gradient = this.ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radius);
            gradient.addColorStop(0, `rgba(255, 200, 50, ${1 - progress})`);
            gradient.addColorStop(0.5, `rgba(255, 100, 0, ${0.8 - progress * 0.8})`);
            gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 10, 20);

        // 关卡
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LEVEL ${this.level}`, this.width / 2, 20);

        // 生命
        this.ctx.fillStyle = '#ff4444';
        this.ctx.textAlign = 'right';
        for (let i = 0; i < this.lives; i++) {
            this.ctx.fillText('♥', this.width - 10 - i * 18, 20);
        }

        // 炸弹
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.textAlign = 'left';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`BOMB: ${this.player.bombs}`, 10, this.height - 10);

        // 火力
        this.ctx.fillStyle = '#00ffff';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`POWER: ${'★'.repeat(this.player.powerLevel)}`, this.width - 10, this.height - 10);
    }
}

/**
 * 太空战机游戏
 * 纵版射击游戏
 */
import { audio } from '../audio.js';

export class SpaceShooter {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 玩家战机
        this.player = {
            x: width / 2,
            y: height - 40,
            width: 24,
            height: 28,
            speed: 4,
            shootCooldown: 0,
            power: 1,
            invincible: 0,
            engineFrame: 0
        };

        // 子弹
        this.bullets = [];
        this.enemyBullets = [];
        this.shootInterval = 120;

        // 敌人
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 1000 / difficulty.speed;

        // 道具
        this.powerUps = [];

        // BOSS
        this.boss = null;
        this.bossSpawnScore = 3000;

        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;

        // 背景
        this.stars = [];
        this.scrollY = 0;

        // 特效
        this.explosions = [];
        this.particles = [];

        this.init();
    }

    init() {
        // 创建星空背景
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 2 + 1
            });
        }
    }

    /**
     * 生成敌人
     */
    spawnEnemy() {
        const types = ['fighter', 'fighter', 'fighter', 'bomber', 'fast'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let enemy;
        if (type === 'fighter') {
            enemy = {
                x: Math.random() * (this.width - 40) + 20,
                y: -30,
                width: 20,
                height: 24,
                type: 'fighter',
                health: 1,
                vx: 0,
                vy: 2 * this.difficulty.speed,
                shootTimer: Math.random() * 1000,
                pattern: Math.floor(Math.random() * 3)
            };
        } else if (type === 'bomber') {
            enemy = {
                x: Math.random() * (this.width - 60) + 30,
                y: -40,
                width: 32,
                height: 32,
                type: 'bomber',
                health: 3,
                vx: 0,
                vy: 1.5 * this.difficulty.speed,
                shootTimer: 0
            };
        } else if (type === 'fast') {
            enemy = {
                x: Math.random() * (this.width - 30) + 15,
                y: -20,
                width: 16,
                height: 20,
                type: 'fast',
                health: 1,
                vx: (Math.random() - 0.5) * 3,
                vy: 4 * this.difficulty.speed,
                shootTimer: 99999 // 不射击
            };
        }

        this.enemies.push(enemy);
    }

    /**
     * 生成BOSS
     */
    spawnBoss() {
        this.boss = {
            x: this.width / 2,
            y: -60,
            width: 80,
            height: 50,
            health: 30,
            maxHealth: 30,
            vx: 2,
            vy: 0,
            phase: 0,
            shootTimer: 0,
            moveTimer: 0,
            entering: true
        };
    }

    /**
     * 生成道具
     */
    spawnPowerUp(x, y) {
        const types = ['power', 'life', 'bomb'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push({
            x, y,
            type,
            width: 16,
            height: 16,
            vy: 2
        });
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) return;

        // 更新背景
        this.updateBackground(deltaTime);

        // 玩家输入
        this.handleInput(keys, keysPressed, deltaTime);

        // 更新玩家
        this.updatePlayer(deltaTime);

        // 更新敌人
        this.updateEnemies(deltaTime);

        // 更新BOSS
        if (this.boss) {
            this.updateBoss(deltaTime);
        }

        // 更新子弹
        this.updateBullets(deltaTime);

        // 更新道具
        this.updatePowerUps(deltaTime);

        // 更新特效
        this.updateEffects(deltaTime);

        // 生成敌人
        if (!this.boss) {
            this.enemySpawnTimer += deltaTime;
            if (this.enemySpawnTimer >= this.enemySpawnInterval) {
                this.enemySpawnTimer = 0;
                this.spawnEnemy();
            }

            // 检查是否该出BOSS
            if (this.score >= this.bossSpawnScore && this.enemies.length === 0) {
                this.spawnBoss();
            }
        }
    }

    /**
     * 更新背景
     */
    updateBackground(deltaTime) {
        this.scrollY += deltaTime * 0.05;
        
        for (const star of this.stars) {
            star.y += star.speed;
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
            }
        }
    }

    /**
     * 处理输入
     */
    handleInput(keys, keysPressed, deltaTime) {
        // 移动
        if (keys.left) this.player.x -= this.player.speed;
        if (keys.right) this.player.x += this.player.speed;
        if (keys.up) this.player.y -= this.player.speed;
        if (keys.down) this.player.y += this.player.speed;

        // 边界
        this.player.x = Math.max(15, Math.min(this.width - 15, this.player.x));
        this.player.y = Math.max(20, Math.min(this.height - 20, this.player.y));

        // 射击
        if (keys.a || keys.b) {
            if (this.player.shootCooldown <= 0) {
                this.playerShoot();
                this.player.shootCooldown = this.shootInterval;
            }
        }
    }

    /**
     * 玩家射击
     */
    playerShoot() {
        const power = this.player.power;

        // 中央子弹
        this.bullets.push({
            x: this.player.x,
            y: this.player.y - 15,
            vx: 0,
            vy: -8,
            damage: 1
        });

        // 双发
        if (power >= 2) {
            this.bullets.push({
                x: this.player.x - 8,
                y: this.player.y - 10,
                vx: 0,
                vy: -8,
                damage: 1
            });
            this.bullets.push({
                x: this.player.x + 8,
                y: this.player.y - 10,
                vx: 0,
                vy: -8,
                damage: 1
            });
        }

        // 散射
        if (power >= 3) {
            this.bullets.push({
                x: this.player.x - 12,
                y: this.player.y - 5,
                vx: -1.5,
                vy: -7,
                damage: 1
            });
            this.bullets.push({
                x: this.player.x + 12,
                y: this.player.y - 5,
                vx: 1.5,
                vy: -7,
                damage: 1
            });
        }

        audio.playShoot();
    }

    /**
     * 更新玩家
     */
    updatePlayer(deltaTime) {
        // 射击冷却
        if (this.player.shootCooldown > 0) {
            this.player.shootCooldown -= deltaTime;
        }

        // 无敌时间
        if (this.player.invincible > 0) {
            this.player.invincible -= deltaTime;
        }

        // 引擎动画
        this.player.engineFrame += deltaTime * 0.02;
    }

    /**
     * 更新敌人
     */
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // 移动
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;

            // 特殊移动模式
            if (enemy.type === 'fighter' && enemy.pattern === 1) {
                enemy.x += Math.sin(enemy.y * 0.05) * 2;
            }

            // 射击
            enemy.shootTimer += deltaTime;
            if (enemy.shootTimer > 1500 / this.difficulty.speed) {
                enemy.shootTimer = 0;
                if (enemy.type !== 'fast') {
                    this.enemyShoot(enemy);
                }
            }

            // 移除离开屏幕的敌人
            if (enemy.y > this.height + 50) {
                this.enemies.splice(i, 1);
                continue;
            }

            // 与玩家碰撞
            if (this.player.invincible <= 0 && this.checkCollision(this.player, enemy)) {
                this.playerHit();
                enemy.health = 0;
            }

            // 检查生命值
            if (enemy.health <= 0) {
                this.score += enemy.type === 'bomber' ? 300 : 100;
                this.addExplosion(enemy.x, enemy.y);
                
                // 掉落道具
                if (Math.random() < 0.15) {
                    this.spawnPowerUp(enemy.x, enemy.y);
                }
                
                this.enemies.splice(i, 1);
                audio.playExplosion();
            }
        }
    }

    /**
     * 敌人射击
     */
    enemyShoot(enemy) {
        if (enemy.type === 'bomber') {
            // 散射
            for (let i = -1; i <= 1; i++) {
                this.enemyBullets.push({
                    x: enemy.x,
                    y: enemy.y + 20,
                    vx: i * 2,
                    vy: 4
                });
            }
        } else {
            // 单发瞄准玩家
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            
            this.enemyBullets.push({
                x: enemy.x,
                y: enemy.y + 15,
                vx: (dx / len) * 4,
                vy: (dy / len) * 4
            });
        }
    }

    /**
     * 更新BOSS
     */
    updateBoss(deltaTime) {
        const boss = this.boss;

        // 入场
        if (boss.entering) {
            boss.y += 1;
            if (boss.y >= 50) {
                boss.entering = false;
            }
            return;
        }

        // 移动
        boss.moveTimer += deltaTime;
        boss.x += boss.vx;
        
        if (boss.x < 50 || boss.x > this.width - 50) {
            boss.vx = -boss.vx;
        }

        // 射击
        boss.shootTimer += deltaTime;
        const shootInterval = boss.health < boss.maxHealth / 2 ? 400 : 600;
        
        if (boss.shootTimer >= shootInterval) {
            boss.shootTimer = 0;
            this.bossShoot();
        }

        // 与玩家碰撞
        if (this.player.invincible <= 0 && this.checkCollision(this.player, boss)) {
            this.playerHit();
        }

        // 检查生命值
        if (boss.health <= 0) {
            this.score += 5000;
            this.addExplosion(boss.x, boss.y);
            this.addExplosion(boss.x - 20, boss.y + 10);
            this.addExplosion(boss.x + 20, boss.y - 10);
            this.boss = null;
            this.bossSpawnScore += 5000;
            audio.playExplosion();
            audio.playLevelUp();
        }
    }

    /**
     * BOSS射击
     */
    bossShoot() {
        const boss = this.boss;
        const phase = Math.floor(Math.random() * 3);

        if (phase === 0) {
            // 扇形射击
            for (let i = -2; i <= 2; i++) {
                const angle = Math.PI / 2 + i * 0.3;
                this.enemyBullets.push({
                    x: boss.x,
                    y: boss.y + 30,
                    vx: Math.cos(angle) * 4,
                    vy: Math.sin(angle) * 4
                });
            }
        } else if (phase === 1) {
            // 瞄准射击
            const dx = this.player.x - boss.x;
            const dy = this.player.y - boss.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    if (this.boss) {
                        this.enemyBullets.push({
                            x: boss.x,
                            y: boss.y + 30,
                            vx: (dx / len) * 5,
                            vy: (dy / len) * 5
                        });
                    }
                }, i * 100);
            }
        } else {
            // 双侧射击
            this.enemyBullets.push({
                x: boss.x - 30, y: boss.y + 20,
                vx: -1, vy: 4
            });
            this.enemyBullets.push({
                x: boss.x + 30, y: boss.y + 20,
                vx: 1, vy: 4
            });
        }
        
        audio.playShoot();
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

            // 超出屏幕
            if (bullet.y < -10 || bullet.y > this.height + 10 ||
                bullet.x < -10 || bullet.x > this.width + 10) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 击中敌人
            let hit = false;
            for (const enemy of this.enemies) {
                if (this.pointInRect(bullet.x, bullet.y, enemy)) {
                    enemy.health -= bullet.damage;
                    hit = true;
                    break;
                }
            }

            // 击中BOSS
            if (!hit && this.boss && !this.boss.entering) {
                if (this.pointInRect(bullet.x, bullet.y, this.boss)) {
                    this.boss.health -= bullet.damage;
                    hit = true;
                    audio.playHit();
                    
                    // 添加伤害粒子
                    this.particles.push({
                        x: bullet.x, y: bullet.y,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        life: 200,
                        color: '#ffff00'
                    });
                }
            }

            if (hit) {
                this.bullets.splice(i, 1);
            }
        }

        // 敌人子弹
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // 超出屏幕
            if (bullet.y < -10 || bullet.y > this.height + 10 ||
                bullet.x < -10 || bullet.x > this.width + 10) {
                this.enemyBullets.splice(i, 1);
                continue;
            }

            // 击中玩家
            if (this.player.invincible <= 0 &&
                Math.abs(bullet.x - this.player.x) < 10 &&
                Math.abs(bullet.y - this.player.y) < 12) {
                this.enemyBullets.splice(i, 1);
                this.playerHit();
            }
        }
    }

    /**
     * 更新道具
     */
    updatePowerUps(deltaTime) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const pu = this.powerUps[i];
            pu.y += pu.vy;

            // 超出屏幕
            if (pu.y > this.height + 20) {
                this.powerUps.splice(i, 1);
                continue;
            }

            // 与玩家碰撞
            if (this.checkCollision(this.player, pu)) {
                if (pu.type === 'power') {
                    this.player.power = Math.min(3, this.player.power + 1);
                } else if (pu.type === 'life') {
                    this.lives = Math.min(5, this.lives + 1);
                }
                this.score += 500;
                this.powerUps.splice(i, 1);
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
        this.addExplosion(this.player.x, this.player.y);
        audio.playExplosion();

        if (this.lives <= 0) {
            this.isGameOver = true;
        } else {
            // 降低火力
            this.player.power = Math.max(1, this.player.power - 1);
        }
    }

    /**
     * 添加爆炸
     */
    addExplosion(x, y) {
        this.explosions.push({
            x, y,
            frame: 0,
            timer: 0
        });

        // 粒子
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * (Math.random() * 3 + 2),
                vy: Math.sin(angle) * (Math.random() * 3 + 2),
                life: 400,
                color: ['#ff4444', '#ffaa00', '#ffff00'][Math.floor(Math.random() * 3)]
            });
        }
    }

    /**
     * 更新特效
     */
    updateEffects(deltaTime) {
        // 爆炸
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.timer += deltaTime;
            if (exp.timer > 50) {
                exp.timer = 0;
                exp.frame++;
                if (exp.frame > 6) {
                    this.explosions.splice(i, 1);
                }
            }
        }

        // 粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= deltaTime;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 碰撞检测
     */
    checkCollision(a, b) {
        return Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
               Math.abs(a.y - b.y) < (a.height + b.height) / 2;
    }

    pointInRect(x, y, rect) {
        return x > rect.x - rect.width/2 &&
               x < rect.x + rect.width/2 &&
               y > rect.y - rect.height/2 &&
               y < rect.y + rect.height/2;
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#000022';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 星空
        for (const star of this.stars) {
            const brightness = 0.3 + star.size * 0.3;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        // 敌人
        for (const enemy of this.enemies) {
            this.drawEnemy(enemy);
        }

        // BOSS
        if (this.boss) {
            this.drawBoss();
        }

        // 道具
        for (const pu of this.powerUps) {
            this.drawPowerUp(pu);
        }

        // 玩家
        if (this.player.invincible <= 0 || Math.floor(this.player.invincible / 100) % 2 === 0) {
            this.drawPlayer();
        }

        // 子弹
        this.ctx.fillStyle = '#00ffff';
        for (const bullet of this.bullets) {
            this.ctx.beginPath();
            this.ctx.ellipse(bullet.x, bullet.y, 3, 6, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.fillStyle = '#ff4444';
        for (const bullet of this.enemyBullets) {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 爆炸
        for (const exp of this.explosions) {
            this.drawExplosion(exp);
        }

        // 粒子
        for (const p of this.particles) {
            const alpha = p.life / 400;
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        }
        this.ctx.globalAlpha = 1;

        // UI
        this.renderUI();
    }

    /**
     * 绘制玩家
     */
    drawPlayer() {
        const { x, y } = this.player;

        // 引擎火焰
        const flameLength = 10 + Math.sin(this.player.engineFrame * 5) * 4;
        const gradient = this.ctx.createLinearGradient(x, y + 10, x, y + 10 + flameLength);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#ffaa00');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 6, y + 10);
        this.ctx.lineTo(x + 6, y + 10);
        this.ctx.lineTo(x, y + 10 + flameLength);
        this.ctx.closePath();
        this.ctx.fill();

        // 机身
        this.ctx.fillStyle = '#4488ff';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 14);
        this.ctx.lineTo(x - 10, y + 10);
        this.ctx.lineTo(x + 10, y + 10);
        this.ctx.closePath();
        this.ctx.fill();

        // 机翼
        this.ctx.fillStyle = '#2266dd';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 5, y);
        this.ctx.lineTo(x - 14, y + 8);
        this.ctx.lineTo(x - 5, y + 8);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x + 5, y);
        this.ctx.lineTo(x + 14, y + 8);
        this.ctx.lineTo(x + 5, y + 8);
        this.ctx.closePath();
        this.ctx.fill();

        // 座舱
        this.ctx.fillStyle = '#88ccff';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 4, 4, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 火力指示
        if (this.player.power >= 2) {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fillRect(x - 10, y + 2, 3, 3);
            this.ctx.fillRect(x + 7, y + 2, 3, 3);
        }
        if (this.player.power >= 3) {
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fillRect(x - 13, y + 5, 3, 3);
            this.ctx.fillRect(x + 10, y + 5, 3, 3);
        }
    }

    /**
     * 绘制敌人
     */
    drawEnemy(enemy) {
        const { x, y, type } = enemy;

        if (type === 'fighter') {
            // 敌机
            this.ctx.fillStyle = '#aa4444';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + 12);
            this.ctx.lineTo(x - 10, y - 8);
            this.ctx.lineTo(x + 10, y - 8);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.fillStyle = '#cc6666';
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, 5, 8, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'bomber') {
            // 轰炸机
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(x - 16, y - 12, 32, 24);
            
            this.ctx.fillStyle = '#888888';
            this.ctx.fillRect(x - 20, y - 6, 40, 12);

            this.ctx.fillStyle = '#aa0000';
            this.ctx.fillRect(x - 10, y + 10, 6, 6);
            this.ctx.fillRect(x + 4, y + 10, 6, 6);
        } else if (type === 'fast') {
            // 快速机
            this.ctx.fillStyle = '#44aa44';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + 10);
            this.ctx.lineTo(x - 8, y - 6);
            this.ctx.lineTo(x + 8, y - 6);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }

    /**
     * 绘制BOSS
     */
    drawBoss() {
        const { x, y, health, maxHealth } = this.boss;

        // 主体
        this.ctx.fillStyle = '#884488';
        this.ctx.fillRect(x - 40, y - 20, 80, 40);

        // 装甲
        this.ctx.fillStyle = '#aa66aa';
        this.ctx.fillRect(x - 35, y - 25, 70, 10);
        this.ctx.fillRect(x - 30, y + 15, 60, 10);

        // 武器挂载
        this.ctx.fillStyle = '#666666';
        this.ctx.fillRect(x - 38, y - 5, 10, 20);
        this.ctx.fillRect(x + 28, y - 5, 10, 20);

        // 核心
        const coreGlow = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        this.ctx.fillStyle = `rgba(255, 100, 100, ${coreGlow})`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // 血条
        const healthPercent = health / maxHealth;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x - 40, y - 35, 80, 6);
        this.ctx.fillStyle = healthPercent > 0.3 ? '#44ff44' : '#ff4444';
        this.ctx.fillRect(x - 40, y - 35, 80 * healthPercent, 6);
    }

    /**
     * 绘制道具
     */
    drawPowerUp(pu) {
        const { x, y, type } = pu;
        const pulse = Math.sin(Date.now() * 0.01) * 2;

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - 8 + pulse, y - 8 + pulse, 16 - pulse * 2, 16 - pulse * 2);

        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        
        if (type === 'power') {
            this.ctx.fillStyle = '#ff8800';
            this.ctx.fillText('P', x, y + 4);
        } else if (type === 'life') {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.fillText('♥', x, y + 4);
        }
    }

    /**
     * 绘制爆炸
     */
    drawExplosion(exp) {
        const radius = 8 + exp.frame * 5;
        const alpha = 1 - exp.frame / 7;

        const gradient = this.ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radius);
        gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(255, 150, 50, ${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
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
        this.ctx.fillText(`♥ ${this.lives}`, 10, 40);

        // 火力等级
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.fillText(`POWER: ${'★'.repeat(this.player.power)}`, 10, 60);

        // 难度
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.difficulty.name, this.width - 10, 20);

        // BOSS血条提示
        if (this.boss && !this.boss.entering) {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('!! BOSS !!', this.width / 2, 20);
        }
    }
}

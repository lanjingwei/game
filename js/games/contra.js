/**
 * 魂斗罗游戏
 * 横版射击游戏
 */
import { audio } from '../audio.js';

export class Contra {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 玩家
        this.player = {
            x: 50,
            y: height - 60,
            width: 16,
            height: 28,
            vx: 0,
            vy: 0,
            speed: 2.5,
            jumpPower: -8,
            onGround: true,
            direction: 1, // 1右 -1左
            aimDirection: { x: 1, y: 0 }, // 瞄准方向
            shooting: false,
            shootCooldown: 0,
            animFrame: 0,
            animTimer: 0,
            invincible: 0
        };

        // 子弹
        this.bullets = [];
        this.enemyBullets = [];
        this.bulletSpeed = 6;
        this.shootInterval = 150;

        // 敌人
        this.enemies = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 2000 / difficulty.speed;

        // 关卡/地形
        this.platforms = [];
        this.scrollX = 0;
        this.levelLength = 2000;

        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;
        this.gravity = 0.4;

        // 特效
        this.explosions = [];
        this.particles = [];

        this.init();
    }

    init() {
        this.generateLevel();
    }

    /**
     * 生成关卡地形
     */
    generateLevel() {
        // 地面
        this.platforms.push({
            x: 0, y: this.height - 30,
            width: this.levelLength, height: 30,
            type: 'ground'
        });

        // 平台
        const platformConfigs = [
            { x: 150, y: this.height - 80, width: 80 },
            { x: 300, y: this.height - 120, width: 60 },
            { x: 450, y: this.height - 90, width: 70 },
            { x: 600, y: this.height - 130, width: 80 },
            { x: 750, y: this.height - 70, width: 60 },
            { x: 900, y: this.height - 110, width: 70 },
            { x: 1050, y: this.height - 140, width: 60 },
            { x: 1200, y: this.height - 80, width: 80 },
            { x: 1400, y: this.height - 120, width: 70 },
            { x: 1600, y: this.height - 90, width: 60 },
        ];

        for (const cfg of platformConfigs) {
            this.platforms.push({
                x: cfg.x, y: cfg.y,
                width: cfg.width, height: 12,
                type: 'platform'
            });
        }
    }

    /**
     * 生成敌人
     */
    spawnEnemy() {
        const types = ['soldier', 'soldier', 'turret', 'runner'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const spawnX = this.scrollX + this.width + 50;
        let enemy;

        if (type === 'soldier') {
            enemy = {
                x: spawnX,
                y: this.height - 60,
                width: 14,
                height: 24,
                type: 'soldier',
                health: 1,
                vx: -1 * this.difficulty.speed,
                vy: 0,
                shootTimer: Math.random() * 1000,
                animFrame: 0
            };
        } else if (type === 'turret') {
            // 固定炮台
            const platform = this.platforms[Math.floor(Math.random() * (this.platforms.length - 1)) + 1];
            if (platform && platform.x > this.scrollX + this.width) {
                enemy = {
                    x: platform.x + platform.width / 2,
                    y: platform.y - 16,
                    width: 20,
                    height: 16,
                    type: 'turret',
                    health: 3,
                    vx: 0,
                    vy: 0,
                    shootTimer: 0,
                    angle: 0
                };
            }
        } else if (type === 'runner') {
            enemy = {
                x: spawnX,
                y: this.height - 55,
                width: 12,
                height: 20,
                type: 'runner',
                health: 1,
                vx: -3 * this.difficulty.speed,
                vy: 0,
                animFrame: 0
            };
        }

        if (enemy) {
            this.enemies.push(enemy);
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) return;

        // 玩家输入
        this.handleInput(keys, keysPressed);

        // 更新玩家
        this.updatePlayer(deltaTime);

        // 更新敌人
        this.updateEnemies(deltaTime);

        // 更新子弹
        this.updateBullets(deltaTime);

        // 更新特效
        this.updateEffects(deltaTime);

        // 生成敌人
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
        }

        // 卷轴
        const playerScreenX = this.player.x - this.scrollX;
        if (playerScreenX > this.width * 0.6) {
            this.scrollX = this.player.x - this.width * 0.6;
        }
        this.scrollX = Math.max(0, Math.min(this.levelLength - this.width, this.scrollX));
    }

    /**
     * 处理输入
     */
    handleInput(keys, keysPressed) {
        // 移动
        this.player.vx = 0;
        if (keys.left) {
            this.player.vx = -this.player.speed;
            this.player.direction = -1;
        }
        if (keys.right) {
            this.player.vx = this.player.speed;
            this.player.direction = 1;
        }

        // 瞄准方向
        this.player.aimDirection = { x: this.player.direction, y: 0 };
        if (keys.up) {
            this.player.aimDirection.y = -1;
            if (!keys.left && !keys.right) {
                this.player.aimDirection.x = 0;
            }
        }
        if (keys.down && !this.player.onGround) {
            this.player.aimDirection.y = 1;
            if (!keys.left && !keys.right) {
                this.player.aimDirection.x = 0;
            }
        }

        // 跳跃
        if (keysPressed.a && this.player.onGround) {
            this.player.vy = this.player.jumpPower;
            this.player.onGround = false;
            audio.playSelect();
        }

        // 射击
        this.player.shooting = keys.b;
    }

    /**
     * 更新玩家
     */
    updatePlayer(deltaTime) {
        // 射击冷却
        if (this.player.shootCooldown > 0) {
            this.player.shootCooldown -= deltaTime;
        }

        // 射击
        if (this.player.shooting && this.player.shootCooldown <= 0) {
            this.shoot();
            this.player.shootCooldown = this.shootInterval;
        }

        // 无敌时间
        if (this.player.invincible > 0) {
            this.player.invincible -= deltaTime;
        }

        // 重力
        this.player.vy += this.gravity;

        // 移动
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        // 边界
        this.player.x = Math.max(this.scrollX + 10, Math.min(this.scrollX + this.width - 10, this.player.x));

        // 平台碰撞
        this.player.onGround = false;
        for (const plat of this.platforms) {
            if (this.player.vy >= 0 &&
                this.player.x > plat.x - 8 &&
                this.player.x < plat.x + plat.width + 8 &&
                this.player.y + this.player.height / 2 >= plat.y &&
                this.player.y + this.player.height / 2 <= plat.y + plat.height + this.player.vy) {
                this.player.y = plat.y - this.player.height / 2;
                this.player.vy = 0;
                this.player.onGround = true;
                break;
            }
        }

        // 掉落死亡
        if (this.player.y > this.height + 50) {
            this.playerDie();
        }

        // 动画
        this.player.animTimer += deltaTime;
        if (this.player.animTimer > 100) {
            this.player.animTimer = 0;
            this.player.animFrame = (this.player.animFrame + 1) % 4;
        }
    }

    /**
     * 射击
     */
    shoot() {
        const aim = this.player.aimDirection;
        const len = Math.sqrt(aim.x * aim.x + aim.y * aim.y) || 1;
        
        this.bullets.push({
            x: this.player.x + aim.x * 10,
            y: this.player.y - 5 + aim.y * 10,
            vx: (aim.x / len) * this.bulletSpeed,
            vy: (aim.y / len) * this.bulletSpeed,
            isPlayer: true
        });
        audio.playShoot();
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

            // 炮台瞄准玩家
            if (enemy.type === 'turret') {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                enemy.angle = Math.atan2(dy, dx);

                enemy.shootTimer += deltaTime;
                if (enemy.shootTimer > 1500 / this.difficulty.speed) {
                    enemy.shootTimer = 0;
                    this.enemyShoot(enemy);
                }
            }

            // 士兵射击
            if (enemy.type === 'soldier') {
                enemy.shootTimer += deltaTime;
                if (enemy.shootTimer > 2000 / this.difficulty.speed) {
                    enemy.shootTimer = 0;
                    if (Math.abs(enemy.x - this.player.x) < 200) {
                        this.enemyShoot(enemy);
                    }
                }
            }

            // 移除离开屏幕的敌人
            if (enemy.x < this.scrollX - 50) {
                this.enemies.splice(i, 1);
                continue;
            }

            // 与玩家碰撞
            if (this.player.invincible <= 0 && this.checkCollision(this.player, enemy)) {
                this.playerDie();
            }
        }
    }

    /**
     * 敌人射击
     */
    enemyShoot(enemy) {
        let vx, vy;
        
        if (enemy.type === 'turret') {
            vx = Math.cos(enemy.angle) * 3;
            vy = Math.sin(enemy.angle) * 3;
        } else {
            const dx = this.player.x - enemy.x;
            vx = dx > 0 ? 3 : -3;
            vy = 0;
        }

        this.enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx, vy,
            isPlayer: false
        });
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
            if (bullet.x < this.scrollX - 20 || bullet.x > this.scrollX + this.width + 20 ||
                bullet.y < -20 || bullet.y > this.height + 20) {
                this.bullets.splice(i, 1);
                continue;
            }

            // 击中敌人
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (this.pointInRect(bullet.x, bullet.y, enemy)) {
                    enemy.health--;
                    this.bullets.splice(i, 1);
                    
                    if (enemy.health <= 0) {
                        this.score += enemy.type === 'turret' ? 300 : 100;
                        this.addExplosion(enemy.x, enemy.y);
                        this.enemies.splice(j, 1);
                        audio.playExplosion();
                    } else {
                        audio.playHit();
                    }
                    break;
                }
            }
        }

        // 敌人子弹
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // 超出屏幕
            if (bullet.x < this.scrollX - 20 || bullet.x > this.scrollX + this.width + 20 ||
                bullet.y < -20 || bullet.y > this.height + 20) {
                this.enemyBullets.splice(i, 1);
                continue;
            }

            // 击中玩家
            if (this.player.invincible <= 0 &&
                this.pointInRect(bullet.x, bullet.y, this.player)) {
                this.enemyBullets.splice(i, 1);
                this.playerDie();
            }
        }
    }

    /**
     * 玩家死亡
     */
    playerDie() {
        this.lives--;
        this.addExplosion(this.player.x, this.player.y);
        audio.playExplosion();

        if (this.lives <= 0) {
            this.isGameOver = true;
        } else {
            // 重生
            this.player.x = this.scrollX + 50;
            this.player.y = this.height - 60;
            this.player.vy = 0;
            this.player.invincible = 2000;
            this.enemyBullets = [];
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
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3 - 2,
                life: 300,
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
                if (exp.frame > 5) {
                    this.explosions.splice(i, 1);
                }
            }
        }

        // 粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
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
        return a.x - a.width/2 < b.x + b.width/2 &&
               a.x + a.width/2 > b.x - b.width/2 &&
               a.y - a.height/2 < b.y + b.height/2 &&
               a.y + a.height/2 > b.y - b.height/2;
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
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(0.5, '#003344');
        gradient.addColorStop(1, '#002233');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 背景装饰
        this.ctx.fillStyle = '#004455';
        for (let i = 0; i < 10; i++) {
            const x = ((i * 150 - this.scrollX * 0.3) % (this.width + 100)) - 50;
            this.ctx.fillRect(x, 50 + i * 15, 30, 80);
        }

        // 平台
        for (const plat of this.platforms) {
            const screenX = plat.x - this.scrollX;
            if (screenX > -plat.width && screenX < this.width) {
                this.drawPlatform(plat, screenX);
            }
        }

        // 敌人
        for (const enemy of this.enemies) {
            const screenX = enemy.x - this.scrollX;
            if (screenX > -30 && screenX < this.width + 30) {
                this.drawEnemy(enemy, screenX);
            }
        }

        // 玩家
        if (this.player.invincible <= 0 || Math.floor(this.player.invincible / 100) % 2 === 0) {
            this.drawPlayer();
        }

        // 子弹
        this.ctx.fillStyle = '#ffff00';
        for (const bullet of this.bullets) {
            const sx = bullet.x - this.scrollX;
            this.ctx.beginPath();
            this.ctx.arc(sx, bullet.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.fillStyle = '#ff4444';
        for (const bullet of this.enemyBullets) {
            const sx = bullet.x - this.scrollX;
            this.ctx.beginPath();
            this.ctx.arc(sx, bullet.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 爆炸
        for (const exp of this.explosions) {
            this.drawExplosion(exp);
        }

        // 粒子
        for (const p of this.particles) {
            const alpha = p.life / 300;
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillRect(p.x - this.scrollX - 2, p.y - 2, 4, 4);
        }
        this.ctx.globalAlpha = 1;

        // UI
        this.renderUI();
    }

    /**
     * 绘制平台
     */
    drawPlatform(plat, screenX) {
        if (plat.type === 'ground') {
            // 地面
            this.ctx.fillStyle = '#445566';
            this.ctx.fillRect(0, plat.y, this.width, plat.height);
            this.ctx.fillStyle = '#556677';
            this.ctx.fillRect(0, plat.y, this.width, 4);
        } else {
            // 平台
            this.ctx.fillStyle = '#667788';
            this.ctx.fillRect(screenX, plat.y, plat.width, plat.height);
            this.ctx.fillStyle = '#889999';
            this.ctx.fillRect(screenX, plat.y, plat.width, 3);
            this.ctx.fillStyle = '#556677';
            this.ctx.fillRect(screenX, plat.y + plat.height - 2, plat.width, 2);
        }
    }

    /**
     * 绘制玩家
     */
    drawPlayer() {
        const x = this.player.x - this.scrollX;
        const y = this.player.y;
        const dir = this.player.direction;

        // 身体
        this.ctx.fillStyle = '#4488ff';
        this.ctx.fillRect(x - 6, y - 12, 12, 20);

        // 头
        this.ctx.fillStyle = '#ffcc88';
        this.ctx.fillRect(x - 5, y - 20, 10, 10);

        // 头发
        this.ctx.fillStyle = '#553322';
        this.ctx.fillRect(x - 5, y - 22, 10, 4);

        // 枪
        this.ctx.fillStyle = '#888888';
        const gunX = x + dir * 8;
        const gunY = y - 8 + this.player.aimDirection.y * 8;
        this.ctx.fillRect(gunX - 3, gunY - 2, 10, 4);

        // 腿
        this.ctx.fillStyle = '#3366cc';
        if (this.player.onGround && Math.abs(this.player.vx) > 0) {
            const legOffset = Math.sin(this.player.animFrame * 0.8) * 4;
            this.ctx.fillRect(x - 5, y + 8, 4, 8 + legOffset);
            this.ctx.fillRect(x + 1, y + 8, 4, 8 - legOffset);
        } else {
            this.ctx.fillRect(x - 5, y + 8, 4, 8);
            this.ctx.fillRect(x + 1, y + 8, 4, 8);
        }
    }

    /**
     * 绘制敌人
     */
    drawEnemy(enemy, screenX) {
        const y = enemy.y;

        if (enemy.type === 'soldier') {
            // 士兵
            this.ctx.fillStyle = '#aa4444';
            this.ctx.fillRect(screenX - 6, y - 10, 12, 18);
            this.ctx.fillStyle = '#ffaa88';
            this.ctx.fillRect(screenX - 4, y - 18, 8, 8);
            this.ctx.fillStyle = '#884444';
            this.ctx.fillRect(screenX - 4, y - 20, 8, 3);
        } else if (enemy.type === 'turret') {
            // 炮台
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(screenX - 10, y - 6, 20, 12);
            
            // 炮管
            this.ctx.save();
            this.ctx.translate(screenX, y);
            this.ctx.rotate(enemy.angle);
            this.ctx.fillStyle = '#888888';
            this.ctx.fillRect(0, -3, 15, 6);
            this.ctx.restore();
        } else if (enemy.type === 'runner') {
            // 跑者
            this.ctx.fillStyle = '#aa8844';
            this.ctx.fillRect(screenX - 5, y - 8, 10, 16);
            this.ctx.fillStyle = '#ffcc88';
            this.ctx.fillRect(screenX - 4, y - 14, 8, 6);
        }
    }

    /**
     * 绘制爆炸
     */
    drawExplosion(exp) {
        const x = exp.x - this.scrollX;
        const radius = 10 + exp.frame * 4;
        const alpha = 1 - exp.frame / 6;

        const gradient = this.ctx.createRadialGradient(x, exp.y, 0, x, exp.y, radius);
        gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 150, 50, ${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, exp.y, radius, 0, Math.PI * 2);
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
        this.ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, 10, 40);

        // 进度
        const progress = Math.floor((this.scrollX / this.levelLength) * 100);
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${progress}%`, this.width - 10, 20);

        // 难度
        this.ctx.fillStyle = '#666666';
        this.ctx.fillText(this.difficulty.name, this.width - 10, 40);
    }
}

/**
 * 超级玛丽游戏
 * 横版平台跳跃游戏
 */
import { audio } from '../audio.js';

export class Mario {
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
            height: 24,
            vx: 0,
            vy: 0,
            speed: 3,
            jumpPower: -9,
            onGround: true,
            direction: 1,
            animFrame: 0,
            animTimer: 0,
            big: false,
            invincible: 0,
            jumping: false
        };

        // 关卡
        this.platforms = [];
        this.bricks = [];
        this.coins = [];
        this.enemies = [];
        this.pipes = [];
        this.flag = null;

        this.scrollX = 0;
        this.levelLength = 2500;

        // 游戏状态
        this.score = 0;
        this.coinCount = 0;
        this.lives = 3;
        this.isGameOver = false;
        this.victory = false;
        this.gravity = 0.5;

        // 特效
        this.particles = [];
        this.floatingTexts = [];

        this.init();
    }

    init() {
        this.generateLevel();
    }

    /**
     * 生成关卡
     */
    generateLevel() {
        // 地面（有缺口）
        const groundSegments = [
            { start: 0, end: 400 },
            { start: 450, end: 900 },
            { start: 950, end: 1500 },
            { start: 1580, end: 2000 },
            { start: 2050, end: 2500 }
        ];

        for (const seg of groundSegments) {
            this.platforms.push({
                x: seg.start, y: this.height - 30,
                width: seg.end - seg.start, height: 30,
                type: 'ground'
            });
        }

        // 砖块和问号块
        const blockConfigs = [
            { x: 150, y: this.height - 100, type: 'question', content: 'coin' },
            { x: 180, y: this.height - 100, type: 'brick' },
            { x: 210, y: this.height - 100, type: 'question', content: 'mushroom' },
            { x: 240, y: this.height - 100, type: 'brick' },
            
            { x: 400, y: this.height - 140, type: 'brick' },
            { x: 420, y: this.height - 140, type: 'question', content: 'coin' },
            { x: 440, y: this.height - 140, type: 'brick' },
            
            { x: 600, y: this.height - 80, type: 'brick' },
            { x: 620, y: this.height - 80, type: 'brick' },
            { x: 640, y: this.height - 80, type: 'brick' },
            
            { x: 800, y: this.height - 120, type: 'question', content: 'coin' },
            { x: 850, y: this.height - 120, type: 'question', content: 'coin' },
            
            { x: 1000, y: this.height - 100, type: 'brick' },
            { x: 1020, y: this.height - 100, type: 'question', content: 'mushroom' },
            { x: 1040, y: this.height - 100, type: 'brick' },
            
            { x: 1200, y: this.height - 140, type: 'brick' },
            { x: 1220, y: this.height - 140, type: 'brick' },
            { x: 1240, y: this.height - 140, type: 'brick' },
            { x: 1260, y: this.height - 140, type: 'brick' },
            
            { x: 1500, y: this.height - 100, type: 'question', content: 'coin' },
            { x: 1700, y: this.height - 120, type: 'question', content: 'coin' },
            { x: 1900, y: this.height - 100, type: 'brick' },
            { x: 1920, y: this.height - 100, type: 'question', content: 'mushroom' },
        ];

        for (const cfg of blockConfigs) {
            this.bricks.push({
                x: cfg.x, y: cfg.y,
                width: 20, height: 20,
                type: cfg.type,
                content: cfg.content,
                hit: false,
                bounceTimer: 0
            });
        }

        // 管道
        const pipeConfigs = [
            { x: 350, height: 40 },
            { x: 700, height: 60 },
            { x: 1100, height: 50 },
            { x: 1400, height: 70 },
            { x: 1800, height: 40 },
            { x: 2100, height: 50 }
        ];

        for (const cfg of pipeConfigs) {
            this.pipes.push({
                x: cfg.x,
                y: this.height - 30 - cfg.height,
                width: 40,
                height: cfg.height
            });
        }

        // 金币
        const coinPositions = [
            { x: 500, y: this.height - 80 },
            { x: 520, y: this.height - 80 },
            { x: 540, y: this.height - 80 },
            { x: 750, y: this.height - 100 },
            { x: 770, y: this.height - 100 },
            { x: 1150, y: this.height - 80 },
            { x: 1170, y: this.height - 80 },
            { x: 1600, y: this.height - 70 },
            { x: 1620, y: this.height - 70 },
            { x: 1640, y: this.height - 70 },
            { x: 2000, y: this.height - 80 },
            { x: 2020, y: this.height - 80 },
        ];

        for (const pos of coinPositions) {
            this.coins.push({
                x: pos.x, y: pos.y,
                collected: false,
                animFrame: 0
            });
        }

        // 敌人
        const enemyConfigs = [
            { x: 300, type: 'goomba' },
            { x: 500, type: 'goomba' },
            { x: 650, type: 'koopa' },
            { x: 900, type: 'goomba' },
            { x: 1050, type: 'goomba' },
            { x: 1300, type: 'koopa' },
            { x: 1450, type: 'goomba' },
            { x: 1650, type: 'goomba' },
            { x: 1850, type: 'koopa' },
            { x: 2000, type: 'goomba' },
        ];

        for (const cfg of enemyConfigs) {
            this.enemies.push({
                x: cfg.x,
                y: this.height - 50,
                width: 18,
                height: 18,
                type: cfg.type,
                vx: -1 * this.difficulty.speed,
                dead: false,
                deathTimer: 0,
                animFrame: 0
            });
        }

        // 终点旗帜
        this.flag = {
            x: 2400,
            y: this.height - 30 - 150,
            height: 150,
            flagY: 0
        };
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver || this.victory) return;

        // 玩家输入
        this.handleInput(keys, keysPressed);

        // 更新玩家
        this.updatePlayer(deltaTime);

        // 更新敌人
        this.updateEnemies(deltaTime);

        // 更新特效
        this.updateEffects(deltaTime);

        // 更新金币动画
        for (const coin of this.coins) {
            coin.animFrame += deltaTime * 0.01;
        }

        // 卷轴
        const playerScreenX = this.player.x - this.scrollX;
        if (playerScreenX > this.width * 0.4) {
            this.scrollX = this.player.x - this.width * 0.4;
        }
        this.scrollX = Math.max(0, Math.min(this.levelLength - this.width, this.scrollX));

        // 检查终点
        if (this.player.x > this.flag.x) {
            this.victory = true;
            this.score += 5000;
            audio.playLevelUp();
        }
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

        // 跳跃
        if ((keysPressed.a || keysPressed.b) && this.player.onGround) {
            this.player.vy = this.player.jumpPower;
            this.player.onGround = false;
            this.player.jumping = true;
            audio.playSelect();
        }

        // 长按跳更高
        if ((keys.a || keys.b) && this.player.jumping && this.player.vy < 0) {
            this.player.vy -= 0.3;
        } else {
            this.player.jumping = false;
        }
    }

    /**
     * 更新玩家
     */
    updatePlayer(deltaTime) {
        // 无敌时间
        if (this.player.invincible > 0) {
            this.player.invincible -= deltaTime;
        }

        // 重力
        this.player.vy += this.gravity;
        this.player.vy = Math.min(10, this.player.vy);

        // 水平移动
        this.player.x += this.player.vx;

        // 左边界
        this.player.x = Math.max(this.scrollX + 10, this.player.x);

        // 垂直移动
        this.player.y += this.player.vy;

        // 平台碰撞
        this.player.onGround = false;
        
        // 地面碰撞
        for (const plat of this.platforms) {
            if (this.checkPlatformCollision(plat)) {
                break;
            }
        }

        // 管道碰撞
        for (const pipe of this.pipes) {
            this.checkPipeCollision(pipe);
        }

        // 砖块碰撞
        for (const brick of this.bricks) {
            this.checkBrickCollision(brick);
        }

        // 金币收集
        for (const coin of this.coins) {
            if (!coin.collected && this.checkCoinCollision(coin)) {
                coin.collected = true;
                this.coinCount++;
                this.score += 200;
                this.addFloatingText(coin.x, coin.y, '200');
                audio.playEat();
            }
        }

        // 掉落死亡
        if (this.player.y > this.height + 50) {
            this.playerDie();
        }

        // 动画
        this.player.animTimer += deltaTime;
        if (this.player.animTimer > 80) {
            this.player.animTimer = 0;
            this.player.animFrame = (this.player.animFrame + 1) % 4;
        }
    }

    /**
     * 检查平台碰撞
     */
    checkPlatformCollision(plat) {
        const px = this.player.x;
        const py = this.player.y;
        const ph = this.player.height;

        if (this.player.vy >= 0 &&
            px > plat.x - 8 && px < plat.x + plat.width + 8 &&
            py + ph/2 >= plat.y && py + ph/2 <= plat.y + 15) {
            this.player.y = plat.y - ph/2;
            this.player.vy = 0;
            this.player.onGround = true;
            this.player.jumping = false;
            return true;
        }
        return false;
    }

    /**
     * 检查管道碰撞
     */
    checkPipeCollision(pipe) {
        const px = this.player.x;
        const py = this.player.y;
        const pw = this.player.width;
        const ph = this.player.height;

        // 顶部碰撞
        if (this.player.vy >= 0 &&
            px > pipe.x && px < pipe.x + pipe.width &&
            py + ph/2 >= pipe.y && py + ph/2 <= pipe.y + 15) {
            this.player.y = pipe.y - ph/2;
            this.player.vy = 0;
            this.player.onGround = true;
            this.player.jumping = false;
            return;
        }

        // 侧面碰撞
        if (py + ph/2 > pipe.y && py - ph/2 < pipe.y + pipe.height) {
            if (px + pw/2 > pipe.x && px - pw/2 < pipe.x + pipe.width) {
                if (this.player.vx > 0) {
                    this.player.x = pipe.x - pw/2;
                } else if (this.player.vx < 0) {
                    this.player.x = pipe.x + pipe.width + pw/2;
                }
            }
        }
    }

    /**
     * 检查砖块碰撞
     */
    checkBrickCollision(brick) {
        const px = this.player.x;
        const py = this.player.y;
        const pw = this.player.width;
        const ph = this.player.height;

        // 顶部碰撞（站在上面）
        if (this.player.vy >= 0 &&
            px > brick.x - pw/2 && px < brick.x + brick.width + pw/2 &&
            py + ph/2 >= brick.y && py + ph/2 <= brick.y + 10) {
            this.player.y = brick.y - ph/2;
            this.player.vy = 0;
            this.player.onGround = true;
            this.player.jumping = false;
            return;
        }

        // 底部碰撞（撞头）
        if (this.player.vy < 0 &&
            px > brick.x - pw/2 && px < brick.x + brick.width + pw/2 &&
            py - ph/2 <= brick.y + brick.height && py - ph/2 >= brick.y) {
            this.player.vy = 2;
            
            if (!brick.hit) {
                brick.hit = true;
                brick.bounceTimer = 100;
                
                if (brick.type === 'question') {
                    if (brick.content === 'coin') {
                        this.coinCount++;
                        this.score += 200;
                        this.addFloatingText(brick.x + 10, brick.y - 20, '200');
                        audio.playEat();
                    } else if (brick.content === 'mushroom') {
                        this.score += 1000;
                        this.addFloatingText(brick.x + 10, brick.y - 20, '1UP');
                        this.lives++;
                        audio.playClear();
                    }
                } else if (brick.type === 'brick') {
                    // 砖块可以再次被撞
                    brick.hit = false;
                    this.score += 50;
                    audio.playHit();
                    
                    // 添加碎片粒子
                    for (let i = 0; i < 4; i++) {
                        this.particles.push({
                            x: brick.x + 10,
                            y: brick.y + 10,
                            vx: (Math.random() - 0.5) * 4,
                            vy: -Math.random() * 5 - 2,
                            life: 500,
                            color: '#aa6622'
                        });
                    }
                }
            }
        }

        // 更新砖块弹跳动画
        if (brick.bounceTimer > 0) {
            brick.bounceTimer -= 16;
        }
    }

    /**
     * 检查金币碰撞
     */
    checkCoinCollision(coin) {
        const dx = this.player.x - coin.x;
        const dy = this.player.y - coin.y;
        return dx * dx + dy * dy < 400;
    }

    /**
     * 更新敌人
     */
    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            if (enemy.dead) {
                enemy.deathTimer -= deltaTime;
                if (enemy.deathTimer <= 0) {
                    this.enemies.splice(i, 1);
                }
                continue;
            }

            // 移动
            enemy.x += enemy.vx;
            enemy.animFrame += deltaTime * 0.01;

            // 简单边界反弹
            for (const pipe of this.pipes) {
                if (enemy.x > pipe.x && enemy.x < pipe.x + pipe.width) {
                    enemy.vx = -enemy.vx;
                    break;
                }
            }

            // 与玩家碰撞
            if (this.player.invincible <= 0) {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                
                if (Math.abs(dx) < 16 && Math.abs(dy) < 20) {
                    // 从上方踩踏
                    if (this.player.vy > 0 && dy < -5) {
                        enemy.dead = true;
                        enemy.deathTimer = 500;
                        this.player.vy = -6;
                        this.score += enemy.type === 'koopa' ? 200 : 100;
                        this.addFloatingText(enemy.x, enemy.y - 20, enemy.type === 'koopa' ? '200' : '100');
                        audio.playHit();
                    } else {
                        // 被敌人碰到
                        this.playerDie();
                    }
                }
            }

            // 移除离开屏幕的敌人
            if (enemy.x < this.scrollX - 50) {
                this.enemies.splice(i, 1);
            }
        }
    }

    /**
     * 玩家死亡
     */
    playerDie() {
        this.lives--;
        audio.playExplosion();

        if (this.lives <= 0) {
            this.isGameOver = true;
        } else {
            // 重生
            this.player.x = Math.max(50, this.scrollX + 50);
            this.player.y = this.height - 60;
            this.player.vy = 0;
            this.player.invincible = 2000;
        }
    }

    /**
     * 添加浮动文字
     */
    addFloatingText(x, y, text) {
        this.floatingTexts.push({
            x, y, text,
            life: 800,
            vy: -1
        });
    }

    /**
     * 更新特效
     */
    updateEffects(deltaTime) {
        // 粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3;
            p.life -= deltaTime;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 浮动文字
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.life -= deltaTime;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    /**
     * 渲染
     */
    render() {
        // 天空背景
        this.ctx.fillStyle = '#5c94fc';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 云朵
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 8; i++) {
            const cloudX = ((i * 300 - this.scrollX * 0.2) % (this.width + 200)) - 100;
            this.drawCloud(cloudX, 40 + (i % 3) * 30);
        }

        // 山丘背景
        this.ctx.fillStyle = '#00a800';
        for (let i = 0; i < 5; i++) {
            const hillX = ((i * 500 - this.scrollX * 0.5) % (this.width + 300)) - 150;
            this.drawHill(hillX, this.height - 30, 100 + (i % 2) * 50);
        }

        // 地面
        for (const plat of this.platforms) {
            this.drawGround(plat);
        }

        // 管道
        for (const pipe of this.pipes) {
            this.drawPipe(pipe);
        }

        // 砖块
        for (const brick of this.bricks) {
            this.drawBrick(brick);
        }

        // 金币
        for (const coin of this.coins) {
            if (!coin.collected) {
                this.drawCoin(coin);
            }
        }

        // 敌人
        for (const enemy of this.enemies) {
            this.drawEnemy(enemy);
        }

        // 旗帜
        this.drawFlag();

        // 玩家
        if (this.player.invincible <= 0 || Math.floor(this.player.invincible / 100) % 2 === 0) {
            this.drawPlayer();
        }

        // 粒子
        for (const p of this.particles) {
            const alpha = p.life / 500;
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillRect(p.x - this.scrollX - 3, p.y - 3, 6, 6);
        }
        this.ctx.globalAlpha = 1;

        // 浮动文字
        for (const ft of this.floatingTexts) {
            const alpha = ft.life / 800;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.font = 'bold 12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.text, ft.x - this.scrollX, ft.y);
        }

        // UI
        this.renderUI();

        // 胜利画面
        if (this.victory) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('STAGE CLEAR!', this.width / 2, this.height / 2);
        }
    }

    /**
     * 绘制云朵
     */
    drawCloud(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 15, 0, Math.PI * 2);
        this.ctx.arc(x + 20, y - 5, 18, 0, Math.PI * 2);
        this.ctx.arc(x + 40, y, 15, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制山丘
     */
    drawHill(x, y, width) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.quadraticCurveTo(x + width / 2, y - width * 0.6, x + width, y);
        this.ctx.fill();
    }

    /**
     * 绘制地面
     */
    drawGround(plat) {
        const sx = plat.x - this.scrollX;
        
        // 草地层
        this.ctx.fillStyle = '#00d800';
        this.ctx.fillRect(sx, plat.y, plat.width, 8);
        
        // 泥土层
        this.ctx.fillStyle = '#c84c0c';
        this.ctx.fillRect(sx, plat.y + 8, plat.width, plat.height - 8);
        
        // 砖块纹理
        this.ctx.strokeStyle = '#a03000';
        this.ctx.lineWidth = 1;
        for (let bx = 0; bx < plat.width; bx += 20) {
            this.ctx.strokeRect(sx + bx, plat.y + 10, 20, 10);
        }
    }

    /**
     * 绘制管道
     */
    drawPipe(pipe) {
        const sx = pipe.x - this.scrollX;
        
        // 管道主体
        this.ctx.fillStyle = '#00a800';
        this.ctx.fillRect(sx + 4, pipe.y + 20, pipe.width - 8, pipe.height - 20);
        
        // 管道顶部
        this.ctx.fillStyle = '#00d800';
        this.ctx.fillRect(sx, pipe.y, pipe.width, 20);
        
        // 高光
        this.ctx.fillStyle = '#50f850';
        this.ctx.fillRect(sx + 4, pipe.y + 2, 8, 16);
        this.ctx.fillRect(sx + 8, pipe.y + 22, 4, pipe.height - 24);
        
        // 阴影
        this.ctx.fillStyle = '#006800';
        this.ctx.fillRect(sx + pipe.width - 8, pipe.y + 2, 4, 16);
    }

    /**
     * 绘制砖块
     */
    drawBrick(brick) {
        const sx = brick.x - this.scrollX;
        const bounceY = brick.bounceTimer > 0 ? -Math.sin(brick.bounceTimer / 100 * Math.PI) * 5 : 0;
        
        if (brick.type === 'question') {
            // 问号块
            this.ctx.fillStyle = brick.hit ? '#886644' : '#ffa000';
            this.ctx.fillRect(sx, brick.y + bounceY, brick.width, brick.height);
            
            if (!brick.hit) {
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.font = 'bold 14px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('?', sx + 10, brick.y + bounceY + 15);
            }
        } else {
            // 普通砖块
            this.ctx.fillStyle = '#c84c0c';
            this.ctx.fillRect(sx, brick.y + bounceY, brick.width, brick.height);
            this.ctx.strokeStyle = '#a03000';
            this.ctx.strokeRect(sx, brick.y + bounceY, brick.width, brick.height);
        }
    }

    /**
     * 绘制金币
     */
    drawCoin(coin) {
        const sx = coin.x - this.scrollX;
        const stretch = Math.abs(Math.sin(coin.animFrame));
        
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.ellipse(sx, coin.y, 6 * stretch, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.beginPath();
        this.ctx.ellipse(sx - 2 * stretch, coin.y, 2 * stretch, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制敌人
     */
    drawEnemy(enemy) {
        const sx = enemy.x - this.scrollX;
        
        if (enemy.dead) {
            // 被踩扁
            this.ctx.fillStyle = enemy.type === 'koopa' ? '#00a800' : '#c84c0c';
            this.ctx.fillRect(sx - 10, enemy.y + 5, 20, 6);
            return;
        }

        if (enemy.type === 'goomba') {
            // 蘑菇怪
            this.ctx.fillStyle = '#c84c0c';
            this.ctx.beginPath();
            this.ctx.arc(sx, enemy.y - 5, 10, Math.PI, 0);
            this.ctx.fill();
            this.ctx.fillRect(sx - 8, enemy.y - 5, 16, 12);
            
            // 眼睛
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(sx - 5, enemy.y - 3, 4, 4);
            this.ctx.fillRect(sx + 1, enemy.y - 3, 4, 4);
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(sx - 4, enemy.y - 2, 2, 2);
            this.ctx.fillRect(sx + 2, enemy.y - 2, 2, 2);
            
            // 脚
            const legOffset = Math.sin(enemy.animFrame) * 2;
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(sx - 7, enemy.y + 6, 5, 4 + legOffset);
            this.ctx.fillRect(sx + 2, enemy.y + 6, 5, 4 - legOffset);
        } else if (enemy.type === 'koopa') {
            // 乌龟
            // 壳
            this.ctx.fillStyle = '#00a800';
            this.ctx.beginPath();
            this.ctx.ellipse(sx, enemy.y, 10, 12, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 头
            this.ctx.fillStyle = '#ffcc88';
            this.ctx.beginPath();
            this.ctx.arc(sx + 8, enemy.y - 5, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 眼睛
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(sx + 9, enemy.y - 7, 2, 2);
        }
    }

    /**
     * 绘制旗帜
     */
    drawFlag() {
        const sx = this.flag.x - this.scrollX;
        
        // 旗杆
        this.ctx.fillStyle = '#00a800';
        this.ctx.fillRect(sx - 2, this.flag.y, 4, this.flag.height);
        
        // 顶球
        this.ctx.fillStyle = '#00d800';
        this.ctx.beginPath();
        this.ctx.arc(sx, this.flag.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 旗帜
        this.ctx.fillStyle = '#00d800';
        this.ctx.beginPath();
        this.ctx.moveTo(sx, this.flag.y + 10);
        this.ctx.lineTo(sx - 30, this.flag.y + 25);
        this.ctx.lineTo(sx, this.flag.y + 40);
        this.ctx.fill();
    }

    /**
     * 绘制玩家
     */
    drawPlayer() {
        const sx = this.player.x - this.scrollX;
        const y = this.player.y;
        const dir = this.player.direction;

        // 帽子
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(sx - 7 * dir, y - 20, 14, 6);
        this.ctx.fillRect(sx - 5 * dir, y - 24, 10, 4);

        // 脸
        this.ctx.fillStyle = '#ffcc88';
        this.ctx.fillRect(sx - 6, y - 14, 12, 10);

        // 眼睛
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(sx + dir * 2, y - 12, 2, 3);

        // 胡子
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(sx - 4, y - 6, 8, 3);

        // 身体（蓝色工装裤）
        this.ctx.fillStyle = '#0000ff';
        this.ctx.fillRect(sx - 6, y - 4, 12, 14);

        // 红色上衣
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(sx - 5, y - 4, 10, 6);

        // 手臂
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(sx - 9, y - 2, 4, 8);
        this.ctx.fillRect(sx + 5, y - 2, 4, 8);

        // 手
        this.ctx.fillStyle = '#ffcc88';
        this.ctx.fillRect(sx - 9, y + 4, 4, 4);
        this.ctx.fillRect(sx + 5, y + 4, 4, 4);

        // 腿
        if (this.player.onGround && Math.abs(this.player.vx) > 0) {
            const legOffset = Math.sin(this.player.animFrame * 0.8) * 3;
            this.ctx.fillRect(sx - 5, y + 10, 4, 6 + legOffset);
            this.ctx.fillRect(sx + 1, y + 10, 4, 6 - legOffset);
        } else {
            this.ctx.fillRect(sx - 5, y + 10, 4, 6);
            this.ctx.fillRect(sx + 1, y + 10, 4, 6);
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
        this.ctx.fillText(`MARIO`, 10, 18);
        this.ctx.fillText(`${this.score.toString().padStart(6, '0')}`, 10, 34);

        // 金币
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillText(`×${this.coinCount.toString().padStart(2, '0')}`, 120, 34);

        // 生命
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`♥ ${this.lives}`, this.width - 10, 34);

        // 难度
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(this.difficulty.name, this.width - 10, 18);
    }
}

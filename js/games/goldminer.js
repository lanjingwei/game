/**
 * 黄金矿工游戏
 * 经典休闲游戏
 */
import { audio } from '../audio.js';

export class GoldMiner {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 矿工位置
        this.minerX = width / 2;
        this.minerY = 40;

        // 抓钩
        this.hook = {
            x: this.minerX,
            y: this.minerY + 20,
            angle: 0,
            angleSpeed: 2,
            angleDir: 1,
            length: 30,
            maxLength: 250,
            state: 'swing', // swing, extend, retract
            speed: 0,
            attached: null
        };

        // 物品
        this.items = [];
        
        // 游戏状态
        this.score = 0;
        this.targetScore = 500;
        this.level = 1;
        this.timeLeft = 60000;
        this.maxTime = 60000;
        this.lives = 3;
        this.isGameOver = false;
        this.victory = false;
        this.levelComplete = false;
        this.levelCompleteTimer = 0;

        // 商店物品
        this.hasDynamite = false;
        this.hasStrength = false;

        this.init();
    }

    init() {
        this.generateItems();
    }

    /**
     * 生成物品
     */
    generateItems() {
        this.items = [];
        const groundY = 80;

        // 金块（小、中、大）
        const goldConfigs = [
            { count: 5 + this.level, size: 'small', value: 50, weight: 0.5 },
            { count: 3 + Math.floor(this.level / 2), size: 'medium', value: 200, weight: 1 },
            { count: 1 + Math.floor(this.level / 3), size: 'large', value: 500, weight: 2 }
        ];

        for (const cfg of goldConfigs) {
            for (let i = 0; i < cfg.count; i++) {
                this.items.push({
                    x: 30 + Math.random() * (this.width - 60),
                    y: groundY + 30 + Math.random() * (this.height - groundY - 60),
                    type: 'gold',
                    size: cfg.size,
                    value: cfg.value,
                    weight: cfg.weight,
                    radius: cfg.size === 'small' ? 8 : cfg.size === 'medium' ? 14 : 22
                });
            }
        }

        // 石头
        for (let i = 0; i < 4 + this.level; i++) {
            const size = Math.random() < 0.5 ? 'small' : 'large';
            this.items.push({
                x: 30 + Math.random() * (this.width - 60),
                y: groundY + 30 + Math.random() * (this.height - groundY - 60),
                type: 'rock',
                size,
                value: size === 'small' ? 10 : 20,
                weight: size === 'small' ? 1.5 : 3,
                radius: size === 'small' ? 12 : 20
            });
        }

        // 钻石（稀有）
        if (Math.random() < 0.3 + this.level * 0.1) {
            this.items.push({
                x: 30 + Math.random() * (this.width - 60),
                y: groundY + 50 + Math.random() * (this.height - groundY - 80),
                type: 'diamond',
                value: 800,
                weight: 0.3,
                radius: 10
            });
        }

        // 炸药桶（可用来炸掉重物）
        if (this.level >= 2) {
            this.items.push({
                x: 30 + Math.random() * (this.width - 60),
                y: groundY + 40 + Math.random() * (this.height - groundY - 70),
                type: 'tnt',
                value: 0,
                weight: 0.5,
                radius: 12
            });
        }

        // 神秘袋（随机奖励）
        if (Math.random() < 0.2) {
            this.items.push({
                x: 30 + Math.random() * (this.width - 60),
                y: groundY + 30 + Math.random() * (this.height - groundY - 60),
                type: 'bag',
                value: [50, 100, 200, 500][Math.floor(Math.random() * 4)],
                weight: 0.8,
                radius: 14
            });
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver || this.victory) return;

        // 关卡完成等待
        if (this.levelComplete) {
            this.levelCompleteTimer -= deltaTime;
            if (this.levelCompleteTimer <= 0) {
                this.nextLevel();
            }
            return;
        }

        // 时间
        this.timeLeft -= deltaTime;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            if (this.score >= this.targetScore) {
                this.levelComplete = true;
                this.levelCompleteTimer = 2000;
                audio.playLevelUp();
            } else {
                this.lives--;
                if (this.lives <= 0) {
                    this.isGameOver = true;
                } else {
                    // 重新开始当前关卡
                    this.timeLeft = this.maxTime;
                    this.generateItems();
                    audio.playGameOver();
                }
            }
            return;
        }

        // 抓钩状态机
        if (this.hook.state === 'swing') {
            // 摆动
            this.hook.angle += this.hook.angleSpeed * this.hook.angleDir * deltaTime / 16;
            
            if (this.hook.angle > 80) {
                this.hook.angle = 80;
                this.hook.angleDir = -1;
            } else if (this.hook.angle < -80) {
                this.hook.angle = -80;
                this.hook.angleDir = 1;
            }

            // 发射
            if (keysPressed.a || keysPressed.b || keysPressed.down) {
                this.hook.state = 'extend';
                this.hook.speed = 5 * this.difficulty.speed;
                audio.playSelect();
            }
        } else if (this.hook.state === 'extend') {
            // 伸出
            this.hook.length += this.hook.speed;
            
            // 到达最大长度
            if (this.hook.length >= this.hook.maxLength) {
                this.hook.state = 'retract';
                this.hook.speed = 3;
            }

            // 碰到边界
            const hookX = this.minerX + Math.sin(this.hook.angle * Math.PI / 180) * this.hook.length;
            const hookY = this.minerY + 20 + Math.cos(this.hook.angle * Math.PI / 180) * this.hook.length;
            
            if (hookX < 10 || hookX > this.width - 10 || hookY > this.height - 10) {
                this.hook.state = 'retract';
                this.hook.speed = 3;
            }

            // 检查碰撞
            this.checkHookCollision();
        } else if (this.hook.state === 'retract') {
            // 收回
            let retractSpeed = this.hook.speed;
            
            if (this.hook.attached) {
                retractSpeed = this.hook.speed / this.hook.attached.weight;
                if (this.hasStrength) retractSpeed *= 1.5;
            }
            
            this.hook.length -= retractSpeed;

            // 收回完成
            if (this.hook.length <= 30) {
                this.hook.length = 30;
                this.hook.state = 'swing';
                
                // 获得物品
                if (this.hook.attached) {
                    const item = this.hook.attached;
                    
                    if (item.type === 'tnt') {
                        // TNT爆炸音效
                        audio.playExplosion();
                    } else {
                        this.score += item.value;
                        audio.playEat();
                        
                        if (item.type === 'bag') {
                            // 神秘袋随机效果
                            if (Math.random() < 0.3) {
                                this.hasStrength = true;
                            }
                        }
                    }
                    
                    // 移除物品
                    const index = this.items.indexOf(item);
                    if (index > -1) {
                        this.items.splice(index, 1);
                    }
                    
                    this.hook.attached = null;
                }

                // 检查是否完成目标
                if (this.score >= this.targetScore) {
                    this.levelComplete = true;
                    this.levelCompleteTimer = 2000;
                    audio.playLevelUp();
                }
            }

            // 使用炸药
            if (this.hasDynamite && this.hook.attached && keysPressed.up) {
                this.hasDynamite = false;
                this.hook.attached = null;
                this.hook.speed = 5;
                audio.playExplosion();
            }
        }
    }

    /**
     * 检查抓钩碰撞
     */
    checkHookCollision() {
        const hookX = this.minerX + Math.sin(this.hook.angle * Math.PI / 180) * this.hook.length;
        const hookY = this.minerY + 20 + Math.cos(this.hook.angle * Math.PI / 180) * this.hook.length;

        for (const item of this.items) {
            const dx = hookX - item.x;
            const dy = hookY - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < item.radius) {
                this.hook.attached = item;
                this.hook.state = 'retract';
                this.hook.speed = 2;
                audio.playHit();
                break;
            }
        }
    }

    /**
     * 下一关
     */
    nextLevel() {
        this.level++;
        this.targetScore = 500 + this.level * 300;
        this.timeLeft = this.maxTime;
        this.levelComplete = false;
        this.hasStrength = false;
        this.generateItems();
        
        if (this.level > 10) {
            this.victory = true;
        }
    }

    /**
     * 渲染
     */
    render() {
        // 天空
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, 80);
        skyGradient.addColorStop(0, '#87ceeb');
        skyGradient.addColorStop(1, '#5fa8d3');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.width, 80);

        // 地面
        const groundGradient = this.ctx.createLinearGradient(0, 80, 0, this.height);
        groundGradient.addColorStop(0, '#8b4513');
        groundGradient.addColorStop(0.3, '#654321');
        groundGradient.addColorStop(1, '#3d2817');
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, 80, this.width, this.height - 80);

        // 地面纹理
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < 20; i++) {
            const x = (i * 47 + 10) % this.width;
            const y = 90 + (i * 31) % (this.height - 100);
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3 + i % 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 物品
        for (const item of this.items) {
            this.drawItem(item);
        }

        // 抓钩线
        const hookEndX = this.minerX + Math.sin(this.hook.angle * Math.PI / 180) * this.hook.length;
        const hookEndY = this.minerY + 20 + Math.cos(this.hook.angle * Math.PI / 180) * this.hook.length;

        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.minerX, this.minerY + 20);
        this.ctx.lineTo(hookEndX, hookEndY);
        this.ctx.stroke();

        // 抓钩头
        this.drawHook(hookEndX, hookEndY);

        // 矿工
        this.drawMiner();

        // UI
        this.renderUI();

        // 关卡完成
        if (this.levelComplete) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('LEVEL COMPLETE!', this.width / 2, this.height / 2 - 20);
            this.ctx.font = '16px monospace';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(`Score: ${this.score}`, this.width / 2, this.height / 2 + 10);
        }

        // 胜利
        if (this.victory) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('YOU WIN!', this.width / 2, this.height / 2);
        }
    }

    /**
     * 绘制物品
     */
    drawItem(item) {
        const { x, y, type, size, radius } = item;

        if (type === 'gold') {
            // 金块
            const gradient = this.ctx.createRadialGradient(x - 3, y - 3, 0, x, y, radius);
            gradient.addColorStop(0, '#fff700');
            gradient.addColorStop(0.5, '#ffd700');
            gradient.addColorStop(1, '#b8860b');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            
            if (size === 'small') {
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            } else {
                // 多边形金块
                this.ctx.moveTo(x, y - radius);
                for (let i = 1; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                    const r = radius * (0.8 + Math.random() * 0.2);
                    this.ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
                }
            }
            this.ctx.fill();
            
            // 高光
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'rock') {
            // 石头
            this.ctx.fillStyle = '#808080';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - radius);
            for (let i = 1; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const r = radius * (0.7 + Math.random() * 0.3);
                this.ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
            }
            this.ctx.fill();
            
            this.ctx.fillStyle = '#a0a0a0';
            this.ctx.beginPath();
            this.ctx.arc(x - 3, y - 3, radius * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (type === 'diamond') {
            // 钻石
            this.ctx.fillStyle = '#00ffff';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - radius);
            this.ctx.lineTo(x + radius, y);
            this.ctx.lineTo(x, y + radius);
            this.ctx.lineTo(x - radius, y);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - radius + 2);
            this.ctx.lineTo(x + radius - 4, y);
            this.ctx.lineTo(x, y - 2);
            this.ctx.lineTo(x - radius + 4, y);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (type === 'tnt') {
            // TNT
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(x - 8, y - 10, 16, 20);
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = 'bold 8px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('TNT', x, y + 3);
        } else if (type === 'bag') {
            // 神秘袋
            this.ctx.fillStyle = '#8b4513';
            this.ctx.beginPath();
            this.ctx.arc(x, y + 3, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#654321';
            this.ctx.fillRect(x - 5, y - 8, 10, 8);
            
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('?', x, y + 7);
        }
    }

    /**
     * 绘制抓钩
     */
    drawHook(x, y) {
        // 如果抓住了物品，显示物品
        if (this.hook.attached) {
            this.drawItem({
                ...this.hook.attached,
                x: x,
                y: y
            });
        }

        // 抓钩
        this.ctx.fillStyle = '#666666';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - 5);
        this.ctx.lineTo(x - 8, y + 8);
        this.ctx.lineTo(x - 3, y + 8);
        this.ctx.lineTo(x, y + 2);
        this.ctx.lineTo(x + 3, y + 8);
        this.ctx.lineTo(x + 8, y + 8);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * 绘制矿工
     */
    drawMiner() {
        const x = this.minerX;
        const y = this.minerY;

        // 身体
        this.ctx.fillStyle = '#4169e1';
        this.ctx.fillRect(x - 12, y - 5, 24, 25);

        // 头
        this.ctx.fillStyle = '#ffcc88';
        this.ctx.beginPath();
        this.ctx.arc(x, y - 15, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // 帽子
        this.ctx.fillStyle = '#8b4513';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 22, 14, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillRect(x - 10, y - 28, 20, 8);

        // 眼睛
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x - 4, y - 16, 2, 0, Math.PI * 2);
        this.ctx.arc(x + 4, y - 16, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // 笑脸
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 12, 4, 0.2, Math.PI - 0.2);
        this.ctx.stroke();
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`$${this.score}`, 10, 18);

        // 目标
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Goal: $${this.targetScore}`, 10, 32);

        // 关卡
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.fillText(`LV.${this.level}`, this.width / 2, 18);

        // 时间
        const seconds = Math.ceil(this.timeLeft / 1000);
        this.ctx.fillStyle = seconds <= 10 ? '#ff4444' : '#ffffff';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`TIME: ${seconds}s`, this.width - 10, 18);

        // 生命
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillText(`♥ ${this.lives}`, this.width - 10, 32);

        // 道具提示
        if (this.hasStrength) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('STRENGTH UP!', 10, 45);
        }

        // 操作提示
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        if (this.hook.state === 'swing') {
            this.ctx.fillText('Press A to grab!', this.width / 2, this.height - 5);
        } else if (this.hook.attached && this.hasDynamite) {
            this.ctx.fillText('Press UP to use dynamite!', this.width / 2, this.height - 5);
        }
    }
}

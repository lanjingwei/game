/**
 * 投篮游戏
 * 休闲投篮游戏
 */
import { audio } from '../audio.js';

export class Basketball {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 篮筐
        this.hoop = {
            x: width - 60,
            y: 100,
            width: 40,
            rimRadius: 20,
            moving: difficulty.speed > 1
        };

        // 篮球
        this.ball = {
            x: 50,
            y: height - 80,
            radius: 15,
            vx: 0,
            vy: 0,
            spinning: 0,
            active: false
        };

        // 投射参数
        this.power = 0;
        this.maxPower = 100;
        this.angle = 45;
        this.charging = false;

        // 物理参数
        this.gravity = 0.4;

        // 游戏状态
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.shots = 0;
        this.hits = 0;
        this.timeLeft = 60000;
        this.isGameOver = false;

        // 特效
        this.effects = [];

        // 篮筐移动
        this.hoopDirection = 1;
        this.hoopSpeed = difficulty.speed;
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

        // 计时
        this.timeLeft -= deltaTime;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.isGameOver = true;
            audio.playLevelUp();
            return;
        }

        // 移动篮筐
        if (this.hoop.moving) {
            this.hoop.y += this.hoopSpeed * this.hoopDirection;
            if (this.hoop.y < 60 || this.hoop.y > 180) {
                this.hoopDirection *= -1;
            }
        }

        // 更新特效
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life -= deltaTime * 0.003;
            if (this.effects[i].life <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // 球在飞行中
        if (this.ball.active) {
            this.updateBall(deltaTime);
            return;
        }

        // 调整角度
        if (keys.up && this.angle < 80) {
            this.angle += 0.5;
        }
        if (keys.down && this.angle > 10) {
            this.angle -= 0.5;
        }

        // 蓄力
        if (keys.a || keys.b) {
            this.charging = true;
            this.power = Math.min(this.maxPower, this.power + deltaTime * 0.1);
        } else if (this.charging) {
            // 投球
            this.shoot();
            this.charging = false;
        }
    }

    /**
     * 投球
     */
    shoot() {
        const rad = this.angle * Math.PI / 180;
        const speed = this.power * 0.15;

        this.ball.vx = Math.cos(rad) * speed;
        this.ball.vy = -Math.sin(rad) * speed;
        this.ball.active = true;
        this.ball.spinning = speed * 0.1;
        this.shots++;
        this.power = 0;

        audio.playSelect();
    }

    /**
     * 更新球
     */
    updateBall(deltaTime) {
        // 重力
        this.ball.vy += this.gravity;

        // 移动
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // 旋转
        this.ball.spinning *= 0.99;

        // 检查进球
        this.checkScore();

        // 边界检查
        if (this.ball.x < this.ball.radius) {
            this.ball.x = this.ball.radius;
            this.ball.vx *= -0.6;
        }
        if (this.ball.x > this.width - this.ball.radius) {
            this.ball.x = this.width - this.ball.radius;
            this.ball.vx *= -0.6;
        }

        // 篮板反弹
        if (this.ball.x > this.hoop.x - 5 && this.ball.x < this.hoop.x + 50 &&
            this.ball.y > this.hoop.y - 40 && this.ball.y < this.hoop.y + 10) {
            this.ball.vx *= -0.7;
            this.ball.x = this.hoop.x - 5 - this.ball.radius;
            audio.playHit();
        }

        // 篮筐碰撞
        const rimLeft = { x: this.hoop.x - this.hoop.rimRadius, y: this.hoop.y };
        const rimRight = { x: this.hoop.x + this.hoop.rimRadius, y: this.hoop.y };

        for (const rim of [rimLeft, rimRight]) {
            const dx = this.ball.x - rim.x;
            const dy = this.ball.y - rim.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.ball.radius + 4) {
                const angle = Math.atan2(dy, dx);
                this.ball.x = rim.x + Math.cos(angle) * (this.ball.radius + 5);
                this.ball.y = rim.y + Math.sin(angle) * (this.ball.radius + 5);
                
                const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
                this.ball.vx = Math.cos(angle) * speed * 0.6;
                this.ball.vy = Math.sin(angle) * speed * 0.6;
                audio.playHit();
            }
        }

        // 落地
        if (this.ball.y > this.height - 30) {
            this.resetBall();
        }

        // 超出屏幕
        if (this.ball.x > this.width + 50 || this.ball.y > this.height + 50) {
            this.resetBall();
        }
    }

    /**
     * 检查进球
     */
    checkScore() {
        // 球心在篮筐范围内且向下运动
        if (this.ball.vy > 0 &&
            this.ball.x > this.hoop.x - this.hoop.rimRadius + 5 &&
            this.ball.x < this.hoop.x + this.hoop.rimRadius - 5 &&
            this.ball.y > this.hoop.y - 5 && this.ball.y < this.hoop.y + 15) {
            
            // 进球!
            this.streak++;
            let points = 2;
            
            // 三分球
            if (this.ball.x < this.width * 0.4) {
                points = 3;
            }
            
            // 连续进球奖励
            points += Math.floor(this.streak / 3);

            this.score += points;
            this.hits++;

            if (this.streak > this.maxStreak) {
                this.maxStreak = this.streak;
            }

            // 特效
            this.effects.push({
                x: this.hoop.x,
                y: this.hoop.y,
                text: this.streak > 1 ? `+${points} 连续${this.streak}!` : `+${points}`,
                life: 1,
                color: points >= 3 ? '#ffcc00' : '#00ff00'
            });

            audio.playClear();
            this.resetBall();
        }
    }

    /**
     * 重置球
     */
    resetBall() {
        // 如果没进球，重置连击
        if (this.ball.y > this.hoop.y + 50) {
            this.streak = 0;
        }

        this.ball.x = 50;
        this.ball.y = this.height - 80;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.active = false;
        this.ball.spinning = 0;
    }

    /**
     * 重新开始
     */
    restart() {
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.shots = 0;
        this.hits = 0;
        this.timeLeft = 60000;
        this.isGameOver = false;
        this.power = 0;
        this.charging = false;
        this.effects = [];
        this.resetBall();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#2d2d5e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 地板
        this.ctx.fillStyle = '#4a3728';
        this.ctx.fillRect(0, this.height - 30, this.width, 30);

        // 三分线
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.width * 0.4, 0);
        this.ctx.lineTo(this.width * 0.4, this.height - 30);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // 篮板和篮筐
        this.drawHoop();

        // 投射瞄准线
        if (!this.ball.active && (this.charging || this.power > 0)) {
            this.drawAimLine();
        }

        // 篮球
        this.drawBall();

        // 特效
        for (const effect of this.effects) {
            this.ctx.fillStyle = effect.color;
            this.ctx.globalAlpha = effect.life;
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(effect.text, effect.x, effect.y - 30 + (1 - effect.life) * 40);
        }
        this.ctx.globalAlpha = 1;

        // 力度条
        this.drawPowerBar();

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('TIME UP!', this.width / 2, this.height / 2 - 50);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2 - 10);

            const accuracy = this.shots > 0 ? Math.floor(this.hits / this.shots * 100) : 0;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`命中率: ${accuracy}% (${this.hits}/${this.shots})`, this.width / 2, this.height / 2 + 20);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.fillText(`最高连续: ${this.maxStreak}`, this.width / 2, this.height / 2 + 45);

            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 80);
        }
    }

    /**
     * 绘制篮板和篮筐
     */
    drawHoop() {
        // 篮板
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(this.hoop.x + 30, this.hoop.y - 40, 8, 60);

        // 篮板方框
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.hoop.x + 5, this.hoop.y - 25, 25, 20);

        // 篮筐
        this.ctx.strokeStyle = '#ff6600';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(this.hoop.x - this.hoop.rimRadius, this.hoop.y);
        this.ctx.lineTo(this.hoop.x + this.hoop.rimRadius, this.hoop.y);
        this.ctx.stroke();

        // 篮网
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const x = this.hoop.x - this.hoop.rimRadius + i * 10;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.hoop.y);
            this.ctx.quadraticCurveTo(x, this.hoop.y + 25, this.hoop.x, this.hoop.y + 35);
            this.ctx.stroke();
        }
    }

    /**
     * 绘制瞄准线
     */
    drawAimLine() {
        const rad = this.angle * Math.PI / 180;
        const power = this.power * 0.15;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.ball.x, this.ball.y);

        // 预测轨迹
        let px = this.ball.x;
        let py = this.ball.y;
        let vx = Math.cos(rad) * power;
        let vy = -Math.sin(rad) * power;

        for (let i = 0; i < 30; i++) {
            vy += this.gravity * 0.5;
            px += vx * 2;
            py += vy * 2;
            
            if (py > this.height - 30) break;
            
            this.ctx.lineTo(px, py);
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * 绘制篮球
     */
    drawBall() {
        const { x, y, radius, spinning } = this.ball;

        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 2, this.height - 25, radius * 0.8, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 球体
        const gradient = this.ctx.createRadialGradient(x - 4, y - 4, 0, x, y, radius);
        gradient.addColorStop(0, '#ff8c00');
        gradient.addColorStop(1, '#cc5500');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 球纹
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(spinning);

        this.ctx.strokeStyle = '#8b4500';
        this.ctx.lineWidth = 1.5;
        
        // 横线
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius - 1, 0, Math.PI);
        this.ctx.stroke();

        // 竖线
        this.ctx.beginPath();
        this.ctx.moveTo(0, -radius + 1);
        this.ctx.lineTo(0, radius - 1);
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * 绘制力度条
     */
    drawPowerBar() {
        const barWidth = 100;
        const barHeight = 10;
        const x = 10;
        const y = this.height - 65;

        // 背景
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x, y, barWidth, barHeight);

        // 力度
        const powerWidth = (this.power / this.maxPower) * barWidth;
        const hue = 120 - (this.power / this.maxPower) * 120;
        this.ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
        this.ctx.fillRect(x, y, powerWidth, barHeight);

        // 边框
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, barWidth, barHeight);

        // 角度
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${Math.floor(this.angle)}°`, x + barWidth + 10, y + 9);
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.score}`, 10, 30);

        // 连击
        if (this.streak > 0) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`🔥 ${this.streak}`, 10, 50);
        }

        // 时间
        const seconds = Math.ceil(this.timeLeft / 1000);
        this.ctx.fillStyle = seconds <= 10 ? '#ff4444' : '#ffffff';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${seconds}s`, this.width - 10, 30);

        // 提示
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('↑↓调角度 按住A蓄力', this.width / 2, this.height - 8);
    }
}

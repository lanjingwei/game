/**
 * 飞刀挑战游戏
 * 将飞刀插入旋转的木头
 */
import { audio } from '../audio.js';

export class KnifeHit {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 木头目标
        this.target = {
            x: width / 2,
            y: 100,
            radius: 50,
            rotation: 0,
            rotSpeed: 0.02 * difficulty.speed
        };

        // 已插入的刀
        this.knives = [];

        // 待发射的刀
        this.knife = {
            x: width / 2,
            y: height - 60,
            flying: false,
            vy: 0
        };

        // 游戏状态
        this.score = 0;
        this.level = 1;
        this.knivesLeft = 5;
        this.isGameOver = false;
        this.levelComplete = false;

        // 苹果
        this.apple = null;
        this.appleCollected = false;

        this.initLevel();
    }

    /**
     * 初始化关卡
     */
    initLevel() {
        this.knives = [];
        this.knivesLeft = 4 + this.level;
        this.levelComplete = false;
        this.knife.flying = false;
        this.knife.y = this.height - 60;

        // 预置刀的数量
        const preKnives = Math.min(this.level - 1, 4);
        for (let i = 0; i < preKnives; i++) {
            const angle = (i / preKnives) * Math.PI * 2;
            this.knives.push({
                angle,
                length: 35
            });
        }

        // 随机苹果
        if (Math.random() < 0.5) {
            this.apple = {
                angle: Math.random() * Math.PI * 2,
                distance: this.target.radius + 15
            };
            this.appleCollected = false;
        } else {
            this.apple = null;
        }

        // 更新旋转速度
        this.target.rotSpeed = 0.02 * this.difficulty.speed * (1 + this.level * 0.1);
        
        // 随机改变旋转方向
        if (this.level > 2 && Math.random() < 0.3) {
            this.target.rotSpeed *= -1;
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

        if (this.levelComplete) {
            if (keysPressed.a) {
                this.level++;
                this.initLevel();
            }
            return;
        }

        // 旋转木头
        this.target.rotation += this.target.rotSpeed;

        // 飞刀飞行
        if (this.knife.flying) {
            this.knife.y += this.knife.vy;
            this.knife.vy = -15;

            // 检查碰撞
            if (this.knife.y <= this.target.y + this.target.radius + 30) {
                this.checkHit();
            }
        }

        // 发射飞刀
        if (keysPressed.a && !this.knife.flying && this.knivesLeft > 0) {
            this.knife.flying = true;
            this.knife.vy = -15;
            audio.playSelect();
        }
    }

    /**
     * 检查命中
     */
    checkHit() {
        const knifeAngle = -Math.PI / 2 - this.target.rotation;

        // 检查是否撞到其他刀
        for (const knife of this.knives) {
            let angleDiff = Math.abs(knifeAngle - knife.angle);
            angleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

            if (angleDiff < 0.3) {
                // 撞刀了
                this.isGameOver = true;
                audio.playGameOver();
                return;
            }
        }

        // 成功插入
        this.knives.push({
            angle: knifeAngle,
            length: 35
        });

        this.score += 10;
        this.knivesLeft--;
        audio.playClear();

        // 检查苹果
        if (this.apple && !this.appleCollected) {
            let angleDiff = Math.abs(knifeAngle - this.apple.angle);
            angleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
            
            if (angleDiff < 0.4) {
                this.appleCollected = true;
                this.score += 50;
                audio.playEat();
            }
        }

        // 重置刀
        this.knife.flying = false;
        this.knife.y = this.height - 60;

        // 检查过关
        if (this.knivesLeft <= 0) {
            this.levelComplete = true;
            this.score += this.level * 20;
            audio.playLevelUp();
        }
    }

    /**
     * 重新开始
     */
    restart() {
        this.score = 0;
        this.level = 1;
        this.isGameOver = false;
        this.initLevel();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 木头目标
        this.drawTarget();

        // 已插入的刀
        for (const knife of this.knives) {
            this.drawInsertedKnife(knife);
        }

        // 苹果
        if (this.apple && !this.appleCollected) {
            this.drawApple();
        }

        // 待发射/飞行中的刀
        this.drawKnife();

        // 剩余刀数
        this.drawKnivesLeft();

        // UI
        this.renderUI();

        // 过关画面
        if (this.levelComplete) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`第 ${this.level} 关完成!`, this.width / 2, this.height / 2 - 20);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px monospace';
            this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2 + 15);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 下一关', this.width / 2, this.height / 2 + 50);
        }

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
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
            this.ctx.fillText(`到达第 ${this.level} 关`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 65);
        }
    }

    /**
     * 绘制目标
     */
    drawTarget() {
        const { x, y, radius, rotation } = this.target;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);

        // 木头
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, '#8b6914');
        gradient.addColorStop(0.7, '#6b4914');
        gradient.addColorStop(1, '#4a3010');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 年轮
        this.ctx.strokeStyle = '#5a4010';
        this.ctx.lineWidth = 1;
        for (let r = 15; r < radius; r += 12) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /**
     * 绘制已插入的刀
     */
    drawInsertedKnife(knife) {
        const { x, y, radius, rotation } = this.target;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation + knife.angle);

        // 刀柄
        this.ctx.fillStyle = '#4a3728';
        this.ctx.fillRect(-4, radius, 8, 20);

        // 刀刃
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.beginPath();
        this.ctx.moveTo(-4, radius);
        this.ctx.lineTo(0, radius - 15);
        this.ctx.lineTo(4, radius);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * 绘制苹果
     */
    drawApple() {
        const { x, y, rotation } = this.target;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation + this.apple.angle);

        // 苹果
        this.ctx.fillStyle = '#ff4444';
        this.ctx.beginPath();
        this.ctx.arc(0, this.apple.distance, 12, 0, Math.PI * 2);
        this.ctx.fill();

        // 叶子
        this.ctx.fillStyle = '#228b22';
        this.ctx.beginPath();
        this.ctx.ellipse(0, this.apple.distance - 12, 5, 3, 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(-3, this.apple.distance - 3, 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * 绘制飞刀
     */
    drawKnife() {
        const { x, y } = this.knife;

        // 刀柄
        this.ctx.fillStyle = '#4a3728';
        this.ctx.fillRect(x - 4, y, 8, 25);

        // 刀刃
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 4, y);
        this.ctx.lineTo(x, y - 20);
        this.ctx.lineTo(x + 4, y);
        this.ctx.closePath();
        this.ctx.fill();

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 2, y);
        this.ctx.lineTo(x, y - 15);
        this.ctx.lineTo(x, y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * 绘制剩余刀数
     */
    drawKnivesLeft() {
        const startY = this.height - 120;
        
        for (let i = 0; i < this.knivesLeft - 1; i++) {
            const y = startY - i * 15;
            
            // 小刀图标
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(this.width / 2 - 2, y, 4, 12);
            
            this.ctx.fillStyle = '#888888';
            this.ctx.beginPath();
            this.ctx.moveTo(this.width / 2 - 2, y);
            this.ctx.lineTo(this.width / 2, y - 8);
            this.ctx.lineTo(this.width / 2 + 2, y);
            this.ctx.closePath();
            this.ctx.fill();
        }
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

        // 关卡
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`第 ${this.level} 关`, this.width / 2, 30);

        // 剩余刀数
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`剩余: ${this.knivesLeft}`, this.width - 10, 25);

        // 提示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('按 A 投掷飞刀', this.width / 2, this.height - 10);
    }
}

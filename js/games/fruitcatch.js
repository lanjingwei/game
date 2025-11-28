/**
 * 接水果游戏
 * 用篮子接住下落的水果
 */
import { audio } from '../audio.js';

export class FruitCatch {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 篮子
        this.basket = {
            x: width / 2,
            y: height - 40,
            width: 50,
            height: 30
        };

        // 下落物品
        this.items = [];
        this.itemSpeed = 2 + difficulty.speed;

        // 生成计时
        this.spawnTimer = 0;
        this.spawnInterval = 1000 / difficulty.speed;

        // 游戏状态
        this.score = 0;
        this.lives = 5;
        this.combo = 0;
        this.maxCombo = 0;
        this.isGameOver = false;

        // 特效
        this.effects = [];

        // 水果类型
        this.fruitTypes = [
            { name: 'apple', color: '#ff4444', points: 10, emoji: '🍎' },
            { name: 'orange', color: '#ff8800', points: 15, emoji: '🍊' },
            { name: 'grape', color: '#8844ff', points: 20, emoji: '🍇' },
            { name: 'banana', color: '#ffdd00', points: 12, emoji: '🍌' },
            { name: 'cherry', color: '#cc0044', points: 25, emoji: '🍒' },
            { name: 'bomb', color: '#333333', points: -30, emoji: '💣' }
        ];
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

        // 移动篮子
        if (keys.left) {
            this.basket.x = Math.max(this.basket.width / 2, this.basket.x - 5);
        }
        if (keys.right) {
            this.basket.x = Math.min(this.width - this.basket.width / 2, this.basket.x + 5);
        }

        // 生成物品
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnItem();
        }

        // 更新物品
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.y += this.itemSpeed + this.score * 0.01;
            item.rotation += item.rotSpeed;

            // 检查是否接住
            if (item.y > this.basket.y - this.basket.height / 2 &&
                item.y < this.basket.y + 10 &&
                Math.abs(item.x - this.basket.x) < this.basket.width / 2 + item.size / 2) {
                
                this.catchItem(item);
                this.items.splice(i, 1);
                continue;
            }

            // 落地
            if (item.y > this.height + 20) {
                if (item.type.name !== 'bomb') {
                    this.lives--;
                    this.combo = 0;
                    
                    this.effects.push({
                        x: item.x,
                        y: this.height - 20,
                        text: 'MISS',
                        life: 1,
                        color: '#ff4444'
                    });

                    if (this.lives <= 0) {
                        this.isGameOver = true;
                        audio.playGameOver();
                    }
                }
                this.items.splice(i, 1);
            }
        }

        // 更新特效
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life -= deltaTime * 0.003;
            this.effects[i].y -= deltaTime * 0.03;
            if (this.effects[i].life <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // 增加难度
        this.itemSpeed = Math.min(8, 2 + this.difficulty.speed + this.score * 0.005);
    }

    /**
     * 生成物品
     */
    spawnItem() {
        // 炸弹概率20%
        const typeIndex = Math.random() < 0.2 
            ? this.fruitTypes.length - 1 
            : Math.floor(Math.random() * (this.fruitTypes.length - 1));

        this.items.push({
            x: 30 + Math.random() * (this.width - 60),
            y: -20,
            size: 25,
            type: this.fruitTypes[typeIndex],
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 0.1
        });
    }

    /**
     * 接住物品
     */
    catchItem(item) {
        if (item.type.name === 'bomb') {
            // 炸弹
            this.score = Math.max(0, this.score + item.type.points);
            this.lives--;
            this.combo = 0;

            this.effects.push({
                x: item.x,
                y: item.y,
                text: '💥',
                life: 1,
                color: '#ff4444'
            });

            audio.playExplosion();

            if (this.lives <= 0) {
                this.isGameOver = true;
                audio.playGameOver();
            }
        } else {
            // 水果
            this.combo++;
            const points = Math.floor(item.type.points * (1 + this.combo * 0.1));
            this.score += points;

            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }

            this.effects.push({
                x: item.x,
                y: item.y,
                text: `+${points}`,
                life: 1,
                color: this.combo > 5 ? '#ffcc00' : '#00ff00'
            });

            audio.playEat();
        }
    }

    /**
     * 重新开始
     */
    restart() {
        this.items = [];
        this.effects = [];
        this.score = 0;
        this.lives = 5;
        this.combo = 0;
        this.maxCombo = 0;
        this.isGameOver = false;
        this.spawnTimer = 0;
        this.itemSpeed = 2 + this.difficulty.speed;
        this.basket.x = this.width / 2;
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#87ceeb');
        gradient.addColorStop(1, '#98fb98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 地面
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(0, this.height - 20, this.width, 20);

        // 物品
        for (const item of this.items) {
            this.drawItem(item);
        }

        // 篮子
        this.drawBasket();

        // 特效
        for (const effect of this.effects) {
            this.ctx.fillStyle = effect.color;
            this.ctx.globalAlpha = effect.life;
            this.ctx.font = 'bold 18px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(effect.text, effect.x, effect.y);
        }
        this.ctx.globalAlpha = 1;

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 40);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`最高连击: ${this.maxCombo}`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 65);
        }
    }

    /**
     * 绘制物品
     */
    drawItem(item) {
        this.ctx.save();
        this.ctx.translate(item.x, item.y);
        this.ctx.rotate(item.rotation);

        if (item.type.name === 'bomb') {
            // 炸弹
            this.ctx.fillStyle = '#333333';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // 引线
            this.ctx.strokeStyle = '#888888';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -item.size / 2);
            this.ctx.quadraticCurveTo(5, -item.size / 2 - 8, 3, -item.size / 2 - 12);
            this.ctx.stroke();

            // 火花
            if (Math.floor(Date.now() / 100) % 2) {
                this.ctx.fillStyle = '#ff4400';
                this.ctx.beginPath();
                this.ctx.arc(3, -item.size / 2 - 12, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            // 水果
            this.ctx.fillStyle = item.type.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // 高光
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(-item.size / 6, -item.size / 6, item.size / 5, 0, Math.PI * 2);
            this.ctx.fill();

            // 叶子
            if (item.type.name !== 'grape' && item.type.name !== 'cherry') {
                this.ctx.fillStyle = '#228b22';
                this.ctx.beginPath();
                this.ctx.ellipse(0, -item.size / 2 - 3, 6, 4, 0.3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.restore();
    }

    /**
     * 绘制篮子
     */
    drawBasket() {
        const { x, y, width, height } = this.basket;

        // 篮子主体
        this.ctx.fillStyle = '#8b4513';
        this.ctx.beginPath();
        this.ctx.moveTo(x - width / 2, y - height / 2);
        this.ctx.lineTo(x - width / 2 + 8, y + height / 2);
        this.ctx.lineTo(x + width / 2 - 8, y + height / 2);
        this.ctx.lineTo(x + width / 2, y - height / 2);
        this.ctx.closePath();
        this.ctx.fill();

        // 篮子纹理
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const py = y - height / 2 + 8 + i * 8;
            this.ctx.beginPath();
            this.ctx.moveTo(x - width / 2 + 3 + i * 2, py);
            this.ctx.lineTo(x + width / 2 - 3 - i * 2, py);
            this.ctx.stroke();
        }
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.score}`, 10, 25);

        // 连击
        if (this.combo > 1) {
            this.ctx.fillStyle = '#ff6600';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`x${this.combo}`, 10, 45);
        }

        // 生命
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = '16px monospace';
        this.ctx.textAlign = 'right';
        let hearts = '';
        for (let i = 0; i < this.lives; i++) {
            hearts += '♥';
        }
        this.ctx.fillText(hearts, this.width - 10, 25);

        // 提示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('←→移动篮子 避开炸弹', this.width / 2, 15);
    }
}

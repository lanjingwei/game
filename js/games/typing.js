/**
 * 打字游戏
 * 字母下落打字游戏
 */
import { audio } from '../audio.js';

export class Typing {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 下落字母
        this.letters = [];
        this.letterSpeed = 1 + difficulty.speed * 0.5;

        // 生成计时
        this.spawnTimer = 0;
        this.spawnInterval = 2000 / difficulty.speed;
        this.minInterval = 800;

        // 当前选择的字母 (ABCD对应四列)
        this.selectedCol = 0;
        this.cols = 4;
        this.colWidth = width / this.cols;
        this.colLetters = ['A', 'B', 'C', 'D'];

        // 游戏状态
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.hits = 0;
        this.misses = 0;
        this.maxMisses = 10;
        this.isGameOver = false;

        // 特效
        this.effects = [];

        // 移动冷却
        this.moveCooldown = 0;
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

        // 生成字母
        this.spawnTimer += deltaTime;
        const interval = Math.max(this.minInterval, this.spawnInterval - this.score * 2);
        
        if (this.spawnTimer >= interval) {
            this.spawnTimer = 0;
            this.spawnLetter();
        }

        // 更新字母
        for (let i = this.letters.length - 1; i >= 0; i--) {
            const letter = this.letters[i];
            letter.y += this.letterSpeed + this.score * 0.005;

            // 超出屏幕
            if (letter.y > this.height) {
                this.misses++;
                this.combo = 0;
                this.letters.splice(i, 1);

                this.effects.push({
                    x: letter.x,
                    y: this.height - 30,
                    text: 'MISS',
                    life: 1,
                    color: '#ff4444'
                });

                audio.playHit();

                if (this.misses >= this.maxMisses) {
                    this.isGameOver = true;
                    audio.playGameOver();
                }
            }
        }

        // 更新特效
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life -= deltaTime * 0.004;
            this.effects[i].y -= deltaTime * 0.05;
            if (this.effects[i].life <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // 移动冷却
        if (this.moveCooldown > 0) {
            this.moveCooldown -= deltaTime;
        }

        // 移动选择
        if (this.moveCooldown <= 0) {
            if (keysPressed.left && this.selectedCol > 0) {
                this.selectedCol--;
                this.moveCooldown = 100;
            } else if (keysPressed.right && this.selectedCol < this.cols - 1) {
                this.selectedCol++;
                this.moveCooldown = 100;
            }
        }

        // 击打
        if (keysPressed.a || keysPressed.b) {
            this.hitLetter();
        }
    }

    /**
     * 生成字母
     */
    spawnLetter() {
        const col = Math.floor(Math.random() * this.cols);
        const letter = this.colLetters[col];

        this.letters.push({
            letter,
            col,
            x: col * this.colWidth + this.colWidth / 2,
            y: -30,
            size: 30
        });
    }

    /**
     * 击打字母
     */
    hitLetter() {
        // 找到当前列最低的字母
        let lowestLetter = null;
        let lowestIndex = -1;

        for (let i = 0; i < this.letters.length; i++) {
            const letter = this.letters[i];
            if (letter.col === this.selectedCol && letter.y > 0) {
                if (!lowestLetter || letter.y > lowestLetter.y) {
                    lowestLetter = letter;
                    lowestIndex = i;
                }
            }
        }

        if (lowestLetter && lowestLetter.y > this.height * 0.3) {
            // 命中
            this.letters.splice(lowestIndex, 1);
            this.combo++;
            this.hits++;

            // 计分
            let points = 10;
            if (lowestLetter.y > this.height * 0.8) {
                points = 30; // 精准
            } else if (lowestLetter.y > this.height * 0.6) {
                points = 20;
            }

            points += this.combo * 2;
            this.score += points;

            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }

            this.effects.push({
                x: lowestLetter.x,
                y: lowestLetter.y,
                text: `+${points}`,
                life: 1,
                color: this.combo > 5 ? '#ffcc00' : '#00ff00'
            });

            audio.playClear();
        } else {
            // 打空
            this.combo = 0;
            audio.playSelect();
        }
    }

    /**
     * 重新开始
     */
    restart() {
        this.letters = [];
        this.effects = [];
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.hits = 0;
        this.misses = 0;
        this.isGameOver = false;
        this.spawnTimer = 0;
        this.selectedCol = 0;
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 列分隔线
        this.ctx.strokeStyle = '#333344';
        this.ctx.lineWidth = 1;
        for (let i = 1; i < this.cols; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.colWidth, 0);
            this.ctx.lineTo(i * this.colWidth, this.height);
            this.ctx.stroke();
        }

        // 底部区域
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(0, this.height - 60, this.width, 60);

        // 判定线
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - 60);
        this.ctx.lineTo(this.width, this.height - 60);
        this.ctx.stroke();

        // 列标签
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        for (let i = 0; i < this.cols; i++) {
            const x = i * this.colWidth + this.colWidth / 2;
            
            if (i === this.selectedCol) {
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.fillRect(i * this.colWidth, this.height - 60, this.colWidth, 60);
            }

            this.ctx.fillStyle = i === this.selectedCol ? '#000000' : '#666666';
            this.ctx.fillText(this.colLetters[i], x, this.height - 25);
        }

        // 下落字母
        for (const letter of this.letters) {
            this.drawLetter(letter);
        }

        // 特效
        for (const effect of this.effects) {
            this.ctx.fillStyle = effect.color;
            this.ctx.globalAlpha = effect.life;
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(effect.text, effect.x, effect.y);
        }
        this.ctx.globalAlpha = 1;

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 40);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2);

            const accuracy = this.hits + this.misses > 0 
                ? Math.floor(this.hits / (this.hits + this.misses) * 100) 
                : 0;
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`准确率: ${accuracy}%`, this.width / 2, this.height / 2 + 25);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.fillText(`最高连击: ${this.maxCombo}`, this.width / 2, this.height / 2 + 50);

            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 85);
        }
    }

    /**
     * 绘制字母
     */
    drawLetter(letter) {
        const { x, y, size } = letter;

        // 背景圆
        this.ctx.fillStyle = '#4a69bd';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // 边框
        this.ctx.strokeStyle = '#6a89cc';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 字母
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${size * 0.6}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(letter.letter, x, y);
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.score}`, 10, 25);

        // 连击
        if (this.combo > 0) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`COMBO ${this.combo}`, 10, 45);
        }

        // 失误
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Miss: ${this.misses}/${this.maxMisses}`, this.width - 10, 25);

        // 提示
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('←→选择 A/B击打', this.width / 2, 15);
    }
}

/**
 * 记忆翻牌游戏
 * 经典配对记忆游戏
 */
import { audio } from '../audio.js';

export class Memory {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 根据难度设置网格大小
        if (difficulty.speed < 1) {
            this.cols = 4;
            this.rows = 3;
        } else if (difficulty.speed === 1) {
            this.cols = 4;
            this.rows = 4;
        } else {
            this.cols = 5;
            this.rows = 4;
        }

        this.cellSize = Math.min(
            Math.floor((width - 40) / this.cols),
            Math.floor((height - 80) / this.rows)
        );
        this.offsetX = (width - this.cols * this.cellSize) / 2;
        this.offsetY = (height - this.rows * this.cellSize) / 2 + 15;

        // 卡片图案
        this.symbols = ['★', '♥', '♦', '♣', '♠', '●', '▲', '■', '◆', '○'];

        // 游戏板
        this.cards = [];
        this.flipped = [];
        this.matched = [];

        // 光标
        this.cursorX = 0;
        this.cursorY = 0;

        // 游戏状态
        this.moves = 0;
        this.pairs = 0;
        this.totalPairs = 0;
        this.timer = 0;
        this.isGameOver = false;
        this.won = false;
        this.canFlip = true;

        // 翻牌动画
        this.flipAnimations = [];

        // 移动冷却
        this.moveCooldown = 0;

        this.init();
    }

    init() {
        this.generateCards();
    }

    /**
     * 生成卡片
     */
    generateCards() {
        const totalCards = this.cols * this.rows;
        this.totalPairs = totalCards / 2;
        
        // 创建配对
        const values = [];
        for (let i = 0; i < this.totalPairs; i++) {
            const symbol = this.symbols[i % this.symbols.length];
            values.push(symbol, symbol);
        }

        // 洗牌
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }

        // 创建卡片
        this.cards = [];
        this.flipped = [];
        this.matched = [];
        
        let index = 0;
        for (let y = 0; y < this.rows; y++) {
            this.cards[y] = [];
            this.flipped[y] = [];
            this.matched[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.cards[y][x] = {
                    symbol: values[index],
                    color: this.getSymbolColor(values[index])
                };
                this.flipped[y][x] = false;
                this.matched[y][x] = false;
                index++;
            }
        }
    }

    /**
     * 获取符号颜色
     */
    getSymbolColor(symbol) {
        const colors = {
            '★': '#ffcc00',
            '♥': '#ff4444',
            '♦': '#ff8800',
            '♣': '#44aa44',
            '♠': '#4444ff',
            '●': '#ff44ff',
            '▲': '#44ffff',
            '■': '#ff6666',
            '◆': '#66ff66',
            '○': '#6666ff'
        };
        return colors[symbol] || '#ffffff';
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.won) {
            if (keysPressed.a) {
                this.restart();
            }
            return;
        }

        // 计时
        this.timer += deltaTime;

        // 更新翻牌动画
        for (let i = this.flipAnimations.length - 1; i >= 0; i--) {
            const anim = this.flipAnimations[i];
            anim.progress += deltaTime / 150;
            if (anim.progress >= 1) {
                this.flipAnimations.splice(i, 1);
            }
        }

        // 移动冷却
        if (this.moveCooldown > 0) {
            this.moveCooldown -= deltaTime;
        }

        // 光标移动
        if (this.moveCooldown <= 0) {
            if (keys.left && this.cursorX > 0) {
                this.cursorX--;
                this.moveCooldown = 120;
            } else if (keys.right && this.cursorX < this.cols - 1) {
                this.cursorX++;
                this.moveCooldown = 120;
            } else if (keys.up && this.cursorY > 0) {
                this.cursorY--;
                this.moveCooldown = 120;
            } else if (keys.down && this.cursorY < this.rows - 1) {
                this.cursorY++;
                this.moveCooldown = 120;
            }
        }

        // 翻牌
        if (keysPressed.a && this.canFlip) {
            this.flipCard(this.cursorX, this.cursorY);
        }
    }

    /**
     * 翻牌
     */
    flipCard(x, y) {
        // 已经翻开或已配对
        if (this.flipped[y][x] || this.matched[y][x]) {
            return;
        }

        // 获取当前翻开的牌
        const flippedCards = [];
        for (let fy = 0; fy < this.rows; fy++) {
            for (let fx = 0; fx < this.cols; fx++) {
                if (this.flipped[fy][fx] && !this.matched[fy][fx]) {
                    flippedCards.push({ x: fx, y: fy });
                }
            }
        }

        // 已有两张翻开
        if (flippedCards.length >= 2) {
            return;
        }

        // 翻开当前牌
        this.flipped[y][x] = true;
        this.flipAnimations.push({
            x, y,
            progress: 0,
            type: 'flip'
        });
        audio.playSelect();

        // 检查配对
        if (flippedCards.length === 1) {
            this.moves++;
            const first = flippedCards[0];
            const firstCard = this.cards[first.y][first.x];
            const secondCard = this.cards[y][x];

            if (firstCard.symbol === secondCard.symbol) {
                // 配对成功
                this.matched[first.y][first.x] = true;
                this.matched[y][x] = true;
                this.pairs++;
                audio.playClear();

                // 检查胜利
                if (this.pairs >= this.totalPairs) {
                    this.won = true;
                    audio.playLevelUp();
                }
            } else {
                // 配对失败，延迟翻回
                this.canFlip = false;
                setTimeout(() => {
                    this.flipped[first.y][first.x] = false;
                    this.flipped[y][x] = false;
                    this.flipAnimations.push({ x: first.x, y: first.y, progress: 0, type: 'unflip' });
                    this.flipAnimations.push({ x, y, progress: 0, type: 'unflip' });
                    this.canFlip = true;
                    audio.playHit();
                }, 800);
            }
        }
    }

    /**
     * 重新开始
     */
    restart() {
        this.moves = 0;
        this.pairs = 0;
        this.timer = 0;
        this.won = false;
        this.canFlip = true;
        this.flipAnimations = [];
        this.cursorX = 0;
        this.cursorY = 0;
        this.init();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#0d0d1a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 绘制卡片
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.drawCard(x, y);
            }
        }

        // 绘制光标
        this.drawCursor();

        // UI
        this.renderUI();

        // 胜利画面
        if (this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('YOU WIN!', this.width / 2, this.height / 2 - 30);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px monospace';
            const time = Math.floor(this.timer / 1000);
            this.ctx.fillText(`时间: ${time}秒`, this.width / 2, this.height / 2 + 5);
            this.ctx.fillText(`步数: ${this.moves}`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 65);
        }
    }

    /**
     * 绘制卡片
     */
    drawCard(x, y) {
        const px = this.offsetX + x * this.cellSize + 3;
        const py = this.offsetY + y * this.cellSize + 3;
        const size = this.cellSize - 6;

        const card = this.cards[y][x];
        const isFlipped = this.flipped[y][x];
        const isMatched = this.matched[y][x];

        // 查找动画
        let scaleX = 1;
        for (const anim of this.flipAnimations) {
            if (anim.x === x && anim.y === y) {
                if (anim.progress < 0.5) {
                    scaleX = 1 - anim.progress * 2;
                } else {
                    scaleX = (anim.progress - 0.5) * 2;
                }
            }
        }

        // 计算缩放后的位置和大小
        const scaledWidth = size * scaleX;
        const offsetX = (size - scaledWidth) / 2;

        if (isMatched) {
            // 已配对 - 显示半透明
            this.ctx.fillStyle = 'rgba(50, 200, 50, 0.3)';
            this.ctx.fillRect(px + offsetX, py, scaledWidth, size);

            this.ctx.fillStyle = card.color;
            this.ctx.globalAlpha = 0.5;
            this.ctx.font = `bold ${size * 0.6}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(card.symbol, px + size/2, py + size/2);
            this.ctx.globalAlpha = 1;
        } else if (isFlipped) {
            // 翻开 - 显示正面
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(px + offsetX, py, scaledWidth, size);

            // 边框
            this.ctx.strokeStyle = card.color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(px + offsetX + 2, py + 2, scaledWidth - 4, size - 4);

            // 符号
            if (scaleX > 0.3) {
                this.ctx.fillStyle = card.color;
                this.ctx.font = `bold ${size * 0.6}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(card.symbol, px + size/2, py + size/2);
            }
        } else {
            // 未翻开 - 显示背面
            this.ctx.fillStyle = '#4a69bd';
            this.ctx.fillRect(px + offsetX, py, scaledWidth, size);

            // 花纹
            this.ctx.strokeStyle = '#6a89cc';
            this.ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                this.ctx.strokeRect(
                    px + offsetX + 4 + i * 3,
                    py + 4 + i * 3,
                    scaledWidth - 8 - i * 6,
                    size - 8 - i * 6
                );
            }

            // 问号
            if (scaleX > 0.3) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `bold ${size * 0.4}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('?', px + size/2, py + size/2);
            }
        }
    }

    /**
     * 绘制光标
     */
    drawCursor() {
        const px = this.offsetX + this.cursorX * this.cellSize;
        const py = this.offsetY + this.cursorY * this.cellSize;

        this.ctx.strokeStyle = '#ff6b6b';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(px, py, this.cellSize, this.cellSize);

        // 闪烁效果
        if (Math.floor(Date.now() / 300) % 2) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.strokeRect(px, py, this.cellSize, this.cellSize);
        }
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 步数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`步数: ${this.moves}`, 10, 20);

        // 配对数
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.pairs}/${this.totalPairs}`, this.width / 2, 20);

        // 时间
        const seconds = Math.floor(this.timer / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, this.width - 10, 20);

        // 提示
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('方向键移动 A翻牌', this.width / 2, this.height - 8);
    }
}

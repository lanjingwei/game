/**
 * 贪吃蛇游戏
 * 带眼睛和渐变蛇身的彩色版本
 */
import { audio } from '../audio.js';

export class Snake {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 游戏区域设置
        this.cols = 20;
        this.rows = 18;
        this.cellSize = 16;
        this.offsetX = 0;
        this.offsetY = 0;

        // 游戏状态
        this.snake = [];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.food = null;
        this.specialFood = null;
        this.score = 0;
        this.isGameOver = false;

        // 移动计时
        this.moveTimer = 0;
        this.baseMoveInterval = 150 / difficulty.speed;
        this.moveInterval = this.baseMoveInterval;

        // 特殊食物计时
        this.specialFoodTimer = 0;
        this.specialFoodDuration = 5000;

        // 蛇身颜色
        this.headColor = '#32cd32';
        this.bodyColors = ['#2eb82e', '#28a428', '#228b22', '#1e7b1e'];

        // 食物闪烁
        this.foodBlink = 0;

        this.init();
    }

    init() {
        // 初始化蛇
        const startX = Math.floor(this.cols / 4);
        const startY = Math.floor(this.rows / 2);
        this.snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];

        this.spawnFood();
    }

    /**
     * 生成食物
     */
    spawnFood() {
        let x, y;
        do {
            x = Math.floor(Math.random() * this.cols);
            y = Math.floor(Math.random() * this.rows);
        } while (this.isSnakeAt(x, y));

        this.food = { x, y };
    }

    /**
     * 生成特殊食物
     */
    spawnSpecialFood() {
        let x, y;
        do {
            x = Math.floor(Math.random() * this.cols);
            y = Math.floor(Math.random() * this.rows);
        } while (this.isSnakeAt(x, y) || (this.food && this.food.x === x && this.food.y === y));

        this.specialFood = { x, y };
        this.specialFoodTimer = this.specialFoodDuration;
    }

    /**
     * 检查位置是否有蛇
     */
    isSnakeAt(x, y) {
        return this.snake.some(seg => seg.x === x && seg.y === y);
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) return;

        // 方向输入（不能直接掉头）
        if (keysPressed.up && this.direction.y !== 1) {
            this.nextDirection = { x: 0, y: -1 };
        } else if (keysPressed.down && this.direction.y !== -1) {
            this.nextDirection = { x: 0, y: 1 };
        } else if (keysPressed.left && this.direction.x !== 1) {
            this.nextDirection = { x: -1, y: 0 };
        } else if (keysPressed.right && this.direction.x !== -1) {
            this.nextDirection = { x: 1, y: 0 };
        }

        // 移动计时
        this.moveTimer += deltaTime;
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            this.move();
        }

        // 特殊食物计时
        if (this.specialFood) {
            this.specialFoodTimer -= deltaTime;
            if (this.specialFoodTimer <= 0) {
                this.specialFood = null;
            }
        } else if (this.score > 0 && this.score % 50 === 0 && Math.random() < 0.01) {
            this.spawnSpecialFood();
        }

        // 食物动画
        this.foodBlink += deltaTime * 0.01;
    }

    /**
     * 移动蛇
     */
    move() {
        this.direction = { ...this.nextDirection };

        const head = this.snake[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };

        // 边界检测（穿墙）
        if (newHead.x < 0) newHead.x = this.cols - 1;
        if (newHead.x >= this.cols) newHead.x = 0;
        if (newHead.y < 0) newHead.y = this.rows - 1;
        if (newHead.y >= this.rows) newHead.y = 0;

        // 自身碰撞检测
        if (this.isSnakeAt(newHead.x, newHead.y)) {
            this.isGameOver = true;
            return;
        }

        // 添加新头部
        this.snake.unshift(newHead);

        // 检查是否吃到食物
        let ate = false;
        if (this.food && newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 10;
            this.spawnFood();
            ate = true;
            audio.playEat();

            // 加速
            this.moveInterval = Math.max(50, this.baseMoveInterval - this.snake.length * 2);
        }

        // 检查是否吃到特殊食物
        if (this.specialFood && newHead.x === this.specialFood.x && newHead.y === this.specialFood.y) {
            this.score += 50;
            this.specialFood = null;
            ate = true;
            // 额外增加长度
            for (let i = 0; i < 3; i++) {
                this.snake.push({ ...this.snake[this.snake.length - 1] });
            }
            audio.playClear();
        }

        // 如果没吃到食物，移除尾部
        if (!ate) {
            this.snake.pop();
        }
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#0a1a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 网格
        this.ctx.strokeStyle = 'rgba(30, 60, 30, 0.3)';
        this.ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX + x * this.cellSize, this.offsetY);
            this.ctx.lineTo(this.offsetX + x * this.cellSize, this.offsetY + this.rows * this.cellSize);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, this.offsetY + y * this.cellSize);
            this.ctx.lineTo(this.offsetX + this.cols * this.cellSize, this.offsetY + y * this.cellSize);
            this.ctx.stroke();
        }

        // 渲染蛇身（从尾到头）
        for (let i = this.snake.length - 1; i >= 0; i--) {
            const seg = this.snake[i];
            const x = this.offsetX + seg.x * this.cellSize;
            const y = this.offsetY + seg.y * this.cellSize;

            if (i === 0) {
                // 蛇头
                this.drawHead(x, y);
            } else {
                // 蛇身（渐变颜色）
                const colorIndex = Math.min(i - 1, this.bodyColors.length - 1);
                const colorProgress = Math.min((i - 1) / Math.max(this.snake.length - 1, 1), 1);
                this.drawBody(x, y, colorIndex, colorProgress);
            }
        }

        // 渲染食物
        if (this.food) {
            this.drawFood(this.food.x, this.food.y, false);
        }

        // 渲染特殊食物
        if (this.specialFood) {
            this.drawFood(this.specialFood.x, this.specialFood.y, true);
        }

        // UI
        this.renderUI();
    }

    /**
     * 绘制蛇头
     */
    drawHead(x, y) {
        const size = this.cellSize - 1;

        // 头部主体
        this.ctx.fillStyle = this.headColor;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, 2);
        this.ctx.fill();

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x + 1, y + 1, size - 2, 2);

        // 眼睛位置根据方向
        const eyeSize = 2;
        let eye1X, eye1Y, eye2X, eye2Y;

        if (this.direction.x === 1) { // 右
            eye1X = x + size - 3;
            eye1Y = y + 1;
            eye2X = x + size - 3;
            eye2Y = y + size - 3;
        } else if (this.direction.x === -1) { // 左
            eye1X = x + 1;
            eye1Y = y + 1;
            eye2X = x + 1;
            eye2Y = y + size - 3;
        } else if (this.direction.y === -1) { // 上
            eye1X = x + 1;
            eye1Y = y + 1;
            eye2X = x + size - 3;
            eye2Y = y + 1;
        } else { // 下
            eye1X = x + 1;
            eye1Y = y + size - 3;
            eye2X = x + size - 3;
            eye2Y = y + size - 3;
        }

        // 眼白
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
        this.ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);

        // 眼珠
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(eye1X + 1, eye1Y + 1, 1, 1);
        this.ctx.fillRect(eye2X + 1, eye2Y + 1, 1, 1);
    }

    /**
     * 绘制蛇身
     */
    drawBody(x, y, colorIndex, progress) {
        const size = this.cellSize - 1;
        const color = this.bodyColors[colorIndex];

        // 主体
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, 1);
        this.ctx.fill();

        // 高光
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.2 - progress * 0.15})`;
        this.ctx.fillRect(x + 1, y + 1, size - 2, 1);

        // 暗部
        this.ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + progress * 0.1})`;
        this.ctx.fillRect(x + 1, y + size - 2, size - 2, 1);
    }

    /**
     * 绘制食物
     */
    drawFood(gridX, gridY, isSpecial) {
        const x = this.offsetX + gridX * this.cellSize;
        const y = this.offsetY + gridY * this.cellSize;
        const size = this.cellSize - 2;
        const pulse = Math.sin(this.foodBlink * 3) * 0.2 + 0.8;

        if (isSpecial) {
            // 特殊食物（星星）
            const centerX = x + this.cellSize / 2;
            const centerY = y + this.cellSize / 2;
            const blink = Math.floor(this.specialFoodTimer / 200) % 2;

            this.ctx.fillStyle = blink ? '#ffd700' : '#ffaa00';
            this.ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 72 - 90) * Math.PI / 180;
                const r = i % 2 === 0 ? 4 * pulse : 2;
                const px = centerX + Math.cos(angle) * r;
                const py = centerY + Math.sin(angle) * r;
                if (i === 0) this.ctx.moveTo(px, py);
                else this.ctx.lineTo(px, py);
            }
            this.ctx.closePath();
            this.ctx.fill();
        } else {
            // 普通食物（苹果）
            // 苹果主体
            this.ctx.fillStyle = `rgba(255, ${50 + pulse * 30}, 50, ${pulse})`;
            this.ctx.beginPath();
            this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2 + 1, size / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // 高光
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(x + this.cellSize / 2 - 1, y + this.cellSize / 2, 1, 0, Math.PI * 2);
            this.ctx.fill();

            // 茎
            this.ctx.fillStyle = '#654321';
            this.ctx.fillRect(x + this.cellSize / 2 - 0.5, y + 1, 1, 2);

            // 叶子
            this.ctx.fillStyle = '#228b22';
            this.ctx.fillRect(x + this.cellSize / 2, y + 1, 2, 1);
        }
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`SCORE: ${this.score}`, this.width - 10, 20);

        // 长度
        this.ctx.fillStyle = '#88ff88';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`LEN: ${this.snake.length}`, this.width - 10, 40);

        // 难度
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.difficulty.name, 10, 20);
    }
}

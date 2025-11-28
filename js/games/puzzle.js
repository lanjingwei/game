/**
 * 拼图游戏
 * 滑块拼图游戏
 */
import { audio } from '../audio.js';

export class Puzzle {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        if (difficulty.speed < 1) {
            this.gridSize = 3;
        } else if (difficulty.speed === 1) {
            this.gridSize = 4;
        } else {
            this.gridSize = 5;
        }

        this.cellSize = Math.floor(220 / this.gridSize);
        this.offsetX = (width - this.gridSize * this.cellSize) / 2;
        this.offsetY = (height - this.gridSize * this.cellSize) / 2 + 10;

        // 游戏板
        this.tiles = [];
        this.emptyX = this.gridSize - 1;
        this.emptyY = this.gridSize - 1;

        // 图案颜色
        this.colors = this.generateColors();

        // 游戏状态
        this.moves = 0;
        this.timer = 0;
        this.isGameOver = false;
        this.won = false;

        // 移动冷却
        this.moveCooldown = 0;

        // 动画
        this.animating = false;
        this.animTile = null;

        this.init();
    }

    /**
     * 生成颜色
     */
    generateColors() {
        const colors = [];
        const total = this.gridSize * this.gridSize;
        
        for (let i = 0; i < total; i++) {
            const hue = (i / total) * 360;
            colors.push(`hsl(${hue}, 70%, 50%)`);
        }
        
        return colors;
    }

    init() {
        // 初始化有序拼图
        this.tiles = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                const num = y * this.gridSize + x + 1;
                this.tiles[y][x] = num < this.gridSize * this.gridSize ? num : 0;
            }
        }

        this.emptyX = this.gridSize - 1;
        this.emptyY = this.gridSize - 1;

        // 打乱拼图
        this.shuffle();
    }

    /**
     * 打乱拼图
     */
    shuffle() {
        const moves = this.gridSize * this.gridSize * 20;
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (let i = 0; i < moves; i++) {
            const validMoves = [];
            
            for (const [dx, dy] of directions) {
                const nx = this.emptyX + dx;
                const ny = this.emptyY + dy;
                
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    validMoves.push([nx, ny]);
                }
            }

            const [nx, ny] = validMoves[Math.floor(Math.random() * validMoves.length)];
            this.tiles[this.emptyY][this.emptyX] = this.tiles[ny][nx];
            this.tiles[ny][nx] = 0;
            this.emptyX = nx;
            this.emptyY = ny;
        }

        this.moves = 0;
        this.timer = 0;
        this.won = false;
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

        // 动画中不允许操作
        if (this.animating) {
            return;
        }

        // 移动冷却
        if (this.moveCooldown > 0) {
            this.moveCooldown -= deltaTime;
            return;
        }

        // 移动（方向相反，因为移动的是块而非空位）
        if (keysPressed.up || keysPressed.down || keysPressed.left || keysPressed.right) {
            let tx = this.emptyX;
            let ty = this.emptyY;

            if (keysPressed.up && this.emptyY < this.gridSize - 1) {
                ty = this.emptyY + 1;
            } else if (keysPressed.down && this.emptyY > 0) {
                ty = this.emptyY - 1;
            } else if (keysPressed.left && this.emptyX < this.gridSize - 1) {
                tx = this.emptyX + 1;
            } else if (keysPressed.right && this.emptyX > 0) {
                tx = this.emptyX - 1;
            }

            if (tx !== this.emptyX || ty !== this.emptyY) {
                this.moveTile(tx, ty);
            }
        }

        // 快捷键A - 移动相邻块
        if (keysPressed.a) {
            // 自动找一个可移动的块
            const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dx, dy] of directions) {
                const nx = this.emptyX + dx;
                const ny = this.emptyY + dy;
                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    this.moveTile(nx, ny);
                    break;
                }
            }
        }
    }

    /**
     * 移动块
     */
    moveTile(x, y) {
        // 检查是否相邻空位
        const dx = Math.abs(x - this.emptyX);
        const dy = Math.abs(y - this.emptyY);
        
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            // 交换
            this.tiles[this.emptyY][this.emptyX] = this.tiles[y][x];
            this.tiles[y][x] = 0;
            this.emptyX = x;
            this.emptyY = y;
            this.moves++;
            this.moveCooldown = 100;
            
            audio.playSelect();

            // 检查胜利
            if (this.checkWin()) {
                this.won = true;
                audio.playLevelUp();
            }
        }
    }

    /**
     * 检查胜利
     */
    checkWin() {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const expected = y * this.gridSize + x + 1;
                if (y === this.gridSize - 1 && x === this.gridSize - 1) {
                    if (this.tiles[y][x] !== 0) return false;
                } else {
                    if (this.tiles[y][x] !== expected) return false;
                }
            }
        }
        return true;
    }

    /**
     * 重新开始
     */
    restart() {
        this.init();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#1a252f');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 拼图区域背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(
            this.offsetX - 5,
            this.offsetY - 5,
            this.gridSize * this.cellSize + 10,
            this.gridSize * this.cellSize + 10
        );

        // 绘制块
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.drawTile(x, y);
            }
        }

        // UI
        this.renderUI();

        // 胜利画面
        if (this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('完成!', this.width / 2, this.height / 2 - 30);

            const time = Math.floor(this.timer / 1000);
            const mins = Math.floor(time / 60);
            const secs = time % 60;

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px monospace';
            this.ctx.fillText(`用时: ${mins}:${secs.toString().padStart(2, '0')}`, this.width / 2, this.height / 2 + 5);
            this.ctx.fillText(`步数: ${this.moves}`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 再来一局', this.width / 2, this.height / 2 + 65);
        }
    }

    /**
     * 绘制块
     */
    drawTile(x, y) {
        const num = this.tiles[y][x];
        if (num === 0) return;

        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;
        const size = this.cellSize - 3;

        // 块背景
        const colorIndex = num - 1;
        this.ctx.fillStyle = this.colors[colorIndex];
        this.ctx.fillRect(px + 1, py + 1, size, size);

        // 3D效果
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(px + 1, py + 1, size, 4);
        this.ctx.fillRect(px + 1, py + 1, 4, size);

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(px + 1, py + size - 3, size, 4);
        this.ctx.fillRect(px + size - 3, py + 1, 4, size);

        // 数字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${this.cellSize * 0.4}px monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillText(num.toString(), px + size / 2 + 2, py + size / 2 + 2);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(num.toString(), px + size / 2, py + size / 2);
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.gridSize}×${this.gridSize} 拼图`, this.width / 2, 22);

        // 步数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`步数: ${this.moves}`, 10, this.height - 25);

        // 时间
        const time = Math.floor(this.timer / 1000);
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, this.width - 10, this.height - 25);

        // 提示
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('方向键移动滑块', this.width / 2, this.height - 5);
    }
}

/**
 * 数独游戏
 * 经典数字益智游戏
 */
import { audio } from '../audio.js';

export class Sudoku {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        this.gridSize = 9;
        this.cellSize = 28;
        this.offsetX = (width - this.gridSize * this.cellSize) / 2;
        this.offsetY = (height - this.gridSize * this.cellSize) / 2 + 15;

        // 游戏板
        this.solution = [];
        this.puzzle = [];
        this.userInput = [];
        this.fixed = [];

        // 光标
        this.cursorX = 4;
        this.cursorY = 4;
        this.selectedNum = 1;

        // 游戏状态
        this.timer = 0;
        this.isGameOver = false;
        this.won = false;
        this.errors = 0;

        // 移动冷却
        this.moveCooldown = 0;

        this.init();
    }

    init() {
        this.generatePuzzle();
    }

    /**
     * 生成数独谜题
     */
    generatePuzzle() {
        // 生成完整解答
        this.solution = this.generateSolution();
        
        // 复制并挖空
        this.puzzle = this.solution.map(row => [...row]);
        this.userInput = Array(9).fill(null).map(() => Array(9).fill(0));
        this.fixed = Array(9).fill(null).map(() => Array(9).fill(false));

        // 根据难度挖空
        let removeCount;
        if (this.difficulty.speed < 1) {
            removeCount = 35; // 简单
        } else if (this.difficulty.speed === 1) {
            removeCount = 45; // 普通
        } else {
            removeCount = 55; // 困难
        }

        const positions = [];
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                positions.push({ x, y });
            }
        }

        // 随机打乱
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        // 挖空
        for (let i = 0; i < removeCount; i++) {
            const pos = positions[i];
            this.puzzle[pos.y][pos.x] = 0;
        }

        // 标记固定格子
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                this.fixed[y][x] = this.puzzle[y][x] !== 0;
            }
        }
    }

    /**
     * 生成完整解答
     */
    generateSolution() {
        const grid = Array(9).fill(null).map(() => Array(9).fill(0));
        this.solveSudoku(grid);
        return grid;
    }

    /**
     * 递归求解数独
     */
    solveSudoku(grid) {
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                if (grid[y][x] === 0) {
                    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    // 随机打乱
                    for (let i = nums.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [nums[i], nums[j]] = [nums[j], nums[i]];
                    }

                    for (const num of nums) {
                        if (this.isValidPlacement(grid, x, y, num)) {
                            grid[y][x] = num;
                            if (this.solveSudoku(grid)) {
                                return true;
                            }
                            grid[y][x] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 检查放置是否有效
     */
    isValidPlacement(grid, x, y, num) {
        // 检查行
        for (let i = 0; i < 9; i++) {
            if (grid[y][i] === num) return false;
        }

        // 检查列
        for (let i = 0; i < 9; i++) {
            if (grid[i][x] === num) return false;
        }

        // 检查3x3宫
        const boxX = Math.floor(x / 3) * 3;
        const boxY = Math.floor(y / 3) * 3;
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                if (grid[boxY + dy][boxX + dx] === num) return false;
            }
        }

        return true;
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

        // 移动冷却
        if (this.moveCooldown > 0) {
            this.moveCooldown -= deltaTime;
        }

        // 光标移动
        if (this.moveCooldown <= 0) {
            if (keys.left && this.cursorX > 0) {
                this.cursorX--;
                this.moveCooldown = 120;
            } else if (keys.right && this.cursorX < 8) {
                this.cursorX++;
                this.moveCooldown = 120;
            } else if (keys.up && this.cursorY > 0) {
                this.cursorY--;
                this.moveCooldown = 120;
            } else if (keys.down && this.cursorY < 8) {
                this.cursorY++;
                this.moveCooldown = 120;
            }
        }

        // 切换数字
        if (keysPressed.l) {
            this.selectedNum = this.selectedNum > 1 ? this.selectedNum - 1 : 9;
            audio.playSelect();
        }
        if (keysPressed.r) {
            this.selectedNum = this.selectedNum < 9 ? this.selectedNum + 1 : 1;
            audio.playSelect();
        }

        // 放置数字
        if (keysPressed.a) {
            this.placeNumber();
        }

        // 清除数字
        if (keysPressed.b) {
            this.clearNumber();
        }
    }

    /**
     * 放置数字
     */
    placeNumber() {
        if (this.fixed[this.cursorY][this.cursorX]) {
            audio.playHit();
            return;
        }

        const num = this.selectedNum;
        
        // 检查是否正确
        if (num === this.solution[this.cursorY][this.cursorX]) {
            this.puzzle[this.cursorY][this.cursorX] = num;
            this.userInput[this.cursorY][this.cursorX] = num;
            audio.playClear();

            // 检查是否完成
            if (this.checkComplete()) {
                this.won = true;
                audio.playLevelUp();
            }
        } else {
            this.userInput[this.cursorY][this.cursorX] = -num; // 负数表示错误
            this.errors++;
            audio.playHit();
        }
    }

    /**
     * 清除数字
     */
    clearNumber() {
        if (this.fixed[this.cursorY][this.cursorX]) {
            return;
        }

        this.userInput[this.cursorY][this.cursorX] = 0;
        if (this.puzzle[this.cursorY][this.cursorX] !== this.solution[this.cursorY][this.cursorX]) {
            this.puzzle[this.cursorY][this.cursorX] = 0;
        }
        audio.playSelect();
    }

    /**
     * 检查是否完成
     */
    checkComplete() {
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                if (this.puzzle[y][x] !== this.solution[y][x]) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 重新开始
     */
    restart() {
        this.timer = 0;
        this.errors = 0;
        this.won = false;
        this.cursorX = 4;
        this.cursorY = 4;
        this.selectedNum = 1;
        this.init();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#f5f5dc';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 绘制网格
        this.drawGrid();

        // 绘制数字
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                this.drawCell(x, y);
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
            this.ctx.fillText(`错误: ${this.errors}次`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 新游戏', this.width / 2, this.height / 2 + 65);
        }
    }

    /**
     * 绘制网格
     */
    drawGrid() {
        // 背景格子
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                const px = this.offsetX + x * this.cellSize;
                const py = this.offsetY + y * this.cellSize;
                
                // 3x3宫交替颜色
                const boxX = Math.floor(x / 3);
                const boxY = Math.floor(y / 3);
                if ((boxX + boxY) % 2 === 0) {
                    this.ctx.fillStyle = '#e8e8d8';
                } else {
                    this.ctx.fillStyle = '#f5f5dc';
                }
                this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
            }
        }

        // 细线
        this.ctx.strokeStyle = '#ccccaa';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 9; i++) {
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, this.offsetY + i * this.cellSize);
            this.ctx.lineTo(this.offsetX + 9 * this.cellSize, this.offsetY + i * this.cellSize);
            this.ctx.stroke();
            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX + i * this.cellSize, this.offsetY);
            this.ctx.lineTo(this.offsetX + i * this.cellSize, this.offsetY + 9 * this.cellSize);
            this.ctx.stroke();
        }

        // 粗线（3x3宫分隔）
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
        for (let i = 0; i <= 3; i++) {
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, this.offsetY + i * 3 * this.cellSize);
            this.ctx.lineTo(this.offsetX + 9 * this.cellSize, this.offsetY + i * 3 * this.cellSize);
            this.ctx.stroke();
            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX + i * 3 * this.cellSize, this.offsetY);
            this.ctx.lineTo(this.offsetX + i * 3 * this.cellSize, this.offsetY + 9 * this.cellSize);
            this.ctx.stroke();
        }
    }

    /**
     * 绘制格子
     */
    drawCell(x, y) {
        const px = this.offsetX + x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + y * this.cellSize + this.cellSize / 2;

        const num = this.puzzle[y][x];
        const userNum = this.userInput[y][x];

        if (num !== 0) {
            // 显示数字
            if (this.fixed[y][x]) {
                this.ctx.fillStyle = '#333333';
                this.ctx.font = 'bold 18px monospace';
            } else {
                this.ctx.fillStyle = '#0066cc';
                this.ctx.font = '18px monospace';
            }
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(num.toString(), px, py + 1);
        } else if (userNum < 0) {
            // 显示错误输入
            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = '18px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(Math.abs(userNum).toString(), px, py + 1);
        }
    }

    /**
     * 绘制光标
     */
    drawCursor() {
        const px = this.offsetX + this.cursorX * this.cellSize;
        const py = this.offsetY + this.cursorY * this.cellSize;

        this.ctx.strokeStyle = '#ff6600';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);

        // 高亮同行同列
        this.ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
        for (let i = 0; i < 9; i++) {
            if (i !== this.cursorX) {
                this.ctx.fillRect(this.offsetX + i * this.cellSize, py, this.cellSize, this.cellSize);
            }
            if (i !== this.cursorY) {
                this.ctx.fillRect(px, this.offsetY + i * this.cellSize, this.cellSize, this.cellSize);
            }
        }
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 时间
        const time = Math.floor(this.timer / 1000);
        const mins = Math.floor(time / 60);
        const secs = time % 60;

        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, 10, 20);

        // 错误次数
        this.ctx.fillStyle = '#ff4444';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`错误: ${this.errors}`, this.width - 10, 20);

        // 当前选择的数字
        this.ctx.fillStyle = '#0066cc';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`[${this.selectedNum}]`, this.width / 2, 20);

        // 数字选择提示
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('L/R换数字 A填入 B清除', this.width / 2, this.height - 5);
    }
}

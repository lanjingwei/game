/**
 * 扫雷游戏
 * 经典益智游戏
 */
import { audio } from '../audio.js';

export class Minesweeper {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 根据难度设置
        if (difficulty.speed < 1) {
            this.cols = 9;
            this.rows = 9;
            this.mineCount = 10;
        } else if (difficulty.speed === 1) {
            this.cols = 12;
            this.rows = 10;
            this.mineCount = 20;
        } else {
            this.cols = 14;
            this.rows = 12;
            this.mineCount = 35;
        }

        this.cellSize = Math.min(
            Math.floor((width - 20) / this.cols),
            Math.floor((height - 60) / this.rows)
        );
        this.offsetX = (width - this.cols * this.cellSize) / 2;
        this.offsetY = (height - this.rows * this.cellSize) / 2 + 15;

        // 游戏板
        this.grid = [];      // 0-8数字, -1雷
        this.revealed = [];  // 是否揭开
        this.flagged = [];   // 是否标记

        // 光标
        this.cursorX = Math.floor(this.cols / 2);
        this.cursorY = Math.floor(this.rows / 2);

        // 游戏状态
        this.isGameOver = false;
        this.won = false;
        this.firstClick = true;
        this.flagCount = 0;
        this.revealedCount = 0;
        this.timer = 0;
        this.timerRunning = false;

        // 移动冷却
        this.moveCooldown = 0;

        this.init();
    }

    init() {
        // 初始化空网格
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            this.revealed[y] = [];
            this.flagged[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = 0;
                this.revealed[y][x] = false;
                this.flagged[y][x] = false;
            }
        }
    }

    /**
     * 放置地雷（第一次点击后）
     */
    placeMines(safeX, safeY) {
        let placed = 0;
        while (placed < this.mineCount) {
            const x = Math.floor(Math.random() * this.cols);
            const y = Math.floor(Math.random() * this.rows);

            // 确保不在安全区域（第一次点击周围3x3）
            if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue;
            if (this.grid[y][x] === -1) continue;

            this.grid[y][x] = -1;
            placed++;
        }

        // 计算数字
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] !== -1) {
                    this.grid[y][x] = this.countAdjacentMines(x, y);
                }
            }
        }
    }

    /**
     * 计算相邻地雷数
     */
    countAdjacentMines(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                    if (this.grid[ny][nx] === -1) count++;
                }
            }
        }
        return count;
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver || this.won) {
            if (keysPressed.a) {
                this.restart();
            }
            return;
        }

        // 计时器
        if (this.timerRunning) {
            this.timer += deltaTime;
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

        // 揭开格子
        if (keysPressed.a) {
            this.reveal(this.cursorX, this.cursorY);
        }

        // 标记/取消标记
        if (keysPressed.b) {
            this.toggleFlag(this.cursorX, this.cursorY);
        }
    }

    /**
     * 揭开格子
     */
    reveal(x, y) {
        if (this.revealed[y][x] || this.flagged[y][x]) return;

        // 第一次点击
        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(x, y);
            this.timerRunning = true;
        }

        this.revealed[y][x] = true;
        this.revealedCount++;
        audio.playSelect();

        // 踩雷
        if (this.grid[y][x] === -1) {
            this.gameOver();
            return;
        }

        // 空格子，自动揭开周围
        if (this.grid[y][x] === 0) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                        if (!this.revealed[ny][nx]) {
                            this.reveal(nx, ny);
                        }
                    }
                }
            }
        }

        // 检查胜利
        this.checkWin();
    }

    /**
     * 标记地雷
     */
    toggleFlag(x, y) {
        if (this.revealed[y][x]) return;

        if (this.flagged[y][x]) {
            this.flagged[y][x] = false;
            this.flagCount--;
        } else if (this.flagCount < this.mineCount) {
            this.flagged[y][x] = true;
            this.flagCount++;
        }
        audio.playHit();
    }

    /**
     * 检查胜利
     */
    checkWin() {
        const safeCount = this.cols * this.rows - this.mineCount;
        if (this.revealedCount === safeCount) {
            this.won = true;
            this.timerRunning = false;
            audio.playLevelUp();
        }
    }

    /**
     * 游戏结束
     */
    gameOver() {
        this.isGameOver = true;
        this.timerRunning = false;
        
        // 揭开所有地雷
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === -1) {
                    this.revealed[y][x] = true;
                }
            }
        }
        
        audio.playExplosion();
    }

    /**
     * 重新开始
     */
    restart() {
        this.isGameOver = false;
        this.won = false;
        this.firstClick = true;
        this.flagCount = 0;
        this.revealedCount = 0;
        this.timer = 0;
        this.timerRunning = false;
        this.cursorX = Math.floor(this.cols / 2);
        this.cursorY = Math.floor(this.rows / 2);
        this.init();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 顶部栏
        this.ctx.fillStyle = '#808080';
        this.ctx.fillRect(10, 10, this.width - 20, 35);
        
        // 地雷计数
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(15, 15, 50, 25);
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText((this.mineCount - this.flagCount).toString().padStart(3, '0'), 40, 34);

        // 表情按钮
        const faceX = this.width / 2;
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(faceX, 27, 12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 表情
        this.ctx.fillStyle = '#000000';
        if (this.isGameOver) {
            // 死亡表情
            this.ctx.fillText('X', faceX - 4, 25);
            this.ctx.fillText('X', faceX + 4, 25);
            this.ctx.beginPath();
            this.ctx.arc(faceX, 32, 4, Math.PI, 0);
            this.ctx.stroke();
        } else if (this.won) {
            // 胜利表情
            this.ctx.beginPath();
            this.ctx.arc(faceX - 4, 24, 2, 0, Math.PI * 2);
            this.ctx.arc(faceX + 4, 24, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(faceX, 28, 5, 0, Math.PI);
            this.ctx.stroke();
        } else {
            // 正常表情
            this.ctx.beginPath();
            this.ctx.arc(faceX - 4, 24, 2, 0, Math.PI * 2);
            this.ctx.arc(faceX + 4, 24, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(faceX, 30, 4, 0.2, Math.PI - 0.2);
            this.ctx.stroke();
        }

        // 计时器
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(this.width - 65, 15, 50, 25);
        this.ctx.fillStyle = '#ff0000';
        const seconds = Math.min(999, Math.floor(this.timer / 1000));
        this.ctx.fillText(seconds.toString().padStart(3, '0'), this.width - 40, 34);

        // 游戏板
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.drawCell(x, y);
            }
        }

        // 光标
        if (!this.isGameOver && !this.won) {
            this.drawCursor();
        }

        // 底部提示
        this.ctx.fillStyle = '#333333';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('A:揭开  B:标记', this.width / 2, this.height - 5);

        // 游戏结束/胜利信息
        if (this.isGameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(0, this.height / 2 - 30, this.width, 60);
            
            this.ctx.fillStyle = this.won ? '#00ff00' : '#ff0000';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? 'YOU WIN!' : 'GAME OVER', this.width / 2, this.height / 2);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 20);
        }
    }

    /**
     * 绘制格子
     */
    drawCell(x, y) {
        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;
        const size = this.cellSize - 1;

        if (this.revealed[y][x]) {
            // 已揭开
            this.ctx.fillStyle = '#bdbdbd';
            this.ctx.fillRect(px, py, size, size);
            
            const value = this.grid[y][x];
            
            if (value === -1) {
                // 地雷
                this.ctx.fillStyle = this.cursorX === x && this.cursorY === y && this.isGameOver 
                    ? '#ff0000' : '#bdbdbd';
                this.ctx.fillRect(px, py, size, size);
                
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath();
                this.ctx.arc(px + size/2, py + size/2, size/3, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 地雷刺
                for (let i = 0; i < 4; i++) {
                    const angle = i * Math.PI / 4;
                    this.ctx.beginPath();
                    this.ctx.moveTo(px + size/2, py + size/2);
                    this.ctx.lineTo(
                        px + size/2 + Math.cos(angle) * size/2.5,
                        py + size/2 + Math.sin(angle) * size/2.5
                    );
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
            } else if (value > 0) {
                // 数字
                const colors = ['', '#0000ff', '#008000', '#ff0000', '#000080', 
                               '#800000', '#008080', '#000000', '#808080'];
                this.ctx.fillStyle = colors[value];
                this.ctx.font = `bold ${this.cellSize - 4}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(value.toString(), px + size/2, py + size/2 + 1);
            }
        } else {
            // 未揭开
            this.ctx.fillStyle = '#c0c0c0';
            this.ctx.fillRect(px, py, size, size);
            
            // 3D效果
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(px, py, size, 2);
            this.ctx.fillRect(px, py, 2, size);
            
            this.ctx.fillStyle = '#808080';
            this.ctx.fillRect(px + size - 2, py, 2, size);
            this.ctx.fillRect(px, py + size - 2, size, 2);
            
            // 旗帜
            if (this.flagged[y][x]) {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.moveTo(px + size/2, py + 3);
                this.ctx.lineTo(px + size - 3, py + size/3);
                this.ctx.lineTo(px + size/2, py + size/2);
                this.ctx.fill();
                
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(px + size/2 - 1, py + size/3, 2, size/2);
            }
        }
    }

    /**
     * 绘制光标
     */
    drawCursor() {
        const px = this.offsetX + this.cursorX * this.cellSize;
        const py = this.offsetY + this.cursorY * this.cellSize;
        const size = this.cellSize - 1;

        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(px - 1, py - 1, size + 2, size + 2);
    }
}

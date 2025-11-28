/**
 * 2048游戏
 * 数字合并游戏
 */
import { audio } from '../audio.js';

export class Game2048 {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        this.gridSize = 4;
        this.cellSize = 60;
        this.cellGap = 8;
        this.offsetX = (width - (this.cellSize * this.gridSize + this.cellGap * (this.gridSize + 1))) / 2;
        this.offsetY = (height - (this.cellSize * this.gridSize + this.cellGap * (this.gridSize + 1))) / 2 + 20;

        // 游戏板
        this.grid = [];
        this.animatingTiles = [];

        // 游戏状态
        this.score = 0;
        this.bestScore = 0;
        this.isGameOver = false;
        this.won = false;
        this.canMove = true;

        // 颜色映射
        this.colors = {
            0: '#cdc1b4',
            2: '#eee4da',
            4: '#ede0c8',
            8: '#f2b179',
            16: '#f59563',
            32: '#f67c5f',
            64: '#f65e3b',
            128: '#edcf72',
            256: '#edcc61',
            512: '#edc850',
            1024: '#edc53f',
            2048: '#edc22e',
            4096: '#3c3a32',
            8192: '#3c3a32'
        };

        this.textColors = {
            2: '#776e65',
            4: '#776e65'
        };

        this.init();
    }

    init() {
        // 初始化空网格
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x] = 0;
            }
        }

        // 添加两个初始方块
        this.addRandomTile();
        this.addRandomTile();
    }

    /**
     * 添加随机方块
     */
    addRandomTile() {
        const emptyCells = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] === 0) {
                    emptyCells.push({ x, y });
                }
            }
        }

        if (emptyCells.length > 0) {
            const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            // 90%概率是2，10%概率是4
            this.grid[cell.y][cell.x] = Math.random() < 0.9 ? 2 : 4;
            
            // 添加出现动画
            this.animatingTiles.push({
                x: cell.x,
                y: cell.y,
                scale: 0,
                targetScale: 1,
                type: 'appear'
            });
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

        // 更新动画
        for (let i = this.animatingTiles.length - 1; i >= 0; i--) {
            const tile = this.animatingTiles[i];
            if (tile.type === 'appear') {
                tile.scale += 0.15;
                if (tile.scale >= 1) {
                    tile.scale = 1;
                    this.animatingTiles.splice(i, 1);
                }
            } else if (tile.type === 'merge') {
                tile.scale += 0.1;
                if (tile.scale >= 1.2) {
                    tile.scale = 1;
                    this.animatingTiles.splice(i, 1);
                }
            }
        }

        // 输入处理
        if (this.canMove && this.animatingTiles.length === 0) {
            let moved = false;
            
            if (keysPressed.up) {
                moved = this.move('up');
            } else if (keysPressed.down) {
                moved = this.move('down');
            } else if (keysPressed.left) {
                moved = this.move('left');
            } else if (keysPressed.right) {
                moved = this.move('right');
            }

            if (moved) {
                this.canMove = false;
                setTimeout(() => {
                    this.addRandomTile();
                    this.canMove = true;
                    
                    if (!this.canMakeMove()) {
                        this.isGameOver = true;
                        if (this.score > this.bestScore) {
                            this.bestScore = this.score;
                        }
                        audio.playGameOver();
                    }
                }, 150);
            }
        }
    }

    /**
     * 移动
     */
    move(direction) {
        let moved = false;
        const merged = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(false));

        const processLine = (line) => {
            // 移除零
            let tiles = line.filter(x => x !== 0);
            
            // 合并相同的
            for (let i = 0; i < tiles.length - 1; i++) {
                if (tiles[i] === tiles[i + 1]) {
                    tiles[i] *= 2;
                    this.score += tiles[i];
                    tiles.splice(i + 1, 1);
                    
                    if (tiles[i] === 2048 && !this.won) {
                        this.won = true;
                        audio.playLevelUp();
                    } else {
                        audio.playEat();
                    }
                }
            }
            
            // 填充零
            while (tiles.length < this.gridSize) {
                tiles.push(0);
            }
            
            return tiles;
        };

        if (direction === 'left') {
            for (let y = 0; y < this.gridSize; y++) {
                const original = [...this.grid[y]];
                this.grid[y] = processLine(this.grid[y]);
                if (original.join(',') !== this.grid[y].join(',')) moved = true;
            }
        } else if (direction === 'right') {
            for (let y = 0; y < this.gridSize; y++) {
                const original = [...this.grid[y]];
                this.grid[y] = processLine(this.grid[y].reverse()).reverse();
                if (original.join(',') !== this.grid[y].join(',')) moved = true;
            }
        } else if (direction === 'up') {
            for (let x = 0; x < this.gridSize; x++) {
                let column = [];
                for (let y = 0; y < this.gridSize; y++) {
                    column.push(this.grid[y][x]);
                }
                const original = [...column];
                column = processLine(column);
                for (let y = 0; y < this.gridSize; y++) {
                    this.grid[y][x] = column[y];
                }
                if (original.join(',') !== column.join(',')) moved = true;
            }
        } else if (direction === 'down') {
            for (let x = 0; x < this.gridSize; x++) {
                let column = [];
                for (let y = 0; y < this.gridSize; y++) {
                    column.push(this.grid[y][x]);
                }
                const original = [...column];
                column = processLine(column.reverse()).reverse();
                for (let y = 0; y < this.gridSize; y++) {
                    this.grid[y][x] = column[y];
                }
                if (original.join(',') !== column.join(',')) moved = true;
            }
        }

        if (moved) {
            audio.playSelect();
        }

        return moved;
    }

    /**
     * 检查是否还能移动
     */
    canMakeMove() {
        // 检查是否有空格
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] === 0) return true;
            }
        }

        // 检查是否有相邻相同的
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const val = this.grid[y][x];
                if (x < this.gridSize - 1 && this.grid[y][x + 1] === val) return true;
                if (y < this.gridSize - 1 && this.grid[y + 1][x] === val) return true;
            }
        }

        return false;
    }

    /**
     * 重新开始
     */
    restart() {
        this.score = 0;
        this.isGameOver = false;
        this.won = false;
        this.animatingTiles = [];
        this.init();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#faf8ef';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 标题
        this.ctx.fillStyle = '#776e65';
        this.ctx.font = 'bold 36px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('2048', 20, 40);

        // 分数框
        this.drawScoreBox(this.width - 140, 10, 60, 'SCORE', this.score);
        this.drawScoreBox(this.width - 70, 10, 60, 'BEST', this.bestScore);

        // 游戏板背景
        const boardWidth = this.cellSize * this.gridSize + this.cellGap * (this.gridSize + 1);
        this.ctx.fillStyle = '#bbada0';
        this.ctx.beginPath();
        this.ctx.roundRect(this.offsetX - this.cellGap, this.offsetY - this.cellGap, 
                          boardWidth, boardWidth, 6);
        this.ctx.fill();

        // 绘制格子
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.drawTile(x, y, this.grid[y][x]);
            }
        }

        // 操作提示
        this.ctx.fillStyle = '#776e65';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('方向键移动方块', this.width / 2, this.height - 10);

        // 胜利提示
        if (this.won && !this.isGameOver) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.fillText('🎉 达成2048! 继续挑战!', this.width / 2, this.height - 30);
        }

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.fillRect(this.offsetX - this.cellGap, this.offsetY - this.cellGap,
                             boardWidth, boardWidth);

            this.ctx.fillStyle = '#776e65';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over!', this.width / 2, this.height / 2 - 10);

            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 25);
        }
    }

    /**
     * 绘制分数框
     */
    drawScoreBox(x, y, width, label, value) {
        this.ctx.fillStyle = '#bbada0';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, 40, 3);
        this.ctx.fill();

        this.ctx.fillStyle = '#eee4da';
        this.ctx.font = '8px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label, x + width / 2, y + 14);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.fillText(value.toString(), x + width / 2, y + 32);
    }

    /**
     * 绘制方块
     */
    drawTile(x, y, value) {
        const px = this.offsetX + x * (this.cellSize + this.cellGap);
        const py = this.offsetY + y * (this.cellSize + this.cellGap);

        // 查找动画
        let scale = 1;
        for (const tile of this.animatingTiles) {
            if (tile.x === x && tile.y === y) {
                scale = tile.scale;
                break;
            }
        }

        const size = this.cellSize * scale;
        const offset = (this.cellSize - size) / 2;

        // 背景色
        this.ctx.fillStyle = this.colors[value] || this.colors[8192];
        this.ctx.beginPath();
        this.ctx.roundRect(px + offset, py + offset, size, size, 3);
        this.ctx.fill();

        // 数字
        if (value > 0) {
            this.ctx.fillStyle = this.textColors[value] || '#f9f6f2';
            
            // 根据数字大小调整字体
            let fontSize = 28;
            if (value >= 100) fontSize = 24;
            if (value >= 1000) fontSize = 18;
            if (value >= 10000) fontSize = 14;
            
            this.ctx.font = `bold ${fontSize * scale}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(value.toString(), px + this.cellSize / 2, py + this.cellSize / 2 + 2);
        }
    }
}

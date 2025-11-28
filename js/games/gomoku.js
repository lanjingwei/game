/**
 * 五子棋游戏
 * 经典策略游戏
 */
import { audio } from '../audio.js';

export class Gomoku {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 棋盘设置
        this.gridSize = 11;
        this.cellSize = 24;
        this.offsetX = (width - (this.gridSize - 1) * this.cellSize) / 2;
        this.offsetY = (height - (this.gridSize - 1) * this.cellSize) / 2 + 10;

        // 游戏板 (0空 1黑 2白)
        this.board = [];
        
        // 光标
        this.cursorX = Math.floor(this.gridSize / 2);
        this.cursorY = Math.floor(this.gridSize / 2);

        // 游戏状态
        this.currentPlayer = 1; // 1黑(玩家) 2白(电脑)
        this.gameOver = false;
        this.winner = 0;
        this.winLine = null;
        this.lastMove = null;

        // 统计
        this.playerWins = 0;
        this.computerWins = 0;

        // AI思考
        this.aiThinking = false;
        this.aiThinkTimer = 0;

        // 移动冷却
        this.moveCooldown = 0;

        this.init();
    }

    init() {
        this.board = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.board[y][x] = 0;
            }
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.gameOver) {
            if (keysPressed.a) {
                this.restart();
            }
            return;
        }

        // AI回合
        if (this.currentPlayer === 2) {
            if (!this.aiThinking) {
                this.aiThinking = true;
                this.aiThinkTimer = 300 + Math.random() * 300;
            } else {
                this.aiThinkTimer -= deltaTime;
                if (this.aiThinkTimer <= 0) {
                    this.aiMove();
                    this.aiThinking = false;
                }
            }
            return;
        }

        // 移动冷却
        if (this.moveCooldown > 0) {
            this.moveCooldown -= deltaTime;
        }

        // 光标移动
        if (this.moveCooldown <= 0) {
            if (keys.left && this.cursorX > 0) {
                this.cursorX--;
                this.moveCooldown = 100;
            } else if (keys.right && this.cursorX < this.gridSize - 1) {
                this.cursorX++;
                this.moveCooldown = 100;
            } else if (keys.up && this.cursorY > 0) {
                this.cursorY--;
                this.moveCooldown = 100;
            } else if (keys.down && this.cursorY < this.gridSize - 1) {
                this.cursorY++;
                this.moveCooldown = 100;
            }
        }

        // 落子
        if (keysPressed.a) {
            this.makeMove(this.cursorX, this.cursorY, 1);
        }
    }

    /**
     * 落子
     */
    makeMove(x, y, player) {
        if (this.board[y][x] !== 0) return false;

        this.board[y][x] = player;
        this.lastMove = { x, y };
        audio.playSelect();

        // 检查胜利
        const win = this.checkWin(x, y, player);
        if (win) {
            this.gameOver = true;
            this.winner = player;
            this.winLine = win;
            
            if (player === 1) {
                this.playerWins++;
                audio.playLevelUp();
            } else {
                this.computerWins++;
                audio.playGameOver();
            }
        } else if (this.isBoardFull()) {
            this.gameOver = true;
            this.winner = 0;
            audio.playHit();
        } else {
            this.currentPlayer = player === 1 ? 2 : 1;
        }

        return true;
    }

    /**
     * 检查胜利
     */
    checkWin(x, y, player) {
        const directions = [
            [[0, 1], [0, -1]],   // 垂直
            [[1, 0], [-1, 0]],   // 水平
            [[1, 1], [-1, -1]], // 对角线
            [[1, -1], [-1, 1]]  // 反对角线
        ];

        for (const [dir1, dir2] of directions) {
            let count = 1;
            const line = [{ x, y }];

            // 方向1
            let nx = x + dir1[0];
            let ny = y + dir1[1];
            while (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize &&
                   this.board[ny][nx] === player) {
                line.push({ x: nx, y: ny });
                count++;
                nx += dir1[0];
                ny += dir1[1];
            }

            // 方向2
            nx = x + dir2[0];
            ny = y + dir2[1];
            while (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize &&
                   this.board[ny][nx] === player) {
                line.unshift({ x: nx, y: ny });
                count++;
                nx += dir2[0];
                ny += dir2[1];
            }

            if (count >= 5) {
                return line.slice(0, 5);
            }
        }

        return null;
    }

    /**
     * 检查棋盘是否满
     */
    isBoardFull() {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.board[y][x] === 0) return false;
            }
        }
        return true;
    }

    /**
     * AI落子
     */
    aiMove() {
        const move = this.findBestMove();
        if (move) {
            this.makeMove(move.x, move.y, 2);
        }
    }

    /**
     * 寻找最佳落子点
     */
    findBestMove() {
        let bestScore = -Infinity;
        let bestMove = null;

        // 评估每个空位
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.board[y][x] === 0) {
                    const score = this.evaluatePosition(x, y);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { x, y };
                    }
                }
            }
        }

        return bestMove;
    }

    /**
     * 评估位置
     */
    evaluatePosition(x, y) {
        let score = 0;

        // 评估AI在此落子的得分
        this.board[y][x] = 2;
        score += this.getPositionScore(x, y, 2) * 1.1;
        this.board[y][x] = 0;

        // 评估阻止玩家的得分
        this.board[y][x] = 1;
        score += this.getPositionScore(x, y, 1);
        this.board[y][x] = 0;

        // 中心位置加分
        const centerDist = Math.abs(x - this.gridSize / 2) + Math.abs(y - this.gridSize / 2);
        score += (this.gridSize - centerDist) * 0.5;

        return score;
    }

    /**
     * 获取位置得分
     */
    getPositionScore(x, y, player) {
        let score = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

        for (const [dx, dy] of directions) {
            let count = 1;
            let blocked = 0;
            let space = 0;

            // 正方向
            for (let i = 1; i < 5; i++) {
                const nx = x + dx * i;
                const ny = y + dy * i;
                if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) {
                    blocked++;
                    break;
                }
                if (this.board[ny][nx] === player) count++;
                else if (this.board[ny][nx] === 0) { space++; break; }
                else { blocked++; break; }
            }

            // 反方向
            for (let i = 1; i < 5; i++) {
                const nx = x - dx * i;
                const ny = y - dy * i;
                if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) {
                    blocked++;
                    break;
                }
                if (this.board[ny][nx] === player) count++;
                else if (this.board[ny][nx] === 0) { space++; break; }
                else { blocked++; break; }
            }

            // 评分
            if (count >= 5) score += 100000;
            else if (count === 4 && blocked === 0) score += 10000;
            else if (count === 4 && blocked === 1) score += 1000;
            else if (count === 3 && blocked === 0) score += 500;
            else if (count === 3 && blocked === 1) score += 100;
            else if (count === 2 && blocked === 0) score += 50;
            else if (count === 2 && blocked === 1) score += 10;
        }

        return score;
    }

    /**
     * 重新开始
     */
    restart() {
        this.init();
        this.currentPlayer = 1;
        this.gameOver = false;
        this.winner = 0;
        this.winLine = null;
        this.lastMove = null;
        this.aiThinking = false;
        this.cursorX = Math.floor(this.gridSize / 2);
        this.cursorY = Math.floor(this.gridSize / 2);
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#dcb35c';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 棋盘
        this.drawBoard();

        // 棋子
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.board[y][x] !== 0) {
                    this.drawPiece(x, y, this.board[y][x]);
                }
            }
        }

        // 最后落子标记
        if (this.lastMove) {
            const px = this.offsetX + this.lastMove.x * this.cellSize;
            const py = this.offsetY + this.lastMove.y * this.cellSize;
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(px - 5, py - 5, 10, 10);
        }

        // 胜利连线
        if (this.winLine) {
            this.drawWinLine();
        }

        // 光标
        if (!this.gameOver && this.currentPlayer === 1) {
            this.drawCursor();
        }

        // UI
        this.renderUI();

        // 游戏结束
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(0, this.height / 2 - 40, this.width, 80);

            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            
            if (this.winner === 1) {
                this.ctx.fillStyle = '#000000';
                this.ctx.fillText('你赢了!', this.width / 2, this.height / 2);
            } else if (this.winner === 2) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText('电脑赢了!', this.width / 2, this.height / 2);
            } else {
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.fillText('平局!', this.width / 2, this.height / 2);
            }

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 再来一局', this.width / 2, this.height / 2 + 28);
        }

        // AI思考提示
        if (this.aiThinking) {
            this.ctx.fillStyle = '#333333';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('电脑思考中...', this.width / 2, this.height - 8);
        }
    }

    /**
     * 绘制棋盘
     */
    drawBoard() {
        this.ctx.strokeStyle = '#8b7355';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < this.gridSize; i++) {
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, this.offsetY + i * this.cellSize);
            this.ctx.lineTo(this.offsetX + (this.gridSize - 1) * this.cellSize, this.offsetY + i * this.cellSize);
            this.ctx.stroke();

            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX + i * this.cellSize, this.offsetY);
            this.ctx.lineTo(this.offsetX + i * this.cellSize, this.offsetY + (this.gridSize - 1) * this.cellSize);
            this.ctx.stroke();
        }

        // 星位
        this.ctx.fillStyle = '#8b7355';
        const starPoints = [
            [Math.floor(this.gridSize / 2), Math.floor(this.gridSize / 2)],
            [2, 2], [2, this.gridSize - 3],
            [this.gridSize - 3, 2], [this.gridSize - 3, this.gridSize - 3]
        ];
        for (const [x, y] of starPoints) {
            this.ctx.beginPath();
            this.ctx.arc(this.offsetX + x * this.cellSize, this.offsetY + y * this.cellSize, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    /**
     * 绘制棋子
     */
    drawPiece(x, y, player) {
        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;
        const radius = this.cellSize * 0.4;

        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(px + 2, py + 2, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 棋子
        const gradient = this.ctx.createRadialGradient(px - 3, py - 3, 0, px, py, radius);
        if (player === 1) {
            gradient.addColorStop(0, '#4a4a4a');
            gradient.addColorStop(1, '#1a1a1a');
        } else {
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#cccccc');
        }

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(px, py, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制胜利连线
     */
    drawWinLine() {
        if (this.winLine.length < 2) return;

        const start = this.winLine[0];
        const end = this.winLine[this.winLine.length - 1];

        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(this.offsetX + start.x * this.cellSize, this.offsetY + start.y * this.cellSize);
        this.ctx.lineTo(this.offsetX + end.x * this.cellSize, this.offsetY + end.y * this.cellSize);
        this.ctx.stroke();
    }

    /**
     * 绘制光标
     */
    drawCursor() {
        const px = this.offsetX + this.cursorX * this.cellSize;
        const py = this.offsetY + this.cursorY * this.cellSize;

        this.ctx.strokeStyle = '#ff6600';
        this.ctx.lineWidth = 2;
        
        const size = 8;
        // 四个角
        this.ctx.beginPath();
        this.ctx.moveTo(px - size, py - size + 4);
        this.ctx.lineTo(px - size, py - size);
        this.ctx.lineTo(px - size + 4, py - size);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(px + size, py - size + 4);
        this.ctx.lineTo(px + size, py - size);
        this.ctx.lineTo(px + size - 4, py - size);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(px - size, py + size - 4);
        this.ctx.lineTo(px - size, py + size);
        this.ctx.lineTo(px - size + 4, py + size);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(px + size, py + size - 4);
        this.ctx.lineTo(px + size, py + size);
        this.ctx.lineTo(px + size - 4, py + size);
        this.ctx.stroke();
    }

    /**
     * 渲染UI
     */
    renderUI() {
        this.ctx.font = '12px monospace';
        
        // 玩家信息
        this.ctx.fillStyle = '#000000';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`●你: ${this.playerWins}`, 10, 18);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.textAlign = 'right';
        this.ctx.strokeText(`○电脑: ${this.computerWins}`, this.width - 10, 18);
        this.ctx.fillText(`○电脑: ${this.computerWins}`, this.width - 10, 18);

        // 提示
        this.ctx.fillStyle = '#8b7355';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('A落子', this.width / 2, this.height - 5);
    }
}

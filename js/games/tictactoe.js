/**
 * 井字棋游戏
 * 经典双人/人机对战游戏
 */
import { audio } from '../audio.js';

export class TicTacToe {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        this.cellSize = 70;
        this.offsetX = (width - this.cellSize * 3) / 2;
        this.offsetY = (height - this.cellSize * 3) / 2 + 20;

        // 游戏状态
        this.board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; // 0空 1玩家X 2电脑O
        this.currentPlayer = 1; // 玩家先手
        this.gameOver = false;
        this.winner = 0;
        this.winLine = null;
        
        // 光标
        this.cursorX = 1;
        this.cursorY = 1;

        // 统计
        this.playerWins = 0;
        this.computerWins = 0;
        this.draws = 0;

        // AI思考延迟
        this.aiThinking = false;
        this.aiThinkTimer = 0;

        // 移动冷却
        this.moveCooldown = 0;

        // 动画
        this.animations = [];
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        // 更新动画
        for (let i = this.animations.length - 1; i >= 0; i--) {
            this.animations[i].progress += deltaTime / 200;
            if (this.animations[i].progress >= 1) {
                this.animations.splice(i, 1);
            }
        }

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
                this.aiThinkTimer = 500;
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
                this.moveCooldown = 150;
            } else if (keys.right && this.cursorX < 2) {
                this.cursorX++;
                this.moveCooldown = 150;
            } else if (keys.up && this.cursorY > 0) {
                this.cursorY--;
                this.moveCooldown = 150;
            } else if (keys.down && this.cursorY < 2) {
                this.cursorY++;
                this.moveCooldown = 150;
            }
        }

        // 放置棋子
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
        this.animations.push({ x, y, progress: 0 });
        audio.playSelect();

        // 检查胜负
        const result = this.checkWin();
        if (result.winner) {
            this.gameOver = true;
            this.winner = result.winner;
            this.winLine = result.line;
            
            if (result.winner === 1) {
                this.playerWins++;
                audio.playLevelUp();
            } else {
                this.computerWins++;
                audio.playGameOver();
            }
        } else if (this.isBoardFull()) {
            this.gameOver = true;
            this.winner = 0;
            this.draws++;
            audio.playHit();
        } else {
            this.currentPlayer = player === 1 ? 2 : 1;
        }

        return true;
    }

    /**
     * AI落子
     */
    aiMove() {
        const aiLevel = this.difficulty.speed; // 0.7, 1, 1.5
        
        // 高难度使用minimax
        if (aiLevel >= 1 && Math.random() < 0.8) {
            const best = this.minimax(this.board, 2, -Infinity, Infinity);
            if (best.move) {
                this.makeMove(best.move.x, best.move.y, 2);
                return;
            }
        }

        // 中等难度有策略
        if (aiLevel >= 0.7) {
            // 检查能否获胜
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    if (this.board[y][x] === 0) {
                        this.board[y][x] = 2;
                        if (this.checkWin().winner === 2) {
                            this.board[y][x] = 0;
                            this.makeMove(x, y, 2);
                            return;
                        }
                        this.board[y][x] = 0;
                    }
                }
            }

            // 阻止玩家获胜
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    if (this.board[y][x] === 0) {
                        this.board[y][x] = 1;
                        if (this.checkWin().winner === 1) {
                            this.board[y][x] = 0;
                            this.makeMove(x, y, 2);
                            return;
                        }
                        this.board[y][x] = 0;
                    }
                }
            }

            // 占据中心
            if (this.board[1][1] === 0) {
                this.makeMove(1, 1, 2);
                return;
            }
        }

        // 随机落子
        const empty = [];
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (this.board[y][x] === 0) {
                    empty.push({ x, y });
                }
            }
        }

        if (empty.length > 0) {
            const move = empty[Math.floor(Math.random() * empty.length)];
            this.makeMove(move.x, move.y, 2);
        }
    }

    /**
     * Minimax算法
     */
    minimax(board, player, alpha, beta) {
        const result = this.checkWinForBoard(board);
        
        if (result === 2) return { score: 10 };
        if (result === 1) return { score: -10 };
        if (this.isBoardFullForBoard(board)) return { score: 0 };

        let best = { score: player === 2 ? -Infinity : Infinity, move: null };

        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (board[y][x] === 0) {
                    board[y][x] = player;
                    const result = this.minimax(board, player === 2 ? 1 : 2, alpha, beta);
                    board[y][x] = 0;

                    if (player === 2) {
                        if (result.score > best.score) {
                            best = { score: result.score, move: { x, y } };
                        }
                        alpha = Math.max(alpha, best.score);
                    } else {
                        if (result.score < best.score) {
                            best = { score: result.score, move: { x, y } };
                        }
                        beta = Math.min(beta, best.score);
                    }

                    if (beta <= alpha) break;
                }
            }
        }

        return best;
    }

    /**
     * 检查胜负
     */
    checkWin() {
        return this.checkWinForBoardWithLine(this.board);
    }

    checkWinForBoard(board) {
        const result = this.checkWinForBoardWithLine(board);
        return result.winner;
    }

    checkWinForBoardWithLine(board) {
        const lines = [
            // 横
            [[0, 0], [1, 0], [2, 0]],
            [[0, 1], [1, 1], [2, 1]],
            [[0, 2], [1, 2], [2, 2]],
            // 竖
            [[0, 0], [0, 1], [0, 2]],
            [[1, 0], [1, 1], [1, 2]],
            [[2, 0], [2, 1], [2, 2]],
            // 斜
            [[0, 0], [1, 1], [2, 2]],
            [[2, 0], [1, 1], [0, 2]]
        ];

        for (const line of lines) {
            const [a, b, c] = line;
            if (board[a[1]][a[0]] !== 0 &&
                board[a[1]][a[0]] === board[b[1]][b[0]] &&
                board[a[1]][a[0]] === board[c[1]][c[0]]) {
                return { winner: board[a[1]][a[0]], line };
            }
        }

        return { winner: 0, line: null };
    }

    /**
     * 检查棋盘是否满
     */
    isBoardFull() {
        return this.isBoardFullForBoard(this.board);
    }

    isBoardFullForBoard(board) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (board[y][x] === 0) return false;
            }
        }
        return true;
    }

    /**
     * 重新开始
     */
    restart() {
        this.board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        this.currentPlayer = 1;
        this.gameOver = false;
        this.winner = 0;
        this.winLine = null;
        this.aiThinking = false;
        this.animations = [];
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

        // 标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('井字棋', this.width / 2, 30);

        // 绘制网格
        this.drawGrid();

        // 绘制棋子
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (this.board[y][x] !== 0) {
                    this.drawPiece(x, y, this.board[y][x]);
                }
            }
        }

        // 绘制获胜线
        if (this.winLine) {
            this.drawWinLine();
        }

        // 绘制光标
        if (!this.gameOver && this.currentPlayer === 1) {
            this.drawCursor();
        }

        // UI
        this.renderUI();

        // 游戏结束提示
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(0, this.height / 2 - 40, this.width, 80);

            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            
            if (this.winner === 1) {
                this.ctx.fillStyle = '#2ecc71';
                this.ctx.fillText('你赢了!', this.width / 2, this.height / 2);
            } else if (this.winner === 2) {
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.fillText('电脑赢了!', this.width / 2, this.height / 2);
            } else {
                this.ctx.fillStyle = '#f39c12';
                this.ctx.fillText('平局!', this.width / 2, this.height / 2);
            }

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 再来一局', this.width / 2, this.height / 2 + 30);
        }

        // AI思考提示
        if (this.aiThinking) {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            const dots = '.'.repeat(Math.floor(Date.now() / 300) % 4);
            this.ctx.fillText(`电脑思考中${dots}`, this.width / 2, this.height - 30);
        }
    }

    /**
     * 绘制网格
     */
    drawGrid() {
        this.ctx.strokeStyle = '#ecf0f1';
        this.ctx.lineWidth = 4;

        // 竖线
        for (let i = 1; i < 3; i++) {
            const x = this.offsetX + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.offsetY);
            this.ctx.lineTo(x, this.offsetY + this.cellSize * 3);
            this.ctx.stroke();
        }

        // 横线
        for (let i = 1; i < 3; i++) {
            const y = this.offsetY + i * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, y);
            this.ctx.lineTo(this.offsetX + this.cellSize * 3, y);
            this.ctx.stroke();
        }
    }

    /**
     * 绘制棋子
     */
    drawPiece(x, y, player) {
        const px = this.offsetX + x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + y * this.cellSize + this.cellSize / 2;
        const size = this.cellSize * 0.35;

        // 查找动画
        let scale = 1;
        for (const anim of this.animations) {
            if (anim.x === x && anim.y === y) {
                scale = Math.min(1, anim.progress * 1.2);
            }
        }

        this.ctx.lineWidth = 6;
        this.ctx.lineCap = 'round';

        if (player === 1) {
            // X
            this.ctx.strokeStyle = '#3498db';
            this.ctx.beginPath();
            this.ctx.moveTo(px - size * scale, py - size * scale);
            this.ctx.lineTo(px + size * scale, py + size * scale);
            this.ctx.moveTo(px + size * scale, py - size * scale);
            this.ctx.lineTo(px - size * scale, py + size * scale);
            this.ctx.stroke();
        } else {
            // O
            this.ctx.strokeStyle = '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(px, py, size * scale, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    /**
     * 绘制获胜线
     */
    drawWinLine() {
        const [a, b, c] = this.winLine;
        const x1 = this.offsetX + a[0] * this.cellSize + this.cellSize / 2;
        const y1 = this.offsetY + a[1] * this.cellSize + this.cellSize / 2;
        const x2 = this.offsetX + c[0] * this.cellSize + this.cellSize / 2;
        const y2 = this.offsetY + c[1] * this.cellSize + this.cellSize / 2;

        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 8;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    /**
     * 绘制光标
     */
    drawCursor() {
        const px = this.offsetX + this.cursorX * this.cellSize;
        const py = this.offsetY + this.cursorY * this.cellSize;

        this.ctx.strokeStyle = '#2ecc71';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(px + 5, py + 5, this.cellSize - 10, this.cellSize - 10);
        this.ctx.setLineDash([]);
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 战绩
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        
        this.ctx.fillStyle = '#3498db';
        this.ctx.fillText(`你: ${this.playerWins}`, 10, this.height - 35);
        
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillText(`电脑: ${this.computerWins}`, 10, this.height - 20);
        
        this.ctx.fillStyle = '#f39c12';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`平局: ${this.draws}`, this.width - 10, this.height - 27);

        // 当前回合
        if (!this.gameOver) {
            this.ctx.fillStyle = '#888888';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('A放置棋子', this.width / 2, this.height - 8);
        }
    }
}

/**
 * 俄罗斯方块游戏
 * 16位彩色风格，带3D立体效果
 */
import { audio } from '../audio.js';

// 方块形状定义
const SHAPES = {
    I: { blocks: [[0,0], [1,0], [2,0], [3,0]], color: '#00d4ff' },
    O: { blocks: [[0,0], [1,0], [0,1], [1,1]], color: '#ffd700' },
    T: { blocks: [[1,0], [0,1], [1,1], [2,1]], color: '#da70d6' },
    S: { blocks: [[1,0], [2,0], [0,1], [1,1]], color: '#32cd32' },
    Z: { blocks: [[0,0], [1,0], [1,1], [2,1]], color: '#ff4444' },
    J: { blocks: [[0,0], [0,1], [1,1], [2,1]], color: '#4169e1' },
    L: { blocks: [[2,0], [0,1], [1,1], [2,1]], color: '#ff8c00' }
};

const SHAPE_KEYS = Object.keys(SHAPES);

export class Tetris {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 游戏区域设置
        this.cols = 10;
        this.rows = 20;
        this.blockSize = 14;
        this.offsetX = 16;
        this.offsetY = 8;

        // 游戏状态
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.isGameOver = false;

        // 下落计时
        this.dropTimer = 0;
        this.baseDropInterval = 800 / difficulty.speed;
        this.dropInterval = this.baseDropInterval;
        this.softDropping = false;

        // 消行动画
        this.clearingLines = [];
        this.clearAnimTimer = 0;
        this.clearAnimDuration = 300;

        // 移动延迟
        this.moveTimer = 0;
        this.moveDelay = 100;
        this.initialMoveDelay = 180;
        this.moveHeld = false;

        this.init();
    }

    init() {
        // 初始化棋盘
        for (let y = 0; y < this.rows; y++) {
            this.board[y] = new Array(this.cols).fill(null);
        }

        this.spawnPiece();
        this.nextPiece = this.randomPiece();
    }

    /**
     * 生成随机方块
     */
    randomPiece() {
        const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
        const shape = SHAPES[key];
        return {
            blocks: shape.blocks.map(b => [...b]),
            color: shape.color,
            x: Math.floor(this.cols / 2) - 1,
            y: 0
        };
    }

    /**
     * 生成新方块
     */
    spawnPiece() {
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
            this.currentPiece.x = Math.floor(this.cols / 2) - 1;
            this.currentPiece.y = 0;
        } else {
            this.currentPiece = this.randomPiece();
        }
        this.nextPiece = this.randomPiece();

        // 检查是否游戏结束
        if (this.checkCollision(this.currentPiece, 0, 0)) {
            this.isGameOver = true;
        }
    }

    /**
     * 碰撞检测
     */
    checkCollision(piece, offsetX, offsetY) {
        for (const [bx, by] of piece.blocks) {
            const x = piece.x + bx + offsetX;
            const y = piece.y + by + offsetY;

            if (x < 0 || x >= this.cols || y >= this.rows) {
                return true;
            }
            if (y >= 0 && this.board[y][x]) {
                return true;
            }
        }
        return false;
    }

    /**
     * 旋转方块
     */
    rotate() {
        if (!this.currentPiece) return;

        // 计算旋转后的位置
        const rotated = this.currentPiece.blocks.map(([x, y]) => [-y + 1, x]);
        const oldBlocks = this.currentPiece.blocks;
        this.currentPiece.blocks = rotated;

        // 墙踢检测
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
            if (!this.checkCollision(this.currentPiece, kick, 0)) {
                this.currentPiece.x += kick;
                audio.playRotate();
                return;
            }
        }

        // 旋转失败，恢复
        this.currentPiece.blocks = oldBlocks;
    }

    /**
     * 移动方块
     */
    move(dx) {
        if (!this.currentPiece) return;
        if (!this.checkCollision(this.currentPiece, dx, 0)) {
            this.currentPiece.x += dx;
            audio.playMove();
        }
    }

    /**
     * 下落方块
     */
    drop() {
        if (!this.currentPiece) return false;

        if (!this.checkCollision(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
            return true;
        }

        // 锁定方块
        this.lockPiece();
        return false;
    }

    /**
     * 硬降落
     */
    hardDrop() {
        if (!this.currentPiece) return;

        let dropDistance = 0;
        while (!this.checkCollision(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
            dropDistance++;
        }
        this.score += dropDistance * 2;
        audio.playDrop();
        this.lockPiece();
    }

    /**
     * 锁定方块到棋盘
     */
    lockPiece() {
        for (const [bx, by] of this.currentPiece.blocks) {
            const x = this.currentPiece.x + bx;
            const y = this.currentPiece.y + by;
            if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) {
                this.board[y][x] = this.currentPiece.color;
            }
        }

        this.checkLines();
        this.spawnPiece();
    }

    /**
     * 检查消行
     */
    checkLines() {
        this.clearingLines = [];

        for (let y = this.rows - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== null)) {
                this.clearingLines.push(y);
            }
        }

        if (this.clearingLines.length > 0) {
            this.clearAnimTimer = this.clearAnimDuration;
            audio.playClear();
        }
    }

    /**
     * 执行消行
     */
    clearLines() {
        // 计分
        const lineScores = [0, 100, 300, 500, 800];
        this.score += lineScores[this.clearingLines.length] * this.level;
        this.lines += this.clearingLines.length;

        // 升级
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = this.baseDropInterval * Math.pow(0.85, this.level - 1);
            audio.playLevelUp();
        }

        // 移除行
        this.clearingLines.sort((a, b) => a - b);
        for (const lineY of this.clearingLines) {
            this.board.splice(lineY, 1);
            this.board.unshift(new Array(this.cols).fill(null));
        }

        this.clearingLines = [];
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) return;

        // 消行动画
        if (this.clearAnimTimer > 0) {
            this.clearAnimTimer -= deltaTime;
            if (this.clearAnimTimer <= 0) {
                this.clearLines();
            }
            return;
        }

        // 输入处理
        if (keysPressed.up || keysPressed.a) {
            this.rotate();
        }

        // 左右移动（支持长按）
        if (keys.left || keys.right) {
            this.moveTimer -= deltaTime;
            if (this.moveTimer <= 0 || keysPressed.left || keysPressed.right) {
                if (keysPressed.left) {
                    this.move(-1);
                    this.moveTimer = this.initialMoveDelay;
                } else if (keysPressed.right) {
                    this.move(1);
                    this.moveTimer = this.initialMoveDelay;
                } else if (keys.left) {
                    this.move(-1);
                    this.moveTimer = this.moveDelay;
                } else if (keys.right) {
                    this.move(1);
                    this.moveTimer = this.moveDelay;
                }
            }
        } else {
            this.moveTimer = 0;
        }

        // 软降落
        this.softDropping = keys.down;

        // 硬降落
        if (keysPressed.b) {
            this.hardDrop();
            return;
        }

        // 自动下落
        const currentDropInterval = this.softDropping ? this.dropInterval / 10 : this.dropInterval;
        this.dropTimer += deltaTime;
        if (this.dropTimer >= currentDropInterval) {
            this.dropTimer = 0;
            this.drop();
            if (this.softDropping) {
                this.score++;
            }
        }
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#0a0a18';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 游戏区域背景
        this.ctx.fillStyle = '#0d0d20';
        this.ctx.fillRect(this.offsetX - 1, this.offsetY - 1, 
            this.cols * this.blockSize + 2, this.rows * this.blockSize + 2);

        // 网格线
        this.ctx.strokeStyle = 'rgba(50, 50, 80, 0.3)';
        this.ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX + x * this.blockSize, this.offsetY);
            this.ctx.lineTo(this.offsetX + x * this.blockSize, this.offsetY + this.rows * this.blockSize);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, this.offsetY + y * this.blockSize);
            this.ctx.lineTo(this.offsetX + this.cols * this.blockSize, this.offsetY + y * this.blockSize);
            this.ctx.stroke();
        }

        // 渲染棋盘
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.board[y][x]) {
                    // 检查是否在消行动画中
                    const isClearing = this.clearingLines.includes(y);
                    if (isClearing) {
                        const flash = Math.floor(this.clearAnimTimer / 50) % 2;
                        if (flash) {
                            this.drawBlock(x, y, '#ffffff');
                        } else {
                            this.drawBlock(x, y, this.board[y][x]);
                        }
                    } else {
                        this.drawBlock(x, y, this.board[y][x]);
                    }
                }
            }
        }

        // 渲染幽灵方块
        if (this.currentPiece && this.clearAnimTimer <= 0) {
            let ghostY = this.currentPiece.y;
            while (!this.checkCollision(this.currentPiece, 0, ghostY - this.currentPiece.y + 1)) {
                ghostY++;
            }
            for (const [bx, by] of this.currentPiece.blocks) {
                const x = this.currentPiece.x + bx;
                const y = ghostY + by;
                if (y >= 0) {
                    this.drawGhostBlock(x, y);
                }
            }
        }

        // 渲染当前方块
        if (this.currentPiece && this.clearAnimTimer <= 0) {
            for (const [bx, by] of this.currentPiece.blocks) {
                const x = this.currentPiece.x + bx;
                const y = this.currentPiece.y + by;
                if (y >= 0) {
                    this.drawBlock(x, y, this.currentPiece.color);
                }
            }
        }

        // 边框
        this.ctx.strokeStyle = '#4a4a6a';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(this.offsetX - 1, this.offsetY - 1,
            this.cols * this.blockSize + 2, this.rows * this.blockSize + 2);

        // 右侧面板
        this.renderPanel();
    }

    /**
     * 绘制方块（带3D效果）
     */
    drawBlock(gridX, gridY, color) {
        const x = this.offsetX + gridX * this.blockSize;
        const y = this.offsetY + gridY * this.blockSize;
        const size = this.blockSize - 1;

        // 主体
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, size, size);

        // 高光（左上）
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.fillRect(x, y, size, 1);
        this.ctx.fillRect(x, y, 1, size);

        // 阴影（右下）
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.fillRect(x + size - 1, y, 1, size);
        this.ctx.fillRect(x, y + size - 1, size, 1);

        // 内部高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.fillRect(x + 1, y + 1, size - 3, size - 3);
    }

    /**
     * 绘制幽灵方块
     */
    drawGhostBlock(gridX, gridY) {
        const x = this.offsetX + gridX * this.blockSize;
        const y = this.offsetY + gridY * this.blockSize;
        const size = this.blockSize - 1;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 0.5;
        this.ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
    }

    /**
     * 渲染右侧面板
     */
    renderPanel() {
        const panelX = 180;

        // NEXT标签
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('NEXT', panelX, 30);

        // 下一个方块预览框
        this.ctx.fillStyle = '#0d0d20';
        this.ctx.fillRect(panelX, 35, 60, 50);
        this.ctx.strokeStyle = '#4a4a6a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(panelX, 35, 60, 50);

        // 绘制下一个方块
        if (this.nextPiece) {
            const previewX = panelX + 10;
            const previewY = 45;
            const previewSize = 10;

            for (const [bx, by] of this.nextPiece.blocks) {
                const x = previewX + bx * previewSize;
                const y = previewY + by * previewSize;
                
                this.ctx.fillStyle = this.nextPiece.color;
                this.ctx.fillRect(x, y, previewSize - 1, previewSize - 1);
                this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                this.ctx.fillRect(x, y, previewSize - 1, 2);
            }
        }

        // 分数
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('SCORE', panelX, 115);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillText(this.score.toString(), panelX, 135);

        // 行数
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('LINES', panelX, 170);
        this.ctx.fillStyle = '#00ff88';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillText(this.lines.toString(), panelX, 190);

        // 等级
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('LEVEL', panelX, 225);
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillText(this.level.toString(), panelX, 245);

        // 难度
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(this.difficulty.name, panelX, 275);
    }
}

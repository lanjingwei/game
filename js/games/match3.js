/**
 * 消消乐游戏
 * 三消益智游戏
 */
import { audio } from '../audio.js';

export class Match3 {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        this.cols = 8;
        this.rows = 8;
        this.cellSize = 32;
        this.offsetX = (width - this.cols * this.cellSize) / 2;
        this.offsetY = (height - this.rows * this.cellSize) / 2 + 15;

        // 宝石类型
        this.gemTypes = 5 + Math.floor(difficulty.speed);
        this.gemColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8800'];

        // 游戏板
        this.grid = [];
        this.selected = null;

        // 光标
        this.cursorX = 0;
        this.cursorY = 0;

        // 动画
        this.animations = [];
        this.falling = false;

        // 游戏状态
        this.score = 0;
        this.moves = 30;
        this.targetScore = 1000 + difficulty.speed * 500;
        this.level = 1;
        this.isGameOver = false;
        this.won = false;
        this.combo = 0;

        // 移动冷却
        this.moveCooldown = 0;

        this.init();
    }

    init() {
        this.generateBoard();
        // 确保没有初始匹配
        while (this.findMatches().length > 0) {
            this.generateBoard();
        }
    }

    /**
     * 生成游戏板
     */
    generateBoard() {
        this.grid = [];
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = {
                    type: Math.floor(Math.random() * this.gemTypes),
                    offsetY: 0,
                    scale: 1,
                    removing: false
                };
            }
        }
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

        // 更新动画
        this.updateAnimations(deltaTime);

        // 如果有动画在播放，不允许操作
        if (this.animations.length > 0 || this.falling) {
            return;
        }

        // 检查并处理匹配
        const matches = this.findMatches();
        if (matches.length > 0) {
            this.removeMatches(matches);
            return;
        }

        // 检查是否需要下落
        if (this.checkFalling()) {
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

        // 选择/交换
        if (keysPressed.a) {
            this.selectOrSwap();
        }

        // 取消选择
        if (keysPressed.b) {
            this.selected = null;
        }
    }

    /**
     * 选择或交换
     */
    selectOrSwap() {
        if (!this.selected) {
            this.selected = { x: this.cursorX, y: this.cursorY };
            audio.playSelect();
        } else {
            const dx = Math.abs(this.cursorX - this.selected.x);
            const dy = Math.abs(this.cursorY - this.selected.y);

            // 只能交换相邻的
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                this.trySwap(this.selected.x, this.selected.y, this.cursorX, this.cursorY);
            } else if (dx === 0 && dy === 0) {
                this.selected = null;
            } else {
                this.selected = { x: this.cursorX, y: this.cursorY };
                audio.playSelect();
            }
        }
    }

    /**
     * 尝试交换
     */
    trySwap(x1, y1, x2, y2) {
        // 交换
        const temp = this.grid[y1][x1];
        this.grid[y1][x1] = this.grid[y2][x2];
        this.grid[y2][x2] = temp;

        // 检查是否有匹配
        const matches = this.findMatches();
        
        if (matches.length > 0) {
            // 有效交换
            this.moves--;
            this.combo = 0;
            this.selected = null;
            audio.playEat();

            // 检查游戏结束
            if (this.moves <= 0 && this.score < this.targetScore) {
                this.isGameOver = true;
                audio.playGameOver();
            }
        } else {
            // 无效交换，换回来
            this.grid[y2][x2] = this.grid[y1][x1];
            this.grid[y1][x1] = temp;
            audio.playHit();
        }
    }

    /**
     * 查找匹配
     */
    findMatches() {
        const matches = new Set();

        // 横向检查
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols - 2; x++) {
                const type = this.grid[y][x].type;
                if (type !== -1 &&
                    this.grid[y][x + 1].type === type &&
                    this.grid[y][x + 2].type === type) {
                    matches.add(`${x},${y}`);
                    matches.add(`${x + 1},${y}`);
                    matches.add(`${x + 2},${y}`);
                    
                    // 检查更长的匹配
                    let i = 3;
                    while (x + i < this.cols && this.grid[y][x + i].type === type) {
                        matches.add(`${x + i},${y}`);
                        i++;
                    }
                }
            }
        }

        // 纵向检查
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows - 2; y++) {
                const type = this.grid[y][x].type;
                if (type !== -1 &&
                    this.grid[y + 1][x].type === type &&
                    this.grid[y + 2][x].type === type) {
                    matches.add(`${x},${y}`);
                    matches.add(`${x},${y + 1}`);
                    matches.add(`${x},${y + 2}`);
                    
                    let i = 3;
                    while (y + i < this.rows && this.grid[y + i][x].type === type) {
                        matches.add(`${x},${y + i}`);
                        i++;
                    }
                }
            }
        }

        return Array.from(matches).map(s => {
            const [x, y] = s.split(',').map(Number);
            return { x, y };
        });
    }

    /**
     * 移除匹配
     */
    removeMatches(matches) {
        this.combo++;
        const points = matches.length * 10 * this.combo;
        this.score += points;

        // 检查胜利
        if (this.score >= this.targetScore) {
            this.won = true;
            audio.playLevelUp();
        }

        // 添加消除动画
        for (const match of matches) {
            this.grid[match.y][match.x].removing = true;
            this.animations.push({
                x: match.x,
                y: match.y,
                type: 'remove',
                progress: 0
            });
        }

        audio.playClear();

        // 延迟后移除
        setTimeout(() => {
            for (const match of matches) {
                this.grid[match.y][match.x].type = -1;
                this.grid[match.y][match.x].removing = false;
            }
            this.animations = this.animations.filter(a => a.type !== 'remove');
            this.falling = true;
        }, 200);
    }

    /**
     * 检查下落
     */
    checkFalling() {
        let hasFalling = false;

        for (let x = 0; x < this.cols; x++) {
            // 从下往上处理
            for (let y = this.rows - 1; y >= 0; y--) {
                if (this.grid[y][x].type === -1) {
                    // 找上方的宝石
                    for (let above = y - 1; above >= 0; above--) {
                        if (this.grid[above][x].type !== -1) {
                            this.grid[y][x] = this.grid[above][x];
                            this.grid[above][x] = { type: -1, offsetY: 0, scale: 1, removing: false };
                            this.grid[y][x].offsetY = (above - y) * this.cellSize;
                            hasFalling = true;
                            break;
                        }
                    }
                }
            }

            // 顶部填充新宝石
            for (let y = 0; y < this.rows; y++) {
                if (this.grid[y][x].type === -1) {
                    this.grid[y][x] = {
                        type: Math.floor(Math.random() * this.gemTypes),
                        offsetY: -this.cellSize * (y + 1),
                        scale: 1,
                        removing: false
                    };
                    hasFalling = true;
                }
            }
        }

        this.falling = hasFalling;
        return hasFalling;
    }

    /**
     * 更新动画
     */
    updateAnimations(deltaTime) {
        // 下落动画
        let stillFalling = false;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x].offsetY < 0) {
                    this.grid[y][x].offsetY += deltaTime * 0.5;
                    if (this.grid[y][x].offsetY > 0) {
                        this.grid[y][x].offsetY = 0;
                    } else {
                        stillFalling = true;
                    }
                }
            }
        }
        
        if (!stillFalling) {
            this.falling = false;
        }

        // 移除动画
        for (const anim of this.animations) {
            anim.progress += deltaTime * 0.005;
        }
    }

    /**
     * 重新开始
     */
    restart() {
        this.score = 0;
        this.moves = 30;
        this.combo = 0;
        this.isGameOver = false;
        this.won = false;
        this.selected = null;
        this.animations = [];
        this.falling = false;
        this.cursorX = 0;
        this.cursorY = 0;
        
        if (this.won) {
            this.level++;
            this.targetScore = 1000 + this.level * 500;
        }
        
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

        // 游戏区域背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillRect(
            this.offsetX - 5,
            this.offsetY - 5,
            this.cols * this.cellSize + 10,
            this.rows * this.cellSize + 10
        );

        // 绘制网格和宝石
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.drawCell(x, y);
            }
        }

        // 绘制光标
        this.drawCursor();

        // 绘制选中
        if (this.selected) {
            this.drawSelected();
        }

        // UI
        this.renderUI();

        // 游戏结束/胜利
        if (this.isGameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = this.won ? '#00ff00' : '#ff4444';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? 'LEVEL UP!' : 'GAME OVER', this.width / 2, this.height / 2 - 20);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px monospace';
            this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2 + 15);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 继续', this.width / 2, this.height / 2 + 50);
        }
    }

    /**
     * 绘制格子
     */
    drawCell(x, y) {
        const gem = this.grid[y][x];
        if (gem.type === -1) return;

        const px = this.offsetX + x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + y * this.cellSize + this.cellSize / 2 + gem.offsetY;
        const size = (this.cellSize - 6) / 2;

        // 消除动画
        let scale = gem.scale;
        if (gem.removing) {
            const anim = this.animations.find(a => a.x === x && a.y === y);
            if (anim) {
                scale = 1 - anim.progress;
            }
        }

        // 宝石主体
        const color = this.gemColors[gem.type];
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * scale, 0, Math.PI * 2);
        this.ctx.fill();

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(px - size * 0.3, py - size * 0.3, size * 0.3 * scale, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制光标
     */
    drawCursor() {
        const px = this.offsetX + this.cursorX * this.cellSize;
        const py = this.offsetY + this.cursorY * this.cellSize;

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
    }

    /**
     * 绘制选中
     */
    drawSelected() {
        const px = this.offsetX + this.selected.x * this.cellSize;
        const py = this.offsetY + this.selected.y * this.cellSize;

        this.ctx.strokeStyle = '#ffcc00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`分数: ${this.score}`, 10, 20);

        // 目标
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`目标: ${this.targetScore}`, 10, 35);

        // 剩余步数
        this.ctx.fillStyle = this.moves <= 5 ? '#ff4444' : '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`步数: ${this.moves}`, this.width - 10, 20);

        // 连击
        if (this.combo > 1) {
            this.ctx.fillStyle = '#ff8800';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`COMBO x${this.combo}!`, this.width / 2, 20);
        }

        // 提示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('A选择/交换 B取消', this.width / 2, this.height - 5);
    }
}

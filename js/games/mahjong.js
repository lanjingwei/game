/**
 * 连连看游戏
 * 经典配对消除游戏
 */
import { audio } from '../audio.js';

export class Mahjong {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        this.cols = 8;
        this.rows = 6;
        this.cellSize = 32;
        this.offsetX = (width - this.cols * this.cellSize) / 2;
        this.offsetY = (height - this.rows * this.cellSize) / 2 + 15;

        // 游戏板
        this.grid = [];
        this.selected = null;
        
        // 光标
        this.cursorX = 0;
        this.cursorY = 0;

        // 图标类型
        this.icons = ['♠', '♥', '♦', '♣', '★', '●', '▲', '■', '◆', '○', '△', '□'];

        // 游戏状态
        this.score = 0;
        this.tilesLeft = 0;
        this.timer = 180000; // 3分钟
        this.isGameOver = false;
        this.won = false;
        this.combo = 0;
        this.lastMatchTime = 0;

        // 提示
        this.hint = null;
        this.hintTimer = 0;

        // 连接路径动画
        this.pathAnimation = null;

        // 移动冷却
        this.moveCooldown = 0;

        this.init();
    }

    init() {
        this.generateBoard();
    }

    /**
     * 生成游戏板
     */
    generateBoard() {
        // 确保有足够的配对
        const totalCells = this.cols * this.rows;
        const pairCount = totalCells / 2;
        
        // 创建配对
        const tiles = [];
        for (let i = 0; i < pairCount; i++) {
            const type = i % this.icons.length;
            tiles.push(type, type);
        }

        // 洗牌
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }

        // 填充网格
        this.grid = [];
        let index = 0;
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = {
                    type: tiles[index],
                    alive: true
                };
                index++;
            }
        }

        this.tilesLeft = totalCells;
        this.selected = null;
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
        this.timer -= deltaTime;
        if (this.timer <= 0) {
            this.timer = 0;
            this.isGameOver = true;
            audio.playGameOver();
            return;
        }

        // 连击超时
        if (Date.now() - this.lastMatchTime > 3000) {
            this.combo = 0;
        }

        // 提示计时器
        if (this.hintTimer > 0) {
            this.hintTimer -= deltaTime;
            if (this.hintTimer <= 0) {
                this.hint = null;
            }
        }

        // 路径动画
        if (this.pathAnimation) {
            this.pathAnimation.timer -= deltaTime;
            if (this.pathAnimation.timer <= 0) {
                this.pathAnimation = null;
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
                this.moveCooldown = 100;
            } else if (keys.right && this.cursorX < this.cols - 1) {
                this.cursorX++;
                this.moveCooldown = 100;
            } else if (keys.up && this.cursorY > 0) {
                this.cursorY--;
                this.moveCooldown = 100;
            } else if (keys.down && this.cursorY < this.rows - 1) {
                this.cursorY++;
                this.moveCooldown = 100;
            }
        }

        // 选择
        if (keysPressed.a) {
            this.selectTile(this.cursorX, this.cursorY);
        }

        // 提示
        if (keysPressed.b) {
            this.showHint();
        }
    }

    /**
     * 选择图块
     */
    selectTile(x, y) {
        const tile = this.grid[y][x];
        if (!tile.alive) return;

        if (!this.selected) {
            this.selected = { x, y };
            audio.playSelect();
        } else {
            if (this.selected.x === x && this.selected.y === y) {
                this.selected = null;
                return;
            }

            const selectedTile = this.grid[this.selected.y][this.selected.x];
            
            // 检查是否同类型
            if (selectedTile.type === tile.type) {
                // 检查是否可以连接
                const path = this.findPath(this.selected.x, this.selected.y, x, y);
                if (path) {
                    // 消除
                    selectedTile.alive = false;
                    tile.alive = false;
                    this.tilesLeft -= 2;
                    
                    // 连击加分
                    this.combo++;
                    this.score += 10 * this.combo;
                    this.lastMatchTime = Date.now();
                    
                    // 显示路径动画
                    this.pathAnimation = {
                        path,
                        timer: 300
                    };

                    audio.playClear();

                    // 检查胜利
                    if (this.tilesLeft === 0) {
                        this.won = true;
                        audio.playLevelUp();
                    }
                } else {
                    audio.playHit();
                }
            } else {
                audio.playHit();
            }

            this.selected = null;
            this.hint = null;
        }
    }

    /**
     * 寻找连接路径（最多两个拐角）
     */
    findPath(x1, y1, x2, y2) {
        // 直线连接
        if (this.canConnectDirect(x1, y1, x2, y2)) {
            return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
        }

        // 一个拐角
        // 尝试通过(x1, y2)
        if (this.isEmpty(x1, y2) && 
            this.canConnectDirect(x1, y1, x1, y2) && 
            this.canConnectDirect(x1, y2, x2, y2)) {
            return [{ x: x1, y: y1 }, { x: x1, y: y2 }, { x: x2, y: y2 }];
        }
        // 尝试通过(x2, y1)
        if (this.isEmpty(x2, y1) && 
            this.canConnectDirect(x1, y1, x2, y1) && 
            this.canConnectDirect(x2, y1, x2, y2)) {
            return [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }];
        }

        // 两个拐角
        // 水平扫描
        for (let x = -1; x <= this.cols; x++) {
            if (this.isEmpty(x, y1) && this.isEmpty(x, y2) &&
                this.canConnectDirect(x1, y1, x, y1) &&
                this.canConnectDirect(x, y1, x, y2) &&
                this.canConnectDirect(x, y2, x2, y2)) {
                return [
                    { x: x1, y: y1 }, { x: x, y: y1 },
                    { x: x, y: y2 }, { x: x2, y: y2 }
                ];
            }
        }

        // 垂直扫描
        for (let y = -1; y <= this.rows; y++) {
            if (this.isEmpty(x1, y) && this.isEmpty(x2, y) &&
                this.canConnectDirect(x1, y1, x1, y) &&
                this.canConnectDirect(x1, y, x2, y) &&
                this.canConnectDirect(x2, y, x2, y2)) {
                return [
                    { x: x1, y: y1 }, { x: x1, y: y },
                    { x: x2, y: y }, { x: x2, y: y2 }
                ];
            }
        }

        return null;
    }

    /**
     * 检查位置是否为空
     */
    isEmpty(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            return true; // 边界外视为空
        }
        return !this.grid[y][x].alive;
    }

    /**
     * 检查是否可以直线连接
     */
    canConnectDirect(x1, y1, x2, y2) {
        if (x1 === x2) {
            // 垂直连接
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            for (let y = minY + 1; y < maxY; y++) {
                if (!this.isEmpty(x1, y)) return false;
            }
            return true;
        } else if (y1 === y2) {
            // 水平连接
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            for (let x = minX + 1; x < maxX; x++) {
                if (!this.isEmpty(x, y1)) return false;
            }
            return true;
        }
        return false;
    }

    /**
     * 显示提示
     */
    showHint() {
        // 寻找可配对的图块
        for (let y1 = 0; y1 < this.rows; y1++) {
            for (let x1 = 0; x1 < this.cols; x1++) {
                if (!this.grid[y1][x1].alive) continue;
                
                for (let y2 = y1; y2 < this.rows; y2++) {
                    for (let x2 = (y2 === y1 ? x1 + 1 : 0); x2 < this.cols; x2++) {
                        if (!this.grid[y2][x2].alive) continue;
                        
                        if (this.grid[y1][x1].type === this.grid[y2][x2].type) {
                            if (this.findPath(x1, y1, x2, y2)) {
                                this.hint = { x1, y1, x2, y2 };
                                this.hintTimer = 2000;
                                this.score = Math.max(0, this.score - 5);
                                audio.playSelect();
                                return;
                            }
                        }
                    }
                }
            }
        }

        // 无解，重新洗牌
        this.shuffle();
    }

    /**
     * 重新洗牌
     */
    shuffle() {
        const aliveTiles = [];
        
        // 收集存活的图块类型
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x].alive) {
                    aliveTiles.push(this.grid[y][x].type);
                }
            }
        }

        // 洗牌
        for (let i = aliveTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [aliveTiles[i], aliveTiles[j]] = [aliveTiles[j], aliveTiles[i]];
        }

        // 重新分配
        let index = 0;
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x].alive) {
                    this.grid[y][x].type = aliveTiles[index];
                    index++;
                }
            }
        }

        audio.playHit();
    }

    /**
     * 重新开始
     */
    restart() {
        this.score = 0;
        this.timer = 180000;
        this.isGameOver = false;
        this.won = false;
        this.combo = 0;
        this.selected = null;
        this.hint = null;
        this.pathAnimation = null;
        this.cursorX = 0;
        this.cursorY = 0;
        this.init();
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 绘制网格背景
        this.ctx.fillStyle = '#16213e';
        this.ctx.fillRect(
            this.offsetX - 5, 
            this.offsetY - 5,
            this.cols * this.cellSize + 10,
            this.rows * this.cellSize + 10
        );

        // 绘制图块
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.drawTile(x, y);
            }
        }

        // 绘制路径动画
        if (this.pathAnimation) {
            this.drawPath(this.pathAnimation.path);
        }

        // 绘制光标
        this.drawCursor();

        // UI
        this.renderUI();

        // 游戏结束/胜利
        if (this.isGameOver || this.won) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = this.won ? '#00ff00' : '#ff0000';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.won ? 'YOU WIN!' : 'TIME UP!', this.width / 2, this.height / 2 - 20);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`Score: ${this.score}`, this.width / 2, this.height / 2 + 15);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 50);
        }
    }

    /**
     * 绘制图块
     */
    drawTile(x, y) {
        const tile = this.grid[y][x];
        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;

        if (!tile.alive) return;

        // 检查是否被选中
        const isSelected = this.selected && this.selected.x === x && this.selected.y === y;
        
        // 检查是否是提示
        const isHint = this.hint && 
            ((this.hint.x1 === x && this.hint.y1 === y) || 
             (this.hint.x2 === x && this.hint.y2 === y));

        // 图块背景
        if (isSelected) {
            this.ctx.fillStyle = '#e94560';
        } else if (isHint && Math.floor(Date.now() / 300) % 2) {
            this.ctx.fillStyle = '#ffc107';
        } else {
            this.ctx.fillStyle = '#0f3460';
        }
        
        this.ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);

        // 图标颜色
        const colors = ['#ff6b6b', '#ee5a5a', '#4ecdc4', '#45b7aa', 
                       '#ffe66d', '#ffd93d', '#95e1d3', '#7bc9bc',
                       '#ff8a5c', '#f67e5c', '#a8d8ea', '#8bc4d6'];
        
        this.ctx.fillStyle = colors[tile.type] || '#ffffff';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            this.icons[tile.type], 
            px + this.cellSize / 2, 
            py + this.cellSize / 2 + 1
        );
    }

    /**
     * 绘制光标
     */
    drawCursor() {
        const px = this.offsetX + this.cursorX * this.cellSize;
        const py = this.offsetY + this.cursorY * this.cellSize;

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(px, py, this.cellSize, this.cellSize);
    }

    /**
     * 绘制连接路径
     */
    drawPath(path) {
        if (path.length < 2) return;

        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        for (let i = 0; i < path.length; i++) {
            const px = this.offsetX + path[i].x * this.cellSize + this.cellSize / 2;
            const py = this.offsetY + path[i].y * this.cellSize + this.cellSize / 2;

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }

        this.ctx.stroke();
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

        // 剩余
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`剩余: ${this.tilesLeft}`, this.width / 2, 20);

        // 时间
        const seconds = Math.ceil(this.timer / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.ctx.fillStyle = seconds <= 30 ? '#ff0000' : '#ffffff';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, this.width - 10, 20);

        // 连击
        if (this.combo > 1) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`COMBO x${this.combo}!`, this.width / 2, this.height - 8);
        }

        // 提示
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('A:选择 B:提示', 10, this.height - 8);
    }
}

/**
 * 推箱子游戏
 * 经典益智游戏
 */
import { audio } from '../audio.js';

export class Sokoban {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 关卡数据
        this.levels = [
            // 关卡1 - 简单入门
            [
                "  #####",
                "###   #",
                "#.@$  #",
                "### $.#",
                "#.##$ #",
                "#   . #",
                "#  $  #",
                "#######"
            ],
            // 关卡2
            [
                "######",
                "#    #",
                "# $@.#",
                "# $. #",
                "#  ###",
                "####"
            ],
            // 关卡3
            [
                " ####",
                " #  ###",
                " #$   #",
                "## #$ #",
                "#. #@ #",
                "#.  $ #",
                "#. ####",
                "####"
            ],
            // 关卡4
            [
                "########",
                "#      #",
                "# .$@$.#",
                "# .$.  #",
                "# $ .$ #",
                "#  $.  #",
                "#      #",
                "########"
            ],
            // 关卡5
            [
                "  #####",
                "  #   #",
                "  #$  #",
                "###  $###",
                "#  $  $ #",
                "#.# ### #",
                "#.  $@  #",
                "#..  ####",
                "#####"
            ]
        ];

        this.currentLevel = 0;
        this.cellSize = 24;
        
        // 游戏状态
        this.grid = [];
        this.playerX = 0;
        this.playerY = 0;
        this.playerDir = 0; // 0下 1左 2右 3上
        this.boxes = [];
        this.targets = [];
        this.moves = 0;
        this.pushes = 0;
        this.isGameOver = false;
        this.levelComplete = false;
        this.history = [];

        // 移动冷却
        this.moveCooldown = 0;

        this.loadLevel(this.currentLevel);
    }

    /**
     * 加载关卡
     */
    loadLevel(levelIndex) {
        if (levelIndex >= this.levels.length) {
            this.isGameOver = true;
            return;
        }

        const level = this.levels[levelIndex];
        this.grid = [];
        this.boxes = [];
        this.targets = [];
        this.moves = 0;
        this.pushes = 0;
        this.levelComplete = false;
        this.history = [];

        // 计算偏移使关卡居中
        const maxWidth = Math.max(...level.map(row => row.length));
        const maxHeight = level.length;
        this.offsetX = (this.width - maxWidth * this.cellSize) / 2;
        this.offsetY = (this.height - maxHeight * this.cellSize) / 2 + 10;

        // 解析关卡
        for (let y = 0; y < level.length; y++) {
            this.grid[y] = [];
            for (let x = 0; x < level[y].length; x++) {
                const char = level[y][x];
                
                switch (char) {
                    case '#':
                        this.grid[y][x] = 'wall';
                        break;
                    case '.':
                        this.grid[y][x] = 'target';
                        this.targets.push({ x, y });
                        break;
                    case '$':
                        this.grid[y][x] = 'floor';
                        this.boxes.push({ x, y });
                        break;
                    case '@':
                        this.grid[y][x] = 'floor';
                        this.playerX = x;
                        this.playerY = y;
                        break;
                    case '*': // 箱子在目标上
                        this.grid[y][x] = 'target';
                        this.targets.push({ x, y });
                        this.boxes.push({ x, y });
                        break;
                    case '+': // 玩家在目标上
                        this.grid[y][x] = 'target';
                        this.targets.push({ x, y });
                        this.playerX = x;
                        this.playerY = y;
                        break;
                    default:
                        this.grid[y][x] = 'floor';
                }
            }
            // 填充行末的空格
            while (this.grid[y].length < maxWidth) {
                this.grid[y].push('empty');
            }
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) {
            if (keysPressed.a) {
                this.currentLevel = 0;
                this.isGameOver = false;
                this.loadLevel(0);
            }
            return;
        }

        if (this.levelComplete) {
            if (keysPressed.a) {
                this.currentLevel++;
                if (this.currentLevel >= this.levels.length) {
                    this.isGameOver = true;
                } else {
                    this.loadLevel(this.currentLevel);
                }
            }
            return;
        }

        // 移动冷却
        if (this.moveCooldown > 0) {
            this.moveCooldown -= deltaTime;
            return;
        }

        // 撤销
        if (keysPressed.b && this.history.length > 0) {
            this.undo();
            this.moveCooldown = 150;
            return;
        }

        // 重置当前关卡
        if (keysPressed.select) {
            this.loadLevel(this.currentLevel);
            return;
        }

        // 移动
        let dx = 0, dy = 0;
        if (keys.up) { dy = -1; this.playerDir = 3; }
        else if (keys.down) { dy = 1; this.playerDir = 0; }
        else if (keys.left) { dx = -1; this.playerDir = 1; }
        else if (keys.right) { dx = 1; this.playerDir = 2; }

        if (dx !== 0 || dy !== 0) {
            this.tryMove(dx, dy);
            this.moveCooldown = 120;
        }
    }

    /**
     * 尝试移动
     */
    tryMove(dx, dy) {
        const newX = this.playerX + dx;
        const newY = this.playerY + dy;

        // 检查边界
        if (newY < 0 || newY >= this.grid.length || 
            newX < 0 || newX >= this.grid[newY].length) {
            return;
        }

        // 检查墙
        if (this.grid[newY][newX] === 'wall' || this.grid[newY][newX] === 'empty') {
            return;
        }

        // 检查箱子
        const boxIndex = this.boxes.findIndex(b => b.x === newX && b.y === newY);
        
        if (boxIndex !== -1) {
            // 尝试推箱子
            const boxNewX = newX + dx;
            const boxNewY = newY + dy;

            // 检查箱子目标位置
            if (boxNewY < 0 || boxNewY >= this.grid.length ||
                boxNewX < 0 || boxNewX >= this.grid[boxNewY].length) {
                return;
            }

            if (this.grid[boxNewY][boxNewX] === 'wall' || 
                this.grid[boxNewY][boxNewX] === 'empty') {
                return;
            }

            // 检查是否有其他箱子
            if (this.boxes.some(b => b.x === boxNewX && b.y === boxNewY)) {
                return;
            }

            // 保存历史
            this.history.push({
                playerX: this.playerX,
                playerY: this.playerY,
                boxIndex,
                boxX: newX,
                boxY: newY
            });

            // 推箱子
            this.boxes[boxIndex].x = boxNewX;
            this.boxes[boxIndex].y = boxNewY;
            this.pushes++;
            audio.playHit();
        } else {
            // 保存历史（无箱子移动）
            this.history.push({
                playerX: this.playerX,
                playerY: this.playerY,
                boxIndex: -1
            });
        }

        // 移动玩家
        this.playerX = newX;
        this.playerY = newY;
        this.moves++;
        audio.playSelect();

        // 检查胜利
        this.checkWin();
    }

    /**
     * 撤销
     */
    undo() {
        if (this.history.length === 0) return;

        const state = this.history.pop();
        this.playerX = state.playerX;
        this.playerY = state.playerY;
        this.moves--;

        if (state.boxIndex !== -1) {
            this.boxes[state.boxIndex].x = state.boxX;
            this.boxes[state.boxIndex].y = state.boxY;
            this.pushes--;
        }

        audio.playSelect();
    }

    /**
     * 检查胜利
     */
    checkWin() {
        const allOnTarget = this.targets.every(target => 
            this.boxes.some(box => box.x === target.x && box.y === target.y)
        );

        if (allOnTarget) {
            this.levelComplete = true;
            audio.playLevelUp();
        }
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 关卡信息
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Level ${this.currentLevel + 1}`, 10, 20);

        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Moves: ${this.moves}`, this.width - 10, 20);

        // 绘制地图
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                this.drawCell(x, y);
            }
        }

        // 绘制箱子
        for (const box of this.boxes) {
            this.drawBox(box.x, box.y);
        }

        // 绘制玩家
        this.drawPlayer();

        // 底部提示
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('方向键:移动  B:撤销  SELECT:重置', this.width / 2, this.height - 5);

        // 关卡完成
        if (this.levelComplete) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('LEVEL CLEAR!', this.width / 2, this.height / 2 - 20);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`Moves: ${this.moves}  Pushes: ${this.pushes}`, 
                             this.width / 2, this.height / 2 + 10);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('按 A 下一关', this.width / 2, this.height / 2 + 40);
        }

        // 游戏通关
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CONGRATULATIONS!', this.width / 2, this.height / 2 - 20);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px monospace';
            this.ctx.fillText('All levels complete!', this.width / 2, this.height / 2 + 15);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 45);
        }
    }

    /**
     * 绘制格子
     */
    drawCell(x, y) {
        const px = this.offsetX + x * this.cellSize;
        const py = this.offsetY + y * this.cellSize;
        const size = this.cellSize;

        const cell = this.grid[y][x];

        if (cell === 'empty') {
            return;
        }

        if (cell === 'wall') {
            // 墙
            const gradient = this.ctx.createLinearGradient(px, py, px + size, py + size);
            gradient.addColorStop(0, '#7f8c8d');
            gradient.addColorStop(0.5, '#95a5a6');
            gradient.addColorStop(1, '#7f8c8d');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(px, py, size, size);

            // 砖块纹理
            this.ctx.strokeStyle = '#5d6d7e';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + size / 2);
            this.ctx.lineTo(px + size, py + size / 2);
            this.ctx.stroke();
        } else {
            // 地板
            this.ctx.fillStyle = '#34495e';
            this.ctx.fillRect(px, py, size, size);

            // 目标点
            if (cell === 'target') {
                this.ctx.fillStyle = '#e74c3c';
                this.ctx.beginPath();
                this.ctx.arc(px + size/2, py + size/2, size/4, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = '#c0392b';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        }
    }

    /**
     * 绘制箱子
     */
    drawBox(x, y) {
        const px = this.offsetX + x * this.cellSize + 2;
        const py = this.offsetY + y * this.cellSize + 2;
        const size = this.cellSize - 4;

        // 检查是否在目标上
        const onTarget = this.targets.some(t => t.x === x && t.y === y);

        // 箱子主体
        const gradient = this.ctx.createLinearGradient(px, py, px + size, py + size);
        if (onTarget) {
            gradient.addColorStop(0, '#27ae60');
            gradient.addColorStop(1, '#1e8449');
        } else {
            gradient.addColorStop(0, '#f39c12');
            gradient.addColorStop(1, '#d68910');
        }
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(px, py, size, size);

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(px + 2, py + 2, size - 4, 4);

        // X标记
        this.ctx.strokeStyle = onTarget ? '#1e8449' : '#b7950b';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(px + 4, py + 4);
        this.ctx.lineTo(px + size - 4, py + size - 4);
        this.ctx.moveTo(px + size - 4, py + 4);
        this.ctx.lineTo(px + 4, py + size - 4);
        this.ctx.stroke();
    }

    /**
     * 绘制玩家
     */
    drawPlayer() {
        const px = this.offsetX + this.playerX * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + this.playerY * this.cellSize + this.cellSize / 2;
        const size = this.cellSize * 0.4;

        // 身体
        this.ctx.fillStyle = '#3498db';
        this.ctx.beginPath();
        this.ctx.arc(px, py, size, 0, Math.PI * 2);
        this.ctx.fill();

        // 眼睛位置根据方向
        let eyeOffsetX = 0, eyeOffsetY = 0;
        if (this.playerDir === 0) eyeOffsetY = 2;
        else if (this.playerDir === 1) eyeOffsetX = -2;
        else if (this.playerDir === 2) eyeOffsetX = 2;
        else if (this.playerDir === 3) eyeOffsetY = -2;

        // 眼睛
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(px - 3 + eyeOffsetX, py - 2 + eyeOffsetY, 3, 0, Math.PI * 2);
        this.ctx.arc(px + 3 + eyeOffsetX, py - 2 + eyeOffsetY, 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(px - 3 + eyeOffsetX * 1.5, py - 2 + eyeOffsetY * 1.5, 1.5, 0, Math.PI * 2);
        this.ctx.arc(px + 3 + eyeOffsetX * 1.5, py - 2 + eyeOffsetY * 1.5, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    }
}

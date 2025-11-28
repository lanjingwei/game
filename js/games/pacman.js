/**
 * 吃豆人游戏
 * 经典迷宫游戏
 */
import { audio } from '../audio.js';

export class Pacman {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        this.cellSize = 16;
        this.cols = 19;
        this.rows = 17;
        this.offsetX = (width - this.cols * this.cellSize) / 2;
        this.offsetY = (height - this.rows * this.cellSize) / 2 + 10;

        // 玩家
        this.player = {
            x: 9, y: 13,
            direction: 0, // 0右 1下 2左 3上
            nextDirection: 0,
            mouthAngle: 0,
            mouthOpen: true
        };

        // 幽灵
        this.ghosts = [];
        this.ghostColors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];

        // 地图 (0空 1墙 2豆子 3能量豆)
        this.map = [];
        this.dots = 0;
        this.totalDots = 0;

        // 游戏状态
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.isGameOver = false;
        this.powerMode = false;
        this.powerTimer = 0;

        // 动画
        this.moveTimer = 0;
        this.moveInterval = 150 / difficulty.speed;
        this.animTimer = 0;

        this.init();
    }

    init() {
        this.generateMap();
        this.spawnGhosts();
    }

    /**
     * 生成地图
     */
    generateMap() {
        // 经典吃豆人地图布局
        const layout = [
            "1111111111111111111",
            "1222222212222222221",
            "1211211212112112121",
            "1311211212112112131",
            "1211211212112112121",
            "1222222222222222221",
            "1211211111111112121",
            "1222212222222212221",
            "1111212111112121111",
            "0001212000002121000",
            "1111212111112121111",
            "1222212222222212221",
            "1211211111111112121",
            "1222222222222222221",
            "1211211212112112121",
            "1322122212222122231",
            "1111111111111111111"
        ];

        this.map = [];
        this.dots = 0;

        for (let y = 0; y < this.rows; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.cols; x++) {
                const cell = parseInt(layout[y][x]);
                this.map[y][x] = cell;
                if (cell === 2 || cell === 3) {
                    this.dots++;
                }
            }
        }
        this.totalDots = this.dots;
    }

    /**
     * 生成幽灵
     */
    spawnGhosts() {
        this.ghosts = [];
        const positions = [
            { x: 8, y: 9 },
            { x: 9, y: 9 },
            { x: 10, y: 9 },
            { x: 9, y: 8 }
        ];

        for (let i = 0; i < 4; i++) {
            this.ghosts.push({
                x: positions[i].x,
                y: positions[i].y,
                direction: Math.floor(Math.random() * 4),
                color: this.ghostColors[i],
                scared: false,
                dead: false,
                moveTimer: 0
            });
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        if (this.isGameOver) return;

        // 输入处理
        if (keys.right) this.player.nextDirection = 0;
        if (keys.down) this.player.nextDirection = 1;
        if (keys.left) this.player.nextDirection = 2;
        if (keys.up) this.player.nextDirection = 3;

        // 动画
        this.animTimer += deltaTime;
        if (this.animTimer > 100) {
            this.animTimer = 0;
            this.player.mouthOpen = !this.player.mouthOpen;
        }

        // 能量模式计时
        if (this.powerMode) {
            this.powerTimer -= deltaTime;
            if (this.powerTimer <= 0) {
                this.powerMode = false;
                for (const ghost of this.ghosts) {
                    ghost.scared = false;
                }
            }
        }

        // 玩家移动
        this.moveTimer += deltaTime;
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            this.movePlayer();
            this.moveGhosts();
            this.checkCollisions();
        }

        // 检查胜利
        if (this.dots === 0) {
            this.level++;
            this.generateMap();
            this.player.x = 9;
            this.player.y = 13;
            this.spawnGhosts();
            this.moveInterval = Math.max(80, this.moveInterval - 10);
            audio.playLevelUp();
        }
    }

    /**
     * 移动玩家
     */
    movePlayer() {
        // 尝试新方向
        let newX = this.player.x;
        let newY = this.player.y;
        
        const dir = this.player.nextDirection;
        if (dir === 0) newX++;
        else if (dir === 1) newY++;
        else if (dir === 2) newX--;
        else if (dir === 3) newY--;

        // 穿越通道
        if (newX < 0) newX = this.cols - 1;
        if (newX >= this.cols) newX = 0;

        // 检查是否可以移动到新方向
        if (newY >= 0 && newY < this.rows && this.map[newY][newX] !== 1) {
            this.player.direction = this.player.nextDirection;
            this.player.x = newX;
            this.player.y = newY;
        } else {
            // 继续当前方向
            newX = this.player.x;
            newY = this.player.y;
            const dir = this.player.direction;
            if (dir === 0) newX++;
            else if (dir === 1) newY++;
            else if (dir === 2) newX--;
            else if (dir === 3) newY--;

            if (newX < 0) newX = this.cols - 1;
            if (newX >= this.cols) newX = 0;

            if (newY >= 0 && newY < this.rows && this.map[newY][newX] !== 1) {
                this.player.x = newX;
                this.player.y = newY;
            }
        }

        // 吃豆子
        const cell = this.map[this.player.y][this.player.x];
        if (cell === 2) {
            this.map[this.player.y][this.player.x] = 0;
            this.dots--;
            this.score += 10;
            audio.playEat();
        } else if (cell === 3) {
            this.map[this.player.y][this.player.x] = 0;
            this.dots--;
            this.score += 50;
            this.powerMode = true;
            this.powerTimer = 8000;
            for (const ghost of this.ghosts) {
                if (!ghost.dead) ghost.scared = true;
            }
            audio.playClear();
        }
    }

    /**
     * 移动幽灵
     */
    moveGhosts() {
        for (const ghost of this.ghosts) {
            if (ghost.dead) {
                // 死亡状态返回出生点
                if (ghost.x === 9 && ghost.y === 9) {
                    ghost.dead = false;
                    ghost.scared = this.powerMode;
                    continue;
                }
                // 简单路径回到中心
                if (ghost.x < 9) ghost.x++;
                else if (ghost.x > 9) ghost.x--;
                else if (ghost.y < 9) ghost.y++;
                else if (ghost.y > 9) ghost.y--;
                continue;
            }

            // 获取可能的移动方向
            const possibleDirs = [];
            const opposite = (ghost.direction + 2) % 4;

            for (let d = 0; d < 4; d++) {
                if (d === opposite) continue; // 不能回头
                
                let nx = ghost.x, ny = ghost.y;
                if (d === 0) nx++;
                else if (d === 1) ny++;
                else if (d === 2) nx--;
                else if (d === 3) ny--;

                if (nx < 0) nx = this.cols - 1;
                if (nx >= this.cols) nx = 0;

                if (ny >= 0 && ny < this.rows && this.map[ny][nx] !== 1) {
                    possibleDirs.push(d);
                }
            }

            if (possibleDirs.length === 0) {
                possibleDirs.push(opposite);
            }

            // 选择方向（害怕时远离玩家，否则追踪玩家）
            let bestDir = possibleDirs[0];
            
            if (ghost.scared) {
                // 远离玩家
                let maxDist = -1;
                for (const d of possibleDirs) {
                    let nx = ghost.x, ny = ghost.y;
                    if (d === 0) nx++;
                    else if (d === 1) ny++;
                    else if (d === 2) nx--;
                    else if (d === 3) ny--;
                    
                    const dist = Math.abs(nx - this.player.x) + Math.abs(ny - this.player.y);
                    if (dist > maxDist) {
                        maxDist = dist;
                        bestDir = d;
                    }
                }
            } else {
                // 追踪玩家（有一定随机性）
                if (Math.random() < 0.7) {
                    let minDist = 999;
                    for (const d of possibleDirs) {
                        let nx = ghost.x, ny = ghost.y;
                        if (d === 0) nx++;
                        else if (d === 1) ny++;
                        else if (d === 2) nx--;
                        else if (d === 3) ny--;
                        
                        const dist = Math.abs(nx - this.player.x) + Math.abs(ny - this.player.y);
                        if (dist < minDist) {
                            minDist = dist;
                            bestDir = d;
                        }
                    }
                } else {
                    bestDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                }
            }

            ghost.direction = bestDir;
            
            if (bestDir === 0) ghost.x++;
            else if (bestDir === 1) ghost.y++;
            else if (bestDir === 2) ghost.x--;
            else if (bestDir === 3) ghost.y--;

            if (ghost.x < 0) ghost.x = this.cols - 1;
            if (ghost.x >= this.cols) ghost.x = 0;
        }
    }

    /**
     * 检查碰撞
     */
    checkCollisions() {
        for (const ghost of this.ghosts) {
            if (ghost.x === this.player.x && ghost.y === this.player.y) {
                if (ghost.scared && !ghost.dead) {
                    // 吃掉幽灵
                    ghost.dead = true;
                    this.score += 200;
                    audio.playExplosion();
                } else if (!ghost.dead) {
                    // 被幽灵抓住
                    this.lives--;
                    audio.playGameOver();
                    
                    if (this.lives <= 0) {
                        this.isGameOver = true;
                    } else {
                        // 重置位置
                        this.player.x = 9;
                        this.player.y = 13;
                        this.spawnGhosts();
                        this.powerMode = false;
                    }
                    break;
                }
            }
        }
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 地图
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.map[y][x];
                const px = this.offsetX + x * this.cellSize;
                const py = this.offsetY + y * this.cellSize;

                if (cell === 1) {
                    // 墙
                    this.ctx.fillStyle = '#2121de';
                    this.ctx.fillRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
                } else if (cell === 2) {
                    // 豆子
                    this.ctx.fillStyle = '#ffb897';
                    this.ctx.beginPath();
                    this.ctx.arc(px + this.cellSize/2, py + this.cellSize/2, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (cell === 3) {
                    // 能量豆
                    const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                    this.ctx.fillStyle = `rgba(255, 184, 151, ${pulse})`;
                    this.ctx.beginPath();
                    this.ctx.arc(px + this.cellSize/2, py + this.cellSize/2, 5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        // 玩家
        this.drawPlayer();

        // 幽灵
        for (const ghost of this.ghosts) {
            this.drawGhost(ghost);
        }

        // UI
        this.renderUI();
    }

    /**
     * 绘制玩家
     */
    drawPlayer() {
        const px = this.offsetX + this.player.x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + this.player.y * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize / 2 - 1;

        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();

        if (this.player.mouthOpen) {
            // 张嘴
            const mouthAngle = 0.3;
            const startAngle = this.player.direction * Math.PI / 2 + mouthAngle;
            const endAngle = this.player.direction * Math.PI / 2 - mouthAngle + Math.PI * 2;
            
            this.ctx.moveTo(px, py);
            this.ctx.arc(px, py, radius, startAngle, endAngle);
            this.ctx.closePath();
        } else {
            // 闭嘴
            this.ctx.arc(px, py, radius, 0, Math.PI * 2);
        }
        
        this.ctx.fill();
    }

    /**
     * 绘制幽灵
     */
    drawGhost(ghost) {
        const px = this.offsetX + ghost.x * this.cellSize + this.cellSize / 2;
        const py = this.offsetY + ghost.y * this.cellSize + this.cellSize / 2;
        const size = this.cellSize - 2;

        if (ghost.dead) {
            // 只画眼睛
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(px - 3, py - 2, 3, 0, Math.PI * 2);
            this.ctx.arc(px + 3, py - 2, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#0000ff';
            this.ctx.beginPath();
            this.ctx.arc(px - 2, py - 1, 1.5, 0, Math.PI * 2);
            this.ctx.arc(px + 4, py - 1, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
            return;
        }

        // 身体颜色
        if (ghost.scared) {
            const flash = this.powerTimer < 2000 && Math.floor(this.powerTimer / 200) % 2;
            this.ctx.fillStyle = flash ? '#ffffff' : '#2121de';
        } else {
            this.ctx.fillStyle = ghost.color;
        }

        // 身体
        this.ctx.beginPath();
        this.ctx.arc(px, py - 2, size / 2, Math.PI, 0);
        this.ctx.lineTo(px + size / 2, py + size / 2 - 2);
        
        // 波浪底部
        for (let i = 0; i < 3; i++) {
            const bx = px + size / 2 - (i + 1) * size / 3;
            this.ctx.quadraticCurveTo(bx + size / 6, py + size / 2 + 2, bx, py + size / 2 - 2);
        }
        
        this.ctx.closePath();
        this.ctx.fill();

        // 眼睛
        if (!ghost.scared) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(px - 3, py - 2, 3, 0, Math.PI * 2);
            this.ctx.arc(px + 3, py - 2, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // 瞳孔（看向玩家）
            const dx = this.player.x - ghost.x;
            const dy = this.player.y - ghost.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const pupilX = (dx / len) * 1.5;
            const pupilY = (dy / len) * 1.5;

            this.ctx.fillStyle = '#0000ff';
            this.ctx.beginPath();
            this.ctx.arc(px - 3 + pupilX, py - 2 + pupilY, 1.5, 0, Math.PI * 2);
            this.ctx.arc(px + 3 + pupilX, py - 2 + pupilY, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // 害怕表情
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(px - 4, py - 3, 2, 2);
            this.ctx.fillRect(px + 2, py - 3, 2, 2);
            
            // 波浪嘴
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(px - 4, py + 3);
            for (let i = 0; i < 4; i++) {
                this.ctx.lineTo(px - 4 + i * 2 + 1, py + 2 + (i % 2) * 2);
            }
            this.ctx.stroke();
        }
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`SCORE: ${this.score}`, 10, 18);

        // 关卡
        this.ctx.fillStyle = '#00ffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`LV.${this.level}`, this.width / 2, 18);

        // 生命
        this.ctx.fillStyle = '#ffff00';
        this.ctx.textAlign = 'right';
        for (let i = 0; i < this.lives; i++) {
            this.ctx.beginPath();
            this.ctx.arc(this.width - 20 - i * 20, 12, 6, 0.3, Math.PI * 2 - 0.3);
            this.ctx.lineTo(this.width - 20 - i * 20, 12);
            this.ctx.fill();
        }

        // 能量模式提示
        if (this.powerMode) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            const time = Math.ceil(this.powerTimer / 1000);
            this.ctx.fillText(`POWER: ${time}s`, this.width / 2, this.height - 5);
        }
    }
}

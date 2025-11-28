/**
 * 堆叠塔游戏
 * 堆叠方块建造高塔
 */
import { audio } from '../audio.js';

export class StackTower {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 已堆叠的方块
        this.blocks = [];
        
        // 当前移动的方块
        this.currentBlock = null;
        
        // 下落的碎片
        this.fallingPieces = [];

        // 游戏参数
        this.blockHeight = 25;
        this.baseWidth = 100;
        this.moveSpeed = 2 * difficulty.speed;
        this.baseY = height - 50;

        // 相机
        this.cameraY = 0;

        // 游戏状态
        this.score = 0;
        this.perfectCount = 0;
        this.isGameOver = false;

        this.init();
    }

    /**
     * 初始化
     */
    init() {
        // 基础方块
        this.blocks = [{
            x: this.width / 2,
            width: this.baseWidth,
            y: this.baseY,
            color: this.getColor(0)
        }];

        this.spawnBlock();
    }

    /**
     * 生成新方块
     */
    spawnBlock() {
        const lastBlock = this.blocks[this.blocks.length - 1];
        const y = lastBlock.y - this.blockHeight;

        this.currentBlock = {
            x: -lastBlock.width / 2,
            width: lastBlock.width,
            y,
            direction: 1,
            color: this.getColor(this.blocks.length)
        };
    }

    /**
     * 获取颜色
     */
    getColor(index) {
        const hue = (index * 25) % 360;
        return `hsl(${hue}, 70%, 55%)`;
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

        // 移动当前方块
        if (this.currentBlock) {
            this.currentBlock.x += this.moveSpeed * this.currentBlock.direction;

            // 边界反弹
            if (this.currentBlock.x + this.currentBlock.width / 2 > this.width) {
                this.currentBlock.direction = -1;
            } else if (this.currentBlock.x - this.currentBlock.width / 2 < 0) {
                this.currentBlock.direction = 1;
            }
        }

        // 放置方块
        if (keysPressed.a && this.currentBlock) {
            this.placeBlock();
        }

        // 更新下落碎片
        for (let i = this.fallingPieces.length - 1; i >= 0; i--) {
            const piece = this.fallingPieces[i];
            piece.vy += 0.5;
            piece.y += piece.vy;
            piece.x += piece.vx;
            piece.rotation += piece.rotSpeed;

            if (piece.y > this.height + 50) {
                this.fallingPieces.splice(i, 1);
            }
        }

        // 相机跟随
        const targetCameraY = Math.max(0, this.blocks.length * this.blockHeight - this.height + 150);
        this.cameraY += (targetCameraY - this.cameraY) * 0.1;
    }

    /**
     * 放置方块
     */
    placeBlock() {
        const lastBlock = this.blocks[this.blocks.length - 1];
        const current = this.currentBlock;

        // 计算重叠
        const lastLeft = lastBlock.x - lastBlock.width / 2;
        const lastRight = lastBlock.x + lastBlock.width / 2;
        const currentLeft = current.x - current.width / 2;
        const currentRight = current.x + current.width / 2;

        const overlapLeft = Math.max(lastLeft, currentLeft);
        const overlapRight = Math.min(lastRight, currentRight);
        const overlapWidth = overlapRight - overlapLeft;

        if (overlapWidth <= 0) {
            // 完全没有重叠，游戏结束
            this.gameOver();
            return;
        }

        // 计算新方块
        const newX = (overlapLeft + overlapRight) / 2;
        const cutoff = current.width - overlapWidth;

        // 完美堆叠检测
        if (cutoff < 3) {
            this.perfectCount++;
            this.score += 20 + this.perfectCount * 5;
            
            // 完美堆叠效果
            if (this.perfectCount >= 3) {
                audio.playLevelUp();
            } else {
                audio.playClear();
            }
        } else {
            this.perfectCount = 0;
            this.score += 10;
            audio.playSelect();

            // 创建下落碎片
            const cutSide = current.x > newX ? 1 : -1;
            this.fallingPieces.push({
                x: cutSide > 0 ? overlapRight + cutoff / 2 : overlapLeft - cutoff / 2,
                y: current.y,
                width: cutoff,
                height: this.blockHeight,
                color: current.color,
                vy: 0,
                vx: cutSide * 2,
                rotation: 0,
                rotSpeed: cutSide * 0.1
            });
        }

        // 添加新方块
        this.blocks.push({
            x: newX,
            width: overlapWidth,
            y: current.y,
            color: current.color
        });

        // 检查方块是否太小
        if (overlapWidth < 10) {
            this.gameOver();
            return;
        }

        // 生成下一个方块
        this.spawnBlock();

        // 增加速度
        this.moveSpeed = Math.min(6, 2 * this.difficulty.speed + this.blocks.length * 0.05);
    }

    /**
     * 游戏结束
     */
    gameOver() {
        this.isGameOver = true;
        this.currentBlock = null;
        audio.playGameOver();
    }

    /**
     * 重新开始
     */
    restart() {
        this.blocks = [];
        this.fallingPieces = [];
        this.currentBlock = null;
        this.score = 0;
        this.perfectCount = 0;
        this.cameraY = 0;
        this.moveSpeed = 2 * this.difficulty.speed;
        this.isGameOver = false;
        this.init();
    }

    /**
     * 渲染
     */
    render() {
        // 背景渐变
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#2d2d5e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 背景网格
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let y = -this.cameraY % 50; y < this.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        this.ctx.save();
        this.ctx.translate(0, this.cameraY);

        // 地面
        this.ctx.fillStyle = '#333355';
        this.ctx.fillRect(0, this.baseY, this.width, this.height);

        // 已堆叠的方块
        for (const block of this.blocks) {
            this.drawBlock(block);
        }

        // 当前移动的方块
        if (this.currentBlock) {
            this.drawBlock(this.currentBlock, true);
        }

        // 下落碎片
        for (const piece of this.fallingPieces) {
            this.drawFallingPiece(piece);
        }

        this.ctx.restore();

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 40);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`得分: ${this.score}`, this.width / 2, this.height / 2);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`高度: ${this.blocks.length - 1} 层`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 65);
        }
    }

    /**
     * 绘制方块
     */
    drawBlock(block, isCurrent = false) {
        const x = block.x - block.width / 2;
        const y = block.y - this.blockHeight;

        // 主体
        this.ctx.fillStyle = block.color;
        this.ctx.fillRect(x, y, block.width, this.blockHeight);

        // 3D效果 - 顶部高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x, y, block.width, 4);

        // 3D效果 - 左侧高光
        this.ctx.fillRect(x, y, 3, this.blockHeight);

        // 3D效果 - 右侧阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(x + block.width - 3, y, 3, this.blockHeight);

        // 3D效果 - 底部阴影
        this.ctx.fillRect(x, y + this.blockHeight - 3, block.width, 3);

        // 当前方块发光效果
        if (isCurrent) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, block.width, this.blockHeight);
        }
    }

    /**
     * 绘制下落碎片
     */
    drawFallingPiece(piece) {
        this.ctx.save();
        this.ctx.translate(piece.x, piece.y);
        this.ctx.rotate(piece.rotation);

        this.ctx.fillStyle = piece.color;
        this.ctx.globalAlpha = 0.7;
        this.ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        
        this.ctx.restore();
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.score}`, this.width / 2, 35);

        // 层数
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`${this.blocks.length - 1} 层`, this.width / 2, 55);

        // 连续完美提示
        if (this.perfectCount >= 2) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 16px monospace';
            this.ctx.fillText(`PERFECT x${this.perfectCount}!`, this.width / 2, 80);
        }

        // 提示
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('按 A 放置方块', this.width / 2, this.height - 10);
    }
}

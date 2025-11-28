/**
 * 打地鼠游戏
 * 经典休闲游戏
 */
import { audio } from '../audio.js';

export class WhackMole {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 网格设置
        this.cols = 3;
        this.rows = 3;
        this.holeSize = 60;
        this.offsetX = (width - this.cols * this.holeSize) / 2;
        this.offsetY = (height - this.rows * this.holeSize) / 2 + 20;

        // 地鼠洞
        this.holes = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.holes.push({
                    x, y,
                    mole: null,
                    hitEffect: 0
                });
            }
        }

        // 光标
        this.cursorX = 1;
        this.cursorY = 1;

        // 游戏状态
        this.score = 0;
        this.misses = 0;
        this.maxMisses = 10;
        this.combo = 0;
        this.maxCombo = 0;
        this.timer = 60000; // 60秒
        this.isGameOver = false;

        // 地鼠生成
        this.spawnTimer = 0;
        this.spawnInterval = 1200 / difficulty.speed;
        this.moleStayTime = 1500 / difficulty.speed;

        // 锤子动画
        this.hammerSwing = 0;

        // 移动冷却
        this.moveCooldown = 0;
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

        // 计时
        this.timer -= deltaTime;
        if (this.timer <= 0) {
            this.timer = 0;
            this.isGameOver = true;
            audio.playLevelUp();
            return;
        }

        // 锤子动画恢复
        if (this.hammerSwing > 0) {
            this.hammerSwing -= deltaTime * 0.01;
        }

        // 更新击打效果
        for (const hole of this.holes) {
            if (hole.hitEffect > 0) {
                hole.hitEffect -= deltaTime * 0.005;
            }
        }

        // 更新地鼠
        for (const hole of this.holes) {
            if (hole.mole) {
                hole.mole.timer -= deltaTime;
                hole.mole.showProgress = Math.min(1, hole.mole.showProgress + deltaTime * 0.008);

                // 地鼠消失
                if (hole.mole.timer <= 0) {
                    if (!hole.mole.hit) {
                        this.misses++;
                        this.combo = 0;
                        if (this.misses >= this.maxMisses) {
                            this.isGameOver = true;
                            audio.playGameOver();
                            return;
                        }
                    }
                    hole.mole = null;
                }
            }
        }

        // 生成地鼠
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnMole();
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

        // 击打
        if (keysPressed.a || keysPressed.b) {
            this.whack();
        }
    }

    /**
     * 生成地鼠
     */
    spawnMole() {
        // 找空洞
        const emptyHoles = this.holes.filter(h => !h.mole);
        if (emptyHoles.length === 0) return;

        const hole = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
        
        // 随机类型
        const rand = Math.random();
        let type, points;
        
        if (rand < 0.1) {
            type = 'golden'; // 金色地鼠，高分
            points = 50;
        } else if (rand < 0.2) {
            type = 'helmet'; // 带头盔，需要打两次
            points = 30;
        } else if (rand < 0.3) {
            type = 'bomb'; // 炸弹，不要打
            points = -20;
        } else {
            type = 'normal';
            points = 10;
        }

        hole.mole = {
            type,
            points,
            timer: this.moleStayTime,
            hit: false,
            hitCount: type === 'helmet' ? 0 : 0,
            showProgress: 0
        };
    }

    /**
     * 击打
     */
    whack() {
        this.hammerSwing = 1;
        
        const hole = this.holes.find(h => h.x === this.cursorX && h.y === this.cursorY);
        if (!hole) return;

        hole.hitEffect = 1;

        if (hole.mole && !hole.mole.hit) {
            const mole = hole.mole;

            if (mole.type === 'bomb') {
                // 打到炸弹
                this.score = Math.max(0, this.score + mole.points);
                this.combo = 0;
                this.misses += 2;
                mole.hit = true;
                audio.playExplosion();

                if (this.misses >= this.maxMisses) {
                    this.isGameOver = true;
                    audio.playGameOver();
                }
            } else if (mole.type === 'helmet') {
                // 头盔地鼠
                mole.hitCount++;
                if (mole.hitCount >= 2) {
                    this.score += mole.points * (1 + this.combo * 0.1);
                    this.combo++;
                    mole.hit = true;
                    audio.playClear();
                } else {
                    audio.playHit();
                }
            } else {
                // 普通和金色地鼠
                this.score += Math.floor(mole.points * (1 + this.combo * 0.1));
                this.combo++;
                mole.hit = true;
                
                if (mole.type === 'golden') {
                    audio.playLevelUp();
                } else {
                    audio.playClear();
                }
            }

            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }
        } else {
            // 打空
            audio.playSelect();
        }
    }

    /**
     * 重新开始
     */
    restart() {
        this.score = 0;
        this.misses = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.timer = 60000;
        this.isGameOver = false;
        this.spawnTimer = 0;
        this.cursorX = 1;
        this.cursorY = 1;

        for (const hole of this.holes) {
            hole.mole = null;
            hole.hitEffect = 0;
        }
    }

    /**
     * 渲染
     */
    render() {
        // 背景 - 草地
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#87ceeb');
        gradient.addColorStop(0.4, '#90ee90');
        gradient.addColorStop(1, '#228b22');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 绘制洞和地鼠
        for (const hole of this.holes) {
            this.drawHole(hole);
        }

        // 绘制锤子/光标
        this.drawHammer();

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('TIME UP!', this.width / 2, this.height / 2 - 40);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`得分: ${Math.floor(this.score)}`, this.width / 2, this.height / 2);

            this.ctx.fillStyle = '#ff8800';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`最高连击: ${this.maxCombo}`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 65);
        }
    }

    /**
     * 绘制洞和地鼠
     */
    drawHole(hole) {
        const px = this.offsetX + hole.x * this.holeSize + this.holeSize / 2;
        const py = this.offsetY + hole.y * this.holeSize + this.holeSize / 2;
        const radius = this.holeSize * 0.4;

        // 击打效果
        if (hole.hitEffect > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 0, ${hole.hitEffect * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(px, py, radius * 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 洞的阴影
        this.ctx.fillStyle = '#1a4d1a';
        this.ctx.beginPath();
        this.ctx.ellipse(px, py + 5, radius, radius * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 洞
        this.ctx.fillStyle = '#0d260d';
        this.ctx.beginPath();
        this.ctx.ellipse(px, py, radius, radius * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 地鼠
        if (hole.mole) {
            this.drawMole(px, py, hole.mole, radius);
        }

        // 洞的边缘（遮挡地鼠下半部分）
        this.ctx.fillStyle = '#228b22';
        this.ctx.beginPath();
        this.ctx.ellipse(px, py + 3, radius + 3, radius * 0.4, 0, 0, Math.PI);
        this.ctx.fill();
    }

    /**
     * 绘制地鼠
     */
    drawMole(x, y, mole, holeRadius) {
        const showY = y - 15 * mole.showProgress;
        const size = holeRadius * 0.8;

        // 被打中的效果
        if (mole.hit) {
            this.ctx.globalAlpha = 0.5;
        }

        if (mole.type === 'bomb') {
            // 炸弹
            this.ctx.fillStyle = '#333333';
            this.ctx.beginPath();
            this.ctx.arc(x, showY - size * 0.3, size * 0.7, 0, Math.PI * 2);
            this.ctx.fill();

            // 引线
            this.ctx.strokeStyle = '#888888';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, showY - size);
            this.ctx.quadraticCurveTo(x + 10, showY - size - 10, x + 5, showY - size - 15);
            this.ctx.stroke();

            // 火花
            if (Math.floor(Date.now() / 100) % 2) {
                this.ctx.fillStyle = '#ff4400';
                this.ctx.beginPath();
                this.ctx.arc(x + 5, showY - size - 15, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            // 地鼠身体
            let bodyColor = '#8b4513';
            if (mole.type === 'golden') {
                bodyColor = '#ffd700';
            }

            this.ctx.fillStyle = bodyColor;
            this.ctx.beginPath();
            this.ctx.ellipse(x, showY, size * 0.8, size, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // 脸
            this.ctx.fillStyle = mole.type === 'golden' ? '#ffe066' : '#d2691e';
            this.ctx.beginPath();
            this.ctx.arc(x, showY - size * 0.2, size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();

            // 眼睛
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(x - size * 0.25, showY - size * 0.35, size * 0.2, 0, Math.PI * 2);
            this.ctx.arc(x + size * 0.25, showY - size * 0.35, size * 0.2, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(x - size * 0.2, showY - size * 0.3, size * 0.1, 0, Math.PI * 2);
            this.ctx.arc(x + size * 0.3, showY - size * 0.3, size * 0.1, 0, Math.PI * 2);
            this.ctx.fill();

            // 鼻子
            this.ctx.fillStyle = '#ff6666';
            this.ctx.beginPath();
            this.ctx.arc(x, showY, size * 0.15, 0, Math.PI * 2);
            this.ctx.fill();

            // 牙齿
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(x - size * 0.15, showY + size * 0.15, size * 0.12, size * 0.2);
            this.ctx.fillRect(x + size * 0.03, showY + size * 0.15, size * 0.12, size * 0.2);

            // 头盔
            if (mole.type === 'helmet') {
                this.ctx.fillStyle = mole.hitCount > 0 ? '#ff6666' : '#888888';
                this.ctx.beginPath();
                this.ctx.ellipse(x, showY - size * 0.5, size * 0.7, size * 0.4, 0, Math.PI, 0);
                this.ctx.fill();

                // 裂痕
                if (mole.hitCount > 0) {
                    this.ctx.strokeStyle = '#333333';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x - 5, showY - size * 0.6);
                    this.ctx.lineTo(x, showY - size * 0.3);
                    this.ctx.lineTo(x + 3, showY - size * 0.7);
                    this.ctx.stroke();
                }
            }

            // 金色地鼠闪光
            if (mole.type === 'golden' && Math.floor(Date.now() / 200) % 2) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.beginPath();
                this.ctx.arc(x - size * 0.3, showY - size * 0.5, size * 0.15, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.globalAlpha = 1;
    }

    /**
     * 绘制锤子
     */
    drawHammer() {
        const px = this.offsetX + this.cursorX * this.holeSize + this.holeSize / 2;
        const py = this.offsetY + this.cursorY * this.holeSize + this.holeSize / 2;

        this.ctx.save();
        this.ctx.translate(px + 20, py - 30);
        this.ctx.rotate(-0.3 - this.hammerSwing * 0.5);

        // 锤柄
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(-5, 0, 10, 40);

        // 锤头
        this.ctx.fillStyle = '#696969';
        this.ctx.fillRect(-15, -15, 30, 20);

        // 高光
        this.ctx.fillStyle = '#888888';
        this.ctx.fillRect(-13, -13, 26, 5);

        this.ctx.restore();

        // 光标指示
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
            this.offsetX + this.cursorX * this.holeSize + 5,
            this.offsetY + this.cursorY * this.holeSize + 5,
            this.holeSize - 10,
            this.holeSize - 10
        );
        this.ctx.setLineDash([]);
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.strokeText(`${Math.floor(this.score)}`, 12, 25);
        this.ctx.fillText(`${Math.floor(this.score)}`, 12, 25);

        // 时间
        const seconds = Math.ceil(this.timer / 1000);
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = seconds <= 10 ? '#ff4444' : '#ffffff';
        this.ctx.strokeText(`${seconds}s`, this.width - 10, 25);
        this.ctx.fillText(`${seconds}s`, this.width - 10, 25);

        // 连击
        if (this.combo > 1) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`COMBO x${this.combo}!`, this.width / 2, 25);
        }

        // 失误
        this.ctx.fillStyle = '#ff6666';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Miss: ${this.misses}/${this.maxMisses}`, 10, this.height - 10);

        // 提示
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('A/B 击打', this.width - 10, this.height - 10);
    }
}

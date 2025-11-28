/**
 * 钢琴块游戏
 * 音乐节奏游戏
 */
import { audio } from '../audio.js';

export class PianoTiles {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 轨道设置
        this.lanes = 4;
        this.laneWidth = width / this.lanes;
        
        // 方块设置
        this.tileHeight = 80;
        this.tiles = [];
        this.tileSpeed = 3 * difficulty.speed;

        // 光标
        this.cursorLane = 1;

        // 游戏状态
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.misses = 0;
        this.maxMisses = 3;
        this.isGameOver = false;

        // 生成计时
        this.spawnTimer = 0;
        this.spawnInterval = 600 / difficulty.speed;

        // 按键提示区
        this.hitLineY = height - 60;

        // 特效
        this.effects = [];

        // 音符频率
        this.notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

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

        // 生成方块
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnTile();
        }

        // 更新方块
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            const tile = this.tiles[i];
            tile.y += this.tileSpeed;

            // 错过方块
            if (tile.y > this.height + 10 && !tile.hit) {
                this.miss();
                this.tiles.splice(i, 1);
            }
        }

        // 更新特效
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life -= deltaTime * 0.003;
            if (this.effects[i].life <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // 移动冷却
        if (this.moveCooldown > 0) {
            this.moveCooldown -= deltaTime;
        }

        // 光标移动
        if (this.moveCooldown <= 0) {
            if (keys.left && this.cursorLane > 0) {
                this.cursorLane--;
                this.moveCooldown = 80;
            } else if (keys.right && this.cursorLane < this.lanes - 1) {
                this.cursorLane++;
                this.moveCooldown = 80;
            }
        }

        // 点击
        if (keysPressed.a || keysPressed.b) {
            this.hitTile(this.cursorLane);
        }

        // 增加速度
        this.tileSpeed = Math.min(10, this.tileSpeed + deltaTime * 0.00005);
    }

    /**
     * 生成方块
     */
    spawnTile() {
        // 随机选择轨道，但避免连续相同
        let lane;
        const lastTile = this.tiles[this.tiles.length - 1];
        
        do {
            lane = Math.floor(Math.random() * this.lanes);
        } while (lastTile && lane === lastTile.lane && Math.random() < 0.7);

        this.tiles.push({
            lane,
            y: -this.tileHeight,
            hit: false,
            note: this.notes[Math.floor(Math.random() * this.notes.length)]
        });
    }

    /**
     * 点击方块
     */
    hitTile(lane) {
        // 找到该轨道上可点击的方块
        for (const tile of this.tiles) {
            if (tile.lane === lane && !tile.hit) {
                const tileBottom = tile.y + this.tileHeight;
                const tileTop = tile.y;

                // 检查是否在判定区域内
                if (tileBottom >= this.hitLineY - 30 && tileTop <= this.hitLineY + 40) {
                    // 命中
                    tile.hit = true;
                    this.combo++;
                    
                    // 根据精准度计分
                    const dist = Math.abs((tile.y + this.tileHeight / 2) - this.hitLineY);
                    let points = 10;
                    let rating = 'GOOD';
                    
                    if (dist < 10) {
                        points = 30;
                        rating = 'PERFECT!';
                    } else if (dist < 25) {
                        points = 20;
                        rating = 'GREAT';
                    }

                    this.score += points * (1 + Math.floor(this.combo / 10) * 0.1);

                    if (this.combo > this.maxCombo) {
                        this.maxCombo = this.combo;
                    }

                    // 添加特效
                    this.effects.push({
                        x: lane * this.laneWidth + this.laneWidth / 2,
                        y: this.hitLineY,
                        text: rating,
                        life: 1,
                        color: rating === 'PERFECT!' ? '#ffcc00' : rating === 'GREAT' ? '#00ff00' : '#ffffff'
                    });

                    // 播放音符
                    this.playNote(tile.note);
                    return;
                }
            }
        }

        // 点空了
        this.miss();
    }

    /**
     * 播放音符
     */
    playNote(freq) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
            audio.playSelect();
        }
    }

    /**
     * 错过
     */
    miss() {
        this.combo = 0;
        this.misses++;
        audio.playHit();

        this.effects.push({
            x: this.width / 2,
            y: this.hitLineY,
            text: 'MISS',
            life: 1,
            color: '#ff4444'
        });

        if (this.misses >= this.maxMisses) {
            this.isGameOver = true;
            audio.playGameOver();
        }
    }

    /**
     * 重新开始
     */
    restart() {
        this.tiles = [];
        this.effects = [];
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.misses = 0;
        this.isGameOver = false;
        this.tileSpeed = 3 * this.difficulty.speed;
        this.spawnTimer = 0;
        this.cursorLane = 1;
    }

    /**
     * 渲染
     */
    render() {
        // 背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 轨道分隔线
        this.ctx.strokeStyle = '#333344';
        this.ctx.lineWidth = 2;
        for (let i = 1; i < this.lanes; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.laneWidth, 0);
            this.ctx.lineTo(i * this.laneWidth, this.height);
            this.ctx.stroke();
        }

        // 判定线
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(0, this.hitLineY - 30, this.width, 70);
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.hitLineY);
        this.ctx.lineTo(this.width, this.hitLineY);
        this.ctx.stroke();

        // 方块
        for (const tile of this.tiles) {
            this.drawTile(tile);
        }

        // 光标指示
        this.drawCursor();

        // 特效
        for (const effect of this.effects) {
            this.ctx.fillStyle = effect.color;
            this.ctx.globalAlpha = effect.life;
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(effect.text, effect.x, effect.y - 20 + (1 - effect.life) * 30);
        }
        this.ctx.globalAlpha = 1;

        // UI
        this.renderUI();

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = '#ff4444';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 40);

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '18px monospace';
            this.ctx.fillText(`得分: ${Math.floor(this.score)}`, this.width / 2, this.height / 2);

            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`最高连击: ${this.maxCombo}`, this.width / 2, this.height / 2 + 30);

            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 65);
        }
    }

    /**
     * 绘制方块
     */
    drawTile(tile) {
        const x = tile.lane * this.laneWidth;
        const y = tile.y;

        if (tile.hit) {
            // 已击中 - 渐隐
            this.ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
        } else {
            // 未击中 - 黑色方块
            this.ctx.fillStyle = '#2a2a4a';
        }

        this.ctx.fillRect(x + 2, y, this.laneWidth - 4, this.tileHeight - 2);

        if (!tile.hit) {
            // 高光
            this.ctx.fillStyle = '#3a3a5a';
            this.ctx.fillRect(x + 4, y + 2, this.laneWidth - 8, 4);
        }
    }

    /**
     * 绘制光标
     */
    drawCursor() {
        const x = this.cursorLane * this.laneWidth;

        // 光标高亮
        this.ctx.fillStyle = 'rgba(255, 255, 100, 0.2)';
        this.ctx.fillRect(x, this.hitLineY - 30, this.laneWidth, 70);

        // 光标指示器
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.beginPath();
        this.ctx.moveTo(x + this.laneWidth / 2, this.height - 15);
        this.ctx.lineTo(x + this.laneWidth / 2 - 10, this.height - 5);
        this.ctx.lineTo(x + this.laneWidth / 2 + 10, this.height - 5);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${Math.floor(this.score)}`, 10, 25);

        // 连击
        if (this.combo > 0) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${this.combo} COMBO`, this.width / 2, 25);
        }

        // 失误
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'right';
        for (let i = 0; i < this.maxMisses; i++) {
            this.ctx.fillText(i < this.misses ? '✗' : '♥', this.width - 10 - i * 20, 25);
        }
    }
}

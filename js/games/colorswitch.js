/**
 * 颜色切换游戏
 * 颜色匹配跳跃游戏 - 优化版
 */
import { audio } from '../audio.js';

export class ColorSwitch {
    constructor(ctx, width, height, difficulty) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.difficulty = difficulty;

        // 霓虹色彩（更鲜艳）
        this.colors = ['#ff2d55', '#5ac8fa', '#ffcc00', '#4cd964'];
        this.glowColors = ['rgba(255,45,85,0.5)', 'rgba(90,200,250,0.5)', 'rgba(255,204,0,0.5)', 'rgba(76,217,100,0.5)'];

        // 球
        this.ball = {
            x: width / 2,
            y: height - 100,
            radius: 10,
            vy: 0,
            colorIndex: 0,
            trail: [] // 拖尾效果
        };

        // 物理参数
        this.gravity = 0.35;
        this.jumpPower = -8.5;
        this.maxFallSpeed = 12;

        // 游戏元素
        this.obstacles = [];
        this.stars = [];
        this.colorSwitchers = [];
        this.particles = []; // 粒子效果

        // 背景星星
        this.bgStars = [];
        for (let i = 0; i < 50; i++) {
            this.bgStars.push({
                x: Math.random() * width,
                y: Math.random() * height * 5,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.5 + 0.3
            });
        }

        // 相机
        this.cameraY = 0;
        this.targetCameraY = 0;

        // 游戏状态
        this.score = 0;
        this.bestScore = 0;
        this.isGameOver = false;
        this.started = false;
        this.obstaclesPassed = 0;

        // 动画计时器
        this.animTime = 0;

        this.initLevel();
    }

    /**
     * 初始化关卡
     */
    initLevel() {
        this.obstacles = [];
        this.stars = [];
        this.colorSwitchers = [];
        this.particles = [];

        // 从球的上方开始生成障碍物（球在 height - 100 位置）
        let y = this.height - 220;
        const obstacleTypes = ['ring', 'bar', 'square', 'triangle', 'doublering'];

        // 生成障碍物（更多种类，渐进难度）
        for (let i = 0; i < 30; i++) {
            y -= 120 + Math.random() * 30;
            
            // 随着关卡深入增加难度
            const difficultyBonus = Math.min(i * 0.03, 0.5);
            const baseSpeed = this.difficulty.speed + difficultyBonus;
            
            // 根据进度解锁更多类型
            let maxType = Math.min(2 + Math.floor(i / 5), obstacleTypes.length);
            const typeIndex = Math.floor(Math.random() * maxType);
            const type = obstacleTypes[typeIndex];
            
            if (type === 'ring') {
                this.obstacles.push({
                    type: 'ring',
                    x: this.width / 2,
                    y,
                    radius: 45,
                    thickness: 10,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (0.015 + Math.random() * 0.015) * baseSpeed * (Math.random() > 0.5 ? 1 : -1),
                    passed: false
                });
            } else if (type === 'bar') {
                this.obstacles.push({
                    type: 'bar',
                    x: this.width / 2,
                    y,
                    width: 180,
                    height: 16,
                    moveX: 0,
                    moveRange: 40 + Math.random() * 20,
                    moveSpeed: (0.8 + Math.random() * 0.8) * baseSpeed,
                    passed: false
                });
            } else if (type === 'square') {
                this.obstacles.push({
                    type: 'square',
                    x: this.width / 2,
                    y,
                    size: 70,
                    thickness: 10,
                    rotation: Math.random() * Math.PI / 4,
                    rotSpeed: (0.012 + Math.random() * 0.01) * baseSpeed * (Math.random() > 0.5 ? 1 : -1),
                    passed: false
                });
            } else if (type === 'triangle') {
                this.obstacles.push({
                    type: 'triangle',
                    x: this.width / 2,
                    y,
                    size: 55,
                    thickness: 10,
                    rotation: 0,
                    rotSpeed: (0.018 + Math.random() * 0.012) * baseSpeed * (Math.random() > 0.5 ? 1 : -1),
                    passed: false
                });
            } else if (type === 'doublering') {
                this.obstacles.push({
                    type: 'doublering',
                    x: this.width / 2,
                    y,
                    innerRadius: 30,
                    outerRadius: 55,
                    thickness: 8,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: 0.02 * baseSpeed,
                    rotSpeed2: -0.015 * baseSpeed,
                    passed: false
                });
            }

            // 星星（在障碍物中间）
            this.stars.push({
                x: this.width / 2,
                y: y,
                collected: false,
                scale: 1,
                pulse: Math.random() * Math.PI * 2
            });

            // 颜色切换器（在障碍物之间）
            if (i % 2 === 0 || Math.random() > 0.6) {
                this.colorSwitchers.push({
                    x: this.width / 2,
                    y: y + 65,
                    rotation: 0,
                    collected: false
                });
            }
        }
    }

    /**
     * 更新
     */
    update(deltaTime, keys, keysPressed) {
        this.animTime += deltaTime;

        // 更新粒子
        this.updateParticles(deltaTime);

        if (this.isGameOver) {
            if (keysPressed.a) {
                this.restart();
            }
            return;
        }

        // 开始游戏
        if (!this.started) {
            // 待机动画
            this.ball.y = this.height - 100 + Math.sin(this.animTime * 0.003) * 8;
            
            if (keysPressed.a) {
                this.started = true;
                this.ball.vy = this.jumpPower;
                audio.playSelect();
            }
            return;
        }

        // 跳跃
        if (keysPressed.a) {
            this.ball.vy = this.jumpPower;
            audio.playSelect();
            // 跳跃粒子
            this.spawnJumpParticles();
        }

        // 重力
        this.ball.vy += this.gravity;
        this.ball.vy = Math.min(this.ball.vy, this.maxFallSpeed);
        this.ball.y += this.ball.vy;

        // 更新拖尾
        this.ball.trail.unshift({ x: this.ball.x, y: this.ball.y, alpha: 1 });
        if (this.ball.trail.length > 8) {
            this.ball.trail.pop();
        }
        for (let i = 0; i < this.ball.trail.length; i++) {
            this.ball.trail[i].alpha = 1 - (i / this.ball.trail.length);
        }

        // 相机平滑跟随
        this.targetCameraY = Math.min(0, this.height / 2 - this.ball.y);
        this.cameraY += (this.targetCameraY - this.cameraY) * 0.08;

        // 更新障碍物
        for (const obs of this.obstacles) {
            if (obs.type === 'ring' || obs.type === 'square' || obs.type === 'triangle') {
                obs.rotation += obs.rotSpeed;
            } else if (obs.type === 'doublering') {
                obs.rotation += obs.rotSpeed;
                obs.rotation2 = (obs.rotation2 || 0) + obs.rotSpeed2;
            } else if (obs.type === 'bar') {
                obs.moveX += obs.moveSpeed;
                if (Math.abs(obs.moveX) > obs.moveRange) {
                    obs.moveSpeed *= -1;
                }
            }
            
            // 检查是否通过障碍物
            if (!obs.passed && this.ball.y < obs.y - 30) {
                obs.passed = true;
                this.obstaclesPassed++;
            }
        }

        // 更新颜色切换器
        for (const switcher of this.colorSwitchers) {
            if (!switcher.collected) {
                switcher.rotation += 0.06;
            }
        }

        // 更新星星动画
        for (const star of this.stars) {
            star.pulse += 0.08;
        }

        // 碰撞检测
        this.checkCollisions();

        // 检查掉落
        if (this.ball.y - this.cameraY > this.height + 50) {
            this.gameOver();
        }
    }

    /**
     * 生成跳跃粒子
     */
    spawnJumpParticles() {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: this.ball.x,
                y: this.ball.y + this.ball.radius,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 1,
                radius: Math.random() * 3 + 2,
                color: this.colors[this.ball.colorIndex],
                life: 1
            });
        }
    }

    /**
     * 生成收集粒子
     */
    spawnCollectParticles(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                radius: Math.random() * 3 + 2,
                color: color,
                life: 1
            });
        }
    }

    /**
     * 更新粒子
     */
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // 重力
            p.life -= 0.03;
            p.radius *= 0.96;
            
            if (p.life <= 0 || p.radius < 0.5) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 碰撞检测
     */
    checkCollisions() {
        // 检查星星
        for (const star of this.stars) {
            if (star.collected) continue;
            
            const dist = Math.sqrt(
                Math.pow(this.ball.x - star.x, 2) +
                Math.pow(this.ball.y - star.y, 2)
            );

            if (dist < 22) {
                star.collected = true;
                this.score++;
                this.spawnCollectParticles(star.x, star.y, '#ffffff');
                audio.playEat();
            }
        }

        // 检查颜色切换器
        for (const switcher of this.colorSwitchers) {
            if (switcher.collected) continue;
            
            const dist = Math.sqrt(
                Math.pow(this.ball.x - switcher.x, 2) +
                Math.pow(this.ball.y - switcher.y, 2)
            );

            if (dist < 18) {
                const oldColor = this.colors[this.ball.colorIndex];
                this.ball.colorIndex = (this.ball.colorIndex + 1) % this.colors.length;
                switcher.collected = true;
                this.spawnCollectParticles(switcher.x, switcher.y, this.colors[this.ball.colorIndex]);
                audio.playClear();
            }
        }

        // 检查障碍物碰撞
        for (const obs of this.obstacles) {
            if (Math.abs(this.ball.y - obs.y) > 80) continue;

            if (obs.type === 'ring') {
                this.checkRingCollision(obs);
            } else if (obs.type === 'bar') {
                this.checkBarCollision(obs);
            } else if (obs.type === 'square') {
                this.checkSquareCollision(obs);
            } else if (obs.type === 'triangle') {
                this.checkTriangleCollision(obs);
            } else if (obs.type === 'doublering') {
                this.checkDoubleRingCollision(obs);
            }
        }
    }

    /**
     * 检查圆环碰撞
     */
    checkRingCollision(ring) {
        const dist = Math.sqrt(
            Math.pow(this.ball.x - ring.x, 2) +
            Math.pow(this.ball.y - ring.y, 2)
        );

        const thickness = ring.thickness || 10;
        const innerR = ring.radius - thickness / 2;
        const outerR = ring.radius + thickness / 2;

        // 在圆环区域内
        if (dist > innerR - this.ball.radius && dist < outerR + this.ball.radius) {
            // 计算球在圆环上的角度
            const ballAngle = Math.atan2(this.ball.y - ring.y, this.ball.x - ring.x);
            let adjustedAngle = ballAngle - ring.rotation;
            
            // 标准化角度到 [0, 2π)
            while (adjustedAngle < 0) adjustedAngle += Math.PI * 2;
            while (adjustedAngle >= Math.PI * 2) adjustedAngle -= Math.PI * 2;
            
            // 根据角度确定颜色区域
            const colorIndex = Math.floor(adjustedAngle / (Math.PI / 2)) % 4;

            if (colorIndex !== this.ball.colorIndex) {
                this.gameOver();
            }
        }
    }

    /**
     * 检查横条碰撞
     */
    checkBarCollision(bar) {
        const barX = bar.x + bar.moveX;
        
        if (Math.abs(this.ball.y - bar.y) < bar.height / 2 + this.ball.radius &&
            Math.abs(this.ball.x - barX) < bar.width / 2 + this.ball.radius) {
            
            // 确定碰撞的颜色区域
            const segmentWidth = bar.width / 4;
            const relativeX = this.ball.x - (barX - bar.width / 2);
            let colorIndex = Math.floor(relativeX / segmentWidth);
            colorIndex = Math.max(0, Math.min(3, colorIndex));

            if (colorIndex !== this.ball.colorIndex) {
                this.gameOver();
            }
        }
    }

    /**
     * 检查方块碰撞
     */
    checkSquareCollision(square) {
        // 转换到方块坐标系
        const dx = this.ball.x - square.x;
        const dy = this.ball.y - square.y;
        const cos = Math.cos(-square.rotation);
        const sin = Math.sin(-square.rotation);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        const halfSize = square.size / 2;
        const thickness = square.thickness || 10;

        // 检查四条边
        const edges = [
            { minX: -halfSize, maxX: halfSize, minY: -halfSize - thickness/2, maxY: -halfSize + thickness/2, color: 0 }, // 上
            { minX: halfSize - thickness/2, maxX: halfSize + thickness/2, minY: -halfSize, maxY: halfSize, color: 1 }, // 右
            { minX: -halfSize, maxX: halfSize, minY: halfSize - thickness/2, maxY: halfSize + thickness/2, color: 2 }, // 下
            { minX: -halfSize - thickness/2, maxX: -halfSize + thickness/2, minY: -halfSize, maxY: halfSize, color: 3 }  // 左
        ];

        for (const edge of edges) {
            if (localX > edge.minX - this.ball.radius && localX < edge.maxX + this.ball.radius &&
                localY > edge.minY - this.ball.radius && localY < edge.maxY + this.ball.radius) {
                if (edge.color !== this.ball.colorIndex) {
                    this.gameOver();
                    return;
                }
            }
        }
    }

    /**
     * 检查三角形碰撞
     */
    checkTriangleCollision(tri) {
        const dist = Math.sqrt(
            Math.pow(this.ball.x - tri.x, 2) +
            Math.pow(this.ball.y - tri.y, 2)
        );

        const size = tri.size;
        const thickness = tri.thickness || 10;

        if (dist > size - thickness - this.ball.radius && dist < size + thickness + this.ball.radius) {
            const ballAngle = Math.atan2(this.ball.y - tri.y, this.ball.x - tri.x);
            let adjustedAngle = ballAngle - tri.rotation;
            
            while (adjustedAngle < 0) adjustedAngle += Math.PI * 2;
            while (adjustedAngle >= Math.PI * 2) adjustedAngle -= Math.PI * 2;
            
            // 三角形有3个边，映射到4种颜色
            const sideIndex = Math.floor(adjustedAngle / (Math.PI * 2 / 3));
            const colorIndex = sideIndex % 4;

            if (colorIndex !== this.ball.colorIndex) {
                this.gameOver();
            }
        }
    }

    /**
     * 检查双圆环碰撞
     */
    checkDoubleRingCollision(ring) {
        const dist = Math.sqrt(
            Math.pow(this.ball.x - ring.x, 2) +
            Math.pow(this.ball.y - ring.y, 2)
        );

        const thickness = ring.thickness || 8;

        // 检查内圈
        const innerR = ring.innerRadius;
        if (dist > innerR - thickness/2 - this.ball.radius && dist < innerR + thickness/2 + this.ball.radius) {
            const ballAngle = Math.atan2(this.ball.y - ring.y, this.ball.x - ring.x);
            let adjustedAngle = ballAngle - (ring.rotation2 || 0);
            while (adjustedAngle < 0) adjustedAngle += Math.PI * 2;
            const colorIndex = Math.floor(adjustedAngle / (Math.PI / 2)) % 4;
            if (colorIndex !== this.ball.colorIndex) {
                this.gameOver();
                return;
            }
        }

        // 检查外圈
        const outerR = ring.outerRadius;
        if (dist > outerR - thickness/2 - this.ball.radius && dist < outerR + thickness/2 + this.ball.radius) {
            const ballAngle = Math.atan2(this.ball.y - ring.y, this.ball.x - ring.x);
            let adjustedAngle = ballAngle - ring.rotation;
            while (adjustedAngle < 0) adjustedAngle += Math.PI * 2;
            const colorIndex = Math.floor(adjustedAngle / (Math.PI / 2)) % 4;
            if (colorIndex !== this.ball.colorIndex) {
                this.gameOver();
            }
        }
    }

    /**
     * 游戏结束
     */
    gameOver() {
        this.isGameOver = true;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
        }
        // 死亡粒子效果
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            this.particles.push({
                x: this.ball.x,
                y: this.ball.y,
                vx: Math.cos(angle) * (2 + Math.random() * 3),
                vy: Math.sin(angle) * (2 + Math.random() * 3),
                radius: Math.random() * 4 + 2,
                color: this.colors[this.ball.colorIndex],
                life: 1
            });
        }
        audio.playGameOver();
    }

    /**
     * 重新开始
     */
    restart() {
        this.ball.x = this.width / 2;
        this.ball.y = this.height - 100;
        this.ball.vy = 0;
        this.ball.colorIndex = 0;
        this.ball.trail = [];
        this.score = 0;
        this.cameraY = 0;
        this.targetCameraY = 0;
        this.isGameOver = false;
        this.started = false;
        this.obstaclesPassed = 0;
        this.initLevel();
    }

    /**
     * 渲染
     */
    render() {
        // 深色渐变背景
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        bgGradient.addColorStop(0, '#0f0c29');
        bgGradient.addColorStop(0.5, '#302b63');
        bgGradient.addColorStop(1, '#24243e');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 背景星星
        this.ctx.fillStyle = '#ffffff';
        for (const star of this.bgStars) {
            const screenY = star.y + this.cameraY * 0.3;
            if (screenY > -10 && screenY < this.height + 10) {
                this.ctx.globalAlpha = star.alpha * (0.5 + Math.sin(this.animTime * 0.002 + star.x) * 0.3);
                this.ctx.beginPath();
                this.ctx.arc(star.x, screenY % (this.height + 20), star.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;

        this.ctx.save();
        this.ctx.translate(0, this.cameraY);

        // 颜色切换器
        for (const switcher of this.colorSwitchers) {
            if (!switcher.collected) {
                this.drawColorSwitcher(switcher);
            }
        }

        // 障碍物
        for (const obs of this.obstacles) {
            if (obs.type === 'ring') {
                this.drawRing(obs);
            } else if (obs.type === 'bar') {
                this.drawBar(obs);
            } else if (obs.type === 'square') {
                this.drawSquare(obs);
            } else if (obs.type === 'triangle') {
                this.drawTriangle(obs);
            } else if (obs.type === 'doublering') {
                this.drawDoubleRing(obs);
            }
        }

        // 星星
        for (const star of this.stars) {
            if (!star.collected) {
                this.drawStar(star);
            }
        }

        // 粒子
        this.drawParticles();

        // 球
        if (!this.isGameOver) {
            this.drawBall();
        }

        this.ctx.restore();

        // UI
        this.renderUI();

        // 开始提示
        if (!this.started && !this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            // 标题发光效果
            this.ctx.shadowColor = '#5ac8fa';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 24px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('COLOR SWITCH', this.width / 2, this.height / 2 - 40);
            this.ctx.shadowBlur = 0;

            // 颜色图例
            for (let i = 0; i < 4; i++) {
                this.ctx.fillStyle = this.colors[i];
                this.ctx.beginPath();
                this.ctx.arc(this.width / 2 - 45 + i * 30, this.height / 2, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.fillStyle = '#aaaaaa';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('穿过与球同色的区域', this.width / 2, this.height / 2 + 35);

            // 闪烁提示
            if (Math.floor(this.animTime / 500) % 2) {
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.font = 'bold 16px monospace';
                this.ctx.fillText('按 A 开始', this.width / 2, this.height / 2 + 70);
            }
        }

        // 游戏结束
        if (this.isGameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.shadowColor = '#ff2d55';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#ff2d55';
            this.ctx.font = 'bold 28px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50);
            this.ctx.shadowBlur = 0;

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 36px monospace';
            this.ctx.fillText(`${this.score}`, this.width / 2, this.height / 2 + 5);

            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('SCORE', this.width / 2, this.height / 2 - 20);

            if (this.score >= this.bestScore && this.score > 0) {
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.font = 'bold 14px monospace';
                this.ctx.fillText('★ NEW BEST ★', this.width / 2, this.height / 2 + 35);
            }

            this.ctx.fillStyle = '#666666';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`最高分: ${this.bestScore}`, this.width / 2, this.height / 2 + 60);

            this.ctx.fillStyle = '#aaaaaa';
            this.ctx.font = '14px monospace';
            this.ctx.fillText('按 A 重新开始', this.width / 2, this.height / 2 + 95);
        }
    }

    /**
     * 绘制粒子
     */
    drawParticles() {
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
    }

    /**
     * 绘制圆环
     */
    drawRing(ring) {
        this.ctx.save();
        this.ctx.translate(ring.x, ring.y);
        this.ctx.rotate(ring.rotation);

        const thickness = ring.thickness || 10;
        const arcAngle = Math.PI / 2;
        
        for (let i = 0; i < 4; i++) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ring.radius, i * arcAngle - 0.02, (i + 1) * arcAngle + 0.02);
            this.ctx.lineWidth = thickness;
            this.ctx.lineCap = 'butt';
            this.ctx.strokeStyle = this.colors[i];
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /**
     * 绘制横条
     */
    drawBar(bar) {
        const barX = bar.x + bar.moveX;
        const segmentWidth = bar.width / 4;

        // 圆角效果
        this.ctx.save();
        for (let i = 0; i < 4; i++) {
            this.ctx.fillStyle = this.colors[i];
            const x = barX - bar.width / 2 + i * segmentWidth;
            this.ctx.beginPath();
            if (i === 0) {
                this.ctx.roundRect(x, bar.y - bar.height / 2, segmentWidth, bar.height, [4, 0, 0, 4]);
            } else if (i === 3) {
                this.ctx.roundRect(x, bar.y - bar.height / 2, segmentWidth, bar.height, [0, 4, 4, 0]);
            } else {
                this.ctx.rect(x, bar.y - bar.height / 2, segmentWidth, bar.height);
            }
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    /**
     * 绘制方块
     */
    drawSquare(square) {
        this.ctx.save();
        this.ctx.translate(square.x, square.y);
        this.ctx.rotate(square.rotation);

        const half = square.size / 2;
        const thickness = square.thickness || 10;

        // 四条边
        this.ctx.fillStyle = this.colors[0];
        this.ctx.fillRect(-half, -half, square.size, thickness);
        
        this.ctx.fillStyle = this.colors[1];
        this.ctx.fillRect(half - thickness, -half, thickness, square.size);
        
        this.ctx.fillStyle = this.colors[2];
        this.ctx.fillRect(-half, half - thickness, square.size, thickness);
        
        this.ctx.fillStyle = this.colors[3];
        this.ctx.fillRect(-half, -half, thickness, square.size);

        this.ctx.restore();
    }

    /**
     * 绘制三角形
     */
    drawTriangle(tri) {
        this.ctx.save();
        this.ctx.translate(tri.x, tri.y);
        this.ctx.rotate(tri.rotation);

        const size = tri.size;
        const thickness = tri.thickness || 10;

        // 三角形三条边
        for (let i = 0; i < 3; i++) {
            const angle1 = (i * 2 / 3) * Math.PI - Math.PI / 2;
            const angle2 = ((i + 1) * 2 / 3) * Math.PI - Math.PI / 2;
            
            this.ctx.beginPath();
            this.ctx.moveTo(Math.cos(angle1) * size, Math.sin(angle1) * size);
            this.ctx.lineTo(Math.cos(angle2) * size, Math.sin(angle2) * size);
            this.ctx.lineWidth = thickness;
            this.ctx.lineCap = 'round';
            this.ctx.strokeStyle = this.colors[i % 4];
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /**
     * 绘制双圆环
     */
    drawDoubleRing(ring) {
        this.ctx.save();
        this.ctx.translate(ring.x, ring.y);

        const thickness = ring.thickness || 8;
        const arcAngle = Math.PI / 2;

        // 外圈
        this.ctx.rotate(ring.rotation);
        for (let i = 0; i < 4; i++) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ring.outerRadius, i * arcAngle - 0.02, (i + 1) * arcAngle + 0.02);
            this.ctx.lineWidth = thickness;
            this.ctx.strokeStyle = this.colors[i];
            this.ctx.stroke();
        }

        // 内圈（反向旋转）
        this.ctx.rotate(-ring.rotation + (ring.rotation2 || 0));
        for (let i = 0; i < 4; i++) {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ring.innerRadius, i * arcAngle - 0.02, (i + 1) * arcAngle + 0.02);
            this.ctx.lineWidth = thickness;
            this.ctx.strokeStyle = this.colors[(i + 2) % 4]; // 颜色偏移
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /**
     * 绘制星星
     */
    drawStar(star) {
        const pulse = 0.8 + Math.sin(star.pulse) * 0.2;
        const size = 8 * pulse;

        // 发光效果
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 10;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const x = star.x + Math.cos(angle) * size;
            const y = star.y + Math.sin(angle) * size;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    /**
     * 绘制颜色切换器
     */
    drawColorSwitcher(switcher) {
        this.ctx.save();
        this.ctx.translate(switcher.x, switcher.y);
        this.ctx.rotate(switcher.rotation);

        const radius = 10;
        
        // 发光效果
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 8;
        
        for (let i = 0; i < 4; i++) {
            this.ctx.fillStyle = this.colors[i];
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, i * Math.PI / 2, (i + 1) * Math.PI / 2);
            this.ctx.lineTo(0, 0);
            this.ctx.closePath();
            this.ctx.fill();
        }

        this.ctx.shadowBlur = 0;
        this.ctx.restore();
    }

    /**
     * 绘制球
     */
    drawBall() {
        // 绘制拖尾
        for (let i = this.ball.trail.length - 1; i >= 0; i--) {
            const t = this.ball.trail[i];
            const size = this.ball.radius * (1 - i / this.ball.trail.length) * 0.8;
            this.ctx.globalAlpha = t.alpha * 0.4;
            this.ctx.fillStyle = this.colors[this.ball.colorIndex];
            this.ctx.beginPath();
            this.ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;

        // 发光效果
        this.ctx.shadowColor = this.colors[this.ball.colorIndex];
        this.ctx.shadowBlur = 15;

        // 球体
        this.ctx.fillStyle = this.colors[this.ball.colorIndex];
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x - 3, this.ball.y - 3, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 渲染UI
     */
    renderUI() {
        // 分数（带阴影）
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 4;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.score}`, this.width / 2, 40);
        this.ctx.shadowBlur = 0;

        // 当前颜色指示器
        this.ctx.fillStyle = this.colors[this.ball.colorIndex];
        this.ctx.beginPath();
        this.ctx.arc(this.width - 25, 25, 12, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 难度显示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.difficulty.name, 10, 20);
    }
}

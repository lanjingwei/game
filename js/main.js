/**
 * GameBoy Color 复古掌机游戏主模块
 */
import { audio } from './audio.js';
import { Tetris } from './games/tetris.js';
import { Snake } from './games/snake.js';
import { Racing } from './games/racing.js';
import { Tank } from './games/tank.js';
import { Breakout } from './games/breakout.js';
import { Contra } from './games/contra.js';
import { Mario } from './games/mario.js';
import { SpaceShooter } from './games/spaceshooter.js';
import { Pacman } from './games/pacman.js';
import { Frogger } from './games/frogger.js';
import { Bomberman } from './games/bomberman.js';
import { GoldMiner } from './games/goldminer.js';
import { FlappyBird } from './games/flappybird.js';
import { Game2048 } from './games/game2048.js';
import { Minesweeper } from './games/minesweeper.js';
import { Sokoban } from './games/sokoban.js';
import { SpaceInvaders } from './games/spaceinvaders.js';
import { Mahjong } from './games/mahjong.js';
import { Jumper } from './games/jumper.js';
import { Pinball } from './games/pinball.js';
import { Aircraft } from './games/aircraft.js';
import { Memory } from './games/memory.js';
import { TicTacToe } from './games/tictactoe.js';
import { WhackMole } from './games/whackmole.js';
import { Match3 } from './games/match3.js';
import { Runner } from './games/runner.js';
import { PianoTiles } from './games/pianotiles.js';
import { Sudoku } from './games/sudoku.js';
import { Gomoku } from './games/gomoku.js';
import { Puzzle } from './games/puzzle.js';
import { Basketball } from './games/basketball.js';
import { Typing } from './games/typing.js';
import { FruitCatch } from './games/fruitcatch.js';
import { KnifeHit } from './games/knifehit.js';
import { ColorSwitch } from './games/colorswitch.js';
import { StackTower } from './games/stacktower.js';

// 游戏状态
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    DIFFICULTY: 'difficulty'
};

// 难度设置
const Difficulty = {
    EASY: { name: '简单', speed: 0.7, label: 'EASY' },
    NORMAL: { name: '普通', speed: 1.0, label: 'NORMAL' },
    HARD: { name: '困难', speed: 1.5, label: 'HARD' }
};

// 游戏列表
const gameList = [
    { id: 'tetris', name: '俄罗斯方块', Game: Tetris, icon: '▦' },
    { id: 'snake', name: '贪吃蛇', Game: Snake, icon: '◐' },
    { id: 'racing', name: '极速赛车', Game: Racing, icon: '▲' },
    { id: 'tank', name: '坦克大战', Game: Tank, icon: '◈' },
    { id: 'breakout', name: '打砖块', Game: Breakout, icon: '▬' },
    { id: 'contra', name: '魂斗罗', Game: Contra, icon: '⚔' },
    { id: 'mario', name: '超级玛丽', Game: Mario, icon: '★' },
    { id: 'spaceshooter', name: '太空战机', Game: SpaceShooter, icon: '✈' },
    { id: 'pacman', name: '吃豆人', Game: Pacman, icon: '◔' },
    { id: 'frogger', name: '青蛙过河', Game: Frogger, icon: '✿' },
    { id: 'bomberman', name: '炸弹人', Game: Bomberman, icon: '◉' },
    { id: 'goldminer', name: '黄金矿工', Game: GoldMiner, icon: '♦' },
    { id: 'flappybird', name: 'Flappy Bird', Game: FlappyBird, icon: '❧' },
    { id: 'game2048', name: '2048', Game: Game2048, icon: '▣' },
    { id: 'minesweeper', name: '扫雷', Game: Minesweeper, icon: '✹' },
    { id: 'sokoban', name: '推箱子', Game: Sokoban, icon: '▨' },
    { id: 'spaceinvaders', name: '太空侵略者', Game: SpaceInvaders, icon: '▓' },
    { id: 'mahjong', name: '连连看', Game: Mahjong, icon: '♣' },
    { id: 'jumper', name: '跳一跳', Game: Jumper, icon: '↑' },
    { id: 'pinball', name: '弹珠台', Game: Pinball, icon: '●' },
    { id: 'aircraft', name: '飞机大战', Game: Aircraft, icon: '✈' },
    { id: 'memory', name: '记忆翻牌', Game: Memory, icon: '♣' },
    { id: 'tictactoe', name: '井字棋', Game: TicTacToe, icon: '╳' },
    { id: 'whackmole', name: '打地鼠', Game: WhackMole, icon: '◕' },
    { id: 'match3', name: '消消乐', Game: Match3, icon: '◇' },
    { id: 'runner', name: '跑酷', Game: Runner, icon: '→' },
    { id: 'pianotiles', name: '钢琴块', Game: PianoTiles, icon: '♫' },
    { id: 'sudoku', name: '数独', Game: Sudoku, icon: '▤' },
    { id: 'gomoku', name: '五子棋', Game: Gomoku, icon: '○' },
    { id: 'puzzle', name: '拼图', Game: Puzzle, icon: '▧' },
    { id: 'basketball', name: '投篮', Game: Basketball, icon: '◔' },
    { id: 'typing', name: '打字游戏', Game: Typing, icon: '⌨' },
    { id: 'fruitcatch', name: '接水果', Game: FruitCatch, icon: '✿' },
    { id: 'knifehit', name: '飞刀挑战', Game: KnifeHit, icon: '†' },
    { id: 'colorswitch', name: '颜色切换', Game: ColorSwitch, icon: '◎' },
    { id: 'stacktower', name: '堆叠塔', Game: StackTower, icon: '▥' }
];

// 主应用类
class GameBoyApp {
    constructor() {
        // 画布设置
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 320;
        this.height = 288;
        
        // 禁用抗锯齿，保持像素清晰
        this.ctx.imageSmoothingEnabled = false;

        // 状态
        this.state = GameState.MENU;
        this.currentGame = null;
        this.selectedIndex = 0;
        this.difficultyIndex = 1;
        this.difficulty = Difficulty.NORMAL;
        this.highScores = this.loadHighScores();

        // 输入状态
        this.keys = {
            up: false, down: false, left: false, right: false,
            a: false, b: false, start: false, select: false,
            l: false, r: false
        };
        this.keysPressed = {}; // 用于检测按键是否刚被按下

        // 动画
        this.lastTime = 0;
        this.menuAnimation = 0;

        // 初始化
        this.init();
    }

    init() {
        this.setupControls();
        this.setupColorPicker();
        
        // 启动游戏循环
        requestAnimationFrame(this.gameLoop.bind(this));
        
        // 开启电源灯
        document.getElementById('power-led').classList.add('on');
    }

    /**
     * 设置控制
     */
    setupControls() {
        // 键盘映射
        const keyMap = {
            'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
            'w': 'up', 's': 'down', 'a': 'left', 'd': 'right',
            'z': 'a', 'Z': 'a', 'x': 'b', 'X': 'b',
            'Enter': 'start', 'Shift': 'select',
            'q': 'l', 'Q': 'l', 'e': 'r', 'E': 'r'
        };

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            const key = keyMap[e.key];
            if (key) {
                e.preventDefault();
                if (!this.keys[key]) {
                    this.keysPressed[key] = true;
                }
                this.keys[key] = true;
                this.highlightButton(key, true);
                this.initAudio();
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = keyMap[e.key];
            if (key) {
                this.keys[key] = false;
                this.highlightButton(key, false);
            }
        });

        // 触摸/鼠标控制
        const buttons = document.querySelectorAll('[data-key]');
        buttons.forEach(btn => {
            const key = btn.dataset.key;

            // 触摸开始
            const startHandler = (e) => {
                e.preventDefault();
                if (!this.keys[key]) {
                    this.keysPressed[key] = true;
                }
                this.keys[key] = true;
                btn.classList.add('pressed');
                this.initAudio();
            };

            // 触摸结束
            const endHandler = (e) => {
                e.preventDefault();
                this.keys[key] = false;
                btn.classList.remove('pressed');
            };

            btn.addEventListener('mousedown', startHandler);
            btn.addEventListener('mouseup', endHandler);
            btn.addEventListener('mouseleave', endHandler);
            btn.addEventListener('touchstart', startHandler, { passive: false });
            btn.addEventListener('touchend', endHandler, { passive: false });
        });
    }

    /**
     * 高亮按钮
     */
    highlightButton(key, pressed) {
        const btnMap = {
            'up': 'btn-up', 'down': 'btn-down', 'left': 'btn-left', 'right': 'btn-right',
            'a': 'btn-a', 'b': 'btn-b', 'start': 'btn-start', 'select': 'btn-select',
            'l': 'btn-l', 'r': 'btn-r'
        };
        const btnId = btnMap[key];
        if (btnId) {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.classList.toggle('pressed', pressed);
            }
        }
    }

    /**
     * 初始化音频（需要用户交互）
     */
    initAudio() {
        if (!audio.initialized) {
            audio.init();
        }
        audio.resume();
    }

    /**
     * 设置配色选择器
     */
    setupColorPicker() {
        const colorOptions = document.querySelectorAll('.color-option');
        const gameboy = document.getElementById('gameboy');

        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                colorOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');

                // 移除所有配色类
                gameboy.classList.remove('purple', 'gray', 'lime', 'berry', 'teal');
                
                // 添加新配色类（purple 是默认，不需要添加类）
                const color = option.dataset.color;
                if (color !== 'purple') {
                    gameboy.classList.add(color);
                }

                audio.playSelect();
            });
        });
    }

    /**
     * 加载最高分
     */
    loadHighScores() {
        try {
            const saved = localStorage.getItem('gbcHighScores');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    }

    /**
     * 保存最高分
     */
    saveHighScore(gameId, score) {
        const key = `${gameId}_${this.difficulty.label}`;
        if (!this.highScores[key] || score > this.highScores[key]) {
            this.highScores[key] = score;
            try {
                localStorage.setItem('gbcHighScores', JSON.stringify(this.highScores));
            } catch {}
        }
    }

    /**
     * 获取最高分
     */
    getHighScore(gameId) {
        const key = `${gameId}_${this.difficulty.label}`;
        return this.highScores[key] || 0;
    }

    /**
     * 游戏循环
     */
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render();

        // 清除按键按下状态
        this.keysPressed = {};

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * 更新逻辑
     */
    update(deltaTime) {
        this.menuAnimation += deltaTime * 0.003;

        switch (this.state) {
            case GameState.MENU:
                this.updateMenu();
                break;
            case GameState.DIFFICULTY:
                this.updateDifficulty();
                break;
            case GameState.PLAYING:
                if (this.currentGame) {
                    this.currentGame.update(deltaTime, this.keys, this.keysPressed);
                    if (this.currentGame.isGameOver) {
                        this.saveHighScore(gameList[this.selectedIndex].id, this.currentGame.score);
                        this.state = GameState.GAME_OVER;
                        audio.playGameOver();
                    }
                }
                // 暂停
                if (this.keysPressed.start) {
                    this.state = GameState.PAUSED;
                    audio.playSelect();
                }
                break;
            case GameState.PAUSED:
                if (this.keysPressed.start) {
                    this.state = GameState.PLAYING;
                    audio.playSelect();
                }
                if (this.keysPressed.b) {
                    this.backToMenu();
                }
                break;
            case GameState.GAME_OVER:
                if (this.keysPressed.start || this.keysPressed.a) {
                    this.startGame();
                }
                if (this.keysPressed.b) {
                    this.backToMenu();
                }
                break;
        }
    }

    /**
     * 更新菜单
     */
    updateMenu() {
        if (this.keysPressed.up) {
            this.selectedIndex = (this.selectedIndex - 1 + gameList.length) % gameList.length;
            audio.playSelect();
        }
        if (this.keysPressed.down) {
            this.selectedIndex = (this.selectedIndex + 1) % gameList.length;
            audio.playSelect();
        }
        if (this.keysPressed.a || this.keysPressed.start) {
            this.state = GameState.DIFFICULTY;
            audio.playConfirm();
        }
        // L/R 快速切换
        if (this.keysPressed.l) {
            this.selectedIndex = 0;
            audio.playSelect();
        }
        if (this.keysPressed.r) {
            this.selectedIndex = gameList.length - 1;
            audio.playSelect();
        }
    }

    /**
     * 更新难度选择
     */
    updateDifficulty() {
        const difficulties = Object.values(Difficulty);
        if (this.keysPressed.left) {
            this.difficultyIndex = (this.difficultyIndex - 1 + difficulties.length) % difficulties.length;
            this.difficulty = difficulties[this.difficultyIndex];
            audio.playSelect();
        }
        if (this.keysPressed.right) {
            this.difficultyIndex = (this.difficultyIndex + 1) % difficulties.length;
            this.difficulty = difficulties[this.difficultyIndex];
            audio.playSelect();
        }
        if (this.keysPressed.a || this.keysPressed.start) {
            this.startGame();
            audio.playConfirm();
        }
        if (this.keysPressed.b) {
            this.state = GameState.MENU;
            audio.playSelect();
        }
    }

    /**
     * 开始游戏
     */
    startGame() {
        const gameInfo = gameList[this.selectedIndex];
        this.currentGame = new gameInfo.Game(this.ctx, this.width, this.height, this.difficulty);
        this.state = GameState.PLAYING;
    }

    /**
     * 返回菜单
     */
    backToMenu() {
        if (this.currentGame && this.currentGame.cleanup) {
            this.currentGame.cleanup();
        }
        this.currentGame = null;
        this.state = GameState.MENU;
        audio.playSelect();
    }

    /**
     * 渲染
     */
    render() {
        // 清屏
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);

        switch (this.state) {
            case GameState.MENU:
                this.renderMenu();
                break;
            case GameState.DIFFICULTY:
                this.renderDifficulty();
                break;
            case GameState.PLAYING:
                if (this.currentGame) {
                    this.currentGame.render();
                }
                break;
            case GameState.PAUSED:
                if (this.currentGame) {
                    this.currentGame.render();
                }
                this.renderPaused();
                break;
            case GameState.GAME_OVER:
                if (this.currentGame) {
                    this.currentGame.render();
                }
                this.renderGameOver();
                break;
        }
    }

    /**
     * 渲染主菜单
     */
    renderMenu() {
        // 背景渐变
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(1, '#0a0a1e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 装饰性动画背景
        this.ctx.fillStyle = 'rgba(100, 100, 200, 0.1)';
        for (let i = 0; i < 5; i++) {
            const x = Math.sin(this.menuAnimation + i * 1.5) * 60 + 160;
            const y = (this.menuAnimation * 20 + i * 80) % 360 - 40;
            this.ctx.fillRect(x - 10, y, 20, 20);
        }

        // 标题
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME SELECT', this.width / 2, 25);

        // 游戏列表（滚动显示）
        const itemHeight = 30;
        const visibleItems = 7;
        const startY = 50;
        
        // 计算滚动偏移
        let scrollOffset = 0;
        if (this.selectedIndex >= visibleItems - 2) {
            scrollOffset = Math.min(this.selectedIndex - (visibleItems - 3), gameList.length - visibleItems);
        }
        scrollOffset = Math.max(0, scrollOffset);

        // 裁剪区域
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, startY - 15, this.width, visibleItems * itemHeight + 10);
        this.ctx.clip();

        gameList.forEach((game, index) => {
            const displayIndex = index - scrollOffset;
            const y = startY + displayIndex * itemHeight;
            
            // 只渲染可见项
            if (displayIndex < 0 || displayIndex >= visibleItems + 1) return;
            
            const isSelected = index === this.selectedIndex;

            // 选中背景
            if (isSelected) {
                const pulse = Math.sin(this.menuAnimation * 3) * 0.2 + 0.8;
                this.ctx.fillStyle = `rgba(100, 150, 255, ${pulse * 0.3})`;
                this.ctx.fillRect(15, y - 12, this.width - 30, 28);
                
                // 选中指示器
                this.ctx.fillStyle = '#ff6b6b';
                this.ctx.font = '14px monospace';
                this.ctx.textAlign = 'left';
                this.ctx.fillText('▶', 22, y + 5);
            }

            // 图标
            this.ctx.fillStyle = isSelected ? '#ffffff' : '#888888';
            this.ctx.font = '16px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(game.icon, 45, y + 5);

            // 游戏名
            this.ctx.fillStyle = isSelected ? '#ffffff' : '#aaaaaa';
            this.ctx.font = isSelected ? 'bold 14px monospace' : '14px monospace';
            this.ctx.fillText(game.name, 75, y + 5);
            
            // 序号
            this.ctx.fillStyle = isSelected ? '#ffcc00' : '#555555';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${index + 1}`, this.width - 20, y + 4);
        });
        
        this.ctx.restore();

        // 滚动指示器
        if (scrollOffset > 0) {
            this.ctx.fillStyle = '#888888';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('▲', this.width / 2, startY - 5);
        }
        if (scrollOffset < gameList.length - visibleItems) {
            this.ctx.fillStyle = '#888888';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('▼', this.width / 2, startY + visibleItems * itemHeight + 5);
        }

        // 底部提示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('↑↓选择  A确认  L/R快速切换', this.width / 2, this.height - 8);
    }

    /**
     * 渲染难度选择
     */
    renderDifficulty() {
        // 背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#1e3a5f');
        gradient.addColorStop(1, '#0a1628');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 游戏名
        const game = gameList[this.selectedIndex];
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = 'bold 20px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(game.name, this.width / 2, 50);

        // 难度标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px monospace';
        this.ctx.fillText('选择难度', this.width / 2, 95);

        // 难度选项
        const difficulties = Object.values(Difficulty);
        const boxWidth = 90;
        const startX = (this.width - boxWidth * 3 - 20) / 2;

        difficulties.forEach((diff, index) => {
            const x = startX + index * (boxWidth + 10);
            const y = 120;
            const isSelected = index === this.difficultyIndex;

            // 框
            this.ctx.strokeStyle = isSelected ? '#ffcc00' : '#444444';
            this.ctx.lineWidth = isSelected ? 3 : 1;
            this.ctx.strokeRect(x, y, boxWidth, 50);

            if (isSelected) {
                this.ctx.fillStyle = 'rgba(255, 204, 0, 0.2)';
                this.ctx.fillRect(x, y, boxWidth, 50);
            }

            // 文字
            this.ctx.fillStyle = isSelected ? '#ffffff' : '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(diff.name, x + boxWidth / 2, y + 32);
        });

        // 最高分
        const highScore = this.getHighScore(game.id);
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`最高分: ${highScore}`, this.width / 2, 210);

        // 底部提示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('←→选择  A开始  B返回', this.width / 2, this.height - 15);
    }

    /**
     * 渲染暂停界面
     */
    renderPaused() {
        // 半透明遮罩
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 暂停框
        this.ctx.fillStyle = '#2a2a4a';
        this.ctx.fillRect(60, 100, 200, 90);
        this.ctx.strokeStyle = '#ffcc00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(60, 100, 200, 90);

        // 文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.width / 2, 140);

        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('START继续  B退出', this.width / 2, 175);
    }

    /**
     * 渲染游戏结束界面
     */
    renderGameOver() {
        // 半透明遮罩
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 游戏结束框
        this.ctx.fillStyle = '#3a1a1a';
        this.ctx.fillRect(40, 70, 240, 150);
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(40, 70, 240, 150);

        // GAME OVER
        this.ctx.fillStyle = '#ff4444';
        this.ctx.font = 'bold 28px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.width / 2, 110);

        // 分数
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '18px monospace';
        this.ctx.fillText(`得分: ${this.currentGame?.score || 0}`, this.width / 2, 150);

        // 最高分
        const gameId = gameList[this.selectedIndex].id;
        const highScore = this.getHighScore(gameId);
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = '16px monospace';
        this.ctx.fillText(`最高: ${highScore}`, this.width / 2, 180);

        // 提示
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('A重玩  B返回菜单', this.width / 2, 210);
    }
}

// 标记ES模块已加载
window.gameBoyAppLoaded = true;

// 启动应用
window.addEventListener('DOMContentLoaded', () => {
    new GameBoyApp();
});

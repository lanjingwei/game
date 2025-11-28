/**
 * 8-bit 音效系统
 * 使用 Web Audio API 合成复古游戏音效
 */
export class AudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
        this.initialized = false;
    }

    /**
     * 初始化音频上下文（需要用户交互后调用）
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API 不可用:', e);
            this.enabled = false;
        }
    }

    /**
     * 恢复音频上下文
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * 创建振荡器
     */
    createOscillator(type, frequency, duration, volume = this.volume) {
        if (!this.ctx || !this.enabled) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);

        return osc;
    }

    /**
     * 播放方波音符
     */
    playSquare(frequency, duration = 0.1) {
        this.createOscillator('square', frequency, duration);
    }

    /**
     * 移动音效
     */
    playMove() {
        this.playSquare(200, 0.05);
    }

    /**
     * 旋转音效
     */
    playRotate() {
        this.playSquare(400, 0.08);
    }

    /**
     * 放置/确认音效
     */
    playDrop() {
        if (!this.ctx || !this.enabled) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    /**
     * 消行/得分音效
     */
    playClear() {
        if (!this.ctx || !this.enabled) return;

        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playSquare(freq, 0.1);
            }, i * 50);
        });
    }

    /**
     * 吃食物音效
     */
    playEat() {
        if (!this.ctx || !this.enabled) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    /**
     * 爆炸音效
     */
    playExplosion() {
        if (!this.ctx || !this.enabled) return;

        // 白噪声爆炸
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.8, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }

    /**
     * 射击音效
     */
    playShoot() {
        if (!this.ctx || !this.enabled) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    /**
     * 碰撞音效
     */
    playHit() {
        if (!this.ctx || !this.enabled) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    /**
     * 弹跳音效
     */
    playBounce() {
        if (!this.ctx || !this.enabled) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(this.volume * 0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    /**
     * 砖块破碎音效
     */
    playBreak() {
        if (!this.ctx || !this.enabled) return;

        const frequencies = [523, 659, 784];
        frequencies.forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.value = freq;

                gain.gain.setValueAtTime(this.volume * 0.3, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + 0.05);
            }, i * 20);
        });
    }

    /**
     * 菜单选择音效
     */
    playSelect() {
        this.playSquare(440, 0.08);
    }

    /**
     * 菜单确认音效
     */
    playConfirm() {
        if (!this.ctx || !this.enabled) return;

        const notes = [440, 554, 659];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playSquare(freq, 0.1);
            }, i * 80);
        });
    }

    /**
     * 游戏结束音效
     */
    playGameOver() {
        if (!this.ctx || !this.enabled) return;

        const notes = [392, 330, 262, 196]; // G4, E4, C4, G3
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playSquare(freq, 0.25);
            }, i * 200);
        });
    }

    /**
     * 升级/过关音效
     */
    playLevelUp() {
        if (!this.ctx || !this.enabled) return;

        const notes = [262, 330, 392, 523, 659, 784]; // C4 to G5
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playSquare(freq, 0.12);
            }, i * 60);
        });
    }

    /**
     * 引擎声音（用于赛车游戏）
     */
    startEngine() {
        if (!this.ctx || !this.enabled || this.engineOsc) return;

        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();

        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 80;

        this.engineGain.gain.value = this.volume * 0.15;

        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc.start();
    }

    /**
     * 更新引擎转速
     */
    updateEngine(speed) {
        if (this.engineOsc) {
            this.engineOsc.frequency.value = 60 + speed * 2;
        }
    }

    /**
     * 停止引擎声音
     */
    stopEngine() {
        if (this.engineOsc) {
            this.engineOsc.stop();
            this.engineOsc = null;
            this.engineGain = null;
        }
    }

    /**
     * 设置音量
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    /**
     * 切换静音
     */
    toggleMute() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// 单例导出
export const audio = new AudioSystem();

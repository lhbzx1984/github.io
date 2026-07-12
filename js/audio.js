/* ============================================
   STAR DEFENSE - Audio System
   Web Audio API synthesized sci-fi sounds
   ============================================ */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.bgmVolume = 0.3;
        this.sfxVolume = 0.5;
        this.currentBGM = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = this.bgmVolume;
            this.bgmGain.connect(this.masterGain);
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            this.initialized = true;
        } catch (e) {
            console.warn('Audio init failed:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setBGMVolume(v) {
        this.bgmVolume = v;
        if (this.bgmGain) this.bgmGain.gain.value = v;
    }

    setSFXVolume(v) {
        this.sfxVolume = v;
        if (this.sfxGain) this.sfxGain.gain.value = v;
    }

    // --- Sound Effects ---

    playShoot() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playEnemyShoot() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playExplosion() {
        if (!this.initialized) return;
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        source.start();
    }

    playBigExplosion() {
        if (!this.initialized) return;
        const bufferSize = this.ctx.sampleRate * 0.6;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5) * (1 + Math.sin(t * 30) * 0.3);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.6);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        source.start();
    }

    playPowerUp() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playHit() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playBossWarning() {
        if (!this.initialized) return;
        for (let i = 0; i < 3; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            const t = this.ctx.currentTime + i * 0.3;
            osc.frequency.setValueAtTime(220, t);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.25);
        }
    }

    playLevelUp() {
        if (!this.initialized) return;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const t = this.ctx.currentTime + i * 0.12;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.2);
        });
    }

    playMenuClick() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    // --- Background Music (procedural) ---

    startBGM(type) {
        if (!this.initialized) return;
        this.stopBGM();
        if (type === 'menu') this._playMenuBGM();
        else if (type === 'game') this._playGameBGM();
        else if (type === 'boss') this._playBossBGM();
    }

    stopBGM() {
        if (this.currentBGM) {
            try { this.currentBGM.stop(); } catch (e) {}
            this.currentBGM = null;
        }
    }

    _playMenuBGM() {
        const notes = [130.81, 146.83, 164.81, 174.61, 196, 220, 246.94, 261.63];
        const bassNotes = [65.41, 73.42, 82.41, 87.31];
        let noteIndex = 0;
        let time = this.ctx.currentTime;

        const playNote = () => {
            if (!this.currentBGM) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const freq = notes[noteIndex % notes.length];
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.06, time + 0.1);
            gain.gain.linearRampToValueAtTime(0.03, time + 0.4);
            gain.gain.linearRampToValueAtTime(0, time + 0.5);
            osc.connect(gain);
            gain.connect(this.bgmGain);
            osc.start(time);
            osc.stop(time + 0.5);

            // Bass
            if (noteIndex % 4 === 0) {
                const bass = this.ctx.createOscillator();
                const bg = this.ctx.createGain();
                bass.type = 'triangle';
                bass.frequency.setValueAtTime(bassNotes[(noteIndex / 4) % bassNotes.length], time);
                bg.gain.setValueAtTime(0, time);
                bg.gain.linearRampToValueAtTime(0.08, time + 0.1);
                bg.gain.linearRampToValueAtTime(0, time + 1.0);
                bass.connect(bg);
                bg.connect(this.bgmGain);
                bass.start(time);
                bass.stop(time + 1.0);
            }

            noteIndex++;
            time += 0.5;
            this._bgmTimer = setTimeout(playNote, 480);
        };

        this.currentBGM = { stop: () => { clearTimeout(this._bgmTimer); } };
        playNote();
    }

    _playGameBGM() {
        // Faster, more intense
        const notes = [220, 246.94, 261.63, 329.63, 293.66, 349.23, 392, 440];
        let noteIndex = 0;
        let time = this.ctx.currentTime;

        const playNote = () => {
            if (!this.currentBGM) return;
            // Lead
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            const freq = notes[noteIndex % notes.length];
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.04, time + 0.02);
            gain.gain.linearRampToValueAtTime(0.02, time + 0.15);
            gain.gain.linearRampToValueAtTime(0, time + 0.2);
            osc.connect(gain);
            gain.connect(this.bgmGain);
            osc.start(time);
            osc.stop(time + 0.2);

            // Kick
            if (noteIndex % 2 === 0) {
                const kick = this.ctx.createOscillator();
                const kg = this.ctx.createGain();
                kick.type = 'sine';
                kick.frequency.setValueAtTime(150, time);
                kick.frequency.exponentialRampToValueAtTime(40, time + 0.1);
                kg.gain.setValueAtTime(0.12, time);
                kg.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
                kick.connect(kg);
                kg.connect(this.bgmGain);
                kick.start(time);
                kick.stop(time + 0.12);
            }

            noteIndex++;
            time += 0.18;
            this._bgmTimer = setTimeout(playNote, 170);
        };

        this.currentBGM = { stop: () => { clearTimeout(this._bgmTimer); } };
        playNote();
    }

    _playBossBGM() {
        // Dark, heavy
        const notes = [110, 0, 116.54, 0, 130.81, 0, 98, 0, 110, 0, 87.31, 0, 116.54, 0, 130.81, 0];
        let noteIndex = 0;
        let time = this.ctx.currentTime;

        const playNote = () => {
            if (!this.currentBGM) return;
            const freq = notes[noteIndex % notes.length];
            if (freq > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, time);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.06, time + 0.05);
                gain.gain.linearRampToValueAtTime(0.03, time + 0.3);
                gain.gain.linearRampToValueAtTime(0, time + 0.4);
                osc.connect(gain);
                gain.connect(this.bgmGain);
                osc.start(time);
                osc.stop(time + 0.4);

                // Sub bass
                const sub = this.ctx.createOscillator();
                const sg = this.ctx.createGain();
                sub.type = 'sine';
                sub.frequency.setValueAtTime(freq / 2, time);
                sg.gain.setValueAtTime(0.1, time);
                sg.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
                sub.connect(sg);
                sg.connect(this.bgmGain);
                sub.start(time);
                sub.stop(time + 0.3);
            }

            // Constant tension pad
            if (noteIndex % 8 === 0) {
                const pad = this.ctx.createOscillator();
                const pg = this.ctx.createGain();
                pad.type = 'sawtooth';
                pad.frequency.setValueAtTime(55, time);
                pg.gain.setValueAtTime(0, time);
                pg.gain.linearRampToValueAtTime(0.04, time + 0.5);
                pg.gain.linearRampToValueAtTime(0, time + 2.0);
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 300;
                filter.Q.value = 5;
                pad.connect(filter);
                filter.connect(pg);
                pg.connect(this.bgmGain);
                pad.start(time);
                pad.stop(time + 2.0);
            }

            noteIndex++;
            time += 0.22;
            this._bgmTimer = setTimeout(playNote, 210);
        };

        this.currentBGM = { stop: () => { clearTimeout(this._bgmTimer); } };
        playNote();
    }
}

const audio = new AudioManager();
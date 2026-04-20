// src/trailmusic.js

export class TrailMusic {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        
        // --- THE MASTER BUS & ACOUSTIC SPACE ---
        this.masterGain = this.ctx?.createGain();
        this.compressor = this.ctx?.createDynamicsCompressor();
        this.delayNode = this.ctx?.createDelay();
        this.delayFeedback = this.ctx?.createGain();
        this.filterNode = this.ctx?.createBiquadFilter();
        
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.value = 0.4; 
            
            // Analog Warmth Filter
            this.filterNode.type = 'lowpass';
            this.filterNode.frequency.value = 6000;

            // Canyon Echo (Slapback)
            this.delayNode.delayTime.value = 0.35; 
            this.delayFeedback.gain.value = 0.25; 
            
            // Routing
            this.delayNode.connect(this.delayFeedback);
            this.delayFeedback.connect(this.delayNode);
            this.delayNode.connect(this.filterNode);
            
            this.masterGain.connect(this.filterNode);
            this.masterGain.connect(this.delayNode);
            
            this.filterNode.connect(this.compressor);
            this.compressor.connect(this.ctx.destination);

            this.initWindEngine();
        }

        this.isPlaying = false;
        this.currentMood = null;
        this.tempo = 90; 
        this.nextNoteTime = 0;
        this.current16thNote = 0;
        this.measure = 0;
        this.timerID = null;

        // --- MUSICAL SCALES ---
        this.scales = {
            c_major: [60, 62, 64, 65, 67, 69, 71, 72], 
            d_minor: [62, 64, 65, 67, 69, 70, 72, 74], 
            g_blues: [55, 58, 60, 61, 62, 65, 67],     
            e_minor: [52, 55, 57, 59, 62, 64, 67]      
        };
    }

    mtof(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // ==========================================
    // 1. THE INSTRUMENTS 
    // ==========================================

    playFiddle(midiNote, time, duration, velocity = 1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator(); 
        const lfoGain = this.ctx.createGain();

        osc.type = 'sawtooth'; 
        osc.frequency.value = this.mtof(midiNote);

        lfo.type = 'sine';
        lfo.frequency.value = 5.5; 
        lfoGain.gain.setValueAtTime(0, time);
        lfoGain.gain.linearRampToValueAtTime(6, time + 0.2); 
        lfo.connect(lfoGain).connect(osc.frequency);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2 * velocity, time + 0.15);
        gain.gain.setValueAtTime(0.2 * velocity, time + duration - 0.1);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(gain).connect(this.masterGain);
        osc.start(time); lfo.start(time);
        osc.stop(time + duration); lfo.stop(time + duration);
    }

    playBanjo(freq, time, isSfx = false) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'square'; 
        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(5000, time);
        filter.frequency.exponentialRampToValueAtTime(300, time + (isSfx ? 0.5 : 0.2));

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(isSfx ? 0.6 : 0.25, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (isSfx ? 0.8 : 0.4));

        osc.connect(filter).connect(gain).connect(this.masterGain);
        osc.start(time); osc.stop(time + 1);

        if (isSfx) this.playNoiseBurst(time, 0.4, 2000);
    }

    playPumpOrgan(midiChord, time, duration) {
        if (!this.ctx) return;
        midiChord.forEach(note => {
            const osc = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator(); 
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc2.type = 'triangle';
            osc.frequency.value = this.mtof(note);
            osc2.frequency.value = this.mtof(note) + 1.5; 

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.1, time + 0.5); 
            gain.gain.linearRampToValueAtTime(0, time + duration);

            osc.connect(gain).connect(this.masterGain);
            osc2.connect(gain).connect(this.masterGain);
            osc.start(time); osc2.start(time);
            osc.stop(time + duration); osc2.stop(time + duration);
        });
    }

    playPercussion(time, type) {
        if (!this.ctx) return;
        if (type === 'kick') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(120, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3); 
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
            osc.connect(gain).connect(this.masterGain);
            osc.start(time); osc.stop(time + 0.3);
        } else if (type === 'clop') {
            this.playNoiseBurst(time, 0.05, 800);
        }
    }

    playNoiseBurst(time, duration, freq) {
        const bufferSize = this.ctx.sampleRate * duration; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        noise.connect(filter).connect(gain).connect(this.masterGain);
        noise.start(time);
    }

    // ==========================================
    // 2. CINEMATIC SOUND EFFECTS (RENAMED TO PREVENT CRASHES)
    // ==========================================
    
    playShootSFX(time) {
        this.playBanjo(880, time, true); // Western Ricochet!
    }

    playHitSFX(time) {
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(80, time);
        osc.frequency.exponentialRampToValueAtTime(10, time + 0.8); // Sub-Drop
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.8);
        osc.connect(gain).connect(this.masterGain);
        osc.start(time); osc.stop(time + 0.8);
        this.playNoiseBurst(time, 0.4, 200); // Thud
    }

    playSplashSFX(time) {
        this.playNoiseBurst(time, 0.6, 1500); // White water crash
        this.playNoiseBurst(time + 0.1, 0.4, 800); 
    }

    // ==========================================
    // 3. THE AMBIENT WEATHER ENGINE
    // ==========================================
    initWindEngine() {
        const bufferSize = this.ctx.sampleRate * 3; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        this.windNoise = this.ctx.createBufferSource();
        this.windNoise.buffer = buffer;
        this.windNoise.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'lowpass';
        
        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0; 

        this.windNoise.connect(this.windFilter).connect(this.windGain).connect(this.masterGain);
        this.windNoise.start();
    }

    // ==========================================
    // 4. THE ALGORITHMIC SEQUENCER
    // ==========================================

    scheduleNote(step, time) {
        const secondsPerBeat = 60.0 / this.tempo;
        const sixteenthTime = secondsPerBeat / 4;

        if (this.currentMood === 'main_menu') {
            this.tempo = 70;
            if (step === 0 && this.measure % 2 === 0) this.playPumpOrgan([48, 52, 55], time, secondsPerBeat * 8); 
            if (step === 0 && this.measure % 2 === 1) this.playPumpOrgan([41, 45, 48], time, secondsPerBeat * 8); 
            
            const scale = this.scales.c_major;
            if (Math.random() > 0.7 && step % 4 === 0) {
                this.playFiddle(scale[Math.floor(Math.random() * scale.length)], time, secondsPerBeat * 2, 0.6);
            }
        }
        
        else if (this.currentMood === 'travel_fair') {
            this.tempo = 90;
            if (step % 4 === 0) this.playPercussion(time, 'kick');
            if (step % 4 === 2) this.playPercussion(time, 'clop');
            
            if (step % 8 === 0) this.playBanjo(this.mtof(36), time); 
            if (step % 8 === 4) this.playBanjo(this.mtof(43), time); 

            const scale = this.scales.c_major;
            if (Math.random() > 0.5 && step % 2 === 0) {
                this.playFiddle(scale[Math.floor(Math.random() * scale.length)], time, sixteenthTime * 2, 0.4);
            }
        }
        
        else if (this.currentMood === 'travel_harsh') {
            this.tempo = 60; 
            if (step === 0) this.playPumpOrgan([50, 53, 57], time, secondsPerBeat * 4); 
            
            const scale = this.scales.d_minor;
            if (Math.random() > 0.8) {
                this.playBanjo(this.mtof(scale[Math.floor(Math.random() * scale.length)]), time);
            }
        }
        
        else if (this.currentMood === 'hunting') {
            this.tempo = 135; 
            const bassNote = step % 8 < 6 ? 40 : 43; 
            if (step % 2 === 0) this.playBanjo(this.mtof(bassNote), time);
            if (step % 4 === 0) this.playPercussion(time, 'kick');

            const scale = this.scales.g_blues;
            if (Math.random() > 0.4) {
                this.playBanjo(this.mtof(scale[Math.floor(Math.random() * scale.length)] + 12), time);
            }
        }

        else if (this.currentMood === 'river') {
            this.tempo = 110;
            const scale = this.scales.e_minor;
            const note = scale[step % scale.length];
            this.playBanjo(this.mtof(note + 12), time); 
            
            if (step === 0 || step === 8) {
                this.playPumpOrgan([52, 55, 59], time, secondsPerBeat * 2);
                this.playNoiseBurst(time, 0.5, 600); 
            }
        }

        else if (this.currentMood === 'death') {
            this.tempo = 40; 
            const dirge = [67, 62, 60, 55];
            if (step % 4 === 0 && this.measure === 0) {
                this.playFiddle(dirge[step/4], time, secondsPerBeat * 2, 0.8);
            }
        }
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            
            const secondsPerBeat = 60.0 / this.tempo;
            this.nextNoteTime += (secondsPerBeat / 4.0); 
            
            this.current16thNote++;
            if (this.current16thNote === 16) {
                this.current16thNote = 0;
                this.measure++;
            }
        }
        this.timerID = setTimeout(() => this.scheduler(), 25);
    }

    // ==========================================
    // 5. STATE MANAGEMENT
    // ==========================================

    setMood(mood) {
        // Force Audio Context Wakeup
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Keep sequence alive
        if (!this.isPlaying && this.ctx) {
            this.start();
        }

        if (this.currentMood === mood) return;
        this.currentMood = mood;
        
        this.current16thNote = 0;
        this.measure = 0;

        if (this.windGain && this.windFilter) {
            const now = this.ctx.currentTime;
            if (mood === 'travel_harsh') {
                this.windGain.gain.linearRampToValueAtTime(0.5, now + 2); 
                this.windFilter.frequency.linearRampToValueAtTime(1200, now + 2);
            } else if (mood === 'travel_fair' || mood === 'hunting' || mood === 'river') {
                this.windGain.gain.linearRampToValueAtTime(0.1, now + 2); 
                this.windFilter.frequency.linearRampToValueAtTime(300, now + 2);
            } else {
                this.windGain.gain.linearRampToValueAtTime(0, now + 1); 
            }
        }
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
        if (this.windGain) this.windGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    }
}
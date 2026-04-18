// src/robotron/Audio.js

export class WilliamsAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
    }

    ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playShoot() {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); 
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2500, t); 
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.15, t); 
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain).connect(this.ctx.destination); 
        osc.start(t); osc.stop(t + 0.15);
    }

    playExplosion(enemyType) {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const isHulk = enemyType === 'hulk';
        const duration = isHulk ? 0.2 : 0.5;
        
        let bufSize = this.ctx.sampleRate * duration; 
        let buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        let data = buf.getChannelData(0); 
        let lastVal = 0;
        for(let i=0; i<bufSize; i++) {
            if (i % (isHulk ? 4 : 8) === 0) lastVal = (Math.random() * 2 - 1);
            data[i] = lastVal;
        }
        
        let noise = this.ctx.createBufferSource(); noise.buffer = buf;
        let filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; 
        filter.Q.value = isHulk ? 2 : 10; 
        filter.frequency.setValueAtTime(isHulk ? 400 : 2000, t); 
        filter.frequency.exponentialRampToValueAtTime(100, t + duration);
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(isHulk ? 0.15 : 0.3, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        noise.connect(filter).connect(gain).connect(this.ctx.destination); 
        noise.start(t);
    }

    playSpawnMaterialize() {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        let carrier = this.ctx.createOscillator(); carrier.type = 'square';
        carrier.frequency.setValueAtTime(100, t); 
        carrier.frequency.linearRampToValueAtTime(1000, t + 0.8);
        
        let modulator = this.ctx.createOscillator(); modulator.type = 'sawtooth'; 
        modulator.frequency.value = 30; 
        let modGain = this.ctx.createGain(); modGain.gain.value = 500;
        modulator.connect(modGain).connect(carrier.frequency);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        carrier.connect(gain).connect(this.ctx.destination); 
        carrier.start(t); modulator.start(t); 
        carrier.stop(t + 0.8); modulator.stop(t + 0.8);
    }
    
    playPlayerDeath() { this.playExplosion('player'); }
    playHumanRescue() { /* Quick arpeggio implementation here if desired */ }
    loadAssets() { return Promise.resolve(); } // No files to load!
}
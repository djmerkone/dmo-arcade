// src/robotron/Audio.js

export class WilliamsAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
    }

    playShoot() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); 
        
        // The Williams laser: An incredibly fast, sharp sawtooth dive
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2500, t); 
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.15, t); 
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        
        osc.connect(gain).connect(this.ctx.destination); 
        osc.start(t); osc.stop(t + 0.15);
    }

    playExplosion(isHulk = false) {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const duration = isHulk ? 0.3 : 0.6;
        
        // 1. Bit-Crushed Noise Generation (The Williams "Crunch")
        let bufSize = this.ctx.sampleRate * duration; 
        let buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        let data = buf.getChannelData(0); 
        
        let lastVal = 0;
        for(let i=0; i<bufSize; i++) {
            // By only changing the random value every 8 samples, we "crush" the bit-rate, 
            // creating a harsh, metallic, retro static instead of smooth white noise.
            if (i % 8 === 0) lastVal = (Math.random() * 2 - 1);
            data[i] = lastVal;
        }
        
        let noise = this.ctx.createBufferSource(); 
        noise.buffer = buf;
        
        // 2. High Resonance Filtering
        let filter = this.ctx.createBiquadFilter(); 
        filter.type = 'lowpass'; 
        filter.Q.value = 10; // High resonance for that electronic "zap" feel
        filter.frequency.setValueAtTime(isHulk ? 800 : 2000, t); 
        filter.frequency.exponentialRampToValueAtTime(100, t + duration);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.3, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        
        noise.connect(filter).connect(gain).connect(this.ctx.destination); 
        noise.start(t);
    }

    playHumanRescue() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        // The frantic, chaotic "bling-bling" arpeggio
        const notes = [800, 1200, 1600, 2400];
        notes.forEach((freq, i) => {
            let osc = this.ctx.createOscillator(); osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.04);
            let gain = this.ctx.createGain(); 
            gain.gain.setValueAtTime(0.1, t + i * 0.04); 
            gain.gain.linearRampToValueAtTime(0, t + i * 0.04 + 0.04);
            osc.connect(gain).connect(this.ctx.destination); 
            osc.start(t + i * 0.04); osc.stop(t + i * 0.04 + 0.04);
        });
    }

    playSpawnMaterialize() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        
        // Frequency Modulation (FM) Synthesis for the warble
        let carrier = this.ctx.createOscillator(); carrier.type = 'square';
        carrier.frequency.setValueAtTime(100, t); 
        carrier.frequency.linearRampToValueAtTime(1000, t + 0.6);
        
        // Modulator makes the pitch violently vibrate
        let modulator = this.ctx.createOscillator(); modulator.type = 'sawtooth'; 
        modulator.frequency.value = 25; // Fast vibration
        let modGain = this.ctx.createGain(); modGain.gain.value = 400;
        
        modulator.connect(modGain).connect(carrier.frequency);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        
        carrier.connect(gain).connect(this.ctx.destination); 
        carrier.start(t); modulator.start(t); 
        carrier.stop(t + 0.6); modulator.stop(t + 0.6);
    }
}
// src/1942/Audio.js

export class ArcadeAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.engineOsc = null;
        this.engineGain = null;
        this.lfo = null; // Low Frequency Oscillator for the "thrumming" prop sound
    }

    playShoot() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); 
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, t); 
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.15);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.08, t); 
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        
        osc.connect(gain).connect(this.ctx.destination); 
        osc.start(t); osc.stop(t + 0.15);
    }

    playExplosion(isHeavy = false) {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const duration = isHeavy ? 0.8 : 0.4;
        
        // Generate White Noise Buffer
        let bufSize = this.ctx.sampleRate * duration; 
        let buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        let data = buf.getChannelData(0); 
        for(let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;
        
        let noise = this.ctx.createBufferSource(); 
        noise.buffer = buf;
        
        // Filter the noise to sound "crunchy"
        let filter = this.ctx.createBiquadFilter(); 
        filter.type = 'lowpass'; 
        filter.frequency.setValueAtTime(isHeavy ? 400 : 800, t); 
        filter.frequency.linearRampToValueAtTime(50, t + duration);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(isHeavy ? 0.4 : 0.2, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        
        noise.connect(filter).connect(gain).connect(this.ctx.destination); 
        noise.start(t);
    }

    playRoll() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); osc.type = 'sine';
        
        // The classic pitch-bending swoop!
        osc.frequency.setValueAtTime(150, t); 
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.4); 
        osc.frequency.exponentialRampToValueAtTime(150, t + 1.0);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.15, t); 
        gain.gain.linearRampToValueAtTime(0.15, t + 0.8); 
        gain.gain.linearRampToValueAtTime(0.001, t + 1.0);
        
        osc.connect(gain).connect(this.ctx.destination); 
        osc.start(t); osc.stop(t + 1.0);
    }

    startEngine() {
        if (!this.ctx || this.ctx.state !== 'running' || this.engineOsc) return;
        
        // Base Engine Drone
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55; // Deep bass

        // LFO to create the "wub-wub-wub" pulsing of twin propellers
        this.lfo = this.ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = 8; // 8 pulses per second

        let lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 15; // Amount of pitch wobble
        this.lfo.connect(lfoGain).connect(this.engineOsc.frequency);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.05; // Keep it subtle so it doesn't drown out SFX

        this.engineOsc.connect(this.engineGain).connect(this.ctx.destination);
        
        this.engineOsc.start();
        this.lfo.start();
    }

    stopEngine() {
        if (this.engineGain) {
            this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
            setTimeout(() => {
                if (this.engineOsc) { this.engineOsc.stop(); this.engineOsc.disconnect(); this.engineOsc = null; }
                if (this.lfo) { this.lfo.stop(); this.lfo.disconnect(); this.lfo = null; }
            }, 200);
        }
    }
}
// src/robotron/Audio.js

export class WilliamsAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
    }

    playShoot() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); osc.type = 'square';
        // Classic Robotron laser: very high pitch that drops instantly
        osc.frequency.setValueAtTime(1200, t); 
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.1);
    }

    playHumanRescue() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        // The iconic ascending "bling-bling!"
        [600, 900].forEach((freq, i) => {
            let osc = this.ctx.createOscillator(); osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.08);
            let gain = this.ctx.createGain(); 
            gain.gain.setValueAtTime(0.1, t + i * 0.08); 
            gain.gain.linearRampToValueAtTime(0, t + i * 0.08 + 0.05);
            osc.connect(gain).connect(this.ctx.destination); 
            osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.05);
        });
    }

    playExplosion(isHulk = false) {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const duration = isHulk ? 0.6 : 0.3; // Hulks sound heavier when hit, even though they don't die
        
        let bufSize = this.ctx.sampleRate * duration; 
        let buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        let data = buf.getChannelData(0); 
        for(let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;
        
        let noise = this.ctx.createBufferSource(); noise.buffer = buf;
        
        let filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; 
        filter.frequency.setValueAtTime(isHulk ? 600 : 1200, t); 
        filter.frequency.linearRampToValueAtTime(100, t + duration);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(isHulk ? 0.3 : 0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        
        noise.connect(filter).connect(gain).connect(this.ctx.destination); noise.start(t);
    }

    playSpawnMaterialize() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        // The warbling sound at the start of a wave
        let osc = this.ctx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t); osc.frequency.linearRampToValueAtTime(800, t + 0.5);
        
        // Rapid LFO for the warble effect
        let lfo = this.ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 15;
        let lfoGain = this.ctx.createGain(); lfoGain.gain.value = 200;
        lfo.connect(lfoGain).connect(osc.frequency);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.5);
        
        osc.connect(gain).connect(this.ctx.destination); 
        osc.start(t); lfo.start(t); osc.stop(t + 0.5); lfo.stop(t + 0.5);
    }
}
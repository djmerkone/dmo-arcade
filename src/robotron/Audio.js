// src/robotron/Audio.js

export class WilliamsAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        // Master volume control to prevent blowing out modern speakers with 1982 math
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
    }

    // Modern browsers aggressively block audio until a user interaction.
    // This forces the audio chip to wake up the millisecond a button is pressed.
    ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // --- 1. THE DAC NOISE GENERATOR (The Secret Sauce) ---
    // Standard white noise sounds like modern static (like a TV). 
    // Williams arcade boards sounded metallic and "crunchy". We achieve this by 
    // holding random values for multiple frames (Sample-and-Hold), artificially 
    // dropping the sample rate to simulate an 8-bit, 11kHz DAC chip.
    createCrushedNoise(duration, crushFactor) {
        let bufSize = this.ctx.sampleRate * duration; 
        let buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        let data = buf.getChannelData(0); 
        let lastVal = 0;
        for(let i = 0; i < bufSize; i++) {
            // Only generate a new random voltage every 'crushFactor' samples
            if (i % crushFactor === 0) lastVal = (Math.random() * 2 - 1);
            data[i] = lastVal;
        }
        let noise = this.ctx.createBufferSource(); 
        noise.buffer = buf;
        return noise;
    }

    // --- 2. PLAYER LASER ---
    playShoot() {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        
        let osc = this.ctx.createOscillator(); 
        osc.type = 'sawtooth'; // Sharp, buzzy waveform
        
        // Classic arcade "pew": Insanely fast exponential frequency dive
        osc.frequency.setValueAtTime(3000, t); 
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.12);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.2, t); 
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        
        osc.connect(gain).connect(this.masterGain); 
        osc.start(t); osc.stop(t + 0.12);
    }

    // --- 3. DYNAMIC EXPLOSIONS ---
    playExplosion(enemyType) {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        
        // Different enemies produce different metallic crashes
        let isHulk = enemyType === 'hulk';
        let isElectrode = enemyType === 'electrode';
        let duration = isHulk ? 0.15 : (isElectrode ? 0.3 : 0.4);
        let crush = isHulk ? 4 : (isElectrode ? 12 : 8); // Higher = crunchier
        
        let noise = this.createCrushedNoise(duration, crush);
        
        // Filter it to give it "body"
        let filter = this.ctx.createBiquadFilter(); 
        filter.type = isHulk ? 'bandpass' : 'lowpass'; 
        filter.Q.value = isHulk ? 15 : 5; // High resonance for metallic "clanks"
        
        // Filter frequency sweep
        filter.frequency.setValueAtTime(isHulk ? 600 : 2500, t); 
        filter.frequency.exponentialRampToValueAtTime(100, t + duration);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(isHulk ? 0.2 : 0.35, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        
        noise.connect(filter).connect(gain).connect(this.masterGain); 
        noise.start(t);
    }

    // --- 4. PLAYER DEATH (SENSORY OVERLOAD) ---
    playPlayerDeath() {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const duration = 1.5; // Massive, screen-clearing explosion
        
        let noise = this.createCrushedNoise(duration, 16); // Extremely heavy crunch
        
        let filter = this.ctx.createBiquadFilter(); 
        filter.type = 'lowpass'; 
        filter.Q.value = 1; 
        filter.frequency.setValueAtTime(4000, t); 
        filter.frequency.exponentialRampToValueAtTime(50, t + duration);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.5, t); // LOUDER
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        noise.connect(filter).connect(gain).connect(this.masterGain); 
        noise.start(t);
    }

    // --- 5. THE WARP/SPAWN MATERIALIZATION ---
    playSpawnMaterialize() {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const duration = 1.5;
        
        // This uses Audio-Rate Frequency Modulation (FM).
        // It makes the pitch vibrate so violently it sounds like tearing spacetime.
        let carrier = this.ctx.createOscillator(); 
        carrier.type = 'square';
        carrier.frequency.setValueAtTime(50, t); 
        carrier.frequency.linearRampToValueAtTime(1500, t + duration);
        
        let modulator = this.ctx.createOscillator(); 
        modulator.type = 'sawtooth'; 
        modulator.frequency.value = 35; // Vibrate 35 times a second
        
        let modGain = this.ctx.createGain(); 
        modGain.gain.value = 800; // Depth of the vibration
        
        modulator.connect(modGain).connect(carrier.frequency);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.2, t); 
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        
        carrier.connect(gain).connect(this.masterGain); 
        carrier.start(t); modulator.start(t); 
        carrier.stop(t + duration); modulator.stop(t + duration);
    }

    // --- 6. HUMAN RESCUE (The Ascending Arpeggio) ---
    playHumanRescue() {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        
        // Frantic, ascending "bling-bling" frequencies
        const frequencies = [880, 1108, 1318, 1760]; // A5, C#6, E6, A6
        const noteLength = 0.04;
        
        frequencies.forEach((freq, i) => {
            let osc = this.ctx.createOscillator(); 
            osc.type = 'square';
            osc.frequency.value = freq;
            
            let gain = this.ctx.createGain(); 
            gain.gain.setValueAtTime(0.15, t + (i * noteLength)); 
            gain.gain.linearRampToValueAtTime(0.01, t + (i * noteLength) + noteLength);
            
            osc.connect(gain).connect(this.masterGain); 
            osc.start(t + (i * noteLength)); 
            osc.stop(t + (i * noteLength) + noteLength);
        });
    }

    // --- 7. HUMAN KILLED (The Tragic Dissonance) ---
    playHumanKilled() {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const duration = 0.5;
        
        // Two oscillators slightly out of tune to create an ugly, dissonant beating effect
        [300, 315].forEach(freq => {
            let osc = this.ctx.createOscillator(); 
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + duration); // Sinks into the bass
            
            let gain = this.ctx.createGain(); 
            gain.gain.setValueAtTime(0.2, t); 
            gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
            
            osc.connect(gain).connect(this.masterGain);
            osc.start(t);
            osc.stop(t + duration);
        });
    }

    loadAssets() { return Promise.resolve(); }
}
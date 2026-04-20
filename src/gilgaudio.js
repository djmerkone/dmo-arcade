// src/gilgaudio.js

/**
 * THE ANCIENT WORLD AUDIO ENGINE (VALHALLA EDITION)
 * High-Fidelity Cinematic Synthesis for the Epic of Gilgamesh.
 * Features: Volumetric Braams, Formant Choirs, Sub-Bass Drums, and Ethereal Flutes.
 */

export class GilgameshAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        
        // --- MASTER CINEMATIC BUS ---
        this.masterGain = this.ctx?.createGain();
        this.compressor = this.ctx?.createDynamicsCompressor();
        
        // Massive Lexicon-style Reverb using Delay Networks
        this.reverbNode = this.ctx?.createDelay();
        this.reverbFeedback = this.ctx?.createGain();
        this.reverbFilter = this.ctx?.createBiquadFilter();

        if (this.masterGain && this.ctx) {
            this.masterGain.gain.value = 1.0;

            // Compressor Settings for Maximum Cinematic "Punch"
            this.compressor.threshold.value = -15;
            this.compressor.knee.value = 10;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.01;
            this.compressor.release.value = 0.25;

            // Abyss Reverb Settings
            this.reverbNode.delayTime.value = 0.7; // Long echo
            this.reverbFeedback.gain.value = 0.55;
            this.reverbFilter.type = 'lowpass';
            this.reverbFilter.frequency.value = 1500;

            // Routing
            this.reverbNode.connect(this.reverbFilter).connect(this.reverbFeedback);
            this.reverbFeedback.connect(this.reverbNode);
            
            this.masterGain.connect(this.compressor);
            this.masterGain.connect(this.reverbNode);
            
            this.reverbNode.connect(this.compressor);
            this.compressor.connect(this.ctx.destination);

            // Initialize Background Ambience
            this.initDesertWind();
        }

        this.isPlaying = false;
        this.currentMood = 'none';
        this.timerID = null;
        this.beatCount = 0;
    }

    // ==========================================
    // 1. PROCEDURAL AMBIENCE
    // ==========================================
    initDesertWind() {
        if (!this.ctx) return;
        const bufSize = this.ctx.sampleRate * 5; 
        const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Brown noise for wind
        let lastOut = 0;
        for (let i = 0; i < bufSize; i++) {
            let white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; 
        }

        this.windNoise = this.ctx.createBufferSource();
        this.windNoise.buffer = buffer;
        this.windNoise.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'lowpass';
        this.windFilter.frequency.value = 200;

        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0.05; // Very subtle start

        this.windNoise.connect(this.windFilter).connect(this.windGain).connect(this.masterGain);
        this.windNoise.start();
    }

    // ==========================================
    // 2. CINEMATIC INSTRUMENTS
    // ==========================================

    /**
     * CINEMATIC BRAAM: Massive, trailer-style horn blast
     */
    playBraam(freq, time, duration = 3.0) {
        if (!this.ctx) return;
        
        // Multiple detuned sawtooths for massive width
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        subOsc.type = 'square'; // Adds grit

        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 1.01; // Detune 1
        subOsc.frequency.value = freq / 2;  // Octave down

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        // The cinematic "Brass" swell
        filter.frequency.setValueAtTime(100, time);
        filter.frequency.exponentialRampToValueAtTime(3000, time + 0.5);
        filter.frequency.exponentialRampToValueAtTime(200, time + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.2); // Hard attack
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain).connect(this.masterGain);

        osc1.start(time); osc2.start(time); subOsc.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration); subOsc.stop(time + duration);
    }

    /**
     * ETHEREAL CHOIR: Formant filtering to emulate monks/priestesses
     */
    playChoirPad(freqs, time, duration = 4.0) {
        if (!this.ctx) return;
        freqs.forEach(freq => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;

            // Formant filters to simulate human throat ("Ah" vowel)
            const formant1 = this.ctx.createBiquadFilter();
            formant1.type = 'bandpass';
            formant1.frequency.value = 730;
            formant1.Q.value = 2;

            const formant2 = this.ctx.createBiquadFilter();
            formant2.type = 'bandpass';
            formant2.frequency.value = 1090;
            formant2.Q.value = 2;

            const gain = this.ctx.createGain();
            // Swell in and out slowly
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.15, time + duration / 2);
            gain.gain.linearRampToValueAtTime(0.001, time + duration);

            osc.connect(formant1).connect(gain);
            osc.connect(formant2).connect(gain);
            gain.connect(this.masterGain);

            osc.start(time);
            osc.stop(time + duration);
        });
    }

    /**
     * THE DUDUK: Ancient middle-eastern woodwind
     */
    playFlute(freq, time, duration, vol = 0.2) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const noise = this.ctx.createBufferSource();
        const noiseFilter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        // Deep, emotive vibrato
        const vibrato = this.ctx.createOscillator();
        const vGain = this.ctx.createGain();
        vibrato.frequency.value = 5.5; // Slightly faster vibrato for tension
        vGain.gain.setValueAtTime(0, time);
        vGain.gain.linearRampToValueAtTime(freq * 0.015, time + 0.8); // Vibrato fades in
        vibrato.connect(vGain).connect(osc.frequency);

        // Breath Noise
        const bufSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = freq * 2;
        noiseFilter.Q.value = 0.5;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.5); 
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gain);
        noise.connect(noiseFilter).connect(gain);
        gain.connect(this.masterGain);

        osc.start(time); vibrato.start(time); noise.start(time);
        osc.stop(time + duration); vibrato.stop(time + duration);
    }

    /**
     * SUB-BASS WAR DRUM: Deep cinematic impacts
     */
    playDrum(time, isHeavy = false) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        // Massive sub-drop
        osc.frequency.setValueAtTime(isHeavy ? 150 : 200, time);
        osc.frequency.exponentialRampToValueAtTime(isHeavy ? 20 : 40, time + 0.3);

        gain.gain.setValueAtTime(isHeavy ? 1.0 : 0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

        // The "Smack" (Transient)
        const smackBuf = Math.floor(this.ctx.sampleRate * 0.05);
        const buffer = this.ctx.createBuffer(1, smackBuf, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < smackBuf; i++) data[i] = Math.random() * 2 - 1;
        const smack = this.ctx.createBufferSource();
        smack.buffer = buffer;
        const smackFilter = this.ctx.createBiquadFilter();
        smackFilter.type = 'lowpass';
        smackFilter.frequency.value = 1000;
        const smackGain = this.ctx.createGain();
        smackGain.gain.setValueAtTime(isHeavy ? 0.3 : 0.1, time);
        smackGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        smack.connect(smackFilter).connect(smackGain).connect(this.masterGain);
        osc.connect(gain).connect(this.masterGain);

        osc.start(time); osc.stop(time + 1.0);
        smack.start(time);
    }

    /**
     * CUNEIFORM CARVE: Stone-on-stone scraping
     */
    playCarve() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        
        const bufSize = Math.floor(this.ctx.sampleRate * 0.04); 
        const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const filter2 = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        noise.buffer = buffer;
        
        // Highpass to remove muddiness, lowpass to give it a "chunky stone" feel
        filter.type = 'highpass';
        filter.frequency.value = 2500; 
        filter2.type = 'lowpass';
        filter2.frequency.value = 6000;

        gain.gain.setValueAtTime(0.25, t); 
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        noise.connect(filter).connect(filter2).connect(gain).connect(this.masterGain);
        noise.start(t);
    }

    // ==========================================
    // 3. THE COMPOSER (Algorithmic Sequencer)
    // ==========================================

    setMood(mood) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => this.startScheduler(mood));
        } else {
            this.startScheduler(mood);
        }
    }

    startScheduler(mood) {
        if (this.currentMood === mood) return;
        this.currentMood = mood;
        this.beatCount = 0;

        // Dynamic Wind Control based on scene
        if (this.windGain && this.windFilter) {
            const t = this.ctx.currentTime;
            if (mood.includes('steppe') || mood.includes('ambience')) {
                this.windGain.gain.linearRampToValueAtTime(0.2, t + 2.0); // Howling wind
                this.windFilter.frequency.linearRampToValueAtTime(800, t + 2.0);
            } else {
                this.windGain.gain.linearRampToValueAtTime(0.02, t + 2.0); // Gentle breeze
                this.windFilter.frequency.linearRampToValueAtTime(200, t + 2.0);
            }
        }

        if (!this.isPlaying) {
            this.isPlaying = true;
            this.scheduler();
        }
    }

    scheduler() {
        if (!this.ctx || !this.isPlaying) return;
        const t = this.ctx.currentTime;
        this.beatCount++;

        // Base Scale: C Phrygian Dominant (Ancient sounding scale)
        // C(65.41), Db(69.30), E(82.41), F(87.31), G(98.00), Ab(103.83), Bb(116.54)

        if (this.currentMood === 'mysterious_ancient') {
            if (this.beatCount % 2 === 1) {
                this.playChoirPad([130.81, 164.81, 196.00], t, 6.0); // C Major ethereal pad
                this.playFlute(261.63, t + 1, 4.0, 0.1); // C4 Flute lead
            }
        } 
        else if (this.currentMood === 'triumphant_brass' || this.currentMood.includes('uruk')) {
            // Huge Hans Zimmer Braam on every downbeat
            if (this.beatCount % 2 === 1) {
                this.playBraam(65.41, t, 4.0); // C2
                this.playDrum(t, true);
                this.playDrum(t + 2.0, false);
            }
        }
        else if (this.currentMood === 'dark_tension') {
            // Dissonant minor seconds
            if (this.beatCount % 2 === 1) {
                this.playChoirPad([65.41, 69.30], t, 5.0); // C and Db rubbing together
                this.playDrum(t, true);
            } else {
                this.playFlute(103.83, t, 3.0, 0.15); // Ab2 low wail
            }
        }
        else if (this.currentMood === 'primitive_percussion' || this.currentMood.includes('wild')) {
            // Tribal Polyrhythms
            this.playDrum(t, true);
            this.playDrum(t + 0.75, false);
            this.playDrum(t + 1.5, false);
            this.playDrum(t + 2.25, true);
            this.playDrum(t + 2.75, false);
            this.playDrum(t + 3.25, false);
            
            if (this.beatCount % 2 === 0) {
                this.playFlute(207.65, t, 2.0, 0.1); // Ab3 quick burst
            }
        }
        else if (this.currentMood === 'ethereal_melancholy') {
            if (this.beatCount % 2 === 1) {
                this.playChoirPad([138.59, 164.81, 207.65], t, 6.0); // Db Minor pad
            }
            if (Math.random() > 0.5) {
                this.playFlute(277.18, t + 1.5, 3.0, 0.08); // Db4 sorrowful wail
            }
        }

        // Loop interval: 4 seconds (15 BPM) - majestic and slow
        this.timerID = setTimeout(() => this.scheduler(), 4000);
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
        if (this.windGain) {
            this.windGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
        }
    }
}
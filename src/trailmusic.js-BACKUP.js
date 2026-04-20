// src/trailmusic.js

/**
 * THE FRONTIER AUDIO ENGINE (EPIC DISCOGRAPHY EDITION)
 * A procedural Web Audio API synthesizer and generative sequencer.
 * It does not play static audio files; it performs live, infinite 
 * algorithmic compositions using 19th-century acoustic synthesis.
 */

export class TrailMusic {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.masterGain = this.ctx?.createGain();
        this.delayNode = this.ctx?.createDelay();
        this.delayFeedback = this.ctx?.createGain();
        
        if (this.masterGain && this.ctx) {
            // Master Volume
            this.masterGain.gain.value = 0.35; 
            
            // Canyon Delay/Echo effect routing
            this.delayNode.delayTime.value = 0.33; // Slapback echo
            this.delayFeedback.gain.value = 0.25; // How much echo feeds back
            
            this.delayNode.connect(this.delayFeedback);
            this.delayFeedback.connect(this.delayNode);
            this.delayNode.connect(this.masterGain);

            this.masterGain.connect(this.ctx.destination);
        }

        this.isPlaying = false;
        this.currentMood = null;
        this.tempo = 110; 
        this.nextNoteTime = 0;
        this.current16thNote = 0;
        this.measure = 0;
        this.timerID = null;

        // Frequencies (C2 to C6)
        this.N = {
            C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
            C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
            C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
            C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
            C6: 1046.50
        };

        // Musical Scales for Generative Melodies
        this.scales = {
            C_Major_Pent: [this.N.C4, this.N.D4, this.N.E4, this.N.G4, this.N.A4, this.N.C5],
            G_Major_Pent: [this.N.G3, this.N.A3, this.N.B3, this.N.D4, this.N.E4, this.N.G4],
            A_Minor_Pent: [this.N.A3, this.N.C4, this.N.D4, this.N.E4, this.N.G4, this.N.A4],
            D_Minor_Pent: [this.N.D4, this.N.F4, this.N.G4, this.N.A4, this.N.C5, this.N.D5]
        };
    }

    ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // ==========================================
    // 19TH CENTURY INSTRUMENT SYNTHESIS
    // ==========================================

    // 1. THE BANJO (Plucky, twangy, fast decay)
    playBanjo(freq, time, useDelay = false) {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        let filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        filter.type = 'highpass'; filter.frequency.value = 500; 

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5, time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.connect(filter).connect(gain);
        gain.connect(this.masterGain);
        if (useDelay) gain.connect(this.delayNode);

        osc.start(time); osc.stop(time + 0.25);
    }

    // 2. THE FIDDLE (Sustained, vibrato, weeping)
    playFiddle(freq, time, duration, volume = 0.3) {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        let lfo = this.ctx.createOscillator();
        let lfoGain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        // Vibrato
        lfo.type = 'sine'; lfo.frequency.value = 5.5; 
        lfoGain.gain.value = freq * 0.02; 
        lfo.connect(lfoGain).connect(osc.frequency);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.2);
        gain.gain.setValueAtTime(volume, time + duration - 0.2);
        gain.gain.linearRampToValueAtTime(0.001, time + duration);

        lfo.start(time); osc.connect(gain).connect(this.masterGain);
        osc.start(time); lfo.stop(time + duration); osc.stop(time + duration);
    }

    // 3. THE HARMONICA (Breathy, reed-like, tremolo)
    playHarmonica(freq, time, duration) {
        if (!this.ctx) return;
        let osc1 = this.ctx.createOscillator();
        let osc2 = this.ctx.createOscillator();
        let filter = this.ctx.createBiquadFilter();
        let gain = this.ctx.createGain();
        
        // Tremolo (Volume modulation)
        let tremolo = this.ctx.createOscillator();
        let tremGain = this.ctx.createGain();

        osc1.type = 'square'; osc1.frequency.value = freq;
        osc2.type = 'sawtooth'; osc2.frequency.value = freq * 1.005; // Chorus effect

        filter.type = 'bandpass'; filter.frequency.value = 1200; filter.Q.value = 1.5;

        tremolo.type = 'sine'; tremolo.frequency.value = 6; // Fast panting breath
        tremolo.connect(tremGain.gain);
        tremGain.gain.value = 0.5;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc1.connect(filter); osc2.connect(filter);
        filter.connect(tremGain).connect(gain).connect(this.masterGain);
        
        tremolo.start(time); osc1.start(time); osc2.start(time);
        tremolo.stop(time + duration); osc1.stop(time + duration); osc2.stop(time + duration);
    }

    // 4. THE SALOON TACK-PIANO (Detuned, clunky, ragtime)
    playPiano(freq, time) {
        if (!this.ctx) return;
        let osc1 = this.ctx.createOscillator();
        let osc2 = this.ctx.createOscillator();
        let gain = this.ctx.createGain();

        osc1.type = 'triangle'; osc1.frequency.value = freq;
        osc2.type = 'sawtooth'; osc2.frequency.value = freq * 1.01; // Out of tune saloon sound

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        osc1.connect(gain); osc2.connect(gain);
        gain.connect(this.masterGain);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + 0.6); osc2.stop(time + 0.6);
    }

    // 5. WOODEN SPOONS (Percussion)
    playSpoons(time, type) {
        if (!this.ctx) return;
        let bufSize = this.ctx.sampleRate * 0.05;
        let buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        let data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        let noise = this.ctx.createBufferSource(); noise.buffer = buf;
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = type === 'high' ? 2800 : 1200; 

        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        noise.connect(filter).connect(gain).connect(this.masterGain);
        noise.start(time);
    }

    // 6. THE JUG BASS (Deep, warm sine root notes)
    playBass(freq, time) {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();

        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.7, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

        osc.connect(gain).connect(this.masterGain);
        osc.start(time); osc.stop(time + 0.7);
    }

    // 7. FUNERAL BELL (Metallic FM Synthesis)
    playBell(freq, time) {
        if (!this.ctx) return;
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.6, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 4.0); // Long toll ring

        // A bell is made of non-harmonic overtones
        [1, 2.1, 3.4, 4.2].forEach(mult => {
            let osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq * mult;
            osc.connect(gain);
            osc.start(time); osc.stop(time + 4.1);
        });
        
        gain.connect(this.masterGain);
        gain.connect(this.delayNode); // Epic echo
    }


    // ==========================================
    // THE GENERATIVE COMPOSER
    // ==========================================

    scheduleNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        const time = this.nextNoteTime;
        const step = this.current16thNote; 
        const m = this.measure; // Tracks 4-bar phrases
        const N = this.N;

        // ----------------------------------------------------
        // 1. MAIN MENU (Majestic, Sweeping, Cinematic)
        // ----------------------------------------------------
        if (this.currentMood === 'main_menu') {
            this.tempo = 85;
            const chords = [N.C3, N.F3, N.C3, N.G3]; // I - IV - I - V progression
            const root = chords[m % 4];

            if (step === 0) this.playBass(root, time);
            
            // Slow, rolling banjo arpeggios
            if (step % 2 === 0) {
                const scale = this.scales.C_Major_Pent;
                this.playBanjo(scale[(step/2 + m) % scale.length], time, true);
            }

            // Majestic Fiddle swells on the 1st beat of every measure
            if (step === 0) {
                const mel = [N.C5, N.A4, N.G4, N.D5];
                this.playFiddle(mel[m % 4], time, secondsPerBeat * 3, 0.4);
            }
        }
        
        // ----------------------------------------------------
        // 2. MATT'S GENERAL STORE (Upbeat Saloon Ragtime)
        // ----------------------------------------------------
        else if (this.currentMood === 'store') {
            this.tempo = 120;
            const root = (m % 2 === 0) ? N.C3 : N.G2;
            const chordRoot = (m % 2 === 0) ? N.C4 : N.G4;

            // Oom-Pah Bass and Piano
            if (step % 4 === 0) this.playBass(root, time);
            if (step % 4 === 2) { // The "Pah"
                this.playPiano(chordRoot, time);
                this.playPiano(chordRoot * 1.25, time); // Major third
            }

            // Jaunty Piano Melody on top
            if (Math.random() > 0.4 && step % 2 === 0) {
                const scale = this.scales.C_Major_Pent;
                this.playPiano(scale[Math.floor(Math.random() * scale.length)] * 2, time);
            }
        }

        // ----------------------------------------------------
        // 3. TRAVEL: FAIR WEATHER (Upbeat, optimistic trot)
        // ----------------------------------------------------
        else if (this.currentMood === 'travel_fair') {
            this.tempo = 115;
            const chords = [N.G2, N.C3, N.D3, N.G2];
            const root = chords[m % 4];

            // Galloping Spoons & Bass
            if (step % 4 === 0) { this.playBass(root, time); this.playSpoons(time, 'low'); }
            if (step % 4 === 2 || step % 4 === 3) this.playSpoons(time, 'high');

            // Plucky Banjo rhythm
            if (step % 4 === 0 || step % 4 === 3) {
                const scale = this.scales.G_Major_Pent;
                this.playBanjo(scale[Math.floor(Math.random() * scale.length)], time);
            }

            // Sweet Harmonica melody lines
            if (m % 2 === 1 && step === 0) {
                this.playHarmonica(N.B4, time, secondsPerBeat * 2);
            }
        }

        // ----------------------------------------------------
        // 4. TRAVEL: HARSH WEATHER / STARVING (Slow, dissonant)
        // ----------------------------------------------------
        else if (this.currentMood === 'travel_harsh') {
            this.tempo = 65; // Agonizingly slow
            const chords = [N.A2, N.D2, N.E2, N.A2];
            const root = chords[m % 4];

            // Heartbeat Bass
            if (step === 0 || step === 2) this.playBass(root, time);

            // Cold, echoing banjo plucks
            if (step === 8) {
                const scale = this.scales.A_Minor_Pent;
                this.playBanjo(scale[Math.floor(Math.random() * scale.length)], time, true); // Delay on
            }

            // Weeping, dissonant fiddle
            if (step === 0 && m % 2 === 0) {
                this.playFiddle(N.A4, time, secondsPerBeat * 4, 0.2);
            } else if (step === 0 && m % 2 === 1) {
                this.playFiddle(N.G4, time, secondsPerBeat * 4, 0.2);
            }
        }

        // ----------------------------------------------------
        // 5. RIVER CROSSING (Tense, flowing, rippling)
        // ----------------------------------------------------
        else if (this.currentMood === 'river') {
            this.tempo = 100;
            
            // Flowing water arpeggios (Fast 16th notes on piano & banjo)
            const scale = this.scales.D_Minor_Pent;
            this.playBanjo(scale[step % scale.length], time, true);
            
            if (step % 8 === 0) this.playBass(N.D3, time);

            // Tense, high fiddle drone
            if (step === 0 && m % 2 === 0) {
                this.playFiddle(N.D5, time, secondsPerBeat * 4, 0.15);
            }
        }

        // ----------------------------------------------------
        // 6. HUNTING (Stealthy, rhythmic, quiet)
        // ----------------------------------------------------
        else if (this.currentMood === 'hunting') {
            this.tempo = 90;
            
            // Sneaky bass line
            if (step === 0) this.playBass(N.E2, time);
            if (step === 6) this.playBass(N.G2, time);
            if (step === 10) this.playBass(N.A2, time);

            // Quiet spoon clicks (like snapping twigs)
            if (step % 4 === 2) this.playSpoons(time, 'high');
            
            // A solitary, high banjo pluck for tension
            if (step === 14 && Math.random() > 0.5) {
                this.playBanjo(N.E5, time, true);
            }
        }

        // ----------------------------------------------------
        // 7. EVENT / DANGER (Sudden stop, low drone)
        // ----------------------------------------------------
        else if (this.currentMood === 'danger') {
            this.tempo = 60;
            if (step === 0 && m === 0) {
                this.playBass(N.C2, time); // Boom
                this.playFiddle(N.C4, time, secondsPerBeat * 8, 0.4); // Long terrifying drone
            }
        }

        // ----------------------------------------------------
        // 8. DEATH / FUNERAL (Solemn Bell)
        // ----------------------------------------------------
        else if (this.currentMood === 'death') {
            this.tempo = 50;
            if (step === 0 && m % 2 === 0) {
                this.playBell(N.A2, time); // Toll the bell
            }
            if (step === 8) {
                this.playHarmonica(N.C4, time, secondsPerBeat * 2); // Mournful breath
            }
        }

        // ----------------------------------------------------
        // 9. VICTORY (Triumphant, fast, full band)
        // ----------------------------------------------------
        else if (this.currentMood === 'victory') {
            this.tempo = 140; // Extremely fast and joyous
            const chords = [N.C3, N.F3, N.G3, N.C3];
            const root = chords[m % 4];

            // Full galloping bass & spoons
            if (step % 4 === 0) this.playBass(root, time);
            if (step % 2 === 0) this.playSpoons(time, 'low');
            if (step % 2 === 1) this.playSpoons(time, 'high');

            // Fast ragtime piano + banjo strumming
            if (step % 4 === 0 || step % 4 === 2) {
                this.playPiano(root * 2, time);
                this.playBanjo(root * 2, time);
            }

            // Triumphant Fiddle melody
            const scale = this.scales.C_Major_Pent;
            if (step % 4 === 0) {
                this.playFiddle(scale[Math.floor(Math.random() * scale.length)], time, secondsPerBeat, 0.4);
            }
        }

        // Advance Sequencer Time
        this.nextNoteTime += 0.25 * secondsPerBeat; // Move 1 sixteenth note forward
        this.current16thNote++;
        if (this.current16thNote === 16) {
            this.current16thNote = 0;
            this.measure++;
        }
    }

    scheduler() {
        // Lookahead timing to ensure perfectly smooth Web Audio playback
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            this.scheduleNote();
        }
        this.timerID = setTimeout(() => this.scheduler(), 25);
    }

    setMood(mood) {
        if (this.currentMood === mood) return;
        this.currentMood = mood;
        
        // When changing moods, instantly align the downbeat for musicality
        this.current16thNote = 0;
        this.measure = 0;
        
        if (!this.isPlaying && this.ctx) {
            this.ensureContext();
            this.isPlaying = true;
            this.nextNoteTime = this.ctx.currentTime + 0.05;
            this.scheduler();
        }
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }
}
// src/menumusic.js

export class ArcadeMenuMusic {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.current16thNote = 0;
        this.tempo = 125; // 125 BPM (Classic driving synthwave tempo)
        this.lookahead = 25.0; // How frequently to call scheduling function (in ms)
        this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
        this.timerID = null;

        // Master Volume & Compressor (Gives it that pumping, loud arcade mix)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4;
        
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);

        // Pre-compute white noise buffer for Snares and Hi-Hats
        this.noiseBuffer = this.createNoiseBuffer();
    }

    createNoiseBuffer() {
        let bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        let buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        let output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // --- SYNTHESIZER INSTRUMENTS ---

    playKick(time) {
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        // Pitch drop (The "Thump")
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        // Volume envelope
        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
        let noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        
        let noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000;
        
        let noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(1, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(time);
        noise.stop(time + 0.2);
    }

    playHiHat(time, isOpen) {
        let noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (isOpen ? 0.3 : 0.05));

        noise.connect(filter).connect(gain).connect(this.masterGain);
        noise.start(time);
        noise.stop(time + (isOpen ? 0.3 : 0.05));
    }

    playBass(time, freq, isAccent) {
        let osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 5; // Resonance
        filter.frequency.setValueAtTime(isAccent ? 800 : 200, time);
        filter.frequency.exponentialRampToValueAtTime(50, time + 0.2);
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isAccent ? 0.6 : 0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.frequency.value = freq;
        
        osc.connect(filter).connect(gain).connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    playArp(time, freq) {
        let osc = this.ctx.createOscillator();
        osc.type = 'square';
        
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.1);
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.frequency.value = freq;
        
        osc.connect(filter).connect(gain).connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    playPad(time, chordFreqs, duration) {
        let gain = this.ctx.createGain();
        // Slow attack and release for lush background pad
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.5);
        gain.gain.setValueAtTime(0.2, time + duration - 0.5);
        gain.gain.linearRampToValueAtTime(0, time + duration);
        gain.connect(this.masterGain);

        chordFreqs.forEach(freq => {
            // Three slightly detuned oscillators per note for massive width
            [-4, 0, 4].forEach(detune => {
                let osc = this.ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;
                osc.detune.value = detune;
                
                let filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 600; // Keep it warm and out of the way of the arp

                osc.connect(filter).connect(gain);
                osc.start(time);
                osc.stop(time + duration);
            });
        });
    }

    // --- SEQUENCER & MUSIC LOGIC ---
    
    mToF(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    scheduleNote(beatNumber, time) {
        // Bar length = 16 (since we are using 16th notes)
        // Progression repeats every 4 bars (64 beats)
        let measure = Math.floor(beatNumber / 16) % 4;
        let step = beatNumber % 16;

        // 1. DRUMS (Four-on-the-floor dance pattern)
        if (step % 4 === 0) this.playKick(time);
        if (step % 8 === 4) this.playSnare(time);
        
        // Hi-hat off-beats
        if (step % 4 === 2) this.playHiHat(time, true); // Open hat
        else if (step % 2 === 0) this.playHiHat(time, false); // Closed hat

        // 2. CHORD PROGRESSION: Am -> F -> C -> G
        let root = 0;
        let chord = [];
        if (measure === 0) { root = 45; chord = [45, 57, 60, 64]; } // A Minor (A2)
        if (measure === 1) { root = 41; chord = [41, 53, 57, 60]; } // F Major (F2)
        if (measure === 2) { root = 48; chord = [48, 55, 60, 64]; } // C Major (C3)
        if (measure === 3) { root = 43; chord = [43, 55, 59, 62]; } // G Major (G2)

        // 3. PUMPING BASS (Plays on every 16th note, accent on the off-beat)
        let isAccent = (step % 4 !== 0);
        this.playBass(time, this.mToF(root), isAccent);

        // 4. ARPEGGIATOR (Fast running 16th notes up and down the chord)
        let arpIndex = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3][step];
        // Move the arp up an octave (+12)
        this.playArp(time, this.mToF(chord[arpIndex] + 12));

        // 5. CHORD PAD (Triggers once at the start of every measure, holds for a full bar)
        if (step === 0) {
            let secondsPerBar = (60 / this.tempo) * 4;
            // Pad is an octave higher than the bass
            let padFreqs = chord.map(midi => this.mToF(midi + 12)); 
            this.playPad(time, padFreqs, secondsPerBar);
        }
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        // 0.25 of a beat = 16th note
        this.nextNoteTime += 0.25 * secondsPerBeat; 
        this.current16thNote++;
        if (this.current16thNote === 64) {
            this.current16thNote = 0;
        }
    }

    scheduler() {
        // While there are notes that will need to play before the next interval,
        // schedule them and advance the pointer.
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    start() {
        if (this.isPlaying) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        this.isPlaying = true;
        this.current16thNote = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05; // Slight delay to ensure context is ready
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }
}
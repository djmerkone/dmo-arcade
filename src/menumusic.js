// src/menumusic.js

export class ArcadeMenuMusic {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.current16thNote = 0;
        this.tempo = 90; // Slower, brooding Dreamwave tempo
        this.lookahead = 25.0; // How frequently to call scheduling function (in ms)
        this.scheduleAheadTime = 0.15; // How far ahead to schedule audio (sec)
        this.timerID = null;

        // --- MASTER BUS & EFFECTS ---
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.35; // Headroom for massive synths
        
        // Synthwave Compression (Pumping and loud)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-20, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(5, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        // Dreamwave Delay Network (Dotted 8th / 3-16ths timing)
        this.delay = this.ctx.createDelay();
        const beatDuration = 60 / this.tempo;
        this.delay.delayTime.value = beatDuration * 0.75; // 3/16ths delay for that bouncing synthwave arp
        
        this.feedback = this.ctx.createGain();
        this.feedback.gain.value = 0.45; // Amount of echo tail
        
        // Filter the delay so it gets darker as it fades (analog tape delay style)
        this.delayFilter = this.ctx.createBiquadFilter();
        this.delayFilter.type = 'lowpass';
        this.delayFilter.frequency.value = 1500;

        this.delay.connect(this.delayFilter);
        this.delayFilter.connect(this.feedback);
        this.feedback.connect(this.delay);
        this.delayFilter.connect(this.compressor);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);

        // Pre-generate White Noise Buffer for 80s Gated Snares and Hi-Hats
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    }

    mToF(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    playKick(time) {
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        
        // Deep, heavy 808-style pitch envelope
        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);
        
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        
        // Transient click for modern punch
        let click = this.ctx.createOscillator();
        click.type = 'square';
        click.frequency.setValueAtTime(800, time);
        click.frequency.exponentialRampToValueAtTime(50, time + 0.05);
        let clickGain = this.ctx.createGain();
        clickGain.gain.setValueAtTime(0.3, time);
        clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        
        osc.connect(gain).connect(this.masterGain);
        click.connect(clickGain).connect(this.masterGain);
        
        osc.start(time); osc.stop(time + 0.4);
        click.start(time); click.stop(time + 0.05);
    }

    playSnare(time) {
        let src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = 0.5;
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3); // Gated 80s tail
        
        src.connect(filter).connect(gain).connect(this.masterGain);
        
        // Send a massive burst of the snare to the delay network to echo into the void
        let delaySend = this.ctx.createGain();
        delaySend.gain.setValueAtTime(0.4, time);
        gain.connect(delaySend).connect(this.delay);
        
        src.start(time);
        src.stop(time + 0.3);
    }

    playHiHat(time, isAccent) {
        let src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isAccent ? 0.15 : 0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        
        src.connect(filter).connect(gain).connect(this.masterGain);
        src.start(time); src.stop(time + 0.05);
    }

    playBass(time, midi) {
        // Dual detuned sawtooths for a thick analog bass
        let osc1 = this.ctx.createOscillator();
        let osc2 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        let freq = this.mToF(midi - 12); // Drop an octave
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 0.99; 
        
        // Plucky filter envelope
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.25);
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain).connect(this.masterGain);
        
        osc1.start(time); osc2.start(time);
        osc1.stop(time + 0.25); osc2.stop(time + 0.25);
    }

    playArp(time, midi) {
        let osc1 = this.ctx.createOscillator();
        let osc2 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        let freq = this.mToF(midi + 12); 
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 1.005; // Chorus effect
        
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time);
        filter.frequency.exponentialRampToValueAtTime(400, time + 0.15);
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain).connect(this.masterGain);
        
        // Send the arp to the delay network for that bouncing synthwave echo
        let delaySend = this.ctx.createGain();
        delaySend.gain.value = 0.4;
        gain.connect(delaySend).connect(this.delay);
        
        osc1.start(time); osc2.start(time);
        osc1.stop(time + 0.15); osc2.stop(time + 0.15);
    }

    playPad(time, midis) {
        const secondsPerBar = (60 / this.tempo) * 4;
        
        midis.forEach(midi => {
            let osc1 = this.ctx.createOscillator();
            let osc2 = this.ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc2.type = 'sawtooth';
            
            let freq = this.mToF(midi - 12); // Deep pad
            osc1.frequency.value = freq;
            osc2.frequency.value = freq * 1.01; // Lush, wide detuning
            
            let filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            // Slow, cinematic filter sweep
            filter.frequency.setValueAtTime(200, time);
            filter.frequency.linearRampToValueAtTime(1200, time + (secondsPerBar / 2));
            filter.frequency.linearRampToValueAtTime(200, time + secondsPerBar);
            
            let gain = this.ctx.createGain();
            // Slow attack and release for ambient background
            gain.gain.setValueAtTime(0.01, time);
            gain.gain.linearRampToValueAtTime(0.12, time + (secondsPerBar / 2));
            gain.gain.linearRampToValueAtTime(0.01, time + secondsPerBar);
            
            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain).connect(this.masterGain);
            
            osc1.start(time); osc2.start(time);
            osc1.stop(time + secondsPerBar); osc2.stop(time + secondsPerBar);
        });
    }

    scheduleNote(step, time) {
        let bar = Math.floor(step / 16);
        let sixteenth = step % 4;
        let eighth = Math.floor(step / 2) % 8;
        let beat = Math.floor(step / 4) % 4;

        // --- THE TACTICAL ESPIONAGE PROGRESSION ---
        // Bassline (Rolling 8th notes): Am, F, G, Em
        const bassNotes = [
            [45, 45, 57, 45, 45, 45, 57, 45], // Am (A2, A2, A3, A2...)
            [41, 41, 53, 41, 41, 41, 53, 41], // F
            [43, 43, 55, 43, 43, 43, 55, 43], // G
            [40, 40, 52, 40, 40, 40, 52, 40]  // Em
        ];
        
        // Ethereal Ambient Pads (Triggered once per bar)
        const padProg = [
            [57, 60, 64], // Am
            [53, 57, 60], // F
            [55, 59, 62], // G
            [52, 55, 59]  // Em
        ];

        // The Iconic Tension Arpeggio (16th notes)
        const arpProg = [
            [57, 60, 64, 62, 60, 59, 60, 62, 57, 60, 64, 62, 60, 59, 60, 62], // Am
            [53, 57, 60, 59, 57, 55, 57, 59, 53, 57, 60, 59, 57, 55, 57, 59], // F
            [55, 59, 62, 60, 59, 57, 59, 60, 55, 59, 62, 60, 59, 57, 59, 60], // G
            [52, 55, 59, 57, 55, 53, 55, 57, 52, 55, 59, 57, 55, 53, 55, 57]  // Em
        ];

        // --- DRUMS ---
        if (sixteenth === 0) { // On the beat
            if (beat === 0 || beat === 2) {
                this.playKick(time);
            }
            if (beat === 1 || beat === 3) {
                this.playSnare(time);
            }
        }
        
        // Driving 16th note hi-hats, accenting the 8ths
        this.playHiHat(time, step % 2 === 0);

        // --- SYNTHS ---
        
        // Rolling 8th note bass
        if (step % 2 === 0) {
            this.playBass(time, bassNotes[bar][eighth]);
        }

        // Fast Plucking Melody
        this.playArp(time, arpProg[bar][step % 16]);

        // Lush Swelling Pads
        if (step % 16 === 0) {
            this.playPad(time, padProg[bar]);
        }
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat; 
        this.current16thNote++;
        if (this.current16thNote === 64) {
            this.current16thNote = 0; // Loop the 4-bar phrase
        }
    }

    scheduler() {
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
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    }
}
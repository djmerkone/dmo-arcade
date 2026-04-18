// src/robotron/Audio.js

export class WilliamsAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.buffers = {};
        
        // Because these are in the public folder, Vite will serve them at these exact paths!
        this.soundPaths = {
            shoot: '/robotron/sounds/robotron_shoot.wav',
            gruntDestroyed: '/robotron/sounds/robotron_grunt_destroyed.wav',
            rescue: '/robotron/sounds/robotron_human_rescued.wav',
            humanKilled: '/robotron/sounds/robotron_human_killed.wav',
            hulkShot: '/robotron/sounds/robotron_hulk_shot.wav',
            electrodeDestroyed: '/robotron/sounds/robotron_electrode_destroyed.wav',
            brainDestroyed: '/robotron/sounds/robotron_brain_destroyed.wav',
            enforcerDestroyed: '/robotron/sounds/robotron_enforcer_destroyed.wav',
            spheroidDestroyed: '/robotron/sounds/robotron_spheroid_destroyed.wav',
            start: '/robotron/sounds/robotron_start.wav',
            playerDeath: '/robotron/sounds/robotron_death.wav'
        };
    }

    async loadAssets() {
        const promises = Object.entries(this.soundPaths).map(async ([key, path]) => {
            try {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.buffers[key] = audioBuffer;
            } catch (e) {
                console.warn(`Could not load sound: ${path}`, e);
            }
        });
        await Promise.all(promises);
        console.log("Williams Audio ROMs: LOADED");
    }

    playSound(key) {
        if (!this.ctx || this.ctx.state !== 'running' || !this.buffers[key]) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[key];
        source.connect(this.ctx.destination);
        source.start(0);
    }

    playShoot() { this.playSound('shoot'); }
    playHumanRescue() { this.playSound('rescue'); }
    playHumanKilled() { this.playSound('humanKilled'); }
    playPlayerDeath() { this.playSound('playerDeath'); }
    playSpawnMaterialize() { this.playSound('start'); }
    
    playExplosion(enemyType) {
        switch(enemyType) {
            case 'hulk': this.playSound('hulkShot'); break;
            case 'electrode': this.playSound('electrodeDestroyed'); break;
            case 'brain': this.playSound('brainDestroyed'); break;
            case 'enforcer': this.playSound('enforcerDestroyed'); break;
            case 'spheroid': this.playSound('spheroidDestroyed'); break;
            case 'grunt':
            case 'prog': 
            default:
                this.playSound('gruntDestroyed'); break;
        }
    }
}
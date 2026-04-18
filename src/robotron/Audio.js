// src/robotron/Audio.js
import shootSfx from './sounds/robotron_shoot.wav';
import gruntDestroyedSfx from './sounds/robotron_grunt_destroyed.wav';
import rescueSfx from './sounds/robotron_human_rescued.wav';
import humanKilledSfx from './sounds/robotron_human_killed.wav';
import hulkShotSfx from './sounds/robotron_hulk_shot.wav';
import electrodeDestroyedSfx from './sounds/robotron_electrode_destroyed.wav';
import brainDestroyedSfx from './sounds/robotron_brain_destroyed.wav';
import enforcerDestroyedSfx from './sounds/robotron_enforcer_destroyed.wav';
import spheroidDestroyedSfx from './sounds/robotron_spheroid_destroyed.wav';
import startSfx from './sounds/robotron_start.wav';
import playerDeathSfx from './sounds/robotron_death.wav';

export class WilliamsAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.buffers = {};
        
        // Using the securely bundled Vite paths
        this.soundPaths = {
            shoot: shootSfx,
            gruntDestroyed: gruntDestroyedSfx,
            rescue: rescueSfx,
            humanKilled: humanKilledSfx,
            hulkShot: hulkShotSfx,
            electrodeDestroyed: electrodeDestroyedSfx,
            brainDestroyed: brainDestroyedSfx,
            enforcerDestroyed: enforcerDestroyedSfx,
            spheroidDestroyed: spheroidDestroyedSfx,
            start: startSfx,
            playerDeath: playerDeathSfx
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
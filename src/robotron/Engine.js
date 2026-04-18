// src/robotron/Engine.js
import { WaveDirector } from './Entities';

export class RobotronEngine {
    constructor(playSoundCallback) {
        this.WIDTH = 640;
        this.HEIGHT = 480;
        this.playSound = playSoundCallback;
        this.director = new WaveDirector(this.WIDTH, this.HEIGHT);
        this.reset();
    }

    reset() {
        this.state = {
            status: 'start', tick: 0, score: 0, wave: 1, lives: 3, WIDTH: this.WIDTH, HEIGHT: this.HEIGHT,
            player: { x: this.WIDTH/2, y: this.HEIGHT/2, speed: 4, cooldown: 0, invuln: 0, facingX: 1, facingY: 0 },
            bullets: [], enemies: [], humans: [], particles: [], electrodes: [],
            spawnTimer: 0, flash: 0,
            spawnParticles: (x, y, count, color, speed, type) => this.spawnParticles(x, y, count, color, speed, type) 
        };
    }

    startWave() {
        this.state.player.x = this.WIDTH/2;
        this.state.player.y = this.HEIGHT/2;
        this.state.bullets = [];
        this.state.spawnTimer = 60; // 1 second materialization animation!
        this.playSound('spawn');
        this.director.spawnWave(this.state.wave, this.state);
    }

    update(keys) {
        if (this.state.status !== 'playing') return this.state;
        this.state.tick++;
        const p = this.state.player;
        if (p.invuln > 0) p.invuln--;

        // If spawning, freeze gameplay logic, only update spawn timer!
        if (this.state.spawnTimer > 0) {
            this.state.spawnTimer--;
            return this.state;
        }

        // --- MOVEMENT & FIRING LOGIC ---
        let dx = 0; let dy = 0;
        if (keys['w'] || keys['arrowup']) dy -= 1; 
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1; 
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 || dy !== 0) { 
            p.facingX = dx; p.facingY = dy;
            const mag = Math.hypot(dx, dy); dx /= mag; dy /= mag; 
        } 
        
        p.x += dx * p.speed; p.y += dy * p.speed;
        p.x = Math.max(10, Math.min(this.WIDTH - 10, p.x));
        p.y = Math.max(10, Math.min(this.HEIGHT - 10, p.y));

        if (p.cooldown > 0) p.cooldown--;
        if (keys[' '] && p.cooldown <= 0) {
            let shootX = p.facingX; let shootY = p.facingY;
            const mag = Math.hypot(shootX, shootY); 
            if (mag > 0) { shootX /= mag; shootY /= mag; }
            this.state.bullets.push({ x: p.x, y: p.y, vx: shootX * 14, vy: shootY * 14, life: 40 });
            p.cooldown = 8; 
            this.playSound('shoot');
        }

        // --- GAMEPLAY LOOPS ---
        this.state.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
        this.state.bullets = this.state.bullets.filter(b => b.life > 0);

        let activeGrunts = 0;
        this.state.enemies.forEach(e => {
            if (e.type === 'grunt') activeGrunts++;
            e.update(this.state);
            if (p.invuln <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < 14) this.triggerDeath();
        });

        this.state.electrodes.forEach(el => { if (p.invuln <= 0 && Math.hypot(p.x - el.x, p.y - el.y) < 14) this.triggerDeath(); });

        this.state.bullets.forEach(b => {
            if (b.life <= 0) return;
            this.state.enemies.forEach(e => {
                if (e.active && Math.hypot(b.x - e.x, b.y - e.y) < 18) {
                    b.life = 0;
                    if (e.hp >= 9999) { 
                        this.playSound('boom', e.type); 
                        this.spawnParticles(b.x, b.y, 5, '#0f0', 2, 'spark');
                        let pushMag = Math.hypot(b.vx, b.vy); e.x += (b.vx/pushMag) * 5; e.y += (b.vy/pushMag) * 5;
                    } else {
                        e.hp--;
                        if (e.hp <= 0) {
                            e.active = false; this.state.score += e.pts; this.playSound('boom', e.type);
                            this.spawnParticles(e.x, e.y, 1, '#fa0', 0, 'enemy_death'); // Classic explosion
                        }
                    }
                }
            });
        });

        this.state.enemies = this.state.enemies.filter(e => e.active);
        
        // Update Advanced Particles
        this.state.particles.forEach(pt => { 
            pt.x += pt.vx; pt.y += pt.vy; 
            if (pt.type === 'spark') { pt.vx *= 0.9; pt.vy *= 0.9; }
            pt.life--; 
        });
        this.state.particles = this.state.particles.filter(pt => pt.life > 0);

        if (activeGrunts === 0) {
            this.state.wave++;
            this.startWave();
        }

        return this.state;
    }

    triggerDeath() {
        this.playSound('playerDeath');
        // Player death is a massive radiating cross pattern
        this.spawnParticles(this.state.player.x, this.state.player.y, 1, '#fff', 0, 'player_death');
        this.state.flash = 10; 
        this.state.lives--;
        if (this.state.lives <= 0) this.state.status = 'gameover';
        else this.state.player.invuln = 90;
    }

    spawnParticles(x, y, count, color, speed, type = 'spark') {
        if (type === 'spark') {
            for(let i=0; i<count; i++) this.state.particles.push({ type, x, y, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed, life: 15, maxLife: 15, color });
        } else {
            // enemy_death and player_death logic handled directly in renderer
            this.state.particles.push({ type, x, y, vx: 0, vy: 0, life: 30, maxLife: 30, color });
        }
    }
}
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
            player: { x: this.WIDTH/2, y: this.HEIGHT/2, speed: 4, cooldown: 0, invuln: 0 },
            bullets: [], enemies: [], humans: [], particles: [], electrodes: [],
            spawnParticles: (x, y, count, color, speed) => this.spawnParticles(x, y, count, color, speed) // Expose to Entities
        };
    }

    startWave() {
        this.state.player.x = this.WIDTH/2;
        this.state.player.y = this.HEIGHT/2;
        this.state.bullets = [];
        this.playSound('spawn');
        this.director.spawnWave(this.state.wave, this.state);
    }

    update(keys) {
        if (this.state.status !== 'playing') return this.state;
        this.state.tick++;
        const p = this.state.player;
        if (p.invuln > 0) p.invuln--;

        // --- TWIN STICK MOVEMENT ---
        let dx = 0; let dy = 0;
        if (keys['w']) dy -= 1; if (keys['s']) dy += 1;
        if (keys['a']) dx -= 1; if (keys['d']) dx += 1;
        if (dx !== 0 && dy !== 0) { const mag = Math.hypot(dx, dy); dx /= mag; dy /= mag; } 
        p.x += dx * p.speed; p.y += dy * p.speed;
        p.x = Math.max(10, Math.min(this.WIDTH - 10, p.x));
        p.y = Math.max(10, Math.min(this.HEIGHT - 10, p.y));

        // --- TWIN STICK FIRING ---
        let shootX = 0; let shootY = 0;
        if (keys['arrowup']) shootY -= 1; if (keys['arrowdown']) shootY += 1;
        if (keys['arrowleft']) shootX -= 1; if (keys['arrowright']) shootX += 1;

        if (p.cooldown > 0) p.cooldown--;
        if ((shootX !== 0 || shootY !== 0) && p.cooldown <= 0) {
            if (shootX !== 0 && shootY !== 0) { const mag = Math.hypot(shootX, shootY); shootX /= mag; shootY /= mag; }
            this.state.bullets.push({ x: p.x, y: p.y, vx: shootX * 12, vy: shootY * 12, life: 40 });
            p.cooldown = 6; this.playSound('shoot');
        }

        // --- BULLET LOGIC ---
        this.state.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
        this.state.bullets = this.state.bullets.filter(b => b.life > 0);

        // --- HUMAN LOGIC ---
        this.state.humans.forEach(h => {
            h.timer++;
            if (h.timer > 60) { h.vx = (Math.random() - 0.5) * 1.5; h.vy = (Math.random() - 0.5) * 1.5; h.timer = 0; }
            h.x += h.vx || 0; h.y += h.vy || 0;
            h.x = Math.max(10, Math.min(this.WIDTH-10, h.x)); h.y = Math.max(10, Math.min(this.HEIGHT-10, h.y));
            if (Math.hypot(p.x - h.x, p.y - h.y) < 20) {
                h.active = false; this.state.score += 1000; this.playSound('rescue'); this.spawnParticles(h.x, h.y, 10, '#0ff', 4);
            }
        });

        // --- ENEMY LOGIC (Delegated to Entities.js!) ---
        let activeGrunts = 0;
        this.state.enemies.forEach(e => {
            if (e.type === 'grunt') activeGrunts++;
            
            // Entity thinks for itself
            e.update(this.state);

            // Player Collision
            if (p.invuln <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < 12) this.triggerDeath();
        });

        // Electrode Collision
        this.state.electrodes.forEach(el => { if (p.invuln <= 0 && Math.hypot(p.x - el.x, p.y - el.y) < 12) this.triggerDeath(); });

        // Bullet vs Enemy Collision
        this.state.bullets.forEach(b => {
            if (b.life <= 0) return;
            this.state.enemies.forEach(e => {
                if (e.active && Math.hypot(b.x - e.x, b.y - e.y) < 16) {
                    b.life = 0;
                    if (e.hp >= 9999) { // Indestructible Hulk
                        this.playSound('boom', true); this.spawnParticles(b.x, b.y, 5, '#0f0', 2);
                        let pushMag = Math.hypot(b.vx, b.vy); e.x += (b.vx/pushMag) * 5; e.y += (b.vy/pushMag) * 5;
                    } else {
                        e.hp--;
                        if (e.hp <= 0) {
                            e.active = false; this.state.score += e.pts; this.playSound('boom', false);
                            // Color code explosions based on enemy type
                            let color = e.type === 'prog' ? '#f00' : (e.type === 'enforcer' ? '#0ff' : '#fa0');
                            this.spawnParticles(e.x, e.y, 25, color, 8);
                        }
                    }
                }
            });
            this.state.electrodes.forEach(el => {
                if (el.active && Math.hypot(b.x - el.x, b.y - el.y) < 15) {
                    b.life = 0; el.active = false; this.playSound('boom', false); this.spawnParticles(el.x, el.y, 15, '#ff0', 5);
                }
            });
        });

        // Clean up memory
        this.state.enemies = this.state.enemies.filter(e => e.active);
        this.state.humans = this.state.humans.filter(h => h.active);
        this.state.electrodes = this.state.electrodes.filter(el => el.active);
        this.state.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vx *= 0.95; pt.vy *= 0.95; pt.life--; });
        this.state.particles = this.state.particles.filter(pt => pt.life > 0);

        // Proceed to next wave if Grunts are dead!
        if (activeGrunts === 0 && this.state.status === 'playing') {
            this.state.wave++;
            this.startWave();
        }

        return this.state;
    }

    triggerDeath() {
        this.spawnParticles(this.state.player.x, this.state.player.y, 50, '#fff', 10);
        this.playSound('boom', true);
        this.state.lives--;
        if (this.state.lives <= 0) this.state.status = 'gameover';
        else this.state.player.invuln = 90;
    }

    spawnParticles(x, y, count, color, speed) {
        for(let i=0; i<count; i++) this.state.particles.push({ x, y, vx: (Math.random() - 0.5) * speed, vy: (Math.random() - 0.5) * speed, life: 20 + Math.random() * 30, color });
    }
}
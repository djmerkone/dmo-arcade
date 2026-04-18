// src/robotron/Engine.js
import { WaveDirector } from './Entities';

export class RobotronEngine {
    constructor(playSoundCallback) {
        this.WIDTH = 1920; 
        this.HEIGHT = 1080;
        this.playSound = playSoundCallback;
        this.director = new WaveDirector(this.WIDTH, this.HEIGHT);
        this.reset();
    }

    reset() {
        this.state = {
            status: 'start', tick: 0, score: 0, wave: 1, lives: 3, 
            WIDTH: this.WIDTH, HEIGHT: this.HEIGHT,
            player: { x: this.WIDTH/2, y: this.HEIGHT/2, speed: 6, cooldown: 0, invuln: 0, facingX: 1, facingY: 0 },
            bullets: [], enemies: [], humans: [], particles: [], electrodes: [],
            spawnTimer: 0, transitionTimer: 0, flash: 0, humanMultiplier: 0
        };
    }

    startWave() {
        this.state.player.x = this.WIDTH/2;
        this.state.player.y = this.HEIGHT/2;
        this.state.bullets = [];
        this.state.particles = [];
        this.state.humanMultiplier = 0; // Resets human rescue combo each wave
        
        // Massive 1.5 second materialization phase
        this.state.spawnTimer = 90; 
        this.playSound('spawn');
        
        this.director.WIDTH = this.WIDTH;
        this.director.HEIGHT = this.HEIGHT;
        this.director.spawnWave(this.state.wave, this.state);
    }

    update(keys) {
        if (this.state.status !== 'playing') return this.state;
        this.state.tick++;
        const p = this.state.player;
        if (p.invuln > 0) p.invuln--;

        // --- WAVE TRANSITION PHASE ---
        if (this.state.transitionTimer > 0) {
            this.state.transitionTimer--;
            if (this.state.transitionTimer <= 0) {
                this.state.wave++;
                this.startWave();
            }
            return this.state; 
        }

        // --- MATERIALIZATION PHASE ---
        if (this.state.spawnTimer > 0) {
            this.state.spawnTimer--;
            return this.state; 
        }

        // --- FULL SPEED MOVEMENT & FIRING ---
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
        p.x = Math.max(20, Math.min(this.WIDTH - 20, p.x));
        p.y = Math.max(20, Math.min(this.HEIGHT - 20, p.y));

        if (p.cooldown > 0) p.cooldown--;
        if (keys[' '] && p.cooldown <= 0) {
            let shootX = p.facingX; let shootY = p.facingY;
            const mag = Math.hypot(shootX, shootY); 
            if (mag > 0) { shootX /= mag; shootY /= mag; }
            this.state.bullets.push({ x: p.x, y: p.y, vx: shootX * 20, vy: shootY * 20, life: 60 });
            p.cooldown = 6; 
            this.playSound('shoot');
        }

        // --- HUMAN RESCUE LOGIC (RESTORED!) ---
        this.state.humans.forEach(h => {
            h.timer++;
            // Wander aimlessly
            if (h.timer > 60) { h.vx = (Math.random() - 0.5) * 2; h.vy = (Math.random() - 0.5) * 2; h.timer = 0; }
            h.x += h.vx || 0; h.y += h.vy || 0;
            h.x = Math.max(20, Math.min(this.WIDTH-20, h.x)); h.y = Math.max(20, Math.min(this.HEIGHT-20, h.y));
            
            // Player Collision (Rescue)
            if (Math.hypot(p.x - h.x, p.y - h.y) < 30) {
                h.active = false; 
                this.state.humanMultiplier = Math.min(5000, this.state.humanMultiplier + 1000);
                this.state.score += this.state.humanMultiplier;
                this.playSound('rescue'); 
                // Spawn floating text!
                this.spawnParticles(h.x, h.y, null, 'text', this.state.humanMultiplier.toString());
            }
        });
        this.state.humans = this.state.humans.filter(h => h.active);

        // --- BULLET & ENEMY COLLISION LOGIC ---
        this.state.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
        this.state.bullets = this.state.bullets.filter(b => b.life > 0);

        let activeGrunts = 0;
        this.state.enemies.forEach(e => {
            if (e.type === 'grunt') activeGrunts++;
            e.update(this.state);
            if (p.invuln <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < 20) this.triggerDeath();
        });

        this.state.electrodes.forEach(el => { if (p.invuln <= 0 && Math.hypot(p.x - el.x, p.y - el.y) < 20) this.triggerDeath(); });

        this.state.bullets.forEach(b => {
            if (b.life <= 0) return;
            this.state.enemies.forEach(e => {
                if (e.active && Math.hypot(b.x - e.x, b.y - e.y) < 24) {
                    b.life = 0;
                    if (e.hp >= 9999) { 
                        this.playSound('boom', e.type); 
                        this.spawnParticles(b.x, b.y, '#0f0', 'deflect'); 
                        let pushMag = Math.hypot(b.vx, b.vy); e.x += (b.vx/pushMag) * 8; e.y += (b.vy/pushMag) * 8;
                    } else {
                        e.hp--;
                        if (e.hp <= 0) {
                            e.active = false; this.state.score += e.pts; this.playSound('boom', e.type);
                            let color = e.type === 'prog' ? '#f00' : (e.type === 'enforcer' ? '#0ff' : '#fa0');
                            this.spawnParticles(e.x, e.y, color, 'enemy_death'); 
                        }
                    }
                }
            });
            this.state.electrodes.forEach(el => {
                if (el.active && Math.hypot(b.x - el.x, b.y - el.y) < 24) {
                    b.life = 0; el.active = false; this.playSound('boom', 'electrode');
                    this.spawnParticles(el.x, el.y, '#ff0', 'enemy_death');
                }
            });
        });

        this.state.enemies = this.state.enemies.filter(e => e.active);
        this.state.electrodes = this.state.electrodes.filter(el => el.active);
        
        // --- PARTICLE LOGIC ---
        this.state.particles.forEach(pt => { 
            if (pt.type === 'dot' || pt.type === 'deflect') {
                pt.x += pt.vx; pt.y += pt.vy; 
                pt.vx *= 0.92; pt.vy *= 0.92; 
            }
            pt.life--; 
        });
        this.state.particles = this.state.particles.filter(pt => pt.life > 0);

        // --- WAVE COMPLETE CHECK ---
        if (activeGrunts === 0 && this.state.transitionTimer === 0 && this.state.spawnTimer === 0) {
            this.state.transitionTimer = 100; // Triggers the flashing level-end sequence!
        }

        return this.state;
    }

    triggerDeath() {
        this.playSound('playerDeath');
        this.spawnParticles(this.state.player.x, this.state.player.y, '#fff', 'player_death');
        this.state.flash = 15; 
        this.state.lives--;
        if (this.state.lives <= 0) this.state.status = 'gameover';
        else this.state.player.invuln = 120;
    }

    spawnParticles(x, y, color, type, extraData = '') {
        if (type === 'enemy_death') {
            this.state.particles.push({ type: 'enemy_death', x, y, life: 15, maxLife: 15, color });
            for(let i=0; i<8; i++) {
                this.state.particles.push({ type: 'dot', x, y, vx: (Math.random()-0.5)*25, vy: (Math.random()-0.5)*25, life: 25, maxLife: 25, color });
            }
        } else if (type === 'player_death') {
            this.state.particles.push({ type: 'player_death', x, y, life: 50, maxLife: 50, color: '#fff' });
        } else if (type === 'deflect') {
            for(let i=0; i<5; i++) {
                this.state.particles.push({ type: 'dot', x, y, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 15, maxLife: 15, color });
            }
        } else if (type === 'text') {
            // Floating score multiplier text
            this.state.particles.push({ type: 'text', x, y, text: extraData, life: 60, maxLife: 60 });
        }
    }
}
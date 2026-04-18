// src/1942/Engine.js

import { WaveDirector } from './Entities';

export class GameEngine {
    constructor(playSoundCallback) {
        this.GAME_WIDTH = 320;   // 4:3 Aspect Ratio
        this.GAME_HEIGHT = 240;
        this.playSound = playSoundCallback;
        this.director = new WaveDirector();
        this.reset();
    }

    reset() {
        this.state = {
            status: 'playing',
            tick: 0,
            score: 0,
            lives: 3,
            rolls: 3,
            player: { 
                x: this.GAME_WIDTH / 2, 
                y: this.GAME_HEIGHT - 30, 
                vx: 0, vy: 0, 
                speed: 2.5, 
                cooldown: 0, 
                isRolling: false, 
                rollTimer: 0, 
                powerLevel: 1 
            },
            bullets: [],
            enemyBullets: [],
            enemies: [],
            particles: [],
            powerups: []
        };
    }

    update(keys) {
        if (this.state.status !== 'playing') return this.state;
        this.state.tick++;

        this.updatePlayer(keys);
        this.updateBullets();
        this.updateEnemies();
        this.updateParticles();
        this.checkCollisions();

        return this.state;
    }

    updatePlayer(keys) {
        const p = this.state.player;

        // --- EVASIVE ROLL MECHANIC ---
        if (p.isRolling) {
            p.rollTimer--;
            p.y -= 0.5; // Drift forward while looping
            if (p.rollTimer <= 0) p.isRolling = false;
            return; // Skip input while rolling
        }

        // --- 8-WAY MOVEMENT ---
        let dx = 0; let dy = 0;
        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        // Normalize diagonals so you don't move 40% faster diagonally
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length; dy /= length;
        }

        p.x += dx * p.speed;
        p.y += dy * p.speed;

        // Hard boundaries
        p.x = Math.max(16, Math.min(this.GAME_WIDTH - 16, p.x));
        p.y = Math.max(16, Math.min(this.GAME_HEIGHT - 16, p.y));

        // --- ACTIONS ---
        if ((keys['shift'] || keys['z']) && this.state.rolls > 0) {
            p.isRolling = true;
            p.rollTimer = 60; // 1-second invulnerability loop
            this.state.rolls--;
            this.playSound('roll');
        }

        if (p.cooldown > 0) p.cooldown--;
        if (keys[' '] && p.cooldown <= 0) {
            if (p.powerLevel === 1) {
                this.state.bullets.push({ x: p.x - 6, y: p.y - 12, vx: 0, vy: -6 });
                this.state.bullets.push({ x: p.x + 6, y: p.y - 12, vx: 0, vy: -6 });
            } else { // Quad Shot!
                this.state.bullets.push({ x: p.x - 12, y: p.y - 8, vx: -0.5, vy: -6 });
                this.state.bullets.push({ x: p.x - 4,  y: p.y - 12, vx: 0, vy: -6 });
                this.state.bullets.push({ x: p.x + 4,  y: p.y - 12, vx: 0, vy: -6 });
                this.state.bullets.push({ x: p.x + 12, y: p.y - 8, vx: 0.5, vy: -6 });
            }
            p.cooldown = 10;
            this.playSound('shoot');
        }
    }

    updateBullets() {
        // Move & Cull Player Bullets
        this.state.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
        this.state.bullets = this.state.bullets.filter(b => b.y > -10);

        // Move & Cull Enemy Bullets
        this.state.enemyBullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
        this.state.enemyBullets = this.state.enemyBullets.filter(b => b.y < this.GAME_HEIGHT + 10 && b.x > -10 && b.x < this.GAME_WIDTH + 10);
    }

updateEnemies() {
        // Let the director spawn new planes
        this.director.processSpawns(this.state.enemies);

        // Let the planes fly themselves
        this.state.enemies.forEach(e => e.update(this.state.player, this.state.enemyBullets));
        
        // Clean up planes that flew off screen
        this.state.enemies = this.state.enemies.filter(e => e.active);
    }

    updateParticles() {
        // Explosions and Powerups
        this.state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
        this.state.particles = this.state.particles.filter(p => p.life > 0);

        this.state.powerups.forEach(p => { p.y += 1; });
        this.state.powerups = this.state.powerups.filter(p => p.y < this.GAME_HEIGHT + 20);
    }

    checkCollisions() {
        const p = this.state.player;

        // 1. Player Bullets vs Enemies
        for (let i = this.state.enemies.length - 1; i >= 0; i--) {
            let e = this.state.enemies[i];
            let hit = false;
            
            for (let j = this.state.bullets.length - 1; j >= 0; j--) {
                let b = this.state.bullets[j];
                // Distance based collision (Radius 12)
                if (Math.hypot(b.x - e.x, b.y - e.y) < 12) {
                    this.state.bullets.splice(j, 1);
                    e.hp--;
                    hit = true;
                    
                    // Small impact sparks
                    this.spawnExplosion(b.x, b.y, 3, '#fff');

                    if (e.hp <= 0) {
                        this.state.score += e.pts;
                        this.spawnExplosion(e.x, e.y, 15, e.type === 'redZero' ? '#f00' : '#fa0');
                        if (e.hasPowerup) this.state.powerups.push({ x: e.x, y: e.y });
                        this.state.enemies.splice(i, 1);
                        this.playSound('boom');
                    }
                    break; // Bullet consumed
                }
            }
        }

        // 2. Player vs Powerups
        for (let i = this.state.powerups.length - 1; i >= 0; i--) {
            let pu = this.state.powerups[i];
            if (Math.hypot(pu.x - p.x, pu.y - p.y) < 20 && !p.isRolling) {
                p.powerLevel = 2;
                this.state.score += 500;
                this.state.powerups.splice(i, 1);
                this.playSound('powerup');
            }
        }

        // 3. Player vs Death (Bullets & Enemy Bodies)
        if (!p.isRolling && this.state.status === 'playing') {
            let hitDeath = false;
            
            // Check enemy bullets (Radius 4 - strict bullet hell hitbox!)
            this.state.enemyBullets.forEach(b => { if (Math.hypot(b.x - p.x, b.y - p.y) < 4) hitDeath = true; });
            
            // Check enemy bodies (Radius 12)
            this.state.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) < 12) hitDeath = true; });

            if (hitDeath) {
                this.spawnExplosion(p.x, p.y, 40, '#ffaa00');
                this.playSound('boom');
                this.state.lives--;
                this.state.enemies = []; // Clear screen
                this.state.enemyBullets = [];
                
                if (this.state.lives <= 0) {
                    this.state.status = 'gameover';
                } else {
                    // Respawn
                    p.x = this.GAME_WIDTH / 2;
                    p.y = this.GAME_HEIGHT - 30;
                    p.powerLevel = 1;
                    p.isRolling = true;
                    p.rollTimer = 90; // 1.5 seconds of spawn invulnerability
                    this.state.rolls = 3; // Reset rolls
                }
            }
        }
    }

    spawnExplosion(x, y, count, color) {
        for(let i=0; i<count; i++) {
            this.state.particles.push({
                x, y, 
                vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4,
                life: 15 + Math.random()*20, 
                color: color
            });
        }
    }
}
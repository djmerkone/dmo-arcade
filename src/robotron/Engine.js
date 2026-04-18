import { WaveDirector } from './Entities';

export class RobotronEngine {
    constructor(playSoundCallback) {
        // High-res internal grid (Renderer will scale this to whatever your screen size is)
        this.WIDTH = 1920; 
        this.HEIGHT = 1080;
        
        this.playSound = playSoundCallback;
        this.director = new WaveDirector(this.WIDTH, this.HEIGHT);
        this.reset();
    }

    reset() {
        this.state = {
            status: 'start', 
            tick: 0, 
            score: 0, 
            wave: 1, 
            lives: 3, 
            WIDTH: this.WIDTH, 
            HEIGHT: this.HEIGHT,
            
            // Player State
            player: { 
                x: this.WIDTH / 2, 
                y: this.HEIGHT / 2, 
                speed: 7, // Faster, truer to arcade twin-stick speed
                cooldown: 0, 
                invuln: 0, 
                facingX: 1, 
                facingY: 0 
            },
            
            // Entity Arrays
            bullets: [], 
            enemies: [], 
            humans: [], 
            particles: [], 
            electrodes: [],
            
            // Timing & Sequence States
            spawnTimer: 0, 
            transitionTimer: 0, 
            flash: 0, 
            
            // Combo System
            humanMultiplier: 0,
            
            // System Delegates (Allows Entities.js to call Engine functions)
            spawnParticles: (x, y, color, type) => this.spawnParticles(x, y, color, type),
            spawnFloatingText: (x, y, text, color) => this.spawnFloatingText(x, y, text, color),
            triggerSound: (soundId, subType) => this.playSound(soundId, subType)
        };
    }

    startWave() {
        this.state.player.x = this.WIDTH / 2;
        this.state.player.y = this.HEIGHT / 2;
        this.state.bullets = [];
        this.state.particles = [];
        
        // Reset the human rescue combo at the start of every wave
        this.state.humanMultiplier = 0; 
        
        // 90 Frames (1.5 seconds) of materialization animation where nothing moves
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

        // --- SEQUENCE MANAGERS ---
        // 1. Wave Complete Flash Sequence
        if (this.state.transitionTimer > 0) {
            this.state.transitionTimer--;
            if (this.state.transitionTimer <= 0) {
                this.state.wave++;
                this.startWave();
            }
            return this.state; // Freeze physical logic during transition
        }

        // 2. Wave Start Materialization Sequence
        if (this.state.spawnTimer > 0) {
            this.state.spawnTimer--;
            return this.state; // Freeze physical logic during spawn
        }

        // --- PLAYER MOVEMENT (8-WAY) ---
        let dx = 0; let dy = 0;
        if (keys['w'] || keys['arrowup']) dy -= 1; 
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1; 
        if (keys['d'] || keys['arrowright']) dx += 1;

        if (dx !== 0 || dy !== 0) { 
            p.facingX = dx; 
            p.facingY = dy;
            const mag = Math.hypot(dx, dy); 
            dx /= mag; 
            dy /= mag; 
        } 
        
        p.x += dx * p.speed; 
        p.y += dy * p.speed;
        
        // Hard Boundaries
        p.x = Math.max(30, Math.min(this.WIDTH - 30, p.x));
        p.y = Math.max(30, Math.min(this.HEIGHT - 30, p.y));

        // --- PLAYER FIRING ---
        if (p.cooldown > 0) p.cooldown--;
        if (keys[' '] && p.cooldown <= 0) {
            let shootX = p.facingX; let shootY = p.facingY;
            const mag = Math.hypot(shootX, shootY); 
            if (mag > 0) { shootX /= mag; shootY /= mag; }
            
            // Williams bullets were incredibly fast
            this.state.bullets.push({ x: p.x, y: p.y, vx: shootX * 24, vy: shootY * 24, life: 60 });
            p.cooldown = 6; 
            this.playSound('shoot');
        }

        // --- HUMAN LOGIC & RESCUE COMBO ---
        this.state.humans.forEach(h => {
            if (!h.active) return;
            h.timer++;
            
            // Erratic Williams Wander Pattern
            if (h.timer > (30 + Math.random() * 60)) { 
                h.vx = (Math.random() - 0.5) * 2.5; 
                h.vy = (Math.random() - 0.5) * 2.5; 
                h.timer = 0; 
            }
            h.x += h.vx || 0; 
            h.y += h.vy || 0;
            h.x = Math.max(30, Math.min(this.WIDTH - 30, h.x)); 
            h.y = Math.max(30, Math.min(this.HEIGHT - 30, h.y));
            
            // RESCUE HITBOX CHECK
            if (p.invuln <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < 30) {
                h.active = false; 
                
                // Trigger the massive combo scoring system (Caps at 5000)
                this.state.humanMultiplier = Math.min(5000, this.state.humanMultiplier + 1000);
                this.state.score += this.state.humanMultiplier;
                
                // EXPLICIT AUDIO CALL
                this.playSound('rescue'); 
                
                // Spawn Floating Math
                this.spawnFloatingText(h.x, h.y, this.state.humanMultiplier.toString(), '#0ff');
            }
        });
        
        // Clean out rescued or murdered humans
        this.state.humans = this.state.humans.filter(h => h.active);

        // --- ENTITY UPDATES ---
        this.state.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; b.life--; });
        this.state.bullets = this.state.bullets.filter(b => b.life > 0);

        let activeHostiles = 0;
        
        this.state.enemies.forEach(e => {
            // Only Grunts, Brains, Spheroids, and Enforcers count toward wave completion. Hulks stay!
            if (e.type !== 'hulk') activeHostiles++;
            
            // Pass the master state to the entity so it can think (hunt humans, shoot sparks, etc)
            e.update(this.state);
            
            // Enemy touches Player = Death
            if (p.invuln <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < 24) this.triggerDeath();
        });

        // Electrode Collision against Player
        this.state.electrodes.forEach(el => { 
            if (p.invuln <= 0 && Math.hypot(p.x - el.x, p.y - el.y) < 24) this.triggerDeath(); 
        });

        // --- BULLET HIT DETECTION ---
        this.state.bullets.forEach(b => {
            if (b.life <= 0) return;
            
            // Vs Enemies
            this.state.enemies.forEach(e => {
                if (e.active && Math.hypot(b.x - e.x, b.y - e.y) < 28) {
                    b.life = 0;
                    if (e.hp >= 9999) { 
                        // Indestructible objects (Hulks)
                        this.playSound('boom', e.type); 
                        this.spawnParticles(b.x, b.y, '#0f0', 'deflect'); 
                        
                        // Deflection Pushback
                        let pushMag = Math.hypot(b.vx, b.vy); 
                        e.x += (b.vx / pushMag) * 12; 
                        e.y += (b.vy / pushMag) * 12;
                    } else {
                        e.hp--;
                        if (e.hp <= 0) {
                            e.active = false; 
                            this.state.score += e.pts; 
                            this.playSound('boom', e.type);
                            
                            // Specific colors for specific deaths
                            let color = e.type === 'prog' ? '#f00' : (e.type === 'enforcer' ? '#0ff' : '#fa0');
                            this.spawnParticles(e.x, e.y, color, 'enemy_death'); 
                        }
                    }
                }
            });
            
            // Vs Electrodes
            this.state.electrodes.forEach(el => {
                if (el.active && Math.hypot(b.x - el.x, b.y - el.y) < 26) {
                    b.life = 0; 
                    el.active = false; 
                    this.playSound('boom', 'electrode');
                    this.spawnParticles(el.x, el.y, '#ff0', 'electrode_death');
                }
            });
        });

        // Garbage collection
        this.state.enemies = this.state.enemies.filter(e => e.active);
        this.state.electrodes = this.state.electrodes.filter(el => el.active);
        
        // --- HYPER GEOMETRY PARTICLE UPDATER ---
        this.state.particles.forEach(pt => { 
            if (pt.type === 'slice' || pt.type === 'death_slice') {
                // Slices stretch outward from the point of impact
                pt.x += Math.cos(pt.angle) * pt.speed;
                pt.y += Math.sin(pt.angle) * pt.speed;
                pt.length += pt.stretchRate; 
            } else if (pt.type === 'text') {
                // Multiplier text floats UP
                pt.y -= 1.5;
            } else {
                // Standard debris slows down (friction)
                pt.x += pt.vx; 
                pt.y += pt.vy; 
                pt.vx *= 0.90; 
                pt.vy *= 0.90; 
            }
            pt.life--; 
        });
        
        this.state.particles = this.state.particles.filter(pt => pt.life > 0);

        // --- WAVE PROGRESSION ---
        if (activeHostiles === 0 && this.state.transitionTimer === 0 && this.state.spawnTimer === 0) {
            this.state.transitionTimer = 120; // Triggers the 2-second flashing level-end sequence!
        }

        return this.state;
    }

    triggerDeath() {
        this.playSound('playerDeath');
        this.state.humanMultiplier = 0; // Death resets the rescue combo
        
        // Trigger the massive geometry explosion
        this.spawnParticles(this.state.player.x, this.state.player.y, '#ffffff', 'player_death');
        
        this.state.flash = 15; // Flashes the entire canvas red
        this.state.lives--;
        
        if (this.state.lives <= 0) {
            this.state.status = 'gameover';
        } else {
            this.state.player.invuln = 120; // 2 Seconds of invulnerability
        }
    }

    // --- WILLIAMS GEOMETRY GENERATOR ---
    spawnParticles(x, y, color, type) {
        if (type === 'enemy_death' || type === 'electrode_death') {
            // THE CLASSIC WILLIAMS SLICES (8-Way spreading lines)
            for(let i=0; i<8; i++) {
                this.state.particles.push({
                    type: 'slice', 
                    x, y, 
                    angle: (i/8) * Math.PI * 2, 
                    speed: 12 + Math.random()*5, 
                    length: 10, 
                    stretchRate: 2.5,
                    life: 30, 
                    maxLife: 30, 
                    color
                });
            }
            // Central chunky debris
            for(let i=0; i<15; i++) {
                this.state.particles.push({
                    type: 'dot', 
                    x, y, 
                    vx: (Math.random()-0.5)*25, 
                    vy: (Math.random()-0.5)*25, 
                    life: 20, maxLife: 20, color
                });
            }
        } 
        else if (type === 'player_death') {
            // MASSIVE 16-Way spreading lines for player death
            for(let i=0; i<16; i++) {
                this.state.particles.push({
                    type: 'death_slice', 
                    x, y, 
                    angle: (i/16) * Math.PI * 2, 
                    speed: 25 + Math.random()*10, 
                    length: 20, 
                    stretchRate: 5.0, // Stretches extremely fast
                    life: 60, maxLife: 60, 
                    color: '#ffffff'
                });
            }
            for(let i=0; i<40; i++) {
                this.state.particles.push({
                    type: 'dot', 
                    x, y, 
                    vx: (Math.random()-0.5)*40, 
                    vy: (Math.random()-0.5)*40, 
                    life: 45, maxLife: 45, color: '#ffff00'
                });
            }
        } 
        else if (type === 'deflect') {
            for(let i=0; i<6; i++) {
                this.state.particles.push({ 
                    type: 'dot', 
                    x, y, 
                    vx: (Math.random()-0.5)*12, 
                    vy: (Math.random()-0.5)*12, 
                    life: 12, maxLife: 12, color 
                });
            }
        }
    }

    spawnFloatingText(x, y, text, color) {
        this.state.particles.push({ 
            type: 'text', 
            x, y, 
            text: text, 
            color: color,
            life: 60, 
            maxLife: 60 
        });
    }
}
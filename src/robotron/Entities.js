// src/robotron/Entities.js

export class WaveDirector {
    constructor(width, height) {
        this.WIDTH = width;
        this.HEIGHT = height;
    }

    spawnWave(waveNum, state) {
        state.enemies = []; 
        state.humans = []; 
        state.electrodes = [];
        
        // --- WILLIAMS SENSORY OVERLOAD MATH ---
        // Grunts swarm exponentially. Brains appear on Wave 2. Spheroids on Wave 3.
        const grunts = Math.min(120, 15 + (waveNum * 12));
        const hulks = Math.min(15, 3 + Math.floor(waveNum / 2));
        const humans = Math.min(12, 4 + Math.floor(waveNum / 2));
        const brains = waveNum >= 2 ? Math.min(12, 2 + waveNum) : 0;
        const spheroids = waveNum >= 3 ? Math.min(10, 1 + waveNum) : 0;
        const electrodes = Math.min(50, 10 + (waveNum * 5));

        // 1. Populate Electrodes (Randomly scattered obstacles)
        for(let i=0; i < electrodes; i++) {
            state.electrodes.push({ 
                x: 40 + Math.random() * (this.WIDTH - 80), 
                y: 40 + Math.random() * (this.HEIGHT - 80), 
                active: true 
            });
        }
        
        // 2. Populate Humans (The bait)
        for(let i=0; i < humans; i++) {
            state.humans.push({ 
                x: 40 + Math.random() * (this.WIDTH - 80), 
                y: 40 + Math.random() * (this.HEIGHT - 80), 
                active: true, 
                timer: Math.random() * 100,
                vx: 0, vy: 0
            });
        }

        // 3. Populate Grunts (Spawned in an outer ring so they collapse inward on the player)
        for(let i=0; i < grunts; i++) {
            let pos = this.getSafeSpawn(state.player);
            state.enemies.push(new Grunt(pos.x, pos.y, waveNum));
        }

        // 4. Populate Hulks (Indestructible squashers)
        for(let i=0; i < hulks; i++) {
            state.enemies.push(new Hulk(Math.random() * this.WIDTH, Math.random() * this.HEIGHT, waveNum));
        }

        // 5. Populate Brains (The mutating masterminds)
        for(let i=0; i < brains; i++) {
            let pos = this.getSafeSpawn(state.player);
            state.enemies.push(new Brain(pos.x, pos.y, waveNum));
        }

        // 6. Populate Spheroids (Mobile factories)
        for(let i=0; i < spheroids; i++) {
            // Spheroids always spawn on the edges
            let ex = Math.random() > 0.5 ? 20 : this.WIDTH - 20;
            let ey = Math.random() * this.HEIGHT;
            state.enemies.push(new Spheroid(ex, ey, waveNum));
        }
    }

    // Ensures Grunts and Brains don't spawn directly on top of the player
    getSafeSpawn(player) {
        let ex, ey;
        do {
            ex = Math.random() * this.WIDTH; 
            ey = Math.random() * this.HEIGHT;
        } while (Math.hypot(ex - player.x, ey - player.y) < 300); // 300px safe zone
        return {x: ex, y: ey};
    }
}

// --- BASE ENTITY CLASS ---
export class Enemy {
    constructor(x, y, type, pts, hp = 1) {
        this.x = x; this.y = y; this.type = type; this.pts = pts; this.hp = hp;
        this.active = true; this.timer = 0;
    }
    
    // Smooth vector tracking used by most enemies
    moveTowards(targetX, targetY, speed) {
        let dx = targetX - this.x; let dy = targetY - this.y;
        let mag = Math.hypot(dx, dy);
        if (mag > 0) { 
            this.x += (dx/mag) * speed; 
            this.y += (dy/mag) * speed; 
        }
    }
}

// --- THE GRUNT (The Swarm) ---
export class Grunt extends Enemy {
    constructor(x, y, wave) { 
        super(x, y, 'grunt', 100); 
        // Base speed is slow, but becomes terrifyingly fast in later waves
        this.speed = 1.2 + (wave * 0.2); 
    }
    update(state) { 
        this.moveTowards(state.player.x, state.player.y, this.speed); 
    }
}

// --- THE HULK (The Indestructible Human-Squasher) ---
export class Hulk extends Enemy {
    constructor(x, y, wave) { 
        super(x, y, 'hulk', 0, 9999); 
        this.speed = 0.8 + (wave * 0.05); 
    } 
    update(state) {
        // Hulks actively hunt humans first. If no humans exist, they wander toward the player.
        let target = this.getClosest(this, state.humans);
        if (target) {
            this.moveTowards(target.x, target.y, this.speed);
        } else {
            this.moveTowards(state.player.x, state.player.y, this.speed * 0.5);
        }

        // Hulk squashes humans!
        state.humans.forEach(h => { 
            if (h.active && Math.hypot(this.x - h.x, this.y - h.y) < 20) { 
                h.active = false; 
                state.triggerSound('humanKilled');
                state.spawnParticles(h.x, h.y, '#ff0000', 'enemy_death'); // Gory red explosion
            }
        });
    }

    getClosest(self, targets) {
        let closest = null; let minDist = Infinity;
        targets.forEach(t => {
            if (!t.active) return;
            let dist = Math.hypot(self.x - t.x, self.y - t.y);
            if (dist < minDist) { minDist = dist; closest = t; }
        });
        return closest;
    }
}

// --- THE BRAIN (The Mutator) ---
export class Brain extends Enemy {
    constructor(x, y, wave) { 
        super(x, y, 'brain', 500); 
        this.speed = 2.0 + (wave * 0.1); 
    }
    update(state) {
        // Brains hunt humans to mutate them.
        let target = this.getClosest(this, state.humans);
        if (target) {
            this.moveTowards(target.x, target.y, this.speed);
            
            // Brain captures human -> Converts to Prog!
            if (Math.hypot(this.x - target.x, this.y - target.y) < 20) {
                target.active = false;
                
                // Spawn a deadly Prog in the human's place
                state.enemies.push(new Prog(target.x, target.y, this.speed * 1.5));
                state.triggerSound('humanKilled'); // Sound of human dying
                state.triggerSound('spawn');       // Sound of Prog being born
                
                // Cyan mutation flash
                state.spawnParticles(target.x, target.y, '#00ffff', 'deflect');
            }
        } else {
            // If all humans are dead/mutated, the Brain comes for YOU.
            this.moveTowards(state.player.x, state.player.y, this.speed);
        }
    }

    getClosest(self, targets) {
        let closest = null; let minDist = Infinity;
        targets.forEach(t => {
            if (!t.active) return;
            let dist = Math.hypot(self.x - t.x, self.y - t.y);
            if (dist < minDist) { minDist = dist; closest = t; }
        });
        return closest;
    }
}

// --- THE PROG (The Hyper-Aggressive Mutant) ---
export class Prog extends Enemy {
    constructor(x, y, speed) { 
        super(x, y, 'prog', 100); 
        this.speed = speed; 
        this.timer = 0;
    }
    update(state) { 
        this.timer++;
        // Progs continually accelerate the longer they are alive!
        let currentSpeed = this.speed + (this.timer * 0.005);
        this.moveTowards(state.player.x, state.player.y, currentSpeed); 
    }
}

// --- THE SPHEROID (The Factory) ---
export class Spheroid extends Enemy {
    constructor(x, y, wave) { 
        super(x, y, 'spheroid', 1000); 
        // Erratically drifts around the screen
        this.vx = (Math.random() - 0.5) * 6; 
        this.vy = (Math.random() - 0.5) * 6;
        this.capacity = 3 + Math.floor(Math.random() * 4); // Births 3 to 6 Enforcers
    }
    update(state) {
        this.timer++;
        this.x += this.vx; this.y += this.vy;
        
        // Bounce off walls
        if (this.x < 30 || this.x > state.WIDTH-30) this.vx *= -1;
        if (this.y < 30 || this.y > state.HEIGHT-30) this.vy *= -1;
        
        // Factory Production Logic (Births an Enforcer every ~2 seconds)
        if (this.timer % 120 === 0 && this.capacity > 0) {
            this.capacity--;
            state.enemies.push(new Enforcer(this.x, this.y));
            state.triggerSound('spawn');
            state.spawnParticles(this.x, this.y, '#00ffff', 'deflect');
        }

        // If empty, drift off the screen and despawn
        if (this.capacity <= 0) {
            this.vy -= 0.1; // Float away upward
            if (this.y < -50) this.active = false;
        }
    }
}

// --- THE ENFORCER (The Turret) ---
export class Enforcer extends Enemy {
    constructor(x, y) { 
        super(x, y, 'enforcer', 150); 
        this.vx = 0; this.vy = 0;
        this.burstTimer = 0;
    }
    update(state) {
        this.timer++;
        this.burstTimer++;

        // Enforcers use "Burst Movement". They stop, shoot, then sprint to a new location.
        if (this.burstTimer > 100) {
            // Pick a new burst trajectory
            this.vx = (Math.random() - 0.5) * 8; 
            this.vy = (Math.random() - 0.5) * 8;
            this.burstTimer = 0;
        } else if (this.burstTimer > 30) {
            // Apply friction to stop moving
            this.vx *= 0.9; 
            this.vy *= 0.9;
        }

        this.x += this.vx; this.y += this.vy;
        
        // Bounce off walls
        if (this.x < 20 || this.x > state.WIDTH-20) this.vx *= -1;
        if (this.y < 20 || this.y > state.HEIGHT-20) this.vy *= -1;

        // Shoot a Spark! (Only when mostly stationary)
        if (this.burstTimer === 50 && Math.random() < 0.6) {
            state.enemies.push(new Spark(this.x, this.y, state.player));
            state.triggerSound('shoot'); // They use the player shoot sound
        }
    }
}

// --- THE SPARK (The Homing Projectile) ---
// Sparks are treated as enemies so they can be shot down by the player!
export class Spark extends Enemy {
    constructor(x, y, player) { 
        super(x, y, 'spark', 25); 
        let dx = player.x - x; 
        let dy = player.y - y; 
        let mag = Math.hypot(dx, dy);
        // Base velocity aimed exactly at player's current location
        this.vx = (dx/mag) * 7; 
        this.vy = (dy/mag) * 7;
        
        this.wobblePhase = Math.random() * Math.PI * 2;
    }
    update(state) {
        this.timer++;
        
        // Sparks have a deadly sine-wave wobble to make them harder to dodge
        let wobble = Math.sin(this.timer * 0.2 + this.wobblePhase) * 2;
        let perpX = -this.vy * 0.2; // Perpendicular vector
        let perpY = this.vx * 0.2;
        
        this.x += this.vx + (perpX * wobble); 
        this.y += this.vy + (perpY * wobble);

        // Sparks despawn when they hit the edge of the screen
        if (this.x < 0 || this.x > state.WIDTH || this.y < 0 || this.y > state.HEIGHT) {
            this.active = false;
        }
    }
}
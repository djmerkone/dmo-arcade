// src/robotron/Entities.js

export class WaveDirector {
    constructor(width, height) {
        this.WIDTH = width;
        this.HEIGHT = height;
    }

    spawnWave(waveNum, state) {
        state.enemies = []; state.humans = []; state.electrodes = [];
        
        // Progression Math
        const grunts = Math.min(80, 10 + (waveNum * 10));
        const hulks = Math.min(8, 2 + Math.floor(waveNum / 2));
        const humans = 6;
        const brains = waveNum >= 2 ? Math.min(6, waveNum) : 0;
        const spheroids = waveNum >= 3 ? Math.min(8, waveNum) : 0;
        const electrodes = Math.min(20, 5 + waveNum);

        // Populate Electrodes
        for(let i=0; i<electrodes; i++) state.electrodes.push({ x: Math.random() * this.WIDTH, y: Math.random() * this.HEIGHT, active: true });
        
        // Populate Humans
        for(let i=0; i<humans; i++) state.humans.push({ x: Math.random() * this.WIDTH, y: Math.random() * this.HEIGHT, active: true, timer: Math.random()*100 });

        // Populate Grunts (Stay away from player at center)
        for(let i=0; i<grunts; i++) {
            let pos = this.getSafeSpawn();
            state.enemies.push(new Grunt(pos.x, pos.y, waveNum));
        }

        // Populate Hulks
        for(let i=0; i<hulks; i++) state.enemies.push(new Hulk(Math.random() * this.WIDTH, Math.random() * this.HEIGHT, waveNum));

        // Populate Brains
        for(let i=0; i<brains; i++) state.enemies.push(new Brain(Math.random() * this.WIDTH, Math.random() * this.HEIGHT, waveNum));

        // Populate Spheroids
        for(let i=0; i<spheroids; i++) state.enemies.push(new Spheroid(Math.random() * this.WIDTH, Math.random() * this.HEIGHT, waveNum));
    }

    getSafeSpawn() {
        let ex, ey;
        do {
            ex = Math.random() * this.WIDTH; ey = Math.random() * this.HEIGHT;
        } while (Math.hypot(ex - this.WIDTH/2, ey - this.HEIGHT/2) < 180);
        return {x: ex, y: ey};
    }
}

// --- ENEMY CLASSES ---
export class Enemy {
    constructor(x, y, type, pts, hp = 1) {
        this.x = x; this.y = y; this.type = type; this.pts = pts; this.hp = hp;
        this.active = true; this.timer = 0;
    }
    moveTowards(targetX, targetY, speed) {
        let dx = targetX - this.x; let dy = targetY - this.y;
        let mag = Math.hypot(dx, dy);
        if (mag > 0) { this.x += (dx/mag) * speed; this.y += (dy/mag) * speed; }
    }
}

export class Grunt extends Enemy {
    constructor(x, y, wave) { super(x, y, 'grunt', 100); this.speed = 0.8 + (wave * 0.1); }
    update(state) { this.moveTowards(state.player.x, state.player.y, this.speed); }
}

export class Hulk extends Enemy {
    constructor(x, y, wave) { super(x, y, 'hulk', 0, 9999); this.speed = 0.5 + (wave * 0.05); } // Indestructible
    update(state) {
        let target = state.humans.find(h => h.active) || state.player;
        this.moveTowards(target.x, target.y, this.speed);
        // Kills humans
        state.humans.forEach(h => { if (h.active && Math.hypot(this.x - h.x, this.y - h.y) < 15) { h.active = false; state.spawnParticles(h.x, h.y, 15, '#f0f', 6); }});
    }
}

export class Brain extends Enemy {
    constructor(x, y, wave) { super(x, y, 'brain', 500); this.speed = 1.0 + (wave * 0.05); }
    update(state) {
        let target = state.humans.find(h => h.active);
        if (target) {
            this.moveTowards(target.x, target.y, this.speed);
            // Brain converts human to Prog!
            if (Math.hypot(this.x - target.x, this.y - target.y) < 15) {
                target.active = false;
                state.enemies.push(new Prog(target.x, target.y, this.speed * 1.5));
                state.spawnParticles(target.x, target.y, 10, '#f00', 4);
            }
        } else {
            this.moveTowards(state.player.x, state.player.y, this.speed * 0.8);
        }
    }
}

export class Prog extends Enemy {
    constructor(x, y, speed) { super(x, y, 'prog', 100); this.speed = speed; }
    update(state) { this.moveTowards(state.player.x, state.player.y, this.speed); }
}

export class Spheroid extends Enemy {
    constructor(x, y, wave) { 
        super(x, y, 'spheroid', 1000); 
        this.vx = (Math.random() - 0.5) * 3; this.vy = (Math.random() - 0.5) * 3;
    }
    update(state) {
        this.timer++;
        this.x += this.vx; this.y += this.vy;
        // Bounce off walls
        if (this.x < 10 || this.x > state.WIDTH-10) this.vx *= -1;
        if (this.y < 10 || this.y > state.HEIGHT-10) this.vy *= -1;
        
        // Births Enforcers
        if (this.timer % 120 === 0 && Math.random() > 0.3) {
            state.enemies.push(new Enforcer(this.x, this.y));
            state.spawnParticles(this.x, this.y, 5, '#0ff', 3);
        }
    }
}

export class Enforcer extends Enemy {
    constructor(x, y) { 
        super(x, y, 'enforcer', 150); 
        this.vx = (Math.random() - 0.5) * 1.5; this.vy = (Math.random() - 0.5) * 1.5;
    }
    update(state) {
        this.timer++;
        this.x += this.vx; this.y += this.vy;
        if (this.x < 10 || this.x > state.WIDTH-10) this.vx *= -1;
        if (this.y < 10 || this.y > state.HEIGHT-10) this.vy *= -1;

        // Shoots Sparks at player
        if (this.timer > 90 && Math.random() < 0.05) {
            state.enemies.push(new Spark(this.x, this.y, state.player));
            this.timer = 0;
        }
    }
}

export class Spark extends Enemy {
    constructor(x, y, player) { 
        super(x, y, 'spark', 25); // Sparks can be shot for 25 points!
        let dx = player.x - x; let dy = player.y - y; let mag = Math.hypot(dx, dy);
        this.vx = (dx/mag) * 3; this.vy = (dy/mag) * 3;
    }
    update(state) {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > state.WIDTH || this.y < 0 || this.y > state.HEIGHT) this.active = false;
    }
}
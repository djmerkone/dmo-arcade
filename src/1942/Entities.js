// src/1942/Entities.js

export class EnemyPlane {
    constructor(x, y, hp, pts, type) {
        this.x = x; this.y = y;
        this.hp = hp; this.pts = pts;
        this.type = type;
        this.timer = 0;
        this.active = true;
    }
}

// 1. The Standard Green Fighter (Sine Wave Sweeper)
export class GreenZero extends EnemyPlane {
    constructor(startX) {
        super(startX, -20, 1, 100, 'zero');
        this.startX = startX;
    }
    update(player, enemyBullets) {
        this.timer++;
        this.y += 1.5;
        this.x = this.startX + Math.sin(this.timer * 0.05) * 40;

        // Shoots twice during its run
        if (this.timer === 60 || this.timer === 120) {
            let dx = player.x - this.x; let dy = player.y - this.y;
            let mag = Math.hypot(dx, dy);
            enemyBullets.push({ x: this.x, y: this.y, vx: (dx/mag)*2.5, vy: (dy/mag)*2.5 });
        }
        if (this.y > 320) this.active = false;
    }
}

// 2. The Red Squadron (Drops Powerups, flies in V-formation and does a U-Turn!)
export class RedZero extends EnemyPlane {
    constructor(startX, startY, isLeader) {
        super(startX, startY, 2, 300, 'redZero');
        this.startX = startX;
        this.hasPowerup = isLeader;
    }
    update(player, enemyBullets) {
        this.timer++;
        
        // Dive bomber U-Turn logic
        if (this.timer < 80) {
            this.y += 3; // Dive fast
        } else if (this.timer < 140) {
            this.y += 1; // Slow down at the bottom of the loop
            this.x += (this.x > 160 ? 2 : -2); // Peel outward
        } else {
            this.y -= 2; // Fly back up the screen!
        }

        if (this.y > 320 || this.y < -50 || this.x < -20 || this.x > 340) this.active = false;
    }
}

// 3. The Heavy Bomber (Takes a ton of damage, shoots in a spread pattern)
export class HeavyBomber extends EnemyPlane {
    constructor(startX) {
        super(startX, -40, 20, 1000, 'bomber');
    }
    update(player, enemyBullets) {
        this.timer++;
        this.y += 0.5; // Moves very slowly

        // Fires a 3-way spread shot every 90 frames
        if (this.timer % 90 === 0) {
            for(let i = -1; i <= 1; i++) {
                enemyBullets.push({ x: this.x, y: this.y + 20, vx: i * 1.5, vy: 3 });
            }
        }
        if (this.y > 320) this.active = false;
    }
}

// THE WAVE DIRECTOR
export class WaveDirector {
    constructor() {
        this.tick = 0;
    }

    processSpawns(enemiesArray) {
        this.tick++;

        // Spawn a Green Zero every 1.5 seconds
        if (this.tick % 90 === 0) {
            const startX = 40 + Math.random() * (320 - 80);
            enemiesArray.push(new GreenZero(startX));
        }

        // Spawn a Red V-Formation every 10 seconds
        if (this.tick % 600 === 0) {
            const centerX = 80 + Math.random() * 160;
            enemiesArray.push(new RedZero(centerX, -20, true));      // Leader
            enemiesArray.push(new RedZero(centerX - 30, -50, false)); // Left Wing
            enemiesArray.push(new RedZero(centerX + 30, -50, false)); // Right Wing
        }

        // Spawn a Heavy Bomber every 20 seconds
        if (this.tick % 1200 === 0) {
            const startX = 60 + Math.random() * 200;
            enemiesArray.push(new HeavyBomber(startX));
        }
    }
}
// src/1942/Sprites.js

export class SpriteManager {
    constructor() {
        this.cache = {};
    }

    // This is called once during the boot sequence to mathematically forge the graphics
    initialize() {
        this.cache.p38 = this.forgeP38(false);         // Player
        this.cache.p38BankLeft = this.forgeP38(-0.3);  // Evasive Roll Frames
        this.cache.p38BankRight = this.forgeP38(0.3);
        this.cache.zero = this.forgeZero('#2b4c20');   // Standard Green Enemy
        this.cache.redZero = this.forgeZero('#8a1c1c'); // Red Powerup Enemy
        this.cache.bulletPlayer = this.forgeBullet('#ffff00', '#ffaa00');
        this.cache.bulletEnemy = this.forgeBullet('#ff0000', '#ffaa00', true);
        
        console.log("1942 Graphics Foundry: Assets Compiled into VRAM.");
    }

    // Fetches the pre-rendered image from memory
    get(spriteName) {
        return this.cache[spriteName];
    }

    // --- THE FORGE: P-38 LIGHTNING (PLAYER) ---
    forgeP38(bankSkew = 0) {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d', { alpha: true });
        
        ctx.translate(32, 32); // Center origin
        if (bankSkew) ctx.transform(1, 0, bankSkew, 1, 0, 0); // Apply 3D banking skew

        // Metallic Gradient
        const metal = ctx.createLinearGradient(-20, -20, 20, 20);
        metal.addColorStop(0, '#e0e5ec');
        metal.addColorStop(0.5, '#7b8a9c');
        metal.addColorStop(1, '#3a4754');

        // Dark Metal (Booms/Engines)
        const darkMetal = ctx.createLinearGradient(-15, 0, 15, 0);
        darkMetal.addColorStop(0, '#4a5568');
        darkMetal.addColorStop(0.5, '#2d3748');
        darkMetal.addColorStop(1, '#1a202c');

        ctx.lineWidth = 1;
        ctx.strokeStyle = '#1a202c';

        // 1. Main Wingspan
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.moveTo(-28, 2);
        ctx.bezierCurveTo(-10, -8, 10, -8, 28, 2);
        ctx.lineTo(28, 6);
        ctx.lineTo(-28, 6);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 2. Twin Booms (The iconic double tails)
        const drawBoom = (xOffset) => {
            ctx.fillStyle = darkMetal;
            ctx.beginPath();
            ctx.ellipse(xOffset, 2, 4, 18, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            
            // Tail fins
            ctx.fillStyle = '#c53030'; // Red tips
            ctx.fillRect(xOffset - 1, 15, 2, 8);
            
            // Propeller Hub
            ctx.fillStyle = '#cbd5e0';
            ctx.beginPath(); ctx.arc(xOffset, -16, 2, 0, Math.PI * 2); ctx.fill();
        };
        drawBoom(-12);
        drawBoom(12);

        // 3. Horizontal Stabilizer (Connects the tails)
        ctx.fillStyle = metal;
        ctx.fillRect(-12, 18, 24, 4);
        ctx.strokeRect(-12, 18, 24, 4);

        // 4. Central Fuselage
        ctx.fillStyle = metal;
        ctx.beginPath();
        ctx.ellipse(0, 4, 6, 14, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // 5. Cockpit Canopy (Glass reflection)
        const glass = ctx.createLinearGradient(0, -6, 0, 6);
        glass.addColorStop(0, '#63b3ed');
        glass.addColorStop(1, '#2b6cb0');
        ctx.fillStyle = glass;
        ctx.beginPath();
        ctx.ellipse(0, 2, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Canopy glare highlight
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.ellipse(-1, -1, 1, 2, 0, 0, Math.PI * 2); ctx.fill();

        // 6. Wing Decals (US Stars)
        ctx.fillStyle = '#2b6cb0'; // Blue circle
        ctx.beginPath(); ctx.arc(-20, 2, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(20, 2, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffffff'; // White star center
        ctx.fillRect(-21, 1.5, 2, 1); ctx.fillRect(19, 1.5, 2, 1);

        return canvas;
    }

    // --- THE FORGE: ZERO FIGHTER (ENEMY) ---
    forgeZero(mainColor) {
        const canvas = document.createElement('canvas');
        canvas.width = 48; canvas.height = 48;
        const ctx = canvas.getContext('2d', { alpha: true });
        ctx.translate(24, 24);

        const bodyPaint = ctx.createLinearGradient(-10, -10, 10, 10);
        bodyPaint.addColorStop(0, mainColor);
        bodyPaint.addColorStop(1, '#111');

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        // 1. Swept Wings
        ctx.fillStyle = bodyPaint;
        ctx.beginPath();
        ctx.moveTo(-20, 4);
        ctx.bezierCurveTo(-10, -2, 10, -2, 20, 4);
        ctx.lineTo(16, 10);
        ctx.lineTo(-16, 10);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 2. Fuselage
        ctx.beginPath();
        ctx.ellipse(0, 2, 5, 12, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // 3. Tail
        ctx.beginPath();
        ctx.moveTo(-6, 12); ctx.lineTo(6, 12); ctx.lineTo(0, 16); ctx.closePath();
        ctx.fill();

        // 4. Hinomaru (Red Sun Decal)
        ctx.fillStyle = '#c53030';
        ctx.beginPath(); ctx.arc(-12, 5, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, 5, 3, 0, Math.PI*2); ctx.fill();

        // 5. Cockpit
        ctx.fillStyle = '#2c5282';
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();

        return canvas;
    }

    // --- THE FORGE: PROJECTILES ---
    forgeBullet(coreColor, glowColor, isRound = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 16; canvas.height = 16;
        const ctx = canvas.getContext('2d', { alpha: true });
        ctx.translate(8, 8);

        ctx.shadowBlur = 6;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = coreColor;

        ctx.beginPath();
        if (isRound) {
            ctx.arc(0, 0, 3, 0, Math.PI * 2); // Enemy orb bullet
        } else {
            ctx.ellipse(0, 0, 1.5, 6, 0, 0, Math.PI * 2); // Player tracer bullet
        }
        ctx.fill();
        
        // Inner white hot core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (isRound) ctx.arc(0, 0, 1, 0, Math.PI * 2);
        else ctx.ellipse(0, 0, 0.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        return canvas;
    }

    // Fast Propeller Renderer (Drawn dynamically so it animates!)
    drawPropeller(ctx, x, y, tick) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tick * 0.5); // Spin speed
        
        ctx.fillStyle = 'rgba(200, 200, 200, 0.4)'; // Motion blur
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Flashing yellow prop tips
        if (tick % 4 < 2) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 6, -0.5, 0.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 6, Math.PI - 0.5, Math.PI + 0.5);
            ctx.stroke();
        }
        ctx.restore();
    }
}
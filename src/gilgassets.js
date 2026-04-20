// src/gilgassets.js

export const GILG_PALETTE = {
    urukSkyTop: '#0a0505', urukSkyBottom: '#8c2614', urukSun: '#ff5500',
    steppeSkyTop: '#02020a', steppeSkyBottom: '#0a1a3a', steppeMoon: '#e0e5ff',
    cedarGloom: '#05110a', underworldAbyss: '#030405', stygianWater: '#0a1c1a',
    silhouette: '#050505', goldHighlight: '#d4af37',
    tabletBase: '#0a0a0a', tabletBorder: '#d4af37',
};

export const GILG_SPRITES = {
    gilgamesh: 'gilgamesh', enkidu: 'enkidu', lion: 'lion',
    humbaba: 'humbaba', bull_of_heaven: 'bull_of_heaven', utnapishtim: 'utnapishtim'
};

export const GilgGraphics = {
    drawSprite: (ctx, actorId, x, y, scale = 1, flip = false, tick = 0, colorOverride = null) => {
        ctx.save();
        ctx.translate(x, y);
        if (flip) ctx.scale(-1, 1);
        
        const s = scale * 1.5; 
        ctx.scale(s, s);

        const fillColor = colorOverride || GILG_PALETTE.silhouette;
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = colorOverride ? fillColor : GILG_PALETTE.goldHighlight;
        
        ctx.lineWidth = 0.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (actorId === 'gilgamesh') GilgGraphics.drawActorGilgamesh(ctx, colorOverride);
        else if (actorId === 'enkidu') GilgGraphics.drawActorEnkidu(ctx, colorOverride);
        else if (actorId === 'lion') GilgGraphics.drawActorLion(ctx, colorOverride);
        else if (actorId === 'humbaba') GilgGraphics.drawActorHumbaba(ctx, tick, colorOverride);
        else if (actorId === 'bull_of_heaven') GilgGraphics.drawActorBull(ctx, colorOverride);
        else if (actorId === 'utnapishtim') GilgGraphics.drawActorUtnapishtim(ctx, colorOverride);

        ctx.restore();
    },

    drawActorGilgamesh: (ctx, colorOverride) => {
        ctx.beginPath();
        ctx.moveTo(-10, 20); ctx.lineTo(-8, 5); ctx.lineTo(-12, -10); 
        ctx.lineTo(8, -10); ctx.lineTo(12, 5); ctx.lineTo(10, 20); ctx.fill();
        ctx.fillRect(-2, -20, 10, 15);
        ctx.beginPath(); ctx.arc(0, -20, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(6, -24); 
        ctx.lineTo(8, -32); ctx.lineTo(0, -28); ctx.lineTo(-8, -32); ctx.fill(); 
        ctx.strokeStyle = colorOverride ? colorOverride : GILG_PALETTE.goldHighlight;
        ctx.lineWidth = 1; ctx.stroke();
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(12, -25); ctx.lineTo(18, 20); 
        ctx.strokeStyle = colorOverride ? colorOverride : '#e3dac9'; ctx.stroke();
    },

    drawActorEnkidu: (ctx, colorOverride) => {
        ctx.beginPath();
        ctx.moveTo(-12, 20); ctx.bezierCurveTo(-15, 0, -5, -15, 5, -10); 
        ctx.lineTo(12, 5); ctx.lineTo(15, 20); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -12, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colorOverride || GILG_PALETTE.silhouette; ctx.lineWidth = 1.5;
        for(let i=0; i<5; i++) {
            ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(2 - i*2, -20 + i*2); ctx.stroke();
        }
        ctx.strokeStyle = colorOverride || GILG_PALETTE.goldHighlight; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(8, -15); ctx.quadraticCurveTo(15, -22, 20, -18); ctx.stroke();
    },

    drawActorLion: (ctx, colorOverride) => {
        ctx.beginPath();
        ctx.ellipse(0, 5, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(15, -2, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-12, 10, 4, 12); ctx.fillRect(-5, 12, 4, 10); ctx.fillRect(10, 10, 4, 12); ctx.fillRect(18, 5, 5, 20);
        ctx.lineWidth = 2; ctx.strokeStyle = colorOverride || GILG_PALETTE.silhouette;
        ctx.beginPath(); ctx.moveTo(-15, 2); ctx.bezierCurveTo(-40, -10, -30, -25, -45, -20); ctx.stroke();
    },

    drawActorHumbaba: (ctx, tick, colorOverride) => {
        ctx.beginPath(); ctx.ellipse(0, 0, 25, 20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colorOverride || GILG_PALETTE.silhouette; ctx.lineWidth = 2.5;
        for(let i=0; i<8; i++) {
            let sway = Math.sin(tick * 0.05 + i) * 4;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-30 + sway, -30 + i*10, -10 + i*5, -40); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(20 + sway, 20 + i*5, 30 + sway, 30); ctx.stroke();
        }
        if (!colorOverride) {
            ctx.fillStyle = '#ff0044'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.arc(-10, -5, 3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(0, -5, 3, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        }
    },

    drawActorBull: (ctx, colorOverride) => {
        ctx.fillRect(-25, -10, 40, 25);
        ctx.fillRect(-20, 15, 8, 15); ctx.fillRect(5, 15, 8, 15);
        ctx.beginPath(); ctx.arc(18, -5, 12, 0, Math.PI*2); ctx.fill();
        if (!colorOverride) ctx.fillStyle = '#1c2d54';
        ctx.fillRect(22, 0, 12, 25);
        ctx.clearRect(22, 5, 12, 2); ctx.clearRect(22, 10, 12, 2); ctx.clearRect(22, 15, 12, 2);
        ctx.strokeStyle = colorOverride || GILG_PALETTE.goldHighlight; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(15, -12); ctx.bezierCurveTo(25, -35, 40, -25, 45, -10); ctx.stroke();
    },

    drawActorUtnapishtim: (ctx, colorOverride) => {
        ctx.beginPath();
        ctx.moveTo(-10, 20); ctx.lineTo(-5, -5); ctx.lineTo(10, -5); ctx.lineTo(15, 20); ctx.fill();
        ctx.beginPath(); ctx.arc(2, -10, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-2, -5); ctx.lineTo(8, -5); ctx.lineTo(4, 15); ctx.fill();
        ctx.strokeStyle = colorOverride ? colorOverride : '#a08a6b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(12, -20); ctx.lineTo(16, 25); ctx.stroke();
    },

    // --- DEEP BACKGROUND (NO colorOverride here) ---
    drawBackground: (ctx, tick, sceneType) => {
        const w = 800; const h = 600;
        if (sceneType === 'uruk') {
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, GILG_PALETTE.urukSkyTop); grad.addColorStop(0.5, '#4a0d0d'); grad.addColorStop(1, GILG_PALETTE.urukSkyBottom);
            ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

            const sunY = 350 + Math.sin(tick * 0.005) * 20; 
            ctx.save(); ctx.shadowColor = GILG_PALETTE.urukSun; ctx.shadowBlur = 120; ctx.fillStyle = '#ff6600';
            ctx.beginPath(); ctx.arc(400, sunY, 180, 0, Math.PI * 2); ctx.fill(); ctx.restore();

            ctx.fillStyle = '#5c3a21'; const bgPan = (tick * 0.1) % 200;
            for(let i=-1; i<6; i++) {
                let bx = (i * 150) - bgPan;
                ctx.fillRect(bx, 420, 100, 180); ctx.fillRect(bx+20, 380, 60, 40); 
            }
        } 
        else if (sceneType === 'steppe') {
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, GILG_PALETTE.steppeSkyTop); grad.addColorStop(1, GILG_PALETTE.steppeSkyBottom);
            ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = GILG_PALETTE.steppeMoon; ctx.shadowColor = '#88aaff'; ctx.shadowBlur = 60;
            ctx.beginPath(); ctx.arc(650, 150, 60, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;

            ctx.fillStyle = '#ffffff';
            for(let i=0; i<150; i++) {
                let sx = ((i * 137) + (tick * (i%3 + 0.1))) % w; let sy = (i * 97) % (h-200);
                ctx.globalAlpha = Math.abs(Math.sin(tick * 0.05 + i)) * 0.8; ctx.fillRect(sx, sy, 2, 2);
            }
            ctx.globalAlpha = 1.0;
        }
        else if (sceneType === 'cedar_forest') {
            ctx.fillStyle = GILG_PALETTE.cedarGloom; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#030805'; 
            for(let i=0; i<12; i++) ctx.fillRect(i*70, -50, 20 + Math.random()*10, 700);
        }
        else if (sceneType === 'underworld') {
            ctx.fillStyle = GILG_PALETTE.underworldAbyss; ctx.fillRect(0, 0, w, h);
        }
    },

    // --- FOREGROUND (Color Override Supported here for Aberration) ---
    drawForeground: (ctx, tick, sceneType, colorOverride = null) => {
        const w = 800;
        const fillColor = colorOverride || GILG_PALETTE.silhouette;
        ctx.fillStyle = fillColor;

        if (sceneType === 'uruk') {
            // PROPER SOLID ZIGGURAT (Separated beginPath calls)
            ctx.beginPath(); ctx.moveTo(100, 600); ctx.lineTo(250, 400); ctx.lineTo(550, 400); ctx.lineTo(700, 600); ctx.fill();
            ctx.beginPath(); ctx.moveTo(280, 400); ctx.lineTo(330, 250); ctx.lineTo(470, 250); ctx.lineTo(520, 400); ctx.fill();
            ctx.beginPath(); ctx.moveTo(350, 250); ctx.lineTo(380, 150); ctx.lineTo(420, 150); ctx.lineTo(450, 250); ctx.fill();

            if (!colorOverride) {
                ctx.fillStyle = 'rgba(255, 200, 50, 0.8)'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 20;
                ctx.fillRect(395, 180, 10, 20); ctx.shadowBlur = 0;
            }
        }
        else if (sceneType === 'steppe') {
            ctx.beginPath();
            ctx.moveTo(0, 600); ctx.lineTo(0, 450); ctx.quadraticCurveTo(200, 400, 400, 480);
            ctx.quadraticCurveTo(600, 550, 800, 420); ctx.lineTo(800, 600); ctx.fill();
            
            ctx.strokeStyle = fillColor; ctx.lineWidth = 2;
            const grassSway = Math.sin(tick * 0.05) * 15;
            for(let i=0; i<40; i++) {
                let gx = i * 20 + 10; let gy = 460 + Math.sin(i) * 40; 
                if (gx < 400) gy -= (gx * 0.1); else gy += ((gx-400) * 0.1);
                ctx.beginPath(); ctx.moveTo(gx, 600); ctx.quadraticCurveTo(gx, gy + 20, gx + grassSway + (i%5), gy); ctx.stroke();
            }
        }
        else if (sceneType === 'cedar_forest') {
            for(let i=0; i<8; i++) {
                let tx = i * 110 + 20; let tw = 40 + Math.random()*30;
                ctx.fillRect(tx, -50, tw, 700);
                ctx.strokeStyle = fillColor; ctx.lineWidth = 10;
                ctx.beginPath(); ctx.moveTo(tx + tw/2, 200 + i*40); ctx.quadraticCurveTo(tx+100, 100, tx+150, 150); ctx.stroke();
            }
        }
        else if (sceneType === 'underworld') {
            if (!colorOverride) {
                const waterGrad = ctx.createLinearGradient(0, 450, 0, 600);
                waterGrad.addColorStop(0, GILG_PALETTE.stygianWater); waterGrad.addColorStop(1, '#000000');
                ctx.fillStyle = waterGrad; ctx.fillRect(0, 450, w, 150);
            }
            ctx.fillStyle = fillColor;
            ctx.beginPath(); ctx.moveTo(0,0);
            for(let i=0; i<=800; i+=80) {
                ctx.lineTo(i + 40, 50 + Math.random()*150); ctx.lineTo(i + 80, 0);
            }
            ctx.fill();
        }
    },

    drawTabletFrame: (ctx, x, y, width, height) => {
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
        ctx.fillStyle = GILG_PALETTE.tabletBase;
        ctx.beginPath(); ctx.roundRect(x, y, width, height, 12); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; 
        ctx.strokeStyle = GILG_PALETTE.tabletBorder; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(x + 8, y + 8, width - 16, height - 16, 6); ctx.stroke();

        ctx.fillStyle = GILG_PALETTE.tabletBorder;
        const cSz = 12; const th = 3;
        ctx.fillRect(x+12, y+12, cSz, th); ctx.fillRect(x+12, y+12, th, cSz);
        ctx.fillRect(x+width-12-cSz, y+12, cSz, th); ctx.fillRect(x+width-12-th, y+12, th, cSz);
        ctx.fillRect(x+12, y+height-12-th, cSz, th); ctx.fillRect(x+12, y+height-12-cSz, th, cSz);
        ctx.fillRect(x+width-12-cSz, y+height-12-th, cSz, th); ctx.fillRect(x+width-12-th, y+height-12-cSz, th, cSz);
    }
};
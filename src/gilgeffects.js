// src/gilgeffects.js

export class GilgameshEffects {
    constructor(width = 800, height = 600) {
        this.w = width;
        this.h = height;
        
        this.particles = [];
        this.maxParticles = 600;
        
        this.godRays = Array(15).fill(0).map(() => ({
            angle: (Math.random() - 0.5) * (Math.PI / 2.5),
            width: 20 + Math.random() * 250,
            speed: 0.001 + Math.random() * 0.007,
            phase: Math.random() * Math.PI * 2,
            baseAlpha: 0.02 + Math.random() * 0.15,
            color: Math.random() > 0.6 ? '255, 240, 200' : '212, 175, 55' 
        }));

        this.camera = {
            x: 0, y: 0, targetX: 0, targetY: 0,
            zoom: 1.0, targetZoom: 1.0, rotation: 0, targetRotation: 0,
            trauma: 0, traumaDecay: 0.035, maxShake: 50, maxRotation: Math.PI / 24 
        };

        this.postVFX = {
            flashColor: '255,255,255', flashAlpha: 0, fadeAlpha: 1.0, targetFade: 0.0,
            glitchIntensity: 0, aberration: 0 
        };

        this.glyphs = ["𒀭", "𒈗", "𒆠", "𒈨", "𒆳", "𒂗", "لیل", "маш", "𒌓", "ىرى", " شہر"];
    }

    trigger(effectName) {
        switch (effectName) {
            case 'white_flash':
                this.postVFX.flashColor = '255,255,255'; this.postVFX.flashAlpha = 1.0; this.postVFX.aberration = 15; break;
            case 'crimson_flash':
                this.postVFX.flashColor = '180,10,0'; this.postVFX.flashAlpha = 0.9; this.camera.trauma = 0.85; this.postVFX.aberration = 25; break;
            case 'screen_shake_subtle':
                this.camera.trauma = Math.min(this.camera.trauma + 0.4, 1.0); break;
            case 'screen_shake_violent':
                this.camera.trauma = 1.0; this.postVFX.aberration = 35; break;
            case 'pan_up_walls':
                this.camera.y = 250; this.camera.targetY = 0; this.camera.zoom = 1.35; this.camera.targetZoom = 1.0; break;
            case 'god_voice_glitch':
                this.postVFX.glitchIntensity = 45; this.camera.trauma = 0.7; this.postVFX.aberration = 40;
                this.postVFX.flashColor = '0,255,255'; this.postVFX.flashAlpha = 0.7; break;
            case 'fade_to_black':
                this.postVFX.targetFade = 1.0; break;
            case 'fade_in_slow':
                this.postVFX.fadeAlpha = 1.0; this.postVFX.targetFade = 0.0; break;
        }
    }

    emitParticles(scene, mood, tick) {
        if (this.particles.length >= this.maxParticles) return;

        let p = {
            x: Math.random() * this.w, y: this.h + 50, vx: 0, vy: 0,
            life: 1.0, decay: 0.005 + Math.random() * 0.01, size: 1 + Math.random() * 4,
            type: 'dust', phaseX: Math.random() * Math.PI * 2, phaseY: Math.random() * Math.PI * 2, color: '200, 200, 200' 
        };

        if (scene === 'uruk' || mood?.includes('brass')) {
            p.type = 'ember'; p.x = 100 + Math.random() * 600; p.color = Math.random() > 0.5 ? '255, 60, 0' : '255, 160, 0'; 
            p.vy = -1.5 - Math.random() * 4; p.vx = (Math.random() - 0.5) * 2; p.decay = 0.008 + Math.random() * 0.012; p.size = 1.5 + Math.random() * 4;
        } else if (scene === 'steppe' && !mood?.includes('melancholy')) {
            p.type = 'sand'; p.x = this.w + 50; p.y = Math.random() * this.h;
            p.vx = -10 - Math.random() * 15; p.vy = (Math.random() - 0.5) * 2.0; p.color = '210, 180, 140'; p.decay = 0.035; p.size = 1 + Math.random() * 2; 
        } else if (scene === 'cedar_forest') {
            p.type = 'spore'; p.x = Math.random() * this.w; p.y = -50; 
            p.vx = Math.sin(tick * 0.01) * 3; p.vy = 0.5 + Math.random() * 2.5; p.color = '50, 255, 100'; p.decay = 0.004; p.size = 2 + Math.random() * 5; 
        } else if (scene === 'underworld') {
            p.type = 'ash'; p.x = Math.random() * this.w; p.y = -20;
            p.vx = (Math.random() - 0.5) * 1.5; p.vy = 2 + Math.random() * 3.5; p.color = '120, 120, 120'; p.decay = 0.006; p.size = 2 + Math.random() * 4;
        } else if (mood?.includes('divine')) {
            p.type = 'divine'; p.y = -20; p.vy = 0.2 + Math.random() * 1.0; p.vx = Math.sin(tick * 0.005) * 1.5;
            p.color = '255, 230, 150'; p.size = 3 + Math.random() * 6; p.decay = 0.002; 
        }
        this.particles.push(p);
    }

    updateAndDraw(ctx, tick, scene, mood, drawActorsCallback) {
        if (this.postVFX.flashAlpha > 0) this.postVFX.flashAlpha = Math.max(0, this.postVFX.flashAlpha - 0.035);
        if (this.postVFX.glitchIntensity > 0) this.postVFX.glitchIntensity--;
        if (this.postVFX.aberration > 0) {
            this.postVFX.aberration *= 0.85;
            if (this.postVFX.aberration < 0.5) this.postVFX.aberration = 0;
        }
        this.postVFX.fadeAlpha += (this.postVFX.targetFade - this.postVFX.fadeAlpha) * 0.03;

        this.camera.x += (this.camera.targetX - this.camera.x) * 0.04;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.04;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.04;
        
        const shake = this.camera.trauma * this.camera.trauma * this.camera.maxShake;
        let shakeX = 0, shakeY = 0, shakeRot = 0;
        
        if (this.camera.trauma > 0) {
            shakeX = (Math.sin(tick * 1.1) + Math.cos(tick * 0.83)) * shake;
            shakeY = (Math.cos(tick * 1.3) + Math.sin(tick * 0.91)) * shake;
            shakeRot = (Math.sin(tick * 1.57)) * (this.camera.trauma * this.camera.trauma * this.camera.maxRotation);
            this.camera.trauma = Math.max(0, this.camera.trauma - this.camera.traumaDecay);
        }

        // DRAW VOLUMETRIC LIGHTING *BEFORE* CAMERA TRANSFORM TO PREVENT SEPARATION
        if (mood?.includes('divine') || mood?.includes('triumphant') || scene === 'uruk') {
            this.drawGodRays(ctx, tick);
        }

        ctx.save();
        ctx.translate(this.w / 2, this.h / 2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.rotate(shakeRot);
        ctx.translate(-this.w / 2 + this.camera.x + shakeX, -this.h / 2 + this.camera.y + shakeY);

        if (drawActorsCallback) {
            if (this.postVFX.aberration > 0) {
                const ab = this.postVFX.aberration;
                ctx.save(); ctx.globalCompositeOperation = 'screen';
                
                ctx.save(); ctx.translate(-ab, 0); ctx.scale(1.01, 1.01);
                drawActorsCallback(ctx, tick, 'rgba(255, 0, 0, 0.8)'); ctx.restore();
                
                ctx.save(); ctx.translate(ab * 1.5, 0);
                drawActorsCallback(ctx, tick, 'rgba(0, 150, 255, 0.8)'); ctx.restore();
                
                ctx.restore(); 

                ctx.save(); drawActorsCallback(ctx, tick, null); ctx.restore();
            } else {
                drawActorsCallback(ctx, tick, null);
            }
        }

        const spawnCount = mood?.includes('fearful') || scene === 'steppe' ? 8 : 3;
        for(let i=0; i<spawnCount; i++) this.emitParticles(scene, mood, tick);

        ctx.globalCompositeOperation = 'screen'; 
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            
            if (p.type === 'ember' || p.type === 'ash') {
                p.x += Math.sin(tick * 0.05 + p.phaseX) * 2.5; p.y += Math.cos(tick * 0.03 + p.phaseY) * 1.5; 
            } else if (p.type === 'spore' || p.type === 'divine') {
                p.x += Math.cos(tick * 0.02 + p.phaseX) * 1.5; 
            }

            p.x += p.vx; p.y += p.vy; p.life -= p.decay;

            if (p.life <= 0 || p.x < -150 || p.x > this.w + 150 || p.y < -150 || p.y > this.h + 150) {
                this.particles.splice(i, 1); continue;
            }

            const alpha = Math.max(0, p.life);
            ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
            
            if (p.size > 2.5 && p.type !== 'ash' && p.type !== 'sand') {
                ctx.shadowColor = `rgba(${p.color}, ${alpha})`; ctx.shadowBlur = p.size * 4;
            } else {
                ctx.shadowBlur = 0;
            }
            
            ctx.beginPath();
            if (p.type === 'sand') {
                ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); 
                ctx.lineWidth = p.size; ctx.strokeStyle = `rgba(${p.color}, ${alpha})`; ctx.lineCap = 'round'; ctx.stroke();
            } else {
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            }
        }
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;

        if (this.postVFX.glitchIntensity > 0) this.drawGodGlitch(ctx, tick);

        ctx.restore(); 

        const vig = ctx.createRadialGradient(this.w/2, this.h/2, 50, this.w/2, this.h/2, this.w * 0.85);
        vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.95)'); 
        ctx.fillStyle = vig; ctx.fillRect(0, 0, this.w, this.h);

        if (this.postVFX.flashAlpha > 0) {
            ctx.fillStyle = `rgba(${this.postVFX.flashColor}, ${this.postVFX.flashAlpha})`; ctx.fillRect(0, 0, this.w, this.h);
        }
        if (this.postVFX.fadeAlpha > 0.01) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.postVFX.fadeAlpha})`; ctx.fillRect(0, 0, this.w, this.h);
        }
    }

    drawGodRays(ctx, tick) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; 
        
        // Locked exactly to the Sun's position from gilgassets.js
        const originX = 400; 
        const originY = 350 + Math.sin(tick * 0.005) * 20; 

        this.godRays.forEach((ray) => {
            const currentAngle = ray.angle + Math.sin(tick * ray.speed + ray.phase) * 0.15;
            const length = 1600; 

            const x1 = originX + Math.cos(currentAngle - 0.06) * length;
            const y1 = originY + Math.sin(currentAngle - 0.06) * length;
            const x2 = originX + Math.cos(currentAngle + 0.06) * length;
            const y2 = originY + Math.sin(currentAngle + 0.06) * length;

            const grad = ctx.createLinearGradient(originX, originY, Math.abs(x1+x2)/2, Math.abs(y1+y2)/2);
            grad.addColorStop(0, `rgba(${ray.color}, ${ray.baseAlpha * 2.5})`); 
            grad.addColorStop(0.3, `rgba(${ray.color}, ${ray.baseAlpha})`);      
            grad.addColorStop(1, `rgba(${ray.color}, 0)`);                       

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.fill();
        });

        ctx.restore();
    }

    drawGodGlitch(ctx, tick) {
        ctx.save();
        ctx.globalCompositeOperation = 'difference';
        
        const numArtifacts = 8 + Math.random() * 15;
        for(let i=0; i<numArtifacts; i++) {
            const gy = Math.random() * this.h;
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,0,0,0.95)' : 'rgba(0,255,255,0.95)';
            ctx.fillRect((Math.random()-0.5)*100, gy, this.w + 200, 2 + Math.random() * 20);
        }

        const numGlyphs = 3 + Math.random() * 5;
        for(let i=0; i<numGlyphs; i++) {
            const gx = Math.random() * this.w;
            const gy = Math.random() * this.h;
            const glyph = this.glyphs[Math.floor(Math.random() * this.glyphs.length)];
            
            ctx.font = `${80 + Math.random() * 150}px monospace`; 
            ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
            
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate((Math.random() - 0.5) * Math.PI);
            if (Math.random() > 0.5) ctx.scale(-1, 1);
            if (Math.random() > 0.5) ctx.scale(1, -1);
            ctx.fillText(glyph, 0, 0);
            ctx.restore();
        }
        ctx.restore();
    }
}
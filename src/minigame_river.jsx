// src/minigame_river.jsx
import React, { useEffect, useRef } from 'react';
import { TrailGraphics, TRAIL_SPRITES } from './trailassets';
import { LANDMARKS } from './traildata'; // <-- Added Import!

export const RiverMiniGame = React.memo(({ 
    engineRef, 
    keysRef, 
    onRiverEnd, 
    playSplashSound 
}) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = false;

        let animationFrameId;
        let eng = engineRef.current;
        
        // --- THE FIX ---
        // Find the actual river we are at, instead of looking at the next landmark!
        let lm = LANDMARKS.find(l => l.distance === Math.floor(eng.distance) && l.type === 'river') 
                 || { width: 600, current: 'swift', biome: 'plains' };

        // --- DYNAMIC RIVER DIFFICULTY ---
        let baseSpeed = lm.current === 'slow' ? 4 : (lm.current === 'swift' ? 7 : 10);
        if (lm.current === 'dangerous' || lm.current === 'rapids') baseSpeed = 14;
        
        // Weather dramatically affects river speed!
        if (eng.weather === 'Thunderstorm' || eng.weather === 'Rainy') {
            baseSpeed += 4; // Swollen, raging river
        }

        // --- LOCAL 60FPS STATE ---
        let riverState = {
            distanceLeft: lm.width || 600,
            wx: 400 - 32, // Wagon X (Center)
            wy: 450,      // Wagon Y (Near bottom)
            angle: 0,     // Wagon rotation based on steering
            integrity: 100, // Wagon Health!
            hazards: [],
            particles: [],
            cameraShake: 0,
            tick: 0
        };

        const spawnParticles = (x, y, color, count, burst) => {
            for(let i=0; i<count; i++) {
                riverState.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * burst,
                    vy: (Math.random() - 0.5) * burst - (baseSpeed * 0.5), 
                    life: 20 + Math.random() * 20,
                    color: color
                });
            }
        };

        const renderLoop = () => {
            riverState.tick++;
            
            // --- 1. MOVEMENT & CONTROLS ---
            let forwardSpeed = 1;
            if (keysRef.current['w'] || keysRef.current['arrowup']) forwardSpeed = 2.5; 
            if (keysRef.current['s'] || keysRef.current['arrowdown']) forwardSpeed = 0.5; 

            riverState.distanceLeft -= forwardSpeed;

            let steerSpeed = 6;
            let isSteering = false;

            if (keysRef.current['a'] || keysRef.current['arrowleft']) {
                riverState.wx -= steerSpeed;
                riverState.angle = -0.15;
                isSteering = true;
            }
            if (keysRef.current['d'] || keysRef.current['arrowright']) {
                riverState.wx += steerSpeed;
                riverState.angle = 0.15;
                isSteering = true;
            }
            if (!isSteering) riverState.angle = 0;

            // --- 2. ENVIRONMENT & CAMERA SHAKE ---
            ctx.save();
            if (riverState.cameraShake > 0) {
                ctx.translate((Math.random()-0.5)*riverState.cameraShake, (Math.random()-0.5)*riverState.cameraShake);
                riverState.cameraShake *= 0.8;
            }

            // Deep Water Background
            ctx.fillStyle = '#003366'; 
            if (eng.weather === 'Thunderstorm') ctx.fillStyle = '#001133'; 
            ctx.fillRect(0, 0, 800, 600);
            
            // --- 3. DYNAMIC SHORES (Sine Wave Math) ---
            let bankWidthLeft = 80 + Math.sin(riverState.tick * 0.02) * 40;
            let bankWidthRight = 80 + Math.cos(riverState.tick * 0.015) * 50;

            ctx.fillStyle = lm.biome === 'desert' ? '#CD853F' : '#005500'; 
            ctx.fillRect(0, 0, bankWidthLeft, 600); 
            ctx.fillRect(800 - bankWidthRight, 0, bankWidthRight, 600); 

            // Clamp Wagon
            riverState.wx = Math.max(bankWidthLeft + 10, Math.min(800 - bankWidthRight - 74, riverState.wx));
            riverState.wy = Math.max(100, Math.min(500, riverState.wy));

            // Shore Props
            let shoreProp = lm.biome === 'desert' ? 'cactus' : (lm.biome === 'mountains' ? 'pine' : 'flower');
            if (riverState.tick % 15 === 0) {
                riverState.hazards.push({ type: 'prop', hx: Math.random() > 0.5 ? 20 : 750, hy: -100, speedOffset: 0, prop: shoreProp });
            }

            // Fast Water Ripples
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            for(let i=0; i<30; i++) {
                let ry = ((i * 45) + (riverState.tick * baseSpeed)) % 600;
                let rx = 100 + ((i * 77) % 600);
                ctx.fillRect(rx, ry, 4 + (i%10), 10 + (i%5));
            }

            // --- 4. WAKE & FOAM ---
            if (riverState.tick % 2 === 0) {
                spawnParticles(riverState.wx + 32, riverState.wy, '#FFFFFF', 2, 2);
            }

            // --- 5. HAZARD LOGIC ---
            let spawnRate = baseSpeed > 10 ? 0.1 : 0.05; 
            
            if (Math.random() < spawnRate && riverState.hazards.length < 15) {
                let typeRand = Math.random();
                let hType = 'rock';
                if (typeRand > 0.5) hType = 'log';
                if (typeRand > 0.8) hType = 'whirlpool';

                let spawnX = 150 + Math.random() * 500;

                riverState.hazards.push({
                    type: hType,
                    hx: spawnX,
                    hy: -100, 
                    speedOffset: (Math.random() - 0.5) * (baseSpeed * 0.4),
                    rotation: Math.random() * Math.PI * 2,
                    hit: false 
                });
            }

            for (let i = riverState.hazards.length - 1; i >= 0; i--) {
                let haz = riverState.hazards[i];
                haz.hy += baseSpeed + haz.speedOffset; 

                if (haz.type === 'prop') {
                    TrailGraphics.drawSprite(ctx, TRAIL_SPRITES[haz.prop], haz.hx, haz.hy, 3);
                }
                else if (haz.type === 'rock') {
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.beginPath(); ctx.arc(haz.hx + 20, haz.hy + 10, 25, 0, Math.PI*2); ctx.fill();

                    ctx.fillStyle = '#555555';
                    ctx.beginPath(); ctx.arc(haz.hx + 20, haz.hy + 20, 20, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#777777';
                    ctx.beginPath(); ctx.arc(haz.hx + 15, haz.hy + 15, 8, 0, Math.PI*2); ctx.fill();
                } 
                else if (haz.type === 'log') {
                    ctx.save();
                    ctx.translate(haz.hx + 10, haz.hy + 40);
                    ctx.rotate(haz.rotation); 
                    ctx.fillStyle = '#4A2F1D'; 
                    ctx.fillRect(-10, -40, 20, 80);
                    ctx.fillStyle = '#3A1F0D'; 
                    ctx.fillRect(-5, -35, 2, 70);
                    ctx.restore();
                }
                else if (haz.type === 'whirlpool') {
                    haz.rotation += 0.25; 
                    ctx.save();
                    ctx.translate(haz.hx + 40, haz.hy + 40);
                    ctx.rotate(haz.rotation);
                    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                    ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI); ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, 18, Math.PI, Math.PI*2); ctx.stroke();
                    ctx.restore();

                    let dx = (haz.hx + 40) - (riverState.wx + 32);
                    let dy = (haz.hy + 40) - (riverState.wy + 48);
                    let dist = Math.hypot(dx, dy);
                    if (dist < 120) {
                        riverState.wx += (dx / dist) * 4; 
                        riverState.wy += (dy / dist) * 2;
                    }
                }

                // --- 6. COLLISION & INTEGRITY DAMAGE ---
                if (!haz.hit && haz.type !== 'prop') {
                    let hazW = haz.type === 'rock' ? 35 : (haz.type === 'whirlpool' ? 60 : 20);
                    let hazH = haz.type === 'rock' ? 35 : (haz.type === 'whirlpool' ? 60 : 70);

                    if (
                        riverState.wx < haz.hx + hazW &&
                        riverState.wx + 60 > haz.hx &&
                        riverState.wy < haz.hy + hazH &&
                        riverState.wy + 90 > haz.hy
                    ) {
                        if (haz.type !== 'whirlpool') {
                            haz.hit = true; 
                            riverState.cameraShake = 25;
                            if (playSplashSound) playSplashSound();
                            
                            spawnParticles(haz.hx, haz.hy, '#8B4513', 15, 8); 
                            spawnParticles(haz.hx, haz.hy, '#FFFFFF', 20, 10); 

                            let dmg = haz.type === 'rock' ? 40 : 25;
                            riverState.integrity -= dmg;

                            if (riverState.integrity <= 0) {
                                if (onRiverEnd) onRiverEnd(false); 
                                return; 
                            }
                        }
                    }
                }

                if (haz.hy > 650) riverState.hazards.splice(i, 1);
            }

            // --- 7. DRAW CAULKED WAGON ---
            ctx.save();
            ctx.translate(riverState.wx + 32, riverState.wy + 48); 
            ctx.rotate(riverState.angle);
            
            ctx.fillStyle = '#654321'; 
            ctx.fillRect(-32, -48, 64, 96);
            
            if (riverState.integrity < 70) {
                ctx.fillStyle = '#111111'; 
                ctx.fillRect(-20, -30, 15, 10);
                if (riverState.integrity < 40) ctx.fillRect(10, 10, 20, 15);
            }

            ctx.fillStyle = '#DDDDDD';
            ctx.fillRect(-26, -42, 52, 84);
            
            ctx.restore();

            // --- 8. PARTICLE SYSTEM ---
            for(let i = riverState.particles.length - 1; i >= 0; i--) {
                let p = riverState.particles[i];
                p.x += p.vx; p.y += p.vy; p.life--;
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.life / 40);
                ctx.fillRect(p.x, p.y, 4, 4);
                if (p.life <= 0) riverState.particles.splice(i, 1);
            }
            ctx.globalAlpha = 1.0;

            ctx.restore(); 

            // --- 9. TACTICAL HUD ---
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; 
            ctx.fillRect(0, 0, 800, 50);
            ctx.fillStyle = '#fff'; 
            ctx.font = '24px "VT323", monospace';
            
            let progress = Math.max(0, Math.floor(riverState.distanceLeft));
            ctx.fillText(`Distance: ${progress} ft`, 20, 32);
            
            ctx.fillText(`Integrity:`, 250, 32);
            ctx.fillStyle = riverState.integrity > 50 ? '#00FF00' : (riverState.integrity > 25 ? '#FFFF00' : '#FF0000');
            ctx.fillRect(350, 15, riverState.integrity, 18);
            ctx.strokeStyle = '#FFF'; ctx.strokeRect(350, 15, 100, 18);

            // Added fallback to 'swift' just in case data is somehow missing
            ctx.fillStyle = eng.weather === 'Thunderstorm' ? '#FF5555' : '#00FFFF';
            ctx.fillText(`Water: ${(lm.current || 'swift').toUpperCase()}`, 500, 32);

            ctx.fillStyle = '#AAAAAA';
            ctx.fillText(`[W/S/A/D] Steer`, 650, 32);

            if (riverState.distanceLeft <= 0) {
                if (onRiverEnd) onRiverEnd(true); 
                return; 
            }

            animationFrameId = requestAnimationFrame(renderLoop);
        };
        
        renderLoop();
        
        return () => cancelAnimationFrame(animationFrameId);
    }, [engineRef, keysRef, onRiverEnd, playSplashSound]);

    return (
        <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            style={{ imageRendering: 'pixelated' }} 
            className="w-full h-full object-contain absolute inset-0 z-40 cursor-none" 
        />
    );
});
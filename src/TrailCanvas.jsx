// src/TrailCanvas.jsx
import React, { useEffect, useRef } from 'react';
import { TrailGraphics } from './trailassets';

export const TrailCanvas = React.memo(({ 
    gameState, 
    engineRef, 
    onTravelTick 
}) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = false;

        let animationFrameId;
        
        // --- LOCAL PHYSICS ARRAYS (Kept out of React state for 60FPS) ---
        let dustParticles = [];
        let birdFlock = [];
        let embers = [];

        // --- THE MASTER 60FPS RENDERING LOOP ---
        const renderLoop = () => {
            let eng = engineRef.current;
            eng.tick++;

            if (gameState === 'travel' && onTravelTick) {
                onTravelTick();
            }

            // 1. CLEAR THE BUFFER
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 800, 600);

            // 2. RENDER THE LIVING WORLD
            const showWorld = ['travel', 'camp_menu', 'event', 'dialogue', 'landmark'].includes(gameState);

            if (showWorld) {
                ctx.save();

                // --- CAMERA SHAKE ---
                let shakeX = 0; let shakeY = 0;
                const isMoving = gameState === 'travel' && eng.pace > 0;

                if (isMoving) {
                    const intensity = eng.pace === 3 ? 2 : (eng.pace === 2 ? 1 : 0.5);
                    if (eng.weather === 'Blizzard' || eng.weather === 'Thunderstorm') {
                        shakeX = (Math.random() - 0.5) * 5 * intensity;
                        shakeY = (Math.random() - 0.5) * 5 * intensity;
                    } else {
                        shakeY = Math.sin(eng.tick * 0.5) * intensity;
                    }
                }
                ctx.translate(shakeX, shakeY);

                // --- DRAW LANDSCAPE ---
                TrailGraphics.drawLandscape(ctx, 800, 600, eng.tick, eng.distance, eng.weather);

                // --- VALHALLA FEATURE: AMBIENT BIRDS ---
                // Birds only fly in fair weather!
                if (Math.random() < 0.002 && birdFlock.length === 0 && eng.weather === 'Fair') {
                    let startY = 50 + Math.random() * 100;
                    for(let i=0; i<5; i++) {
                        // V-Formation math
                        let offsetY = i % 2 === 0 ? (i * 8) : (-i * 8);
                        birdFlock.push({ x: -50 - (i*15), y: startY + offsetY, frame: Math.random() * 10 });
                    }
                }

                ctx.fillStyle = '#111';
                for(let i = birdFlock.length - 1; i >= 0; i--) {
                    let b = birdFlock[i];
                    b.x += 1.5; // Fly right
                    b.frame += 0.15; // Flap speed
                    let wingY = Math.sin(b.frame) * 4; // Flapping math
                    
                    ctx.fillRect(b.x, b.y, 4, 2); // Bird body
                    ctx.fillRect(b.x - 2, b.y + wingY, 2, 2); // Back wing
                    ctx.fillRect(b.x + 4, b.y + wingY, 2, 2); // Front wing
                    
                    if (b.x > 850) birdFlock.splice(i, 1);
                }

                // --- VALHALLA FEATURE: DYNAMIC SUN SHADOWS ---
                const timeOfDay = eng.tick % 180;
                if (timeOfDay > 20 && timeOfDay < 150 && eng.weather !== 'Blizzard' && eng.weather !== 'Rainy') {
                    // Sun is up! Calculate shadow stretch based on sun angle
                    let sunProgress = (timeOfDay - 20) / 130; // 0 (Dawn) to 1 (Dusk)
                    let shadowStretch = Math.cos(sunProgress * Math.PI) * 150; // -150 to +150
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent shadow
                    ctx.beginPath();
                    // Draw an ellipse under the wagon that stretches with the sun
                    ctx.ellipse(260 + shadowStretch, 470, 70 + Math.abs(shadowStretch * 0.5), 15, 0, 0, Math.PI * 2);
                    ctx.fill();
                }

                // --- WAGON DUST PHYSICS ---
                if (isMoving && eng.weather !== 'Rainy' && eng.weather !== 'Blizzard' && eng.weather !== 'Snowing') {
                    if (Math.random() < 0.3 * eng.pace) {
                        dustParticles.push({
                            x: 240 + Math.random() * 30,
                            y: 455, // Adjusted to wheel height
                            vx: -2 - Math.random() * 2,
                            vy: -Math.random() * 1.5,
                            life: 30,
                            size: Math.random() * 4 + 2
                        });
                    }
                }

                ctx.fillStyle = (eng.distance > 350 && eng.distance < 640) || (eng.distance > 980 && eng.distance < 1198) 
                    ? 'rgba(205, 133, 63, 0.4)' 
                    : 'rgba(120, 100, 80, 0.4)';

                for (let i = dustParticles.length - 1; i >= 0; i--) {
                    let p = dustParticles[i];
                    p.x += p.vx; p.y += p.vy; p.life--; p.size += 0.1;
                    if (p.life > 0) {
                        ctx.globalAlpha = p.life / 30; 
                        ctx.fillRect(p.x, p.y, p.size, p.size);
                    } else {
                        dustParticles.splice(i, 1);
                    }
                }
                ctx.globalAlpha = 1.0;

                // --- DRAW WAGON TEAM ---
                const aliveParty = eng.party ? eng.party.filter(p => p.health > 0) : [];
                const avgHealth = aliveParty.length > 0 ? (aliveParty.reduce((s, p) => s + p.health, 0) / aliveParty.length) : 100;
                TrailGraphics.drawWagonTeam(ctx, 200, 350, 4, eng.tick, avgHealth, isMoving);

                // --- FOREGROUND SPEED BLUR ---
                if (isMoving && eng.pace > 1 && eng.weather !== 'Blizzard') {
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    for(let i=0; i<3; i++) {
                        let fx = ((i * 300) - (eng.tick * 15)) % 1100;
                        if (fx < -300) fx += 1100;
                        ctx.fillRect(fx, 560, 150, 40);
                    }
                }

                // --- VALHALLA FEATURE: ROARING CAMPFIRE ---
                if (gameState === 'camp_menu') {
                    // Pulsing radial glow
                    let pulse = Math.sin(eng.tick * 0.1) * 0.1 + 0.9; 
                    const fireGlow = ctx.createRadialGradient(400, 480, 10, 400, 480, 250);
                    fireGlow.addColorStop(0, `rgba(255, 100, 0, ${0.4 * pulse})`);
                    fireGlow.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = fireGlow;
                    ctx.fillRect(0, 0, 800, 600);

                    // Floating Embers
                    if (Math.random() < 0.4) {
                        embers.push({ x: 400 + (Math.random()-0.5)*30, y: 480, vx: (Math.random()-0.5)*2, vy: -1 - Math.random()*3, life: 50 });
                    }
                    ctx.fillStyle = '#FFAA00';
                    for (let i = embers.length - 1; i >= 0; i--) {
                        let e = embers[i];
                        e.x += e.vx; e.y += e.vy; e.life--;
                        ctx.globalAlpha = Math.max(0, e.life / 50);
                        ctx.fillRect(e.x, e.y, 3, 3);
                        if (e.life <= 0) embers.splice(i, 1);
                    }
                    ctx.globalAlpha = 1.0;

                    // Logs
                    ctx.fillStyle = '#4A2F1D';
                    ctx.fillRect(380, 480, 40, 10);
                    ctx.fillRect(390, 475, 20, 15);
                }

                ctx.restore();
            }

            // --- GAME OVER SCREEN ---
            if (gameState === 'gameover') {
                const grad = ctx.createLinearGradient(0, 0, 0, 600);
                grad.addColorStop(0, '#AA0000');
                grad.addColorStop(1, '#000000');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 800, 600);
            }

            animationFrameId = requestAnimationFrame(renderLoop);
        };
        
        renderLoop();
        
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameState, engineRef, onTravelTick]);

    // Note: The transition-opacity fade is removed so it doesn't fight your App.jsx CRT transitions!
    return (
        <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            style={{ imageRendering: 'pixelated' }} 
            className={`w-full h-full object-contain absolute inset-0 z-10 pointer-events-none 
                ${['travel', 'event', 'dialogue', 'camp_menu', 'landmark', 'gameover'].includes(gameState) ? 'opacity-100' : 'opacity-0'}`} 
        />
    );
});
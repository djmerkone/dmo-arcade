// src/minigame_hunt.jsx
import React, { useEffect, useRef } from 'react';
import { TrailGraphics, TRAIL_SPRITES } from './trailassets';
import { HUNTING_ANIMALS } from './traildata';

export const HuntingMiniGame = React.memo(({ 
    engineRef, 
    keysRef, 
    onHuntingEnd, 
    playShootSound, 
    playHitSound 
}) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = false;

        let animationFrameId;
        let eng = engineRef.current;
        let h = eng.hunting;

// Extract current biome from the map engine
        let currentBiome = eng.nextLandmarkObj?.biome || 'plains';
        
        // VVV REPLACE THESE TWO LINES VVV
        let localAnimals = HUNTING_ANIMALS.filter(a => a.biomes && a.biomes.includes(currentBiome));
        if (!localAnimals || localAnimals.length === 0) localAnimals = HUNTING_ANIMALS; // Failsafe

        // --- HUNTING SPECIFIC STATE (60FPS Local Physics) ---
        let huntState = {
            timer: 60 * 60, // 60 seconds at 60fps
            collected: 0,
            x: 400, y: 400,
            crouching: false,
            noiseRadius: 0,
            stamina: 100,
            weapon: 'rifle', // 'rifle' or 'shotgun'
            reloadTimer: 0,
            windX: (Math.random() - 0.5) * 8, // Intense wind
            windY: (Math.random() - 0.5) * 2,
            cameraShake: 0,
            flashAlpha: 0, // Muzzle flash
            projectiles: [],
            animals: [],
            particles: [], // Blood and dirt
            texts: [] // Floating "+40 lbs"
        };

        const spawnParticles = (x, y, color, count, burstForce) => {
            for(let i=0; i<count; i++) {
                huntState.particles.push({
                    x, y,
                    vx: (Math.random() - 0.5) * burstForce,
                    vy: (Math.random() - 0.5) * burstForce,
                    life: 20 + Math.random() * 20,
                    color: color
                });
            }
        };

        const renderLoop = () => {
            eng.tick++;
            huntState.timer--;

            // --- 1. ENVIRONMENT ---
            let grassColor = currentBiome === 'desert' ? '#BDB76B' : (currentBiome === 'mountains' ? '#2E8B57' : '#006600');
            if (eng.weather === 'Blizzard' || eng.weather === 'Snowing') grassColor = '#EEEEEE';
            
            ctx.fillStyle = grassColor; 
            ctx.fillRect(0, 0, 800, 600);

            // Draw some biome-specific obstacles
            ctx.fillStyle = currentBiome === 'desert' ? '#A0522D' : '#004400';
            ctx.beginPath(); ctx.arc(150, 250, 40, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(650, 450, 60, 0, Math.PI*2); ctx.fill();

            // Weather effects (Wind shift)
            huntState.windX += (Math.random() - 0.5) * 0.2;
            huntState.windX = Math.max(-6, Math.min(6, huntState.windX));

            // Camera Shake Physics
            ctx.save();
            if (huntState.cameraShake > 0) {
                ctx.translate((Math.random()-0.5)*huntState.cameraShake, (Math.random()-0.5)*huntState.cameraShake);
                huntState.cameraShake *= 0.8; // Dampen
            }

            // --- 2. PLAYER MECHANICS ---
            huntState.crouching = keysRef.current['shift'] && huntState.stamina > 20;
            let isRunning = !huntState.crouching && (keysRef.current['w'] || keysRef.current['s'] || keysRef.current['a'] || keysRef.current['d']);
            
            let speed = huntState.crouching ? 3 : 6;
            if (isRunning) huntState.stamina = Math.max(0, huntState.stamina - 0.5);
            else huntState.stamina = Math.min(100, huntState.stamina + 0.2);

            let targetNoise = huntState.crouching ? 40 : (isRunning ? 150 : 20);
            
            let isMoving = false;
            if (keysRef.current['w'] || keysRef.current['arrowup']) { huntState.y -= speed; isMoving = true; }
            if (keysRef.current['s'] || keysRef.current['arrowdown']) { huntState.y += speed; isMoving = true; }
            if (keysRef.current['a'] || keysRef.current['arrowleft']) { huntState.x -= speed; isMoving = true; }
            if (keysRef.current['d'] || keysRef.current['arrowright']) { huntState.x += speed; isMoving = true; }

            huntState.x = Math.max(20, Math.min(780, huntState.x));
            huntState.y = Math.max(60, Math.min(580, huntState.y));

            // Weapon Swapping
            if (keysRef.current['1']) huntState.weapon = 'rifle';
            if (keysRef.current['2']) huntState.weapon = 'shotgun';

            // Noise Radius Lerp
            if (!isMoving) targetNoise = huntState.crouching ? 0 : 30;
            huntState.noiseRadius += (targetNoise - huntState.noiseRadius) * 0.15;

            // Draw Noise Radius
            ctx.strokeStyle = `rgba(255, 255, 255, ${isMoving ? 0.2 : 0.05})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(huntState.x, huntState.y, huntState.noiseRadius, 0, Math.PI * 2); ctx.stroke();

            // Draw Player Crosshair
            TrailGraphics.drawSprite(ctx, TRAIL_SPRITES.hunter, huntState.x - 24, huntState.y - 32, huntState.crouching ? 3 : 4);

            // --- 3. WEAPON BALLISTICS ---
            if (huntState.reloadTimer > 0) huntState.reloadTimer--;

            if (keysRef.current[' '] && huntState.reloadTimer <= 0 && eng.inventory.bullets > 0) {
                if (playShootSound) playShootSound();
                eng.inventory.bullets--;

                huntState.noiseRadius = 500; // MASSIVE gunshot noise
                huntState.flashAlpha = 0.8; // Muzzle Flash
                huntState.cameraShake = huntState.weapon === 'rifle' ? 15 : 25; // Heavy Recoil
                
                // Recoil pushback
                huntState.y += huntState.weapon === 'rifle' ? 10 : 15;

                if (huntState.weapon === 'rifle') {
                    huntState.reloadTimer = 60; // 1 second reload
                    huntState.projectiles.push({ x: 400, y: 600, tx: huntState.x, ty: huntState.y, speed: 30, size: 4, life: 30, dmg: 3 });
                } else if (huntState.weapon === 'shotgun') {
                    huntState.reloadTimer = 35; // ~0.5 second reload
                    // Shotgun fires 6 spreading pellets
                    for(let p=0; p<6; p++) {
                        huntState.projectiles.push({ 
                            x: 400, y: 600, 
                            tx: huntState.x + (Math.random() - 0.5) * 200, 
                            ty: huntState.y + (Math.random() - 0.5) * 200, 
                            speed: 35, size: 2, life: 12, dmg: 1 
                        });
                    }
                }
            }

            // Draw Projectiles
            ctx.fillStyle = '#FFFF00';
            for (let i = huntState.projectiles.length - 1; i >= 0; i--) {
                let p = huntState.projectiles[i];
                let dx = p.tx - p.x;
                let dy = p.ty - p.y;
                let dist = Math.hypot(dx, dy);
                
                if (dist > p.speed && p.life > 0) {
                    p.x += (dx / dist) * p.speed + huntState.windX;
                    p.y += (dy / dist) * p.speed + huntState.windY;
                    p.life--;
                    ctx.fillRect(p.x, p.y, p.size, p.size);
                } else {
                    spawnParticles(p.x, p.y, '#AAAAAA', 5, 2); // Dirt impact smoke
                    huntState.projectiles.splice(i, 1);
                }
            }

            // --- 4. ADVANCED ANIMAL AI ---
            if (Math.random() < 0.04 && huntState.animals.length < 8) {
                let type = localAnimals[Math.floor(Math.random() * localAnimals.length)];
                let hp = type.weight > 100 ? 3 : (type.weight > 20 ? 2 : 1); // Large game takes more hits!
                huntState.animals.push({ 
                    ...type, 
                    hp: hp,
                    ax: Math.random() > 0.5 ? -50 : 850, 
                    ay: 100 + Math.random() * 400, 
                    dir: Math.random() > 0.5 ? 1 : -1, 
                    state: 'graze', // graze, alert, flee, charge
                    fleeTimer: 0,
                    dead: false 
                });
            }

            for (let i = huntState.animals.length - 1; i >= 0; i--) {
                let a = huntState.animals[i];
                if (!a.dead) {
                    let distToPlayer = Math.hypot(huntState.x - (a.ax + 20), huntState.y - (a.ay + 15));
                    
                    // --- PREDATOR LOGIC ---
                    let isPredator = a.name.includes("Bear");
                    
                    if (distToPlayer < huntState.noiseRadius) {
                        if (isPredator && distToPlayer < 250) {
                            a.state = 'charge';
                        } else {
                            a.state = 'flee';
                            a.fleeTimer = 180; // Panic for 3 seconds
                            a.dir = (huntState.x < a.ax) ? 1 : -1; // Run away
                        }
                    }

                    // Movement State Machine
                    if (a.state === 'graze') {
                        a.ax += (a.speed * 0.3 * a.dir); 
                        if (Math.random() < 0.01) a.dir *= -1; 
                    } else if (a.state === 'flee') {
                        a.ax += (a.speed * 1.5 * a.dir); 
                        a.fleeTimer--;
                        if (a.fleeTimer <= 0) a.state = 'graze';
                    } else if (a.state === 'charge') {
                        // Sprint directly at player!
                        a.ax += a.speed * 1.2 * (huntState.x > a.ax ? 1 : -1);
                        a.ay += a.speed * 1.2 * (huntState.y > a.ay ? 1 : -1);
                        a.dir = (huntState.x > a.ax) ? 1 : -1;

                        if (distToPlayer < 30) {
                            // MAULED!
                            huntState.cameraShake = 40;
                            spawnParticles(huntState.x, huntState.y, '#FF0000', 30, 8); // Blood
                            huntState.timer -= 600; // Lose 10 seconds!
                            huntState.texts.push({ x: huntState.x, y: huntState.y - 20, text: "MAULED! -10 SEC", life: 60 });
                            a.state = 'flee'; // Bear loses interest and leaves
                            a.fleeTimer = 300;
                            a.dir = a.dir * -1;
                        }
                    }

                    // Collision with Bullets
                    for (let j = 0; j < huntState.projectiles.length; j++) {
                        let proj = huntState.projectiles[j];
                        if (Math.hypot(proj.x - (a.ax + 20), proj.y - (a.ay + 15)) < 30) {
                            a.hp -= proj.dmg;
                            spawnParticles(proj.x, proj.y, '#AA0000', 10, 5); // Blood spray
                            huntState.projectiles.splice(j, 1);
                            
                            if (a.hp <= 0) {
                                a.dead = true; 
                                huntState.collected += a.weight; 
                                if (playHitSound) playHitSound();
                                huntState.texts.push({ x: a.ax, y: a.ay, text: `+${a.weight} lbs`, life: 60 });
                            } else {
                                // Hit but not dead! Enrage predators or panic prey!
                                if (isPredator) a.state = 'charge';
                                else { a.state = 'flee'; a.fleeTimer = 200; }
                            }
                            break;
                        }
                    }

                    // Draw Animal
                    const frame = Math.floor(eng.tick / (a.state === 'flee' || a.state === 'charge' ? 5 : 15)) % 2 === 0 ? '1' : '2';
                    let spriteName = `${a.name.split(' ').pop().toLowerCase()}_${frame}`; // E.g., "Grizzly Bear" -> "bear_1"
                    
                    // Shadow
                    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(a.ax+15, a.ay+25, 20, 8, 0, 0, Math.PI*2); ctx.fill();

                    if (TRAIL_SPRITES[spriteName]) {
                        TrailGraphics.drawSprite(ctx, TRAIL_SPRITES[spriteName], a.ax, a.ay, 3, a.dir === -1);
                    } else { 
                        ctx.fillStyle = '#AA5500'; ctx.fillRect(a.ax, a.ay, 20, 15); 
                    }
                    
                    // Despawn
                    if (a.ax < -200 || a.ax > 1000) huntState.animals.splice(i, 1);
                } else {
                    // Draw Dead Carcass
                    ctx.fillStyle = '#AA0000'; ctx.fillRect(a.ax, a.ay + 10, 30, 10); 
                }
            }

            // --- 5. EFFECTS SYSTEM ---
            // Muzzle Flash
            if (huntState.flashAlpha > 0) {
                ctx.fillStyle = `rgba(255, 255, 100, ${huntState.flashAlpha})`;
                ctx.fillRect(0, 0, 800, 600);
                huntState.flashAlpha -= 0.1;
            }

            // Particles
            for(let i = huntState.particles.length - 1; i >= 0; i--) {
                let p = huntState.particles[i];
                p.x += p.vx; p.y += p.vy; p.life--;
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 20;
                ctx.fillRect(p.x, p.y, 4, 4);
                if (p.life <= 0) huntState.particles.splice(i, 1);
            }
            ctx.globalAlpha = 1.0;

            // Floating Text
            ctx.fillStyle = '#FFF'; ctx.font = '24px "VT323", monospace';
            for(let i = huntState.texts.length - 1; i >= 0; i--) {
                let t = huntState.texts[i];
                t.y -= 1; t.life--;
                ctx.globalAlpha = t.life / 60;
                ctx.fillText(t.text, t.x, t.y);
                if (t.life <= 0) huntState.texts.splice(i, 1);
            }
            ctx.globalAlpha = 1.0;
            ctx.restore(); // Restore camera shake

            // --- 6. TACTICAL HUD ---
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, 800, 50);
            ctx.fillStyle = '#fff'; ctx.font = '22px "VT323", monospace';
            
            let timeColor = huntState.timer < 600 ? '#FF5555' : '#FFF';
            ctx.fillStyle = timeColor;
            ctx.fillText(`Time: ${Math.max(0, Math.floor(huntState.timer/60))}`, 20, 32);
            
            ctx.fillStyle = '#FFF';
            ctx.fillText(`Bullets: ${eng.inventory.bullets}`, 120, 32);
            ctx.fillText(`Meat: ${huntState.collected} lbs`, 250, 32);
            
            // Stamina Bar
            ctx.fillText(`Stamina:`, 400, 32);
            ctx.fillStyle = huntState.stamina > 20 ? '#00FF00' : '#FF0000';
            ctx.fillRect(490, 16, huntState.stamina * 0.8, 16);
            ctx.strokeStyle = '#FFF'; ctx.strokeRect(490, 16, 80, 16);

            // Weapon Status
            ctx.fillStyle = huntState.weapon === 'rifle' ? '#00FFFF' : '#555555';
            ctx.fillText(`[1] RIFLE`, 600, 20);
            ctx.fillStyle = huntState.weapon === 'shotgun' ? '#00FFFF' : '#555555';
            ctx.fillText(`[2] SHOTGUN`, 600, 42);

            // Wind Indicator
            ctx.fillStyle = '#FF0000';
            ctx.fillText(`Wind:`, 710, 32);
            ctx.beginPath(); ctx.moveTo(760, 26); ctx.lineTo(760 + (huntState.windX * 4), 26); 
            ctx.strokeStyle = '#FF0000'; ctx.lineWidth = 3; ctx.stroke();

            // End Condition
            if (huntState.timer <= 0) {
                if (onHuntingEnd) onHuntingEnd(huntState.collected);
            } else {
                animationFrameId = requestAnimationFrame(renderLoop);
            }
        };
        
        renderLoop();
        
        return () => cancelAnimationFrame(animationFrameId);
    }, [engineRef, keysRef, onHuntingEnd, playShootSound, playHitSound]);

    return (
        <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            style={{ imageRendering: 'pixelated' }} 
            className="w-full h-full object-contain bg-black absolute inset-0 z-40 cursor-none" 
        />
    );
});
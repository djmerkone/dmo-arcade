// src/robotron/index.jsx
import React, { useEffect, useRef, useState } from 'react';
import { WilliamsAudio } from './Audio';
import { RobotronSprites } from './Sprites';
import { RobotronEngine } from './Engine';

export default function RobotronGame({ audioCtx, onMenu }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Prevents rendering until the VRAM is fully forged and loaded
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // alpha: false tells the browser the canvas will never be transparent, 
    // which massively boosts rendering performance for heavy particle systems.
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false; // Strictly enforce crisp 8-bit pixels

    // Boot the Hardware Emulators
    const audio = new WilliamsAudio(audioCtx);
    const sprites = new RobotronSprites();
    
    let engine; 
    let animationFrameId;

    const bootGame = async () => {
        // Forge the CRT Sprites in memory
        await sprites.loadAssets();
        
        // Initialize the Engine and wire the Hardware Audio callbacks
        engine = new RobotronEngine((actionType, enemyType) => {
            if (actionType === 'shoot') audio.playShoot();
            if (actionType === 'boom') audio.playExplosion(enemyType); 
            if (actionType === 'rescue') audio.playHumanRescue();
            if (actionType === 'humanKilled') audio.playHumanKilled();
            if (actionType === 'spawn') audio.playSpawnMaterialize();
            if (actionType === 'playerDeath') audio.playPlayerDeath();
        });
        
        // --- FLUID FULLSCREEN RESIZE BINDING ---
        const handleResize = () => {
            if (!containerRef.current || !engine) return;
            const rect = containerRef.current.getBoundingClientRect();
            // Snap the canvas resolution exactly to the monitor's physical pixels
            canvas.width = rect.width;
            canvas.height = rect.height;
            // Update the physics engine boundaries in real-time
            engine.WIDTH = rect.width;
            engine.HEIGHT = rect.height;
        };
        
        window.addEventListener('resize', handleResize);
        handleResize(); // Trigger immediately to establish the grid

        setIsReady(true);
        loop(); // Ignite the V8 Engine
    };
    
    bootGame();

    // --- KEYBOARD EVENT INTERCEPTORS ---
    const keys = {};
    const handleKeyDown = e => { 
        if (!isReady || !engine) return;
        
        // Stop the Spacebar from scrolling the browser window down
        if (e.key === ' ') e.preventDefault(); 
        keys[e.key.toLowerCase()] = true; 
        
        // Menu Escape Hatch
        if(e.key.toLowerCase() === 'm') onMenu();
        
        // Start / Restart Sequence
        if(e.key === 'Enter' || e.key.toLowerCase() === 'enter') {
            if (engine.state.status === 'start' || engine.state.status === 'gameover') {
                engine.reset();
                engine.state.status = 'playing';
                engine.startWave();
            }
        }
    };
    const handleKeyUp = e => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- THE MASTER LOOP (60 FPS) ---
    const loop = () => {
        if (!engine) return;

        // 1. HARDWARE USB GAMEPAD POLLER
        const virtualKeys = { ...keys };
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        // Grab the first connected controller
        const gp = gamepads.find(g => g !== null && g.connected);

        if (gp) {
            // Start/Select Buttons (Reset / Start Game)
            if (gp.buttons[9]?.pressed || gp.buttons[7]?.pressed) {
                if (engine.state.status === 'start' || engine.state.status === 'gameover') {
                    engine.reset(); engine.state.status = 'playing'; engine.startWave();
                }
            }
            // Action Buttons (A, B, X, Y, Triggers) -> Map to Spacebar (Fire)
            if (gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[2]?.pressed || gp.buttons[7]?.pressed) {
                virtualKeys[' '] = true;
            }
            // Left Analog Stick & D-Pad -> Map to WASD (Move/Aim)
            if (gp.axes[0] < -0.3 || gp.buttons[14]?.pressed) virtualKeys['a'] = true; 
            if (gp.axes[0] >  0.3 || gp.buttons[15]?.pressed) virtualKeys['d'] = true; 
            if (gp.axes[1] < -0.3 || gp.buttons[12]?.pressed) virtualKeys['w'] = true; 
            if (gp.axes[1] >  0.3 || gp.buttons[13]?.pressed) virtualKeys['s'] = true; 
        }

        // 2. PHYSICS UPDATE
        // We pass the merged Keyboard + Gamepad inputs into the Engine
        const state = engine.update(virtualKeys);
        
        // 3. CRT PHOSPHOR PERSISTENCE RENDERER
        // By drawing a 40% opaque black box, moving bright objects leave a fading neon smear behind them.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
        ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);

        // GLOBAL SENSORY FLASH (Damage / Wave Start)
        if (state.flash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${state.flash / 15})`;
            ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);
            state.flash--;
        }

        // --- RENDER ROUTING ---
        if (state.status === 'start') {
            ctx.fillStyle = '#ff0000'; ctx.font = '80px "VT323"'; ctx.textAlign = 'center';
            ctx.fillText("ROBOTRON: 2084", engine.WIDTH/2, engine.HEIGHT/2 - 60);
            
            ctx.fillStyle = '#0f0'; ctx.font = '30px "VT323"';
            ctx.fillText("D-PAD: MOVE  |  A/B/SPACE: FIRE", engine.WIDTH/2, engine.HEIGHT/2 + 20);
            
            ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? '#fff' : '#ff0'; 
            ctx.fillText("PRESS START", engine.WIDTH/2, engine.HEIGHT/2 + 90);
        } 
        else {
            
            // A. WAVE TRANSITION (Strobe Flashing Text)
            if (state.transitionTimer > 0) {
                ctx.fillStyle = (Math.floor(state.transitionTimer / 4) % 2 === 0) ? '#0ff' : '#f0f'; 
                ctx.font = '80px "VT323"'; ctx.textAlign = 'center';
                ctx.fillText(`WAVE ${state.wave} COMPLETED`, engine.WIDTH/2, engine.HEIGHT/2);
            }
            
            // B. MATERIALIZATION WARP (Massive Collapsing Geometry)
            else if (state.spawnTimer > 0) {
                let progress = state.spawnTimer / 90; // 1.0 down to 0.0
                // Boxes collapse from 800px wide down to nothing
                let boxSize1 = progress * 800; 
                let boxSize2 = progress * 400;
                
                ctx.lineWidth = 6;
                state.enemies.forEach(e => {
                    // Hyper-strobe the colors while collapsing
                    ctx.strokeStyle = (Math.floor(state.tick / 2) % 2 === 0) ? '#fff' : (e.type === 'hulk' ? '#0f0' : '#f00');
                    ctx.strokeRect(e.x - boxSize1/2, e.y - boxSize1/2, boxSize1, boxSize1);
                    ctx.strokeRect(e.x - boxSize2/2, e.y - boxSize2/2, boxSize2, boxSize2);
                });
                sprites.draw(ctx, 'player', state.player.x, state.player.y, state.tick);
            } 
            
            // C. STANDARD COMBAT RENDER
            else {
                // Background Layer: Obstacles & Bait
                state.electrodes.forEach(el => sprites.draw(ctx, 'electrode', el.x, el.y, state.tick));
                state.humans.forEach(h => sprites.draw(ctx, 'human', h.x, h.y, state.tick));
                
                // Entity Layer: The Swarm
                state.enemies.forEach(e => sprites.draw(ctx, e.type, e.x, e.y, state.tick));

                // Projectile Layer: Player Lasers (Thick, glowing neon tracers)
                ctx.strokeStyle = '#ffff00'; 
                ctx.lineWidth = 6; 
                ctx.lineCap = 'round';
                ctx.beginPath();
                state.bullets.forEach(b => {
                    // Draw a line extending backward based on its current velocity
                    ctx.moveTo(b.x, b.y); 
                    ctx.lineTo(b.x - b.vx * 1.5, b.y - b.vy * 1.5); 
                });
                ctx.stroke();

                // Hero Layer (Flashes during invulnerability phase)
                if (state.player.invuln <= 0 || Math.floor(state.tick / 3) % 2 === 0) {
                    sprites.draw(ctx, 'player', state.player.x, state.player.y, state.tick);
                }
            }

            // D. ADVANCED GEOMETRIC PARTICLE RENDERER
            state.particles.forEach(p => {
                let progress = 1 - (p.life / p.maxLife); // 0.0 to 1.0 (Birth to Death)
                ctx.globalAlpha = Math.max(0, 1 - progress); // Fades out over time
                
                if (p.type === 'text') {
                    // Floating Multiplier Scores (e.g. 1000, 2000)
                    ctx.fillStyle = p.color;
                    ctx.font = '30px "VT323"';
                    ctx.textAlign = 'center';
                    ctx.fillText(p.text, p.x, p.y); 
                } 
                else if (p.type === 'slice' || p.type === 'death_slice') {
                    // The legendary spreading arcade lines
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = p.type === 'death_slice' ? 8 : 5; 
                    ctx.beginPath();
                    let endX = p.x + Math.cos(p.angle) * p.length;
                    let endY = p.y + Math.sin(p.angle) * p.length;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
                else if (p.type === 'enemy_death' || p.type === 'electrode_death') {
                    // Expanding Hollow Box with an X inside
                    let size = progress * (p.type === 'electrode_death' ? 80 : 150); 
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 6;
                    
                    // The Box
                    ctx.strokeRect(p.x - size/2, p.y - size/2, size, size);
                    
                    // The Crosshair
                    ctx.beginPath(); 
                    ctx.moveTo(p.x - size/2, p.y - size/2); ctx.lineTo(p.x + size/2, p.y + size/2);
                    ctx.moveTo(p.x - size/2, p.y + size/2); ctx.lineTo(p.x + size/2, p.y - size/2);
                    ctx.stroke();
                } 
                else if (p.type === 'player_death') {
                    // Screen-shattering massive geometric starburst
                    let size = progress * 1200; // Expands to fill the whole monitor
                    ctx.strokeStyle = (Math.floor(state.tick / 2) % 2 === 0) ? '#fff' : '#f00'; 
                    ctx.lineWidth = 30;
                    ctx.beginPath();
                    // Horizontal & Vertical
                    ctx.moveTo(p.x - size, p.y); ctx.lineTo(p.x + size, p.y);
                    ctx.moveTo(p.x, p.y - size); ctx.lineTo(p.x, p.y + size);
                    // Diagonals
                    ctx.moveTo(p.x - size, p.y - size); ctx.lineTo(p.x + size, p.y + size);
                    ctx.moveTo(p.x - size, p.y + size); ctx.lineTo(p.x + size, p.y - size);
                    ctx.stroke();
                    // Expanding Outer Ring
                    ctx.strokeRect(p.x - size/2, p.y - size/2, size, size);
                }
                else if (p.type === 'dot') {
                    // Chunky shrapnel
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, 8, 8); 
                }
            });
            ctx.globalAlpha = 1.0;

            // --- VINTAGE HUD ---
            ctx.fillStyle = '#ff0000'; ctx.font = '36px "VT323"'; ctx.textAlign = 'left';
            ctx.fillText(`SCORE: ${state.score}`, 30, 40);
            
            ctx.textAlign = 'center'; ctx.fillStyle = '#00ffff';
            ctx.fillText(`WAVE ${state.wave}`, engine.WIDTH/2, 40);
            
            ctx.textAlign = 'right'; ctx.fillStyle = '#0f0';
            ctx.fillText(`LIVES: ${state.lives}`, engine.WIDTH - 30, 40);

            // --- GAME OVER OVERLAY ---
            if (state.status === 'gameover') {
                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);
                ctx.fillStyle = '#f00'; ctx.font = '100px "VT323"'; ctx.textAlign = 'center';
                ctx.fillText("GAME OVER", engine.WIDTH/2, engine.HEIGHT/2);
                ctx.fillStyle = '#fff'; ctx.font = '40px "VT323"';
                ctx.fillText("PRESS START TO RESTART", engine.WIDTH/2, engine.HEIGHT/2 + 80);
            }
        }

        animationFrameId = requestAnimationFrame(loop);
    };

    return () => {
        // Cleanup sequence when you exit back to the menu
        window.removeEventListener('resize', () => {});
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioCtx, onMenu]);

  return (
    // The Container is now absolute inset-0 with overflow-hidden to trap the 
    // canvas and force it to be an exact 1:1 pixel match with your monitor.
    <div ref={containerRef} className="absolute inset-0 z-20 bg-black pointer-events-auto overflow-hidden">
      {!isReady && (
         <div className="absolute inset-0 z-30 flex items-center justify-center bg-black bg-opacity-90">
             <h2 className="text-[#0f0] text-4xl font-['VT323'] blink-text">LOADING ROM ASSETS...</h2>
         </div>
      )}
      <canvas ref={canvasRef} className="block w-full h-full cursor-none" />
    </div>
  );
}
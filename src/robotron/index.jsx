// src/robotron/index.jsx
import React, { useEffect, useRef, useState } from 'react';
import { WilliamsAudio } from './Audio';
import { RobotronSprites } from './Sprites';
import { RobotronEngine } from './Engine';

export default function RobotronGame({ audioCtx, onMenu }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;

    const audio = new WilliamsAudio(audioCtx);
    const sprites = new RobotronSprites();
    let engine; 
    let animationFrameId;

    const bootGame = async () => {
        await sprites.loadAssets();
        engine = new RobotronEngine((actionType, enemyType) => {
            if (actionType === 'shoot') audio.playShoot();
            if (actionType === 'boom') audio.playExplosion(enemyType); 
            if (actionType === 'spawn') audio.playSpawnMaterialize();
            if (actionType === 'playerDeath') audio.playPlayerDeath();
        });
        
        // --- FULLSCREEN RESIZE BINDING ---
        const handleResize = () => {
            if (!containerRef.current || !engine) return;
            const rect = containerRef.current.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            engine.WIDTH = rect.width;
            engine.HEIGHT = rect.height;
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Trigger immediately to set initial full screen

        setIsReady(true);
        loop(); 
    };
    
    bootGame();

    const keys = {};
    const handleKeyDown = e => { 
        if (!isReady || !engine) return;
        if (e.key === ' ') e.preventDefault(); 
        keys[e.key.toLowerCase()] = true; 
        if(e.key.toLowerCase() === 'm') onMenu();
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

    const loop = () => {
        if (!engine) return;

        // USB Gamepad Poller
        const virtualKeys = { ...keys };
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads.find(g => g !== null && g.connected);

        if (gp) {
            if (gp.buttons[9]?.pressed || gp.buttons[7]?.pressed) {
                if (engine.state.status === 'start' || engine.state.status === 'gameover') {
                    engine.reset(); engine.state.status = 'playing'; engine.startWave();
                }
            }
            if (gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) virtualKeys[' '] = true;
            if (gp.axes[0] < -0.5 || gp.buttons[14]?.pressed) virtualKeys['a'] = true; 
            if (gp.axes[0] > 0.5 || gp.buttons[15]?.pressed) virtualKeys['d'] = true; 
            if (gp.axes[1] < -0.5 || gp.buttons[12]?.pressed) virtualKeys['w'] = true; 
            if (gp.axes[1] > 0.5 || gp.buttons[13]?.pressed) virtualKeys['s'] = true; 
        }

        const state = engine.update(virtualKeys);
        
        // PHOSPHOR TRAIL RENDERER
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'; 
        ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);

        // GLOBAL SCREEN FLASH
        if (state.flash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${state.flash / 15})`;
            ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);
            state.flash--;
        }

        if (state.status === 'start') {
            ctx.fillStyle = '#ff0000'; ctx.font = '80px "VT323"'; ctx.textAlign = 'center';
            ctx.fillText("ROBOTRON: 2084", engine.WIDTH/2, engine.HEIGHT/2 - 60);
            ctx.fillStyle = '#0f0'; ctx.font = '30px "VT323"';
            ctx.fillText("D-PAD: MOVE  |  A/B/SPACE: FIRE", engine.WIDTH/2, engine.HEIGHT/2 + 20);
            ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? '#fff' : '#ff0'; 
            ctx.fillText("PRESS START", engine.WIDTH/2, engine.HEIGHT/2 + 90);
        } else {
            
            // --- WAVE TRANSITION ANIMATION ---
            if (state.transitionTimer > 0) {
                // Hyper flashing text
                ctx.fillStyle = (Math.floor(state.transitionTimer / 4) % 2 === 0) ? '#0ff' : '#f0f'; 
                ctx.font = '80px "VT323"'; ctx.textAlign = 'center';
                ctx.fillText(`WAVE ${state.wave} COMPLETED`, engine.WIDTH/2, engine.HEIGHT/2);
            }
            
            // --- MATERIALIZATION ANIMATION ---
            else if (state.spawnTimer > 0) {
                let progress = 1 - (state.spawnTimer / 90); // 0.0 to 1.0
                let boxSize = (1 - progress) * 400; // Collapses from massive 400px down to 0
                
                ctx.lineWidth = 4;
                state.enemies.forEach(e => {
                    ctx.strokeStyle = e.type === 'hulk' ? '#0f0' : (e.type === 'brain' ? '#f0f' : '#f00');
                    // Draw multiple expanding/collapsing geometric boxes!
                    ctx.strokeRect(e.x - boxSize/2, e.y - boxSize/2, boxSize, boxSize);
                    ctx.strokeRect(e.x - boxSize, e.y - boxSize, boxSize*2, boxSize*2);
                });
                
                sprites.draw(ctx, 'player', state.player.x, state.player.y, state.tick);
            } 
            
            // --- STANDARD RENDER ---
            else {
                state.electrodes.forEach(el => sprites.draw(ctx, 'electrode', el.x, el.y, state.tick));
                state.humans.forEach(h => sprites.draw(ctx, 'human', h.x, h.y, state.tick));
                state.enemies.forEach(e => sprites.draw(ctx, e.type, e.x, e.y, state.tick));

                // Laser Tracers
                ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 6; ctx.lineCap = 'round';
                ctx.beginPath();
                state.bullets.forEach(b => {
                    ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 1.5, b.y - b.vy * 1.5); 
                });
                ctx.stroke();

                if (state.player.invuln <= 0 || Math.floor(state.tick / 3) % 2 === 0) {
                    sprites.draw(ctx, 'player', state.player.x, state.player.y, state.tick);
                }
            }

            // --- THE SPREADING SLICE PARTICLES ---
            state.particles.forEach(p => {
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
                if (p.type === 'slice') {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 5; // Thick arcade lines
                    ctx.beginPath();
                    let endX = p.x + Math.cos(p.angle) * p.length;
                    let endY = p.y + Math.sin(p.angle) * p.length;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, 6, 6); // Chunky shrapnel
                }
            });
            ctx.globalAlpha = 1.0;

            // --- HUD ---
            ctx.fillStyle = '#ff0000'; ctx.font = '30px "VT323"'; ctx.textAlign = 'left';
            ctx.fillText(`SCORE: ${state.score}`, 20, 35);
            ctx.textAlign = 'center'; ctx.fillStyle = '#00ffff';
            ctx.fillText(`WAVE ${state.wave}`, engine.WIDTH/2, 35);
            ctx.textAlign = 'right'; ctx.fillStyle = '#0f0';
            ctx.fillText(`LIVES: ${state.lives}`, engine.WIDTH - 20, 35);

            if (state.status === 'gameover') {
                ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,engine.WIDTH,engine.HEIGHT);
                ctx.fillStyle = '#f00'; ctx.font = '80px "VT323"'; ctx.textAlign = 'center';
                ctx.fillText("GAME OVER", engine.WIDTH/2, engine.HEIGHT/2);
                ctx.fillStyle = '#fff'; ctx.font = '30px "VT323"';
                ctx.fillText("PRESS START TO RESTART", engine.WIDTH/2, engine.HEIGHT/2 + 60);
            }
        }

        animationFrameId = requestAnimationFrame(loop);
    };

    return () => {
        window.removeEventListener('resize', () => {}); // cleanup handled implicitly by unmount
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioCtx, onMenu]);

  return (
    // We removed all CSS constraints! It will stretch to fit the absolute container.
    <div ref={containerRef} className="absolute inset-0 z-20 bg-black pointer-events-auto overflow-hidden">
      {!isReady && (
         <div className="absolute inset-0 z-30 flex items-center justify-center bg-black bg-opacity-90">
             <h2 className="text-[#0f0] text-3xl font-['VT323'] blink-text">LOADING ROM ASSETS...</h2>
         </div>
      )}
      <canvas ref={canvasRef} className="block w-full h-full cursor-none" />
    </div>
  );
}
// src/robotron/index.jsx
import React, { useEffect, useRef, useState } from 'react';
import { WilliamsAudio } from './Audio';
import { RobotronSprites } from './Sprites';
import { RobotronEngine } from './Engine';

export default function RobotronGame({ audioCtx, onMenu }) {
  const canvasRef = useRef(null);
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
        try {
            await Promise.all([
                sprites.loadAssets(),
                audio.loadAssets()
            ]);
            
            engine = new RobotronEngine((actionType, enemyType) => {
                if (actionType === 'shoot') audio.playShoot();
                if (actionType === 'boom') audio.playExplosion(enemyType); 
                if (actionType === 'rescue') audio.playHumanRescue();
                if (actionType === 'humanKilled') audio.playHumanKilled();
                if (actionType === 'playerDeath') audio.playPlayerDeath();
                if (actionType === 'spawn') audio.playSpawnMaterialize();
            });

            setIsReady(true);
            loop(); 
        } catch (err) {
            console.error("Failed to boot Robotron ROMs", err);
        }
    };
    
    bootGame();

    const keys = {};
    const handleKeyDown = e => { 
        if (!isReady || !engine) return;
        if (e.key === ' ') e.preventDefault(); 
        keys[e.key.toLowerCase()] = true; 
        if(e.key.toLowerCase() === 'm') onMenu();
        
        // Broadened safety check for simulated keyboards
        if(e.key === 'Enter' || e.key.toLowerCase() === 'enter' || e.key === 'Return') {
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

        // --- NATIVE USB GAMEPAD POLLER ---
        // We create a copy of the keys object so we can inject controller inputs 
        // without permanently overriding the physical keyboard state.
        const virtualKeys = { ...keys };
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads.find(g => g !== null && g.connected);

        if (gp) {
            // NES Start Button (Usually mapped to button 9 or 7 on USB controllers)
            if (gp.buttons[9]?.pressed || gp.buttons[7]?.pressed) {
                if (engine.state.status === 'start' || engine.state.status === 'gameover') {
                    engine.reset();
                    engine.state.status = 'playing';
                    engine.startWave();
                }
            }

            // NES A/B Action Buttons -> Map to Spacebar (Fire)
            if (gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[2]?.pressed) {
                virtualKeys[' '] = true;
            }

            // NES D-Pad / Analog Axes -> Map to WASD (Move)
            if (gp.axes[0] < -0.5 || gp.buttons[14]?.pressed) virtualKeys['a'] = true; // Left
            if (gp.axes[0] > 0.5 || gp.buttons[15]?.pressed) virtualKeys['d'] = true; // Right
            if (gp.axes[1] < -0.5 || gp.buttons[12]?.pressed) virtualKeys['w'] = true; // Up
            if (gp.axes[1] > 0.5 || gp.buttons[13]?.pressed) virtualKeys['s'] = true; // Down
        }

        // Pass the merged Keyboard & USB Controller inputs into the engine
        const state = engine.update(virtualKeys);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
        ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);

        if (state.flash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${state.flash / 10})`;
            ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);
            state.flash--;
        }

        if (state.status === 'start') {
            ctx.fillStyle = '#ff0000'; ctx.font = '60px "VT323"'; ctx.textAlign = 'center';
            ctx.fillText("ROBOTRON: 2084", engine.WIDTH/2, engine.HEIGHT/2 - 40);
            ctx.fillStyle = '#0f0'; ctx.font = '24px "VT323"';
            
            // Updated to reflect USB Controller capabilities
            ctx.fillText("D-PAD: MOVE  |  A/B/SPACE: FIRE", engine.WIDTH/2, engine.HEIGHT/2 + 20);
            
            ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? '#fff' : '#ff0'; 
            ctx.fillText("PRESS START", engine.WIDTH/2, engine.HEIGHT/2 + 70);
        } else {
            state.electrodes.forEach(el => sprites.draw(ctx, 'electrode', el.x, el.y, state.tick));
            state.humans.forEach(h => sprites.draw(ctx, 'human', h.x, h.y, state.tick));
            
            state.enemies.forEach(e => {
                if ((e.type === 'brain' || e.type === 'prog') && Math.floor(state.tick / 3) % 2 === 0) {
                    ctx.globalAlpha = 0.5; 
                }
                sprites.draw(ctx, e.type, e.x, e.y, state.tick);
                ctx.globalAlpha = 1.0;
            });

            ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            state.bullets.forEach(b => {
                ctx.moveTo(b.x, b.y); 
                ctx.lineTo(b.x - b.vx * 1.2, b.y - b.vy * 1.2); 
            });
            ctx.stroke();

            if (state.status === 'playing') {
                if (state.player.invuln <= 0 || Math.floor(state.tick / 3) % 2 === 0) {
                    sprites.draw(ctx, 'player', state.player.x, state.player.y, state.tick);
                }
            }

            state.particles.forEach(p => {
                ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 50));
                if (p.type === 'shockwave') {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 3;
                    let size = (p.maxLife - p.life) * p.speed;
                    ctx.strokeRect(p.x - size/2, p.y - size/2, size, size);
                } else {
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, 4, 4); 
                }
            });
            ctx.globalAlpha = 1.0;

            ctx.fillStyle = '#ff0000'; ctx.font = '22px "VT323"'; ctx.textAlign = 'left';
            ctx.fillText(`SCORE: ${state.score}`, 10, 25);
            ctx.textAlign = 'center'; ctx.fillStyle = '#00ffff';
            ctx.fillText(`WAVE ${state.wave}`, engine.WIDTH/2, 25);
            ctx.textAlign = 'right'; ctx.fillStyle = '#0f0';
            ctx.fillText(`LIVES: ${state.lives}`, engine.WIDTH - 10, 25);

            if (state.status === 'gameover') {
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,engine.WIDTH,engine.HEIGHT);
                ctx.fillStyle = '#f00'; ctx.font = '60px "VT323"'; ctx.textAlign = 'center';
                ctx.fillText("GAME OVER", engine.WIDTH/2, engine.HEIGHT/2);
                ctx.fillStyle = '#fff'; ctx.font = '24px "VT323"';
                ctx.fillText("PRESS START TO RESTART", engine.WIDTH/2, engine.HEIGHT/2 + 50);
            }
        }

        animationFrameId = requestAnimationFrame(loop);
    };

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioCtx, onMenu]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-black p-4">
      {!isReady && (
         <div className="absolute inset-0 z-30 flex items-center justify-center bg-black bg-opacity-90">
             <h2 className="text-[#0f0] text-3xl font-['VT323'] blink-text">LOADING ROM ASSETS...</h2>
         </div>
      )}
      <canvas ref={canvasRef} width={640} height={480} className="w-full max-w-[800px] aspect-[4/3] object-contain border-4 border-[#333] shadow-[0_0_30px_#f00]" />
    </div>
  );
}
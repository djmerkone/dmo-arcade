// src/robotron/index.jsx
import React, { useEffect, useRef } from 'react';
import { WilliamsAudio } from './Audio';
import { RobotronSprites } from './Sprites';
import { RobotronEngine } from './Engine';

export default function RobotronGame({ audioCtx, onMenu }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Disable smoothing for perfect 8-bit pixels
    ctx.imageSmoothingEnabled = false;

    // Initialize Systems
    const audio = new WilliamsAudio(audioCtx);
    const sprites = new RobotronSprites();
    sprites.initialize();
    
    const engine = new RobotronEngine((type, isHulk) => {
        if (type === 'shoot') audio.playShoot();
        if (type === 'boom') audio.playExplosion(isHulk);
        if (type === 'rescue') audio.playHumanRescue();
        if (type === 'spawn') audio.playSpawnMaterialize();
    });

    // Input Handling
    const keys = {};
const handleKeyDown = e => { 
        if (e.key === ' ') e.preventDefault(); // Stops the page from scrolling when you shoot!
        keys[e.key.toLowerCase()] = true; 
        if(e.key.toLowerCase() === 'm') onMenu();
        if(e.key === 'Enter') {
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

    // The Master Loop
    let animationFrameId;
    const loop = () => {
        const state = engine.update(keys);
        
        // --- RENDER PIPELINE ---
        // 1. Clear with true black
        ctx.fillStyle = '#000000'; 
        ctx.fillRect(0, 0, engine.WIDTH, engine.HEIGHT);

        if (state.status === 'start') {
            ctx.fillStyle = '#ff0000'; ctx.font = '60px "VT323"'; ctx.textAlign = 'center';
            ctx.fillText("ROBOTRON: 2084", engine.WIDTH/2, engine.HEIGHT/2 - 40);
            ctx.fillStyle = '#0f0'; ctx.font = '24px "VT323"';
            
            // UPDATED INSTRUCTIONS:
            ctx.fillText("WASD/ARROWS: MOVE  |  SPACE: FIRE", engine.WIDTH/2, engine.HEIGHT/2 + 20);
            
            ctx.fillStyle = '#fff';
            ctx.fillText("PRESS ENTER TO START", engine.WIDTH/2, engine.HEIGHT/2 + 70);
        } else {
            
            // Draw Electrodes
            state.electrodes.forEach(el => {
                ctx.drawImage(sprites.get('electrode'), el.x - 9, el.y - 9);
            });

            // Draw Humans
            state.humans.forEach(h => {
                ctx.drawImage(sprites.get('human'), h.x - 9, h.y - 9);
            });

            // Draw Enemies
            state.enemies.forEach(e => {
                ctx.drawImage(sprites.get(e.type, state.tick), e.x - 9, e.y - 9);
            });

            // Draw Bullets (Solid yellow lines)
            ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 3;
            ctx.beginPath();
            state.bullets.forEach(b => {
                ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx*0.5, b.y - b.vy*0.5); // Tracer effect
            });
            ctx.stroke();

            // Draw Player (Flashes when invulnerable)
            if (state.status === 'playing') {
                if (state.player.invuln <= 0 || Math.floor(state.tick / 4) % 2 === 0) {
                    ctx.drawImage(sprites.get('player'), state.player.x - 9, state.player.y - 9);
                }
            }

            // Draw Spectacular Particles
            state.particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 50; // Fade out based on max life
                // We draw rects instead of arcs because it looks more "arcade hardware" accurate
                ctx.fillRect(p.x, p.y, 4, 4); 
            });
            ctx.globalAlpha = 1.0;

            // Draw HUD
            ctx.fillStyle = '#ff0000'; ctx.font = '20px "VT323"'; ctx.textAlign = 'left';
            ctx.fillText(`SCORE: ${state.score}`, 10, 25);
            ctx.textAlign = 'center'; ctx.fillStyle = '#00ffff';
            ctx.fillText(`WAVE ${state.wave}`, engine.WIDTH/2, 25);
            ctx.textAlign = 'right'; ctx.fillStyle = '#0f0';
            ctx.fillText(`LIVES: ${state.lives}`, engine.WIDTH - 10, 25);

            if (state.status === 'gameover') {
                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0,0,engine.WIDTH,engine.HEIGHT);
                ctx.fillStyle = '#f00'; ctx.font = '50px "VT323"'; ctx.textAlign = 'center';
                ctx.fillText("GAME OVER", engine.WIDTH/2, engine.HEIGHT/2);
                ctx.fillStyle = '#fff'; ctx.font = '20px "VT323"';
                ctx.fillText("PRESS ENTER TO RESTART", engine.WIDTH/2, engine.HEIGHT/2 + 50);
            }
        }

        animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioCtx, onMenu]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-black p-4">
      {/* 640x480 is exactly 4:3! */}
      <canvas ref={canvasRef} width={640} height={480} className="w-full max-w-[800px] aspect-[4/3] object-contain border-4 border-[#333] shadow-[0_0_30px_#f00]" />
    </div>
  );
}
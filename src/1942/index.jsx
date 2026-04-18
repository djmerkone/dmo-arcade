// src/1942/index.jsx
import React, { useEffect, useRef } from 'react';
import { GameRenderer } from './Renderer';
import { SpriteManager } from './Sprites';
import { GameEngine } from './Engine';

export default function Game1942({ audioCtx, onMenu }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // 1. Initialize our custom Audio Callback
    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      if (type === 'shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.1);
      } else if (type === 'boom') {
        let bufSize = audioCtx.sampleRate * 0.5; let buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        let data = buf.getChannelData(0); for(let i=0; i<bufSize; i++) data[i] = Math.random()*2-1;
        let noise = audioCtx.createBufferSource(); noise.buffer = buf;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(600, t); filter.frequency.linearRampToValueAtTime(50, t+0.5);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.5);
        noise.connect(filter).connect(gain).connect(audioCtx.destination); noise.start(t);
      } else if (type === 'powerup') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(400, t); osc.frequency.setValueAtTime(600, t + 0.1); osc.frequency.setValueAtTime(800, t + 0.2);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.3);
      } else if (type === 'roll') {
        let osc = audioCtx.createOscillator(); osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t); osc.frequency.linearRampToValueAtTime(600, t + 0.3); osc.frequency.linearRampToValueAtTime(200, t + 0.8);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0.1, t + 0.6); gain.gain.linearRampToValueAtTime(0.001, t + 0.8);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.8);
      }
    };

    // 2. Boot the Foundry and Engines
    const sprites = new SpriteManager();
    sprites.initialize(); // Pre-renders all graphics into VRAM

    const renderer = new GameRenderer(canvasRef.current);
    // Update Renderer constants to 4:3!
    renderer.GAME_WIDTH = 320; 
    renderer.GAME_HEIGHT = 240;
    renderer.buffer.width = 320;
    renderer.buffer.height = 240;

const engine = new GameEngine({
    shoot: () => audio.playShoot(),
    boom: (heavy) => audio.playExplosion(heavy),
    roll: () => audio.playRoll()
});
    window.addEventListener('resize', handleResize);
    handleResize();

    // 4. Input Wiring
    const keys = {};
    const handleKeyDown = e => { 
        keys[e.key.toLowerCase()] = true; 
        if(e.key.toLowerCase() === 'm') onMenu(); 
        if(e.key === 'Enter' && engine.state.status === 'gameover') engine.reset();
    };
    const handleKeyUp = e => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

// 5. The Master Loop
    const loop = () => {
        // Step A: Engine calculates all physics
        const state = engine.update(keys);
        
        // --- ADD THE AUDIO TRIGGERS HERE ---
        if (state.status === 'playing') audio.startEngine();
        if (state.status === 'gameover') audio.stopEngine();
        // -----------------------------------

        // Step B: We inject the Sprites to the renderer alongside the state!
        // We override the renderer's standard draw logic to use our Pre-Rendered Cache
        renderer.drawOcean(state.tick);
        
        const ctx = renderer.bufferCtx;
        
        // Draw Powerups
        state.powerups.forEach(p => {
            ctx.fillStyle = '#f00'; ctx.fillRect(p.x - 6, p.y - 6, 12, 12);
            ctx.fillStyle = '#fff'; ctx.font = '8px "VT323"'; ctx.fillText("POW", p.x - 5, p.y + 3);
        });

        // Draw Bullets (using forged sprites)
        state.bullets.forEach(b => ctx.drawImage(sprites.get('bulletPlayer'), b.x - 8, b.y - 8));
        state.enemyBullets.forEach(b => ctx.drawImage(sprites.get('bulletEnemy'), b.x - 8, b.y - 8));

        // Draw Enemies
        state.enemies.forEach(e => {
            let img = e.type === 'redZero' ? sprites.get('redZero') : sprites.get('zero');
            ctx.drawImage(img, e.x - 24, e.y - 24);
            sprites.drawPropeller(ctx, e.x, e.y - 12, state.tick);
        });

        // Draw Player with Loop-de-loop Scaling!
        const p = state.player;
        if (state.status === 'playing') {
            ctx.save();
            ctx.translate(p.x, p.y);
            
            if (p.isRolling) {
                // 3D Scale Illusion
                let rollProgress = p.rollTimer / 60; // 1 to 0
                let scale = 1 + Math.sin(rollProgress * Math.PI) * 1.5; 
                ctx.scale(scale, scale);
                
                // Banking Illusion
                let img = sprites.get('p38');
                if (rollProgress > 0.6) img = sprites.get('p38BankLeft');
                else if (rollProgress < 0.4) img = sprites.get('p38BankRight');
                
                ctx.drawImage(img, -32, -32);
                sprites.drawPropeller(ctx, -12, -16, state.tick);
                sprites.drawPropeller(ctx, 12, -16, state.tick);
            } else {
                // Normal shadow
                ctx.globalAlpha = 0.4;
                ctx.drawImage(sprites.get('p38'), -20, -10, 32, 32); 
                ctx.globalAlpha = 1.0;
                
                ctx.drawImage(sprites.get('p38'), -32, -32);
                sprites.drawPropeller(ctx, -12, -16, state.tick);
                sprites.drawPropeller(ctx, 12, -16, state.tick);
            }
            ctx.restore();
        }

        // Draw Particles
        state.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 30;
            ctx.beginPath(); ctx.arc(p.x, p.y, 1 + (p.life/10), 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        // UI Layer
        ctx.fillStyle = '#ff0000'; ctx.font = '12px "VT323", monospace'; ctx.textAlign = 'left';
        ctx.fillText("1UP", 10, 15);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(state.score.toString().padStart(6, '0'), 10, 25);
        
        ctx.textAlign = 'right';
        ctx.fillStyle = '#0f0';
        ctx.fillText("ROLL: " + state.rolls, 310, 230);
        
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        for(let i=0; i<state.lives; i++) {
            ctx.drawImage(sprites.get('p38'), 10 + (i*16), 220, 16, 16);
        }

        if (state.status === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0, 320, 240);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f00'; ctx.font = '24px "VT323"'; ctx.fillText("GAME OVER", 160, 110);
            ctx.fillStyle = '#fff'; ctx.font = '12px "VT323"'; ctx.fillText("PRESS ENTER TO RESTART", 160, 140);
        }

        // Step C: Blit buffer to screen
        renderer.ctx.clearRect(0, 0, renderer.canvas.width, renderer.canvas.height);
        renderer.ctx.drawImage(
            renderer.buffer, 
            0, 0, renderer.GAME_WIDTH, renderer.GAME_HEIGHT, 
            0, 0, renderer.canvas.width, renderer.canvas.height
        );

        animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioCtx, onMenu]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black pointer-events-auto p-4 md:p-8">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-contain cursor-none border-4 border-[#222]" 
        style={{ boxShadow: '0 0 50px rgba(0,0,0,0.9)' }}
      />
    </div>
  );
}
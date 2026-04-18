import React, { useEffect, useRef } from 'react';

// --- PIXEL ART DICTIONARY ---
const PALETTE = {
  'S': '#cccccc', 'D': '#555555', 'B': '#0055ff', 'Y': '#ffff00',
  'G': '#44aa44', 'R': '#ff3300', 'W': '#ffffff', 'O': '#ff8800'
};

const SPRITES = {
  p38: [ // The iconic twin-boom Lightning
    "....D....",
    "...S.S...",
    "..S.B.S..",
    "..S.S.S..",
    "DSSSSSSD.",
    "S.SSSSS.S",
    "..S.S.S..",
    "...S.S..."
  ],
  enemy: [ // Green Zero fighter
    "....G....",
    "...GGG...",
    "..G.R.G..",
    ".GGGGGGG.",
    "G.G...G.G",
    "...GGG..."
  ],
  redFighter: [ // Red power-up drops
    "....R....",
    "...RRR...",
    "..R.B.R..",
    ".RRRRRRR.",
    "R.R...R.R",
    "...RRR..."
  ],
  bomber: [ // Heavy bomber
    "......G......",
    ".....GGG.....",
    "....G.R.G....",
    "...GGGGGGG...",
    "..GGGGGGGGG..",
    ".G.G.....G.G.",
    "G.G.......G.G",
    ".....GGG.....",
    ".....GGG.....",
    "......G......"
  ]
};

export default function Game1942({ audioCtx, onMenu }) {
  const canvasRef = useRef(null);
  
  const NATIVE_W = 600;
  const NATIVE_H = 800;

  const state = useRef({
    status: 'start',
    score: 0,
    highScore: 0,
    lives: 3,
    rolls: 3,
    tick: 0,
    bgY: 0,
    player: { x: 300, y: 700, speed: 6, cooldown: 0, isRolling: false, rollTimer: 0, powerLevel: 1 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    islands: [],
    keys: {}
  });

  // --- INPUT HANDLER ---
  useEffect(() => {
    const handleKeyDown = e => { state.current.keys[e.key.toLowerCase()] = true; };
    const handleKeyUp = e => { state.current.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  // --- GAME ENGINE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

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
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.5);
        noise.connect(filter).connect(gain).connect(audioCtx.destination); noise.start(t);
      } else if (type === 'roll') {
        let osc = audioCtx.createOscillator(); osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t); osc.frequency.linearRampToValueAtTime(600, t + 0.3); osc.frequency.linearRampToValueAtTime(200, t + 0.8);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0.1, t + 0.6); gain.gain.linearRampToValueAtTime(0.001, t + 0.8);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.8);
      } else if (type === 'powerup') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(400, t); osc.frequency.setValueAtTime(600, t + 0.1); osc.frequency.setValueAtTime(800, t + 0.2);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.3);
      }
    };

    const spawnExplosion = (x, y, size) => {
        playAudio('boom');
        for(let i=0; i<size; i++) {
            state.current.particles.push({
                x, y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
                life: 20 + Math.random()*20, color: Math.random() > 0.5 ? '#ffaa00' : '#ff0000'
            });
        }
    };

    // --- GAME LOOP ---
    const update = () => {
      let gs = state.current;
      let keys = gs.keys;

      if (keys['m']) { onMenu(); return; }

      if (gs.status === 'start' && keys['enter']) {
        gs.status = 'playing'; gs.score = 0; gs.lives = 3; gs.rolls = 3; gs.tick = 0;
        gs.player = { x: 300, y: 700, speed: 6, cooldown: 0, isRolling: false, rollTimer: 0, powerLevel: 1 };
        gs.enemies = []; gs.bullets = []; gs.enemyBullets = []; gs.particles = []; gs.powerups = []; gs.islands = [];
      }

      if (gs.status === 'gameover' && keys['enter']) { gs.status = 'start'; }
      if (gs.status !== 'playing') return;

      gs.tick++;
      gs.bgY = (gs.bgY + 2) % 100; // Fast scrolling ocean

      // Generate Islands
      if (Math.random() < 0.01) {
          gs.islands.push({ x: Math.random() * NATIVE_W, y: -200, size: 50 + Math.random() * 100 });
      }

      let p = gs.player;

      // --- ROLL MECHANIC (INVULNERABILITY) ---
      if (p.isRolling) {
          p.rollTimer--;
          p.y -= 2; // Drift forward during roll
          if (p.rollTimer <= 0) p.isRolling = false;
      } else {
          // Movement
          if (keys['w'] || keys['arrowup']) p.y -= p.speed;
          if (keys['s'] || keys['arrowdown']) p.y += p.speed;
          if (keys['a'] || keys['arrowleft']) p.x -= p.speed;
          if (keys['d'] || keys['arrowright']) p.x += p.speed;
          
          p.x = Math.max(30, Math.min(NATIVE_W - 30, p.x));
          p.y = Math.max(30, Math.min(NATIVE_H - 30, p.y));

          // Trigger Roll
          if ((keys['shift'] || keys['z']) && gs.rolls > 0) {
              p.isRolling = true; p.rollTimer = 60; gs.rolls--; playAudio('roll');
              // Clear nearby bullets to simulate dodging under them
              gs.enemyBullets = gs.enemyBullets.filter(b => Math.hypot(b.x - p.x, b.y - p.y) > 100);
          }

          // Shooting
          if (p.cooldown > 0) p.cooldown--;
          if (keys[' '] && p.cooldown <= 0) {
              if (p.powerLevel === 1) {
                  gs.bullets.push({ x: p.x - 8, y: p.y - 20, vx: 0, vy: -15 });
                  gs.bullets.push({ x: p.x + 8, y: p.y - 20, vx: 0, vy: -15 });
              } else {
                  gs.bullets.push({ x: p.x - 12, y: p.y - 15, vx: -2, vy: -15 });
                  gs.bullets.push({ x: p.x - 4, y: p.y - 20, vx: 0, vy: -15 });
                  gs.bullets.push({ x: p.x + 4, y: p.y - 20, vx: 0, vy: -15 });
                  gs.bullets.push({ x: p.x + 12, y: p.y - 15, vx: 2, vy: -15 });
              }
              p.cooldown = 8; playAudio('shoot');
          }
      }

      // Update Bullets
      gs.bullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
      gs.bullets = gs.bullets.filter(b => b.y > -20);
      
      gs.enemyBullets.forEach(b => { b.x += b.vx; b.y += b.vy; });
      gs.enemyBullets = gs.enemyBullets.filter(b => b.y < NATIVE_H + 20 && b.x > -20 && b.x < NATIVE_W + 20);

      // --- AI SPAWNING ---
      let difficulty = 1 + (gs.tick / 1000);
      
      // Standard Green Fighters (Sine wave sweeps)
      if (Math.random() < 0.03 * difficulty) {
         let startX = Math.random() > 0.5 ? -50 : NATIVE_W + 50;
         gs.enemies.push({ type: 'enemy', x: startX, y: Math.random() * 200, startX: startX, hp: 1, timer: 0, pts: 100 });
      }

      // Red Fighter Squadron (Drops Powerups)
      if (gs.tick % 600 === 0) {
         let startX = 100 + Math.random() * 400;
         for(let i=0; i<3; i++) {
             gs.enemies.push({ type: 'redFighter', x: startX + (i*50), y: -50 - (i*40), hp: 2, timer: 0, pts: 300, isRed: true });
         }
      }

      // Heavy Bomber
      if (gs.tick % 900 === 0) {
         gs.enemies.push({ type: 'bomber', x: 300, y: -100, hp: 20, timer: 0, pts: 1000 });
      }

      // Update Enemies
      for (let i = gs.enemies.length - 1; i >= 0; i--) {
          let e = gs.enemies[i];
          e.timer++;

          if (e.type === 'enemy') {
              e.x += (e.startX < 0 ? 4 : -4);
              e.y += Math.sin(e.timer * 0.05) * 4 + 2;
              if (e.timer % 60 === 0 && Math.random() < 0.5) {
                 let dx = p.x - e.x; let dy = p.y - e.y; let mag = Math.hypot(dx, dy);
                 gs.enemyBullets.push({ x: e.x, y: e.y, vx: (dx/mag)*5, vy: (dy/mag)*5 });
              }
          } else if (e.type === 'redFighter') {
              e.y += 5; // Fast dive bombers
              e.x += Math.sin(e.timer * 0.1) * 3;
          } else if (e.type === 'bomber') {
              e.y += 1.5;
              if (e.timer % 80 === 0) {
                  for(let j=-1; j<=1; j++) {
                     gs.enemyBullets.push({ x: e.x, y: e.y + 20, vx: j*3, vy: 6 });
                  }
              }
          }

          if (e.y > NATIVE_H + 100 || e.x < -100 || e.x > NATIVE_W + 100) { gs.enemies.splice(i, 1); continue; }

          // Collision with Player Bullets
          let eHitbox = e.type === 'bomber' ? 40 : 20;
          for (let j = gs.bullets.length - 1; j >= 0; j--) {
              let b = gs.bullets[j];
              if (Math.hypot(b.x - e.x, b.y - e.y) < eHitbox) {
                  e.hp--; gs.bullets.splice(j, 1);
                  spawnExplosion(b.x, b.y, 3);
                  if (e.hp <= 0) {
                      gs.score += e.pts; if (gs.score > gs.highScore) gs.highScore = gs.score;
                      spawnExplosion(e.x, e.y, e.type === 'bomber' ? 40 : 15);
                      
                      if (e.isRed && Math.random() < 0.5) {
                         gs.powerups.push({ x: e.x, y: e.y, type: 'POW' });
                      }
                      gs.enemies.splice(i, 1);
                  }
                  break;
              }
          }
      }

      // Collision with Player
      if (!p.isRolling && gs.status === 'playing') {
          let hit = false;
          gs.enemyBullets.forEach(b => { if (Math.hypot(b.x - p.x, b.y - p.y) < 10) hit = true; });
          gs.enemies.forEach(e => { if (Math.hypot(e.x - p.x, e.y - p.y) < 20) hit = true; });

          if (hit) {
              spawnExplosion(p.x, p.y, 50); gs.lives--; p.powerLevel = 1; gs.enemyBullets = []; gs.enemies = [];
              if (gs.lives <= 0) { gs.status = 'gameover'; } 
              else { p.x = 300; p.y = 700; p.isRolling = true; p.rollTimer = 120; gs.rolls = 3; } // Respawn invuln
          }
      }

      // Powerups
      for (let i = gs.powerups.length - 1; i >= 0; i--) {
          let pu = gs.powerups[i];
          pu.y += 2;
          if (Math.hypot(pu.x - p.x, pu.y - p.y) < 30 && !p.isRolling) {
              p.powerLevel = 2; gs.score += 500; playAudio('powerup');
              gs.powerups.splice(i, 1);
          } else if (pu.y > NATIVE_H + 50) {
              gs.powerups.splice(i, 1);
          }
      }

      // Update Particles & Islands
      gs.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life--; });
      gs.particles = gs.particles.filter(pt => pt.life > 0);
      gs.islands.forEach(isl => { isl.y += 1; });
      gs.islands = gs.islands.filter(isl => isl.y < NATIVE_H + 200);
    };

    // --- RENDER ENGINE ---
    const drawSprite = (sprite, x, y, scale = 3) => {
        let w = sprite[0].length * scale; let h = sprite.length * scale;
        let sx = x - w/2; let sy = y - h/2;
        for (let r = 0; r < sprite.length; r++) {
            for (let c = 0; c < sprite[r].length; c++) {
                let char = sprite[r][c];
                if (char !== '.') {
                    ctx.fillStyle = PALETTE[char];
                    ctx.fillRect(Math.floor(sx + c*scale), Math.floor(sy + r*scale), scale, scale);
                }
            }
        }
    };

    const drawText = (text, x, y, size, color, align='center') => {
        ctx.fillStyle = color; ctx.textAlign = align; ctx.font = `${size}px "VT323", monospace`; ctx.fillText(text, x, y);
    };

    const draw = () => {
      let gs = state.current;
      let p = gs.player;

      // 1. Ocean Background
      ctx.fillStyle = '#0033aa'; ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);
      
      // Moving water highlights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 20; i++) {
         let wy = ((gs.tick * 1.5) + (i * 50)) % (NATIVE_H + 100) - 50;
         let wx = (Math.sin(i * 45) * 300) + 300;
         ctx.fillRect(wx, wy, 60 + (Math.cos(i) * 30), 6);
      }

      // Islands
      ctx.fillStyle = '#116622';
      gs.islands.forEach(isl => {
          ctx.beginPath(); ctx.arc(isl.x, isl.y, isl.size, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#ddcc88'; ctx.beginPath(); ctx.arc(isl.x - isl.size*0.2, isl.y + isl.size*0.2, isl.size*0.3, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#116622';
      });

      if (gs.status === 'start') {
         ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
         drawText("1942", NATIVE_W/2, 250, 100, '#ffaa00');
         drawText("MIDWAY BATTLE", NATIVE_W/2, 300, 40, '#fff');
         drawText("PRESS ENTER TO LAUNCH", NATIVE_W/2, 450, 30, '#0f0');
         drawText("WASD: Move | SPACE: Fire | SHIFT: Roll", NATIVE_W/2, 550, 20, '#aaa');
         return;
      }

      // Shadows (Drawn slightly below sprites)
      if (!p.isRolling) drawSprite(SPRITES.p38, p.x + 20, p.y + 20, 3);
      gs.enemies.forEach(e => drawSprite(SPRITES[e.type], e.x + 20, e.y + 20, e.type==='bomber'?4:3));

      // Entities
      gs.enemies.forEach(e => drawSprite(SPRITES[e.type], e.x, e.y, e.type==='bomber'?4:3));
      
      // Player with 3D Roll Effect
      if (p.isRolling) {
          // Swoop scale calculation: creates a huge visual loop towards the screen
          let rollProgress = p.rollTimer / 60; // 1 to 0
          let scale = 3 + Math.sin(rollProgress * Math.PI) * 4; 
          
          // Draw a tiny shadow fixed on the ocean
          drawSprite(SPRITES.p38, p.x + 20, p.y + 40, 2); 
          
          // Draw the massive swooping plane
          drawSprite(SPRITES.p38, p.x, p.y, scale);
      } else {
          drawSprite(SPRITES.p38, p.x, p.y, 3);
      }

      // Bullets
      ctx.fillStyle = '#ffff00';
      gs.bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 8, 4, 16));
      ctx.fillStyle = '#ff0000';
      gs.enemyBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill(); });

      // Powerups
      gs.powerups.forEach(pu => {
          ctx.fillStyle = '#ff0000'; ctx.fillRect(pu.x - 15, pu.y - 10, 30, 20);
          drawText("POW", pu.x, pu.y + 5, 16, '#fff');
      });

      // Particles
      gs.particles.forEach(pt => {
          ctx.fillStyle = pt.color; ctx.globalAlpha = pt.life / 40;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 3 + (pt.life/10), 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1.0;
      });

      // --- ARCADE HUD ---
      drawText("1UP", 50, 40, 24, '#f00', 'left');
      drawText(gs.score.toString().padStart(6, '0'), 50, 70, 24, '#fff', 'left');
      
      drawText("HIGH SCORE", NATIVE_W/2, 40, 24, '#f00');
      drawText(gs.highScore.toString().padStart(6, '0'), NATIVE_W/2, 70, 24, '#fff');

      // Lives
      for(let i=0; i<gs.lives; i++) drawSprite(SPRITES.p38, 40 + i*30, NATIVE_H - 30, 1.5);
      
      // Roll Icons (R)
      for(let i=0; i<gs.rolls; i++) drawText("R", NATIVE_W - 30 - i*25, NATIVE_H - 20, 24, '#0f0', 'right');

      if (gs.status === 'gameover') {
         ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
         drawText("GAME OVER", NATIVE_W/2, NATIVE_H/2, 60, '#f00');
         drawText("PRESS ENTER TO RESTART", NATIVE_W/2, NATIVE_H/2 + 60, 24, '#fff');
      }
    };

    const loop = () => {
      update(); draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [audioCtx, onMenu]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent p-6 md:p-12">
      <canvas ref={canvasRef} width={600} height={800} className="w-full h-full max-h-full object-contain bg-black cursor-none" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}
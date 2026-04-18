import React, { useEffect, useRef } from 'react';

// --- 3D VECTOR MODELS ---
const MODELS = {
  cube: {
    faces: [
      [[-40, 40, 40], [40, 40, 40], [40, -40, 40], [-40, -40, 40]], 
      [[-40, 40, -40], [-40, -40, -40], [40, -40, -40], [40, 40, -40]], 
      [[-40, 40, -40], [-40, 40, 40], [-40, -40, 40], [-40, -40, -40]], 
      [[40, 40, -40], [40, -40, -40], [40, -40, 40], [40, 40, 40]], 
      [[-40, 40, -40], [40, 40, -40], [40, 40, 40], [-40, 40, 40]]
    ]
  },
  pyramid: {
    faces: [
      [[-60, -40, 60], [60, -40, 60], [60, -40, -60], [-60, -40, -60]], 
      [[-60, -40, 60], [60, -40, 60], [0, 80, 0]], 
      [[60, -40, 60], [60, -40, -60], [0, 80, 0]], 
      [[60, -40, -60], [-60, -40, -60], [0, 80, 0]], 
      [[-60, -40, -60], [-60, -40, 60], [0, 80, 0]] 
    ]
  },
  tank: {
    faces: [
      [[-25, -15, 35], [25, -15, 35], [35, -15, -35], [-35, -15, -35]], 
      [[-15, 10, 25], [15, 10, 25], [25, 10, -25], [-25, 10, -25]], 
      [[-25, -15, 35], [-15, 10, 25], [15, 10, 25], [25, -15, 35]], 
      [[-35, -15, -35], [-25, 10, -25], [25, 10, -25], [35, -15, -35]], 
      [[-25, -15, 35], [-35, -15, -35], [-25, 10, -25], [-15, 10, 25]], 
      [[25, -15, 35], [15, 10, 25], [25, 10, -25], [35, -15, -35]], 
      [[-10, 10, 10], [10, 10, 10], [10, 20, -10], [-10, 20, -10]], 
      [[-3, 15, 10], [3, 15, 10], [3, 15, 55], [-3, 15, 55]] 
    ]
  },
  saucer: {
    faces: [
      [[-20, 0, 20], [20, 0, 20], [20, 0, -20], [-20, 0, -20]],
      [[-20, 0, 20], [20, 0, 20], [0, 15, 0]],
      [[20, 0, 20], [20, 0, -20], [0, 15, 0]],
      [[20, 0, -20], [-20, 0, -20], [0, 15, 0]],
      [[-20, 0, -20], [-20, 0, 20], [0, 15, 0]],
      [[-20, 0, 20], [20, 0, 20], [0, -15, 0]],
      [[20, 0, 20], [20, 0, -20], [0, -15, 0]],
      [[20, 0, -20], [-20, 0, -20], [0, -15, 0]],
      [[-20, 0, -20], [-20, 0, 20], [0, -15, 0]]
    ]
  }
};

export default function BattlezoneGame({ audioCtx, onMenu }) {
  const canvasRef = useRef(null);

  const NATIVE_W = 800;
  const NATIVE_H = 600;
  const FOV = 500; 
  const WORLD_SIZE = 12000;
  const GRID_SIZE = 600;

  const state = useRef({
    status: 'start',
    score: 0,
    highScore: 0,
    wave: 1,
    waveTimer: 0,
    player: { x: 0, z: 0, vx: 0, vz: 0, bodyAngle: 0, turretAngle: 0, cooldown: 0, hp: 5, maxHp: 5, invuln: 0, shake: 0 },
    enemies: [],
    projectiles: [],
    obstacles: [],
    particles: [],
    dust: [],
    mountains: [],
    stars: [],
    keys: {}
  });

  // --- CONTROLS & MOUSE LOCK ---
  useEffect(() => {
    const canvas = canvasRef.current;
    
    const handleKeyDown = e => { state.current.keys[e.key.toLowerCase()] = true; };
    const handleKeyUp = e => { state.current.keys[e.key.toLowerCase()] = false; };
    
    const handleMouseMove = e => {
      if (document.pointerLockElement === canvas && state.current.status === 'playing') {
        state.current.player.turretAngle -= e.movementX * 0.003; 
      }
    };

    const handleMouseDown = e => {
      if (state.current.status !== 'playing') return;
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      } else {
        state.current.keys['mouse0'] = true;
      }
    };

    const handleMouseUp = e => { state.current.keys['mouse0'] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // --- GAME ENGINE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const buildEnvironment = () => {
      let mts = [];
      let curHeight = 20;
      for(let a=0; a < Math.PI*2; a += 0.08) {
          curHeight += (Math.random() - 0.5) * 40;
          curHeight = Math.max(15, Math.min(100, curHeight));
          mts.push({ angle: a, height: curHeight, dist: 8000 + Math.random()*2000 });
      }
      
      let strs = [];
      for(let i=0; i<150; i++) {
         strs.push({
            angle: Math.random() * Math.PI * 2,
            height: 100 + Math.random() * 300,
            size: Math.random() > 0.8 ? 2 : 1,
            flicker: Math.random() * Math.PI * 2
         });
      }

      let obs = [];
      for (let i = 0; i < 30; i++) {
        let ox, oz;
        do {
          ox = (Math.random() - 0.5) * WORLD_SIZE;
          oz = (Math.random() - 0.5) * WORLD_SIZE;
        } while (Math.hypot(ox, oz) < 1500); 

        obs.push({
          type: Math.random() > 0.6 ? 'cube' : 'pyramid',
          x: ox, z: oz, angle: Math.random() * Math.PI * 2
        });
      }
      return { mts, strs, obs };
    };

    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      if (type === 'shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.25);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.25);
      } else if (type === 'enemy_shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(400, t); osc.frequency.linearRampToValueAtTime(300, t + 0.4);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.4);
      } else if (type === 'boom') {
        let bufSize = audioCtx.sampleRate * 1.2; let buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        let data = buf.getChannelData(0); for(let i=0; i<bufSize; i++) data[i] = Math.random()*2-1;
        let noise = audioCtx.createBufferSource(); noise.buffer = buf;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(400, t); filter.frequency.linearRampToValueAtTime(30, t+1.2);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.8, t); gain.gain.exponentialRampToValueAtTime(0.01, t+1.2);
        noise.connect(filter).connect(gain).connect(audioCtx.destination); noise.start(t);
      }
    };

    const triggerExplosion = (ex, ey, ez, color) => {
        playAudio('boom');
        
        // 1. Expanding 3D Shockwave
        state.current.particles.push({
            type: 'shockwave', x: ex, y: ey, z: ez, radius: 1, maxRadius: 250, color: '#fff'
        });

        // 2. Vector Debris Shards (Spinning chunks)
        for(let i=0; i<15; i++) {
            state.current.particles.push({
                type: 'shard', x: ex, y: ey + 20, z: ez,
                vx: (Math.random()-0.5)*35, vy: 10 + (Math.random()*25), vz: (Math.random()-0.5)*35,
                rx: Math.random()*Math.PI*2, ry: Math.random()*Math.PI*2, rz: Math.random()*Math.PI*2,
                rvx: (Math.random()-0.5)*0.6, rvy: (Math.random()-0.5)*0.6, rvz: (Math.random()-0.5)*0.6,
                len: 20 + Math.random()*60, life: 60 + Math.random()*40, color: color
            });
        }

        // 3. Dense Glittering Spark Dust
        const colors = ['#ffffff', '#ffaa00', '#ff0000', color];
        for(let i=0; i<100; i++) {
            state.current.dust.push({
                x: ex, y: ey + 20, z: ez,
                vx: (Math.random()-0.5)*50, vy: 5 + (Math.random()*40), vz: (Math.random()-0.5)*50,
                life: 80 + Math.random()*60,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    };

// --- 3D MATH CORE ---
    const transformPoint = (px, py, pz, objX, objZ, objAngle, camX, camZ, camAngle, shakeOffset) => {
      let cosO = Math.cos(objAngle); let sinO = Math.sin(objAngle);
      // FIX: Corrected object local rotation matrix
      let rx = px * cosO + pz * sinO; 
      let rz = -px * sinO + pz * cosO;
      let wx = rx + objX; let wz = rz + objZ;
      let dx = wx - camX; let dz = wz - camZ;
      // FIX: Corrected camera space rotation matrix
      let cosC = Math.cos(camAngle); let sinC = Math.sin(camAngle);
      let cx = dx * cosC - dz * sinC; 
      let cz = dx * sinC + dz * cosC;
      return { x: cx + shakeOffset, y: py + shakeOffset, z: cz };
    };

    const transformParticle = (ptX, ptY, ptZ, pX, pY, pZ, rx, ry, rz, camX, camZ, camAngle, shakeOffset) => {
        let cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
        let x1 = ptX * cz - ptY * sz; let y1 = ptX * sz + ptY * cz; let z1 = ptZ;
        let x2 = x1 * cy + z1 * sy; let y2 = y1; let z2 = -x1 * sy + z1 * cy;
        let x3 = x2; let y3 = y2 * cx - z2 * sx; let z3 = y2 * sx + z2 * cx;
        let wx = x3 + pX; let wy = y3 + pY; let wz = z3 + pZ;
        let dx = wx - camX; let dz = wz - camZ;
        // FIX: Corrected camera space rotation matrix for particles
        let cosC = Math.cos(camAngle), sinC = Math.sin(camAngle);
        return { x: (dx * cosC - dz * sinC) + shakeOffset, y: wy + shakeOffset, z: (dx * sinC + dz * cosC) };
    };

    const projectToScreen = (camPt) => {
      if (camPt.z < 10) return null;
      let scale = FOV / camPt.z;
      // Horizon locked exactly to y: 20 relative offset
      return { x: (NATIVE_W / 2) + (camPt.x * scale), y: (NATIVE_H / 2) - (camPt.y * scale) + 20 };
    };

    // --- GAME LOOP ---
    const update = () => {
      let gs = state.current;
      let keys = gs.keys;

      if (keys['m']) {
        if (document.pointerLockElement) document.exitPointerLock();
        onMenu(); return;
      }

      if (gs.status === 'start' && keys['enter']) {
        gs.status = 'playing'; gs.score = 0; gs.wave = 0; gs.waveTimer = 180;
        gs.player = { x: 0, z: 0, vx: 0, vz: 0, bodyAngle: 0, turretAngle: 0, cooldown: 0, hp: 5, maxHp: 5, invuln: 0, shake: 0 };
        let env = buildEnvironment();
        gs.mountains = env.mts; gs.stars = env.strs; gs.obstacles = env.obs;
        gs.enemies = []; gs.projectiles = []; gs.particles = []; gs.dust = [];
      }

      if (gs.status === 'gameover' && keys['enter']) { gs.status = 'start'; }
      if (gs.status !== 'playing') return;

      let p = gs.player;
      if (p.invuln > 0) p.invuln--;
      if (p.shake > 0.5) p.shake *= 0.8; else p.shake = 0;

      // WASD Hull Movement & Heavy Physics
      let thrust = 0;
      if (keys['w']) thrust = 1.8;
      if (keys['s']) thrust = -1.8;
      if (keys['a']) p.bodyAngle -= 0.04;
      if (keys['d']) p.bodyAngle += 0.04;

      p.vx += Math.sin(p.bodyAngle) * thrust;
      p.vz += Math.cos(p.bodyAngle) * thrust;
      
      p.vx *= 0.90; p.vz *= 0.90; 

      let nextX = p.x + p.vx;
      let nextZ = p.z + p.vz;

      let hitObs = false;
      gs.obstacles.forEach(obs => {
         if (Math.hypot(obs.x - nextX, obs.z - nextZ) < 80) hitObs = true;
      });
      
      if (!hitObs) { p.x = nextX; p.z = nextZ; } 
      else { p.vx *= -0.5; p.vz *= -0.5; p.shake = 10; } 

      if (Math.abs(p.x) > WORLD_SIZE) p.x = Math.sign(p.x) * WORLD_SIZE;
      if (Math.abs(p.z) > WORLD_SIZE) p.z = Math.sign(p.z) * WORLD_SIZE;

      // Mouse Shooting - Perfectly aligned to crosshair horizon
      if (p.cooldown > 0) p.cooldown--;
      if (keys['mouse0'] && p.cooldown <= 0 && document.pointerLockElement) {
         gs.projectiles.push({
            x: p.x + Math.sin(p.turretAngle)*20, z: p.z + Math.cos(p.turretAngle)*20, y: 15,
            vx: Math.sin(p.turretAngle) * 40, vz: Math.cos(p.turretAngle) * 40,
            isPlayer: true, life: 60
         });
         p.cooldown = 35; playAudio('shoot');
      }

      // Update Projectiles
      for (let i = gs.projectiles.length - 1; i >= 0; i--) {
         let pr = gs.projectiles[i];
         pr.x += pr.vx; pr.z += pr.vz; pr.life--;
         
         let hit = false;
         for (let o of gs.obstacles) {
            if (Math.hypot(o.x - pr.x, o.z - pr.z) < 60) { hit = true; break; }
         }

         if (pr.isPlayer && !hit) {
            for (let j = gs.enemies.length - 1; j >= 0; j--) {
               let e = gs.enemies[j];
               if (Math.hypot(e.x - pr.x, e.z - pr.z) < 55) {
                  gs.score += e.type === 'saucer' ? 5000 : 1000;
                  if (gs.score > gs.highScore) gs.highScore = gs.score;
                  hit = true; 
                  triggerExplosion(e.x, 15, e.z, '#fa0');
                  gs.enemies.splice(j, 1);
                  break;
               }
            }
         }

         if (!pr.isPlayer && !hit && p.invuln <= 0) {
            if (Math.hypot(p.x - pr.x, p.z - pr.z) < 40) {
               hit = true; p.hp--; p.invuln = 60; p.shake = 40; playAudio('hit');
               if (p.hp <= 0) { gs.status = 'gameover'; if (document.pointerLockElement) document.exitPointerLock(); }
            }
         }

         if (hit || pr.life <= 0) gs.projectiles.splice(i, 1);
      }

      // WAVE MANAGEMENT & AI Spawning
      if (gs.enemies.length === 0) {
         gs.waveTimer--;
         if (gs.waveTimer <= 0) {
            gs.wave++;
            let spawns = Math.min(6, 1 + Math.floor(gs.wave / 2));
            for(let i=0; i<spawns; i++) {
                let dist = 2500 + Math.random() * 3000;
                let ang = Math.random() * Math.PI * 2;
                gs.enemies.push({
                    type: Math.random() > 0.85 ? 'saucer' : 'tank',
                    x: p.x + Math.sin(ang) * dist, z: p.z + Math.cos(ang) * dist,
                    angle: Math.random() * Math.PI * 2, state: 'hunt', timer: Math.random()*100
                });
            }
            gs.waveTimer = 180; 
         }
      }

      // Progressive Enemy Difficulty
      let enemySpeed = Math.min(10, 3 + (gs.wave * 0.4));
      let enemyAggro = Math.max(60, 240 - (gs.wave * 20)); // Starts slow (220 frames), gets faster each wave

      gs.enemies.forEach(e => {
         let dx = p.x - e.x; let dz = p.z - e.z;
         let dist = Math.hypot(dx, dz);
         let targetAngle = Math.atan2(dx, dz);

         if (e.type === 'tank') {
            let diff = targetAngle - e.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            e.angle += Math.max(-0.04, Math.min(0.04, diff));

            if (dist > 800) { e.x += Math.sin(e.angle) * enemySpeed; e.z += Math.cos(e.angle) * enemySpeed; }
            else if (dist < 400) { e.x -= Math.sin(e.angle) * enemySpeed; e.z -= Math.cos(e.angle) * enemySpeed; }

            e.timer++;
            // Enemies won't fire until their timer exceeds the progressive aggro threshold
            if (e.timer > enemyAggro && Math.abs(diff) < 0.15 && dist < 4000) {
               gs.projectiles.push({
                  x: e.x + Math.sin(e.angle)*40, z: e.z + Math.cos(e.angle)*40, y: 15,
                  vx: Math.sin(e.angle) * 25, vz: Math.cos(e.angle) * 25,
                  isPlayer: false, life: 100
               });
               e.timer = 0; playAudio('enemy_shoot');
            }
         } else if (e.type === 'saucer') {
            e.x += Math.sin(Date.now() * 0.001) * 12; e.z += Math.cos(Date.now() * 0.0013) * 12;
            e.y = 150 + Math.sin(Date.now() * 0.002) * 50; 
         }
      });

      // Update Explosive Particles (Shards & Shockwaves)
      for (let i = gs.particles.length - 1; i >= 0; i--) {
         let pt = gs.particles[i];
         
         if (pt.type === 'shockwave') {
             pt.radius += 15;
             if (pt.radius > pt.maxRadius) gs.particles.splice(i, 1);
         } else {
             pt.x += pt.vx; pt.y += pt.vy; pt.z += pt.vz;
             pt.rx += pt.rvx; pt.ry += pt.rvy; pt.rz += pt.rvz;
             pt.vy -= 0.6; // Gravity
             pt.vx *= 0.98; pt.vz *= 0.98; 
             if (pt.y < 0) { pt.y = 0; pt.vy *= -0.5; pt.vx *= 0.8; pt.vz *= 0.8; } 
             
             // Shards leave a trail of trailing sparks
             if (Math.random() < 0.3) {
                 gs.dust.push({
                    x: pt.x, y: pt.y, z: pt.z,
                    vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, vz: (Math.random()-0.5)*2,
                    life: 20 + Math.random()*20, color: pt.color
                 });
             }

             pt.life--; if (pt.life <= 0) gs.particles.splice(i, 1);
         }
      }

      // Update Glitter Dust
      for (let i = gs.dust.length - 1; i >= 0; i--) {
         let d = gs.dust[i];
         d.x += d.vx; d.y += d.vy; d.z += d.vz;
         d.vy -= 0.8; 
         d.vx *= 0.92; d.vz *= 0.92; 
         if (d.y < 0) { d.y = 0; d.vy *= -0.3; d.vx *= 0.5; d.vz *= 0.5; }
         d.life--; if (d.life <= 0) gs.dust.splice(i, 1);
      }
    };

    const drawCRTText = (ctx, text, x, y, color, font, align = 'center') => {
      ctx.font = font; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(text, x, y);
    };

    // --- RENDER ENGINE ---
    const draw = () => {
      let gs = state.current;
      let p = gs.player;
      let shake = (Math.random() - 0.5) * p.shake;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, NATIVE_W, NATIVE_H); 

      ctx.lineWidth = 2; ctx.lineJoin = 'round';

      if (gs.status === 'start') {
        drawCRTText(ctx, "BATTLEZONE", NATIVE_W/2, 200, '#0f0', '80px "VT323", monospace');
        drawCRTText(ctx, "VECTOR ASSAULT", NATIVE_W/2, 260, '#0f0', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO START", NATIVE_W/2, 380, '#fff', '24px "VT323", monospace');
        drawCRTText(ctx, "WASD: Drive Hull  |  MOUSE: Aim Turret", NATIVE_W/2, 450, '#fa0', '22px "VT323", monospace');
        drawCRTText(ctx, "CLICK TO SHOOT", NATIVE_W/2, 480, '#fa0', '22px "VT323", monospace');
        return;
      }

      // --- DRAW SKY (STARS) ---
      gs.stars.forEach(s => {
          let angleDiff = s.angle - p.turretAngle;
          while(angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while(angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          if (Math.abs(angleDiff) < Math.PI / 2) { 
              let screenX = NATIVE_W/2 + Math.tan(angleDiff) * FOV;
              let screenY = s.height + shake;
              let alpha = 0.5 + Math.sin(Date.now() * 0.005 + s.flicker) * 0.5;
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
              ctx.fillRect(screenX, screenY, s.size, s.size);
          }
      });

      // --- DRAW HORIZON MOUNTAINS ---
      ctx.strokeStyle = '#0f0'; ctx.beginPath();
      let started = false;
      for (let i = 0; i <= gs.mountains.length; i++) {
          let m = gs.mountains[i % gs.mountains.length];
          let rawAngle = m.angle;
          let angleDiff = rawAngle - p.turretAngle;
          while(angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while(angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (Math.abs(angleDiff) < Math.PI / 2) { 
              let screenX = NATIVE_W/2 + Math.tan(angleDiff) * FOV;
              let screenY = NATIVE_H/2 + 20 - m.height + shake;
              if (!started) { ctx.moveTo(screenX, screenY); started = true; }
              else { ctx.lineTo(screenX, screenY); }
          } else {
              started = false;
          }
      }
      ctx.stroke();

      // --- DRAW INFINITE FLOOR GRID ---
      ctx.beginPath();
      for(let x = -8; x <= 8; x++) {
          let gridX = Math.floor(p.x / GRID_SIZE) * GRID_SIZE + (x * GRID_SIZE);
          let pNear = transformPoint(gridX, 0, p.z, 0, 0, 0, p.x, p.z, p.turretAngle, shake);
          let pFar = transformPoint(gridX, 0, p.z + 8000, 0, 0, 0, p.x, p.z, p.turretAngle, shake);
          if (pNear.z > 10 && pFar.z > 10) {
             let sNear = projectToScreen(pNear); let sFar = projectToScreen(pFar);
             ctx.moveTo(sNear.x, sNear.y); ctx.lineTo(sFar.x, sFar.y);
          }
      }
      for(let z = -2; z <= 12; z++) {
          let gridZ = Math.floor(p.z / GRID_SIZE) * GRID_SIZE + (z * GRID_SIZE);
          let pLeft = transformPoint(p.x - 8000, 0, gridZ, 0, 0, 0, p.x, p.z, p.turretAngle, shake);
          let pRight = transformPoint(p.x + 8000, 0, gridZ, 0, 0, 0, p.x, p.z, p.turretAngle, shake);
          if (pLeft.z > 10 && pRight.z > 10) {
             let sLeft = projectToScreen(pLeft); let sRight = projectToScreen(pRight);
             ctx.moveTo(sLeft.x, sLeft.y); ctx.lineTo(sRight.x, sRight.y);
          }
      }
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)'; ctx.stroke();

      // --- 3D PAINTER'S QUEUE ---
      let renderQueue = [];

      const queueModel = (modelData, wx, wy, wz, wAngle, color) => {
         modelData.faces.forEach(face => {
            let projectedFace = []; let avgZ = 0; let valid = true;
            for (let pt of face) {
               let camPt = transformPoint(pt[0], pt[1], pt[2], wx, wz, wAngle, p.x, p.z, p.turretAngle, shake);
               camPt.y += wy; 
               if (camPt.z < 10) { valid = false; break; } 
               avgZ += camPt.z; projectedFace.push(projectToScreen(camPt));
            }
            if (valid && projectedFace.length > 0) renderQueue.push({ zDist: avgZ / face.length, pts: projectedFace, color });
         });
      };

      gs.obstacles.forEach(o => queueModel(MODELS[o.type], o.x, 0, o.z, o.angle, '#0f0'));
      gs.enemies.forEach(e => {
         let h = e.type === 'saucer' ? (e.y || 120) : 0;
         queueModel(MODELS[e.type], e.x, h, e.z, e.angle, '#fa0'); 
      });

      // Queue Projectiles
      gs.projectiles.forEach(pr => {
         let camPt = transformPoint(0, 0, 0, pr.x, pr.z, 0, p.x, p.z, p.turretAngle, shake);
         camPt.y += pr.y;
         if (camPt.z >= 10) {
            let screenPt = projectToScreen(camPt);
            let s = Math.max(3, 1500 / camPt.z);
            let pulse = Math.abs(Math.sin(Date.now() * 0.02));
            let color = pr.isPlayer ? '#0f0' : (pulse > 0.5 ? '#f00' : '#fff'); 
            
            renderQueue.push({
               zDist: camPt.z, isProjectile: true, color: color, lineWidth: pr.isPlayer ? 3 : 5,
               pts: [ {x: screenPt.x, y: screenPt.y - s}, {x: screenPt.x + s, y: screenPt.y}, {x: screenPt.x, y: screenPt.y + s}, {x: screenPt.x - s, y: screenPt.y} ]
            });
         }
      });

      // Queue Explosions
      gs.particles.forEach(pt => {
          if (pt.type === 'shockwave') {
               let camPt = transformPoint(0, 0, 0, pt.x, pt.z, 0, p.x, p.z, p.turretAngle, shake);
               camPt.y += pt.y;
               if (camPt.z > 10) {
                   let screenPt = projectToScreen(camPt);
                   let s = Math.max(1, (pt.radius * FOV) / camPt.z);
                   let alpha = Math.max(0, 1 - (pt.radius / pt.maxRadius));
                   renderQueue.push({
                       zDist: camPt.z, isShockwave: true, alpha: alpha, color: pt.color, radius: s, pt: screenPt
                   });
               }
          } else {
              let p1 = transformParticle(0, 0, -pt.len/2, pt.x, pt.y, pt.z, pt.rx, pt.ry, pt.rz, p.x, p.z, p.turretAngle, shake);
              let p2 = transformParticle(0, 0, pt.len/2, pt.x, pt.y, pt.z, pt.rx, pt.ry, pt.rz, p.x, p.z, p.turretAngle, shake);
              if (p1.z >= 10 && p2.z >= 10) {
                  renderQueue.push({
                      zDist: (p1.z + p2.z) / 2, isParticle: true, color: pt.color,
                      pts: [projectToScreen(p1), projectToScreen(p2)]
                  });
              }
          }
      });

      // Draw Queue Back-to-Front (NO SHADOWS OR GLOWS FOR PURE VECTORS)
      renderQueue.sort((a, b) => b.zDist - a.zDist);
      renderQueue.forEach(item => {
         if (item.isShockwave) {
             ctx.beginPath(); ctx.arc(item.pt.x, item.pt.y, item.radius, 0, Math.PI*2);
             ctx.strokeStyle = `rgba(255, 255, 255, ${item.alpha})`; ctx.lineWidth = 4 * item.alpha;
             ctx.stroke();
         } else {
             ctx.beginPath();
             item.pts.forEach((pt, i) => { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
             if (!item.isParticle && !item.isProjectile) {
                ctx.closePath(); ctx.fillStyle = '#000'; ctx.fill(); 
             }
             ctx.strokeStyle = item.color; ctx.lineWidth = item.lineWidth || 2;
             ctx.stroke();
         }
      });

      // --- DRAW GLITTER DUST ---
      gs.dust.forEach(d => {
         let camPt = transformPoint(0, 0, 0, d.x, d.z, 0, p.x, p.z, p.turretAngle, shake);
         camPt.y += d.y;
         if (camPt.z > 10) {
             let screenPt = projectToScreen(camPt);
             let alpha = Math.max(0, d.life / 80);
             let size = Math.max(1, 1000 / camPt.z);
             ctx.fillStyle = d.color; ctx.globalAlpha = alpha;
             ctx.fillRect(screenPt.x - size/2, screenPt.y - size/2, size, size);
             ctx.globalAlpha = 1.0;
         }
      });

      if (p.invuln > 0 && p.invuln > 40) {
         ctx.fillStyle = `rgba(255, 0, 0, ${(p.invuln - 40) / 20 * 0.4})`;
         ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
      }

      // --- 1:1 AUTHENTIC HUD ---
      ctx.lineWidth = 2; ctx.setLineDash([4, 4]);

      ctx.strokeStyle = '#fff'; ctx.strokeRect(30, 20, 200, 100);
      let closestEnemy = Math.min(...gs.enemies.map(e => Math.hypot(e.x - p.x, e.z - p.z)));
      if (closestEnemy < 3500 && Math.floor(Date.now() / 250) % 2 === 0) {
          drawCRTText(ctx, "ENEMY", 130, 50, '#f00', '24px "VT323", monospace');
          drawCRTText(ctx, "IN RANGE", 130, 80, '#f00', '24px "VT323", monospace');
      }

      ctx.strokeRect(270, 20, 260, 100); ctx.setLineDash([]); 
      ctx.strokeStyle = '#fff'; ctx.beginPath();
      ctx.moveTo(400, 100); ctx.lineTo(330, 30); ctx.moveTo(400, 100); ctx.lineTo(470, 30);
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(398, 98, 4, 4); 
      
      gs.enemies.forEach(e => {
          let dx = e.x - p.x; let dz = e.z - p.z;
          let dist = Math.hypot(dx, dz);
          let angle = Math.atan2(dx, dz) - p.turretAngle;
          while(angle > Math.PI) angle -= Math.PI * 2;
          while(angle < -Math.PI) angle += Math.PI * 2;
          if (dist < 6000 && Math.abs(angle) < Math.PI/3) { 
              let rDist = (dist / 6000) * 70;
              let rx = 400 + Math.sin(angle) * rDist;
              let ry = 100 - Math.cos(angle) * rDist;
              ctx.fillStyle = '#fa0'; ctx.fillRect(rx-3, ry-3, 6, 6);
          }
      });

      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#fff'; ctx.strokeRect(570, 20, 200, 100); ctx.setLineDash([]);
      drawCRTText(ctx, `SCORE   ${gs.score}`, 585, 50, '#fff', '22px "VT323", monospace', 'left');
      drawCRTText(ctx, `HIGH    ${gs.highScore}`, 585, 75, '#fff', '22px "VT323", monospace', 'left');
      drawCRTText(ctx, `HP:`, 585, 105, '#0f0', '22px "VT323", monospace', 'left');
      for(let i=0; i<p.maxHp; i++) {
          if (i < p.hp) { ctx.fillStyle = '#0f0'; ctx.fillRect(625 + i*18, 93, 12, 14); }
          else { ctx.strokeStyle = '#0f0'; ctx.strokeRect(625 + i*18, 93, 12, 14); }
      }

      // Crosshair - Fixed exactly at screen center / horizon vanishing point
      ctx.strokeStyle = '#0f0'; ctx.beginPath();
      ctx.moveTo(NATIVE_W/2 - 20, NATIVE_H/2 + 20); ctx.lineTo(NATIVE_W/2 - 5, NATIVE_H/2 + 20);
      ctx.moveTo(NATIVE_W/2 + 20, NATIVE_H/2 + 20); ctx.lineTo(NATIVE_W/2 + 5, NATIVE_H/2 + 20);
      ctx.moveTo(NATIVE_W/2, NATIVE_H/2); ctx.lineTo(NATIVE_W/2, NATIVE_H/2 + 15);
      ctx.moveTo(NATIVE_W/2, NATIVE_H/2 + 40); ctx.lineTo(NATIVE_W/2, NATIVE_H/2 + 25);
      ctx.stroke();

      if (gs.enemies.length === 0 && gs.waveTimer > 0) {
         // FIX: Check if gs.wave > 0 before printing "AREA SECURED"
         if (gs.wave > 0 && gs.waveTimer > 120) drawCRTText(ctx, "AREA SECURED", NATIVE_W/2, NATIVE_H/2 - 80, '#0f0', '50px "VT323", monospace');
         
         if (gs.waveTimer < 100 && Math.floor(gs.waveTimer / 15) % 2 === 0) {
             drawCRTText(ctx, `WAVE ${gs.wave + 1} APPROACHING`, NATIVE_W/2, NATIVE_H/2 - 80, '#f00', '40px "VT323", monospace');
         }
      }

      if (document.pointerLockElement !== canvasRef.current && gs.status === 'playing') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
          drawCRTText(ctx, "CLICK SCREEN TO LOCK MOUSE & PLAY", NATIVE_W/2, NATIVE_H/2, '#0f0', '40px "VT323", monospace');
          drawCRTText(ctx, "PRESS M TO RETURN TO MENU", NATIVE_W/2, NATIVE_H/2 + 40, '#fff', '20px "VT323", monospace');
      }

      if (gs.status === 'gameover') {
         ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
         drawCRTText(ctx, "DESTROYED", NATIVE_W/2, NATIVE_H/2 - 20, '#f00', '80px "VT323", monospace');
         drawCRTText(ctx, "PRESS ENTER TO RESTART", NATIVE_W/2, NATIVE_H/2 + 40, '#0f0', '30px "VT323", monospace');
         drawCRTText(ctx, "PRESS M FOR MENU", NATIVE_W/2, NATIVE_H/2 + 80, '#fff', '20px "VT323", monospace');
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
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-contain bg-black cursor-crosshair" />
    </div>
  );
}
import React, { useEffect, useRef } from 'react';

// --- 3D VECTOR MODELS ---
const MODELS = {
  cube: {
    faces: [
      [[-30, 30, 30], [30, 30, 30], [30, -30, 30], [-30, -30, 30]], 
      [[-30, 30, -30], [-30, -30, -30], [30, -30, -30], [30, 30, -30]], 
      [[-30, 30, -30], [-30, 30, 30], [-30, -30, 30], [-30, -30, -30]], 
      [[30, 30, -30], [30, -30, -30], [30, -30, 30], [30, 30, 30]], 
      [[-30, 30, -30], [30, 30, -30], [30, 30, 30], [-30, 30, 30]]
    ]
  },
  pyramid: {
    faces: [
      [[-40, -30, 40], [40, -30, 40], [40, -30, -40], [-40, -30, -40]], 
      [[-40, -30, 40], [40, -30, 40], [0, 50, 0]], 
      [[40, -30, 40], [40, -30, -40], [0, 50, 0]], 
      [[40, -30, -40], [-40, -30, -40], [0, 50, 0]], 
      [[-40, -30, -40], [-40, -30, 40], [0, 50, 0]] 
    ]
  },
  tank: {
    faces: [
      [[-20, -10, 30], [20, -10, 30], [30, -10, -30], [-30, -10, -30]], 
      [[-15, 10, 25], [15, 10, 25], [25, 10, -25], [-25, 10, -25]], 
      [[-20, -10, 30], [-15, 10, 25], [15, 10, 25], [20, -10, 30]], 
      [[-30, -10, -30], [-25, 10, -25], [25, 10, -25], [30, -10, -30]], 
      [[-20, -10, 30], [-30, -10, -30], [-25, 10, -25], [-15, 10, 25]], 
      [[20, -10, 30], [15, 10, 25], [25, 10, -25], [30, -10, -30]], 
      [[-10, 10, 10], [10, 10, 10], [10, 20, -10], [-10, 20, -10]], 
      [[-2, 15, 10], [2, 15, 10], [2, 15, 45], [-2, 15, 45]] 
    ]
  },
  saucer: {
    faces: [
      [[-15, 0, 15], [15, 0, 15], [15, 0, -15], [-15, 0, -15]],
      [[-15, 0, 15], [15, 0, 15], [0, 10, 0]],
      [[15, 0, 15], [15, 0, -15], [0, 10, 0]],
      [[15, 0, -15], [-15, 0, -15], [0, 10, 0]],
      [[-15, 0, -15], [-15, 0, 15], [0, 10, 0]],
      [[-15, 0, 15], [15, 0, 15], [0, -10, 0]],
      [[15, 0, 15], [15, 0, -15], [0, -10, 0]],
      [[15, 0, -15], [-15, 0, -15], [0, -10, 0]],
      [[-15, 0, -15], [-15, 0, 15], [0, -10, 0]]
    ]
  }
};

export default function BattlezoneGame({ audioCtx, onMenu }) {
  const canvasRef = useRef(null);

  const NATIVE_W = 800;
  const NATIVE_H = 600;
  const FOV = 450; 
  const WORLD_SIZE = 15000;

  const state = useRef({
    status: 'start',
    score: 0,
    highScore: 0,
    player: { x: 0, z: 0, bodyAngle: 0, turretAngle: 0, speed: 0, cooldown: 0, hp: 5, maxHp: 5, invuln: 0, shake: 0 },
    enemies: [],
    projectiles: [],
    obstacles: [],
    particles: [],
    mountains: [],
    keys: {}
  });

  // --- CONTROLS & MOUSE LOCK ---
  useEffect(() => {
    const canvas = canvasRef.current;
    
    const handleKeyDown = e => { state.current.keys[e.key] = true; };
    const handleKeyUp = e => { state.current.keys[e.key] = false; };
    
    const handleMouseMove = e => {
      if (document.pointerLockElement === canvas && state.current.status === 'playing') {
        state.current.player.turretAngle -= e.movementX * 0.0025; // Smooth turret sensitivity
      }
    };

    const handleMouseDown = e => {
      if (state.current.status !== 'playing') return;
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      } else {
        state.current.keys['Mouse0'] = true;
      }
    };

    const handleMouseUp = e => { state.current.keys['Mouse0'] = false; };

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

    // Generate static mountain horizon
    const buildMountains = () => {
      let mts = [];
      let curHeight = 20;
      for(let a=0; a < Math.PI*2; a += 0.05) {
          curHeight += (Math.random() - 0.5) * 30;
          curHeight = Math.max(10, Math.min(80, curHeight));
          mts.push({ angle: a, height: curHeight });
      }
      return mts;
    };

    const buildArena = () => {
      let obs = [];
      for (let i = 0; i < 40; i++) {
        let ox, oz;
        do {
          ox = (Math.random() - 0.5) * WORLD_SIZE;
          oz = (Math.random() - 0.5) * WORLD_SIZE;
        } while (Math.hypot(ox, oz) < 1000); // Clear the immediate spawn area

        obs.push({
          type: Math.random() > 0.5 ? 'cube' : 'pyramid',
          x: ox, z: oz, angle: Math.random() * Math.PI * 2
        });
      }
      return obs;
    };

    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      if (type === 'shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.3);
      } else if (type === 'boom') {
        let bufSize = audioCtx.sampleRate * 0.8; let buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        let data = buf.getChannelData(0); for(let i=0; i<bufSize; i++) data[i] = Math.random()*2-1;
        let noise = audioCtx.createBufferSource(); noise.buffer = buf;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(300, t); filter.frequency.linearRampToValueAtTime(50, t+0.8);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.5, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.8);
        noise.connect(filter).connect(gain).connect(audioCtx.destination); noise.start(t);
      } else if (type === 'hit') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.4);
      }
    };

    const triggerExplosion = (ex, ey, ez, color) => {
        playAudio('boom');
        for(let i=0; i<40; i++) {
            state.current.particles.push({
                x: ex, y: ey + 15, z: ez,
                vx: (Math.random()-0.5)*15, vy: (Math.random()*20), vz: (Math.random()-0.5)*15,
                rx: Math.random()*Math.PI*2, ry: Math.random()*Math.PI*2, rz: Math.random()*Math.PI*2,
                rvx: (Math.random()-0.5)*0.3, rvy: (Math.random()-0.5)*0.3, rvz: (Math.random()-0.5)*0.3,
                len: 15 + Math.random()*40,
                life: 60 + Math.random()*60,
                color: color
            });
        }
    };

    // --- 3D MATH CORE ---
    const transformPoint = (px, py, pz, objX, objZ, objAngle, camX, camZ, camAngle, shakeOffset) => {
      let cosO = Math.cos(objAngle); let sinO = Math.sin(objAngle);
      let rx = px * cosO - pz * sinO; let rz = px * sinO + pz * cosO;
      let wx = rx + objX; let wz = rz + objZ;
      let dx = wx - camX; let dz = wz - camZ;
      let cosC = Math.cos(-camAngle); let sinC = Math.sin(-camAngle);
      let cx = dx * cosC - dz * sinC; let cz = dx * sinC + dz * cosC;
      return { x: cx + shakeOffset, y: py + shakeOffset, z: cz };
    };

    const transformParticle = (ptX, ptY, ptZ, pX, pY, pZ, rx, ry, rz, camX, camZ, camAngle, shakeOffset) => {
        let cx = Math.cos(rx), sx = Math.sin(rx);
        let cy = Math.cos(ry), sy = Math.sin(ry);
        let cz = Math.cos(rz), sz = Math.sin(rz);
        let x1 = ptX * cz - ptY * sz; let y1 = ptX * sz + ptY * cz; let z1 = ptZ;
        let x2 = x1 * cy + z1 * sy; let y2 = y1; let z2 = -x1 * sy + z1 * cy;
        let x3 = x2; let y3 = y2 * cx - z2 * sx; let z3 = y2 * sx + z2 * cx;
        let wx = x3 + pX; let wy = y3 + pY; let wz = z3 + pZ;
        let dx = wx - camX; let dz = wz - camZ;
        let cosC = Math.cos(-camAngle), sinC = Math.sin(-camAngle);
        let finalX = dx * cosC - dz * sinC; let finalZ = dx * sinC + dz * cosC;
        return { x: finalX + shakeOffset, y: wy + shakeOffset, z: finalZ };
    };

    const projectToScreen = (camPt) => {
      if (camPt.z < 10) return null;
      let scale = FOV / camPt.z;
      return { x: (NATIVE_W / 2) + (camPt.x * scale), y: (NATIVE_H / 2) - (camPt.y * scale) + 50 };
    };

    // --- GAME LOOP ---
    const update = () => {
      let gs = state.current;
      let keys = gs.keys;

      if (keys['m'] || keys['M']) {
        if (document.pointerLockElement) document.exitPointerLock();
        onMenu(); return;
      }

      if (gs.status === 'start' && keys['Enter']) {
        gs.status = 'playing'; gs.score = 0;
        gs.player = { x: 0, z: 0, bodyAngle: 0, turretAngle: 0, speed: 0, cooldown: 0, hp: 5, maxHp: 5, invuln: 0, shake: 0 };
        gs.mountains = buildMountains();
        gs.obstacles = buildArena();
        gs.enemies = [{ type: 'tank', x: 0, z: 1500, angle: Math.PI, state: 'hunt', timer: 0 }];
        gs.projectiles = []; gs.particles = [];
      }

      if (gs.status === 'gameover' && keys['Enter']) { gs.status = 'start'; }

      if (gs.status !== 'playing') return;

      let p = gs.player;
      if (p.invuln > 0) p.invuln--;
      if (p.shake > 0.5) p.shake *= 0.8; else p.shake = 0;

      // WASD Hull Movement
      let prevBody = p.bodyAngle;
      if (keys['w']) p.speed += 0.8;
      if (keys['s']) p.speed -= 0.8;
      if (keys['a']) p.bodyAngle -= 0.035;
      if (keys['d']) p.bodyAngle += 0.035;

      // Turret rides along with the hull rotation automatically
      p.turretAngle += (p.bodyAngle - prevBody);

      p.speed *= 0.92; // Friction
      let nextX = p.x + Math.sin(p.bodyAngle) * p.speed;
      let nextZ = p.z + Math.cos(p.bodyAngle) * p.speed;

      // Collision vs Obstacles
      let hitObs = false;
      gs.obstacles.forEach(obs => {
         if (Math.hypot(obs.x - nextX, obs.z - nextZ) < 50) hitObs = true;
      });
      if (!hitObs) { p.x = nextX; p.z = nextZ; } else { p.speed *= -0.5; }

      // Mouse Shooting
      if (p.cooldown > 0) p.cooldown--;
      if (keys['Mouse0'] && p.cooldown <= 0 && document.pointerLockElement) {
         gs.projectiles.push({
            x: p.x, z: p.z, y: 15,
            vx: Math.sin(p.turretAngle) * 25, vz: Math.cos(p.turretAngle) * 25,
            isPlayer: true, life: 80
         });
         p.cooldown = 40; playAudio('shoot');
      }

      // Update Projectiles
      for (let i = gs.projectiles.length - 1; i >= 0; i--) {
         let pr = gs.projectiles[i];
         pr.x += pr.vx; pr.z += pr.vz; pr.life--;
         
         let hit = false;
         for (let o of gs.obstacles) {
            if (Math.hypot(o.x - pr.x, o.z - pr.z) < 40) { hit = true; break; }
         }

         // Player hits Enemy
         if (pr.isPlayer && !hit) {
            for (let j = gs.enemies.length - 1; j >= 0; j--) {
               let e = gs.enemies[j];
               if (Math.hypot(e.x - pr.x, e.z - pr.z) < 45) {
                  gs.score += e.type === 'saucer' ? 5000 : 1000;
                  if (gs.score > gs.highScore) gs.highScore = gs.score;
                  hit = true; 
                  triggerExplosion(e.x, 15, e.z, '#fa0');
                  gs.enemies.splice(j, 1);
                  break;
               }
            }
         }

         // Enemy hits Player
         if (!pr.isPlayer && !hit && p.invuln <= 0) {
            if (Math.hypot(p.x - pr.x, p.z - pr.z) < 40) {
               hit = true;
               p.hp--;
               p.invuln = 60;
               p.shake = 30;
               playAudio('hit');
               if (p.hp <= 0) { gs.status = 'gameover'; if (document.pointerLockElement) document.exitPointerLock(); }
            }
         }

         if (hit || pr.life <= 0) gs.projectiles.splice(i, 1);
      }

      // Enemy AI Spawning
      if (gs.enemies.length < 3) {
         let dist = 2000 + Math.random() * 2000;
         let ang = Math.random() * Math.PI * 2;
         gs.enemies.push({
            type: Math.random() > 0.8 ? 'saucer' : 'tank',
            x: p.x + Math.sin(ang) * dist, z: p.z + Math.cos(ang) * dist,
            angle: 0, state: 'hunt', timer: 0
         });
      }

      // Enemy Tracking
      gs.enemies.forEach(e => {
         let dx = p.x - e.x; let dz = p.z - e.z;
         let dist = Math.hypot(dx, dz);
         let targetAngle = Math.atan2(dx, dz);

         if (e.type === 'tank') {
            let diff = targetAngle - e.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            e.angle += Math.max(-0.03, Math.min(0.03, diff));

            if (dist > 400) { e.x += Math.sin(e.angle) * 5; e.z += Math.cos(e.angle) * 5; }

            e.timer++;
            if (e.timer > 100 && Math.abs(diff) < 0.2 && dist < 3000) {
               gs.projectiles.push({
                  x: e.x + Math.sin(e.angle)*40, z: e.z + Math.cos(e.angle)*40, y: 15,
                  vx: Math.sin(e.angle) * 18, vz: Math.cos(e.angle) * 18,
                  isPlayer: false, life: 100
               });
               e.timer = 0; playAudio('shoot');
            }
         } else if (e.type === 'saucer') {
            e.x += Math.sin(Date.now() * 0.001) * 8; e.z += Math.cos(Date.now() * 0.0013) * 8;
            e.y = 120 + Math.sin(Date.now() * 0.002) * 30; 
         }
      });

      // Update 3D Particles
      for (let i = gs.particles.length - 1; i >= 0; i--) {
         let pt = gs.particles[i];
         pt.x += pt.vx; pt.y += pt.vy; pt.z += pt.vz;
         pt.rx += pt.rvx; pt.ry += pt.rvy; pt.rz += pt.rvz;
         pt.life--;
         if (pt.life <= 0) gs.particles.splice(i, 1);
      }
    };

    const drawCRTText = (ctx, text, x, y, color, font, align = 'center') => {
      ctx.font = font; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(text, x, y);
    };

    // --- RENDER ENGINE ---
    const draw = () => {
      let gs = state.current;
      let p = gs.player;
      let shake = (Math.random() - 0.5) * p.shake; // Camera impact shake

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, NATIVE_W, NATIVE_H); // True Black

      ctx.lineWidth = 2; ctx.lineJoin = 'round';

      if (gs.status === 'start') {
        drawCRTText(ctx, "BATTLEZONE", NATIVE_W/2, 200, '#0f0', '60px "VT323", monospace');
        drawCRTText(ctx, "VECTOR ASSAULT", NATIVE_W/2, 260, '#0f0', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO START", NATIVE_W/2, 380, '#fff', '24px "VT323", monospace');
        drawCRTText(ctx, "WASD: Drive Hull  |  MOUSE: Aim Turret", NATIVE_W/2, 450, '#fa0', '20px "VT323", monospace');
        drawCRTText(ctx, "CLICK TO SHOOT", NATIVE_W/2, 480, '#fa0', '20px "VT323", monospace');
        return;
      }

      // --- HORIZON MOUNTAINS ---
      ctx.strokeStyle = '#0f0'; ctx.beginPath();
      let started = false;
      for (let i = 0; i <= gs.mountains.length; i++) {
          let m = gs.mountains[i % gs.mountains.length];
          let rawAngle = (i / gs.mountains.length) * Math.PI * 2;
          let angleDiff = rawAngle - p.turretAngle;
          while(angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while(angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (Math.abs(angleDiff) < Math.PI / 2) { 
              let screenX = NATIVE_W/2 + Math.tan(angleDiff) * FOV;
              let screenY = NATIVE_H/2 + 50 - m.height + shake;
              if (!started) { ctx.moveTo(screenX, screenY); started = true; }
              else { ctx.lineTo(screenX, screenY); }
          } else {
              started = false;
          }
      }
      ctx.stroke();

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

      // Queue World
      gs.obstacles.forEach(o => queueModel(MODELS[o.type], o.x, 0, o.z, o.angle, '#0f0'));
      gs.enemies.forEach(e => {
         let h = e.type === 'saucer' ? (e.y || 120) : 0;
         queueModel(MODELS[e.type], e.x, h, e.z, e.angle, '#fa0'); // Enemies are glowing ORANGE
      });

      // Queue Projectiles
      gs.projectiles.forEach(pr => {
         let camPt = transformPoint(0, 0, 0, pr.x, pr.z, 0, p.x, p.z, p.turretAngle, shake);
         camPt.y += pr.y;
         if (camPt.z >= 10) {
            let screenPt = projectToScreen(camPt);
            let s = Math.max(2, 1200 / camPt.z);
            let pulse = Math.abs(Math.sin(Date.now() * 0.05));
            let color = pr.isPlayer ? '#0f0' : (pulse > 0.5 ? '#f00' : '#f88'); // Red pulsing enemy fire
            
            renderQueue.push({
               zDist: camPt.z, isProjectile: true, color: color, lineWidth: pr.isPlayer ? 2 : 4,
               pts: [ {x: screenPt.x, y: screenPt.y - s}, {x: screenPt.x + s, y: screenPt.y}, {x: screenPt.x, y: screenPt.y + s}, {x: screenPt.x - s, y: screenPt.y} ]
            });
         }
      });

      // Queue Particles (Explosions)
      gs.particles.forEach(pt => {
          let p1 = transformParticle(0, 0, -pt.len/2, pt.x, pt.y, pt.z, pt.rx, pt.ry, pt.rz, p.x, p.z, p.turretAngle, shake);
          let p2 = transformParticle(0, 0, pt.len/2, pt.x, pt.y, pt.z, pt.rx, pt.ry, pt.rz, p.x, p.z, p.turretAngle, shake);
          if (p1.z >= 10 && p2.z >= 10) {
              renderQueue.push({
                  zDist: (p1.z + p2.z) / 2, isParticle: true, color: pt.color,
                  pts: [projectToScreen(p1), projectToScreen(p2)]
              });
          }
      });

      // Draw Queue Back-to-Front
      renderQueue.sort((a, b) => b.zDist - a.zDist);
      renderQueue.forEach(item => {
         ctx.beginPath();
         item.pts.forEach((pt, i) => { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
         if (!item.isParticle && !item.isProjectile) {
            ctx.closePath();
            ctx.fillStyle = '#000'; ctx.fill(); // Painter's wipe
         }
         ctx.strokeStyle = item.color;
         ctx.lineWidth = item.lineWidth || 2;
         ctx.stroke();
      });

      // Red Flash overlay when hit
      if (p.invuln > 0 && p.invuln > 40) {
         ctx.fillStyle = `rgba(255, 0, 0, ${(p.invuln - 40) / 20 * 0.3})`;
         ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
      }

      // --- 1:1 AUTHENTIC HUD ---
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]); // Dotted retro borders

      // Left Box (Enemy Warning)
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(30, 20, 200, 100);
      let closestEnemy = Math.min(...gs.enemies.map(e => Math.hypot(e.x - p.x, e.z - p.z)));
      if (closestEnemy < 3000 && Math.floor(Date.now() / 250) % 2 === 0) {
          drawCRTText(ctx, "ENEMY", 130, 50, '#f00', '24px "VT323", monospace');
          drawCRTText(ctx, "IN RANGE", 130, 80, '#f00', '24px "VT323", monospace');
      }

      // Center Box (Radar)
      ctx.strokeRect(270, 20, 260, 100);
      ctx.setLineDash([]); // Solid lines for radar internals
      ctx.strokeStyle = '#fff'; ctx.beginPath();
      ctx.moveTo(400, 100); ctx.lineTo(330, 30);
      ctx.moveTo(400, 100); ctx.lineTo(470, 30);
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(398, 98, 4, 4); // Player Blip
      gs.enemies.forEach(e => {
          let dx = e.x - p.x; let dz = e.z - p.z;
          let dist = Math.hypot(dx, dz);
          let angle = Math.atan2(dx, dz) - p.turretAngle;
          while(angle > Math.PI) angle -= Math.PI * 2;
          while(angle < -Math.PI) angle += Math.PI * 2;
          if (dist < 5000 && Math.abs(angle) < Math.PI/3) { // Inside the cone
              let rDist = (dist / 5000) * 70;
              let rx = 400 + Math.sin(angle) * rDist;
              let ry = 100 - Math.cos(angle) * rDist;
              ctx.fillStyle = '#f00'; ctx.fillRect(rx-2, ry-2, 4, 4);
          }
      });

      // Right Box (Score & Health)
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(570, 20, 200, 100);
      ctx.setLineDash([]);
      drawCRTText(ctx, `SCORE   ${gs.score}`, 585, 50, '#fff', '22px "VT323", monospace', 'left');
      drawCRTText(ctx, `HIGH    ${gs.highScore}`, 585, 75, '#fff', '22px "VT323", monospace', 'left');
      drawCRTText(ctx, `HP:`, 585, 105, '#0f0', '22px "VT323", monospace', 'left');
      for(let i=0; i<p.maxHp; i++) {
          if (i < p.hp) { ctx.fillStyle = '#0f0'; ctx.fillRect(625 + i*18, 93, 12, 14); }
          else { ctx.strokeStyle = '#0f0'; ctx.strokeRect(625 + i*18, 93, 12, 14); }
      }

      // Crosshair
      ctx.strokeStyle = '#0f0'; ctx.beginPath();
      ctx.moveTo(NATIVE_W/2 - 20, NATIVE_H/2 + 50); ctx.lineTo(NATIVE_W/2 - 5, NATIVE_H/2 + 50);
      ctx.moveTo(NATIVE_W/2 + 20, NATIVE_H/2 + 50); ctx.lineTo(NATIVE_W/2 + 5, NATIVE_H/2 + 50);
      ctx.moveTo(NATIVE_W/2, NATIVE_H/2 + 30); ctx.lineTo(NATIVE_W/2, NATIVE_H/2 + 45);
      ctx.moveTo(NATIVE_W/2, NATIVE_H/2 + 70); ctx.lineTo(NATIVE_W/2, NATIVE_H/2 + 55);
      ctx.stroke();

      // Mouse Lock Prompt
      if (document.pointerLockElement !== canvasRef.current && gs.status === 'playing') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
          drawCRTText(ctx, "CLICK SCREEN TO LOCK MOUSE & PLAY", NATIVE_W/2, NATIVE_H/2, '#0f0', '40px "VT323", monospace');
          drawCRTText(ctx, "PRESS M TO RETURN TO MENU", NATIVE_W/2, NATIVE_H/2 + 40, '#fff', '20px "VT323", monospace');
      }

      if (gs.status === 'gameover') {
         ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
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
import React, { useEffect, useRef } from 'react';

// --- 3D VECTOR MODELS (Defined as Arrays of Polygon Faces) ---
// Each point is [x, y, z] relative to the object's center
const MODELS = {
  cube: {
    faces: [
      [[-20, 20, 20], [20, 20, 20], [20, -20, 20], [-20, -20, 20]], // Front
      [[-20, 20, -20], [-20, -20, -20], [20, -20, -20], [20, 20, -20]], // Back
      [[-20, 20, -20], [-20, 20, 20], [-20, -20, 20], [-20, -20, -20]], // Left
      [[20, 20, -20], [20, -20, -20], [20, -20, 20], [20, 20, 20]], // Right
      [[-20, 20, -20], [20, 20, -20], [20, 20, 20], [-20, 20, 20]], // Top
      [[-20, -20, -20], [-20, -20, 20], [20, -20, 20], [20, -20, -20]] // Bottom
    ]
  },
  pyramid: {
    faces: [
      [[-30, -20, 30], [30, -20, 30], [30, -20, -30], [-30, -20, -30]], // Base
      [[-30, -20, 30], [30, -20, 30], [0, 40, 0]], // Front
      [[30, -20, 30], [30, -20, -30], [0, 40, 0]], // Right
      [[30, -20, -30], [-30, -20, -30], [0, 40, 0]], // Back
      [[-30, -20, -30], [-30, -20, 30], [0, 40, 0]] // Left
    ]
  },
  tank: {
    faces: [
      [[-20, -10, 30], [20, -10, 30], [30, -10, -30], [-30, -10, -30]], // Base Bottom
      [[-15, 10, 25], [15, 10, 25], [25, 10, -25], [-25, 10, -25]], // Base Top
      [[-20, -10, 30], [-15, 10, 25], [15, 10, 25], [20, -10, 30]], // Base Front
      [[-30, -10, -30], [-25, 10, -25], [25, 10, -25], [30, -10, -30]], // Base Back
      [[-20, -10, 30], [-30, -10, -30], [-25, 10, -25], [-15, 10, 25]], // Base Left
      [[20, -10, 30], [15, 10, 25], [25, 10, -25], [30, -10, -30]], // Base Right
      [[-10, 10, 10], [10, 10, 10], [10, 20, -10], [-10, 20, -10]], // Turret Base
      [[-2, 15, 10], [2, 15, 10], [2, 15, 45], [-2, 15, 45]] // Gun Barrel
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
  const FOV = 400; // Field of View projection scalar

  const state = useRef({
    status: 'start',
    score: 0,
    highScore: 0,
    player: { x: 0, z: 0, angle: 0, speed: 0, turn: 0, cooldown: 0 },
    enginePitch: 50,
    enemies: [],
    projectiles: [],
    obstacles: [],
    particles: [],
    radarAngle: 0,
    keys: {}
  });

  const engineOscRef = useRef(null);
  const engineGainRef = useRef(null);

  // --- CONTROLS ---
  useEffect(() => {
    const handleKeyDown = e => { state.current.keys[e.key] = true; };
    const handleKeyUp = e => { state.current.keys[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- GAME ENGINE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // AUDIO SYNTHESIS
    const initEngineAudio = () => {
      if (!audioCtx || audioCtx.state !== 'running' || engineOscRef.current) return;
      let osc = audioCtx.createOscillator();
      let gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 50;
      gain.gain.value = 0; // Starts silent
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      engineOscRef.current = osc;
      engineGainRef.current = gain;
    };

    const updateEngineAudio = (vol, freq) => {
      if (engineGainRef.current && engineOscRef.current && audioCtx) {
        engineGainRef.current.gain.setTargetAtTime(vol * 0.15, audioCtx.currentTime, 0.1);
        engineOscRef.current.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.1);
      }
    };

    const stopEngineAudio = () => {
      if (engineGainRef.current && audioCtx) {
        engineGainRef.current.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
      }
    };

    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      if (type === 'shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.3);
      } else if (type === 'boom') {
        let bufSize = audioCtx.sampleRate * 0.6; let buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        let data = buf.getChannelData(0); for(let i=0; i<bufSize; i++) data[i] = Math.random()*2-1;
        let noise = audioCtx.createBufferSource(); noise.buffer = buf;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(400, t); filter.frequency.linearRampToValueAtTime(50, t+0.6);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.6);
        noise.connect(filter).connect(gain).connect(audioCtx.destination); noise.start(t);
      } else if (type === 'radar') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(1200, t); osc.frequency.setValueAtTime(800, t + 0.05);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.linearRampToValueAtTime(0, t + 0.1);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.1);
      }
    };

    // LEVEL GENERATION
    const buildArena = () => {
      let obs = [];
      for (let i = 0; i < 40; i++) {
        obs.push({
          type: Math.random() > 0.5 ? 'cube' : 'pyramid',
          x: (Math.random() - 0.5) * 4000,
          z: (Math.random() - 0.5) * 4000,
          angle: Math.random() * Math.PI * 2
        });
      }
      return obs;
    };

    // MATH & 3D PROJECTION
    const transformPoint = (px, py, pz, objX, objZ, objAngle, camX, camZ, camAngle) => {
      // 1. Rotate point around object's center
      let cosO = Math.cos(objAngle); let sinO = Math.sin(objAngle);
      let rx = px * cosO - pz * sinO;
      let rz = px * sinO + pz * cosO;
      
      // 2. Translate to world space
      let wx = rx + objX; let wz = rz + objZ;
      
      // 3. Translate relative to camera
      let dx = wx - camX; let dz = wz - camZ;
      
      // 4. Rotate relative to camera angle
      let cosC = Math.cos(-camAngle); let sinC = Math.sin(-camAngle);
      let cx = dx * cosC - dz * sinC;
      let cz = dx * sinC + dz * cosC;
      
      return { x: cx, y: py, z: cz };
    };

    const projectToScreen = (camPt) => {
      if (camPt.z < 10) return null; // Behind camera clipping
      let scale = FOV / camPt.z;
      return {
        x: (NATIVE_W / 2) + (camPt.x * scale),
        y: (NATIVE_H / 2) - (camPt.y * scale) + 50 // +50 pitches the horizon down slightly
      };
    };

    // --- GAME LOOP ---
    const update = () => {
      let gs = state.current;
      let keys = gs.keys;

      if (keys['m'] || keys['M']) {
        stopEngineAudio(); onMenu(); return;
      }

      if (gs.status === 'start' && keys['Enter']) {
        gs.status = 'playing'; gs.score = 0;
        gs.player = { x: 0, z: 0, angle: 0, speed: 0, turn: 0, cooldown: 0 };
        gs.obstacles = buildArena();
        gs.enemies = [{ type: 'tank', x: 0, z: 1000, angle: Math.PI, state: 'hunt', timer: 0 }];
        gs.projectiles = []; gs.particles = [];
        initEngineAudio();
      }

      if (gs.status === 'gameover' && keys['Enter']) {
        gs.status = 'start';
      }

      if (gs.status !== 'playing') {
        stopEngineAudio(); return;
      }

      let p = gs.player;
      
      // TANK TREAD CONTROLS (Dual Stick Support + Keyboard Fallback)
      let leftTread = 0; let rightTread = 0;
      
      // If ANY key is pressed, init audio
      if (Object.keys(keys).some(k => keys[k])) initEngineAudio();

      // Dual Joystick Mapping (Left Stick = WASD, Right Stick = Arrows)
      if (keys['w']) leftTread += 1;
      if (keys['s']) leftTread -= 1;
      if (keys['ArrowUp']) rightTread += 1;
      if (keys['ArrowDown']) rightTread -= 1;

      // Casual Keyboard Fallback (A/D to steer, overrides treads to force spins)
      if (keys['a']) { leftTread = -1; rightTread = 1; }
      if (keys['d']) { leftTread = 1; rightTread = -1; }
      
      // Single Joystick Forward/Back Fallback
      if (keys['ArrowUp'] && !keys['w'] && !keys['a'] && !keys['d']) leftTread = 1;
      if (keys['ArrowDown'] && !keys['s'] && !keys['a'] && !keys['d']) leftTread = -1;

      // Apply Physics
      let targetSpeed = (leftTread + rightTread) * 0.5 * 8; // Max speed 8
      let targetTurn = (leftTread - rightTread) * 0.5 * 0.04; // Max turn 0.04 rad/f

      p.speed += (targetSpeed - p.speed) * 0.1; // Acceleration
      p.turn += (targetTurn - p.turn) * 0.2;

      p.angle += p.turn;
      let nextX = p.x + Math.sin(p.angle) * p.speed;
      let nextZ = p.z + Math.cos(p.angle) * p.speed;

      // Collision vs Obstacles (Simple radius check)
      let hitObs = false;
      gs.obstacles.forEach(obs => {
         if (Math.hypot(obs.x - nextX, obs.z - nextZ) < 40) hitObs = true;
      });
      if (!hitObs) { p.x = nextX; p.z = nextZ; } 
      else { p.speed *= -0.5; } // Bounce back

      // Engine Audio Modulation
      let motorEffort = Math.abs(p.speed) / 8 + Math.abs(p.turn) / 0.04;
      updateEngineAudio(0.5 + motorEffort * 0.5, 40 + motorEffort * 40);

      // Firing
      if (p.cooldown > 0) p.cooldown--;
      if (keys[' '] && p.cooldown <= 0 && gs.projectiles.filter(pr => pr.isPlayer).length < 2) {
         gs.projectiles.push({
            x: p.x, z: p.z, y: 15,
            vx: Math.sin(p.angle) * 20, vz: Math.cos(p.angle) * 20,
            isPlayer: true, life: 60
         });
         p.cooldown = 40; playAudio('shoot');
      }

      // Radar
      gs.radarAngle -= 0.05;
      if (gs.radarAngle < 0) gs.radarAngle += Math.PI * 2;

      // Update Projectiles
      for (let i = gs.projectiles.length - 1; i >= 0; i--) {
         let pr = gs.projectiles[i];
         pr.x += pr.vx; pr.z += pr.vz; pr.life--;
         
         let hit = false;
         
         // Hit Obstacles
         for (let o of gs.obstacles) {
            if (Math.hypot(o.x - pr.x, o.z - pr.z) < 30) { hit = true; break; }
         }

         // Hit Enemies
         if (pr.isPlayer && !hit) {
            for (let j = gs.enemies.length - 1; j >= 0; j--) {
               let e = gs.enemies[j];
               if (Math.hypot(e.x - pr.x, e.z - pr.z) < 40) {
                  gs.score += e.type === 'saucer' ? 5000 : 1000;
                  if (gs.score > gs.highScore) gs.highScore = gs.score;
                  hit = true; playAudio('boom');
                  
                  // Vector Explosion
                  for(let k=0; k<15; k++) {
                     gs.particles.push({
                        x: e.x, y: 10, z: e.z,
                        vx: (Math.random()-0.5)*10, vy: Math.random()*10, vz: (Math.random()-0.5)*10,
                        life: 30
                     });
                  }
                  gs.enemies.splice(j, 1);
                  break;
               }
            }
         }

         // Hit Player
         if (!pr.isPlayer && !hit) {
            if (Math.hypot(p.x - pr.x, p.z - pr.z) < 30) {
               gs.status = 'gameover'; playAudio('boom'); stopEngineAudio();
            }
         }

         if (hit || pr.life <= 0) gs.projectiles.splice(i, 1);
      }

      // Enemy AI
      if (gs.enemies.length === 0) {
         let dist = 1000 + Math.random() * 1000;
         let ang = Math.random() * Math.PI * 2;
         gs.enemies.push({
            type: Math.random() > 0.8 ? 'saucer' : 'tank',
            x: p.x + Math.sin(ang) * dist,
            z: p.z + Math.cos(ang) * dist,
            angle: 0, state: 'hunt', timer: 0
         });
      }

      gs.enemies.forEach(e => {
         let dx = p.x - e.x; let dz = p.z - e.z;
         let dist = Math.hypot(dx, dz);
         let targetAngle = Math.atan2(dx, dz);

         if (e.type === 'tank') {
            // Turn towards player
            let diff = targetAngle - e.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            e.angle += Math.max(-0.02, Math.min(0.02, diff));

            // Move
            if (dist > 300) {
               e.x += Math.sin(e.angle) * 3.5; e.z += Math.cos(e.angle) * 3.5;
            }

            // Shoot
            e.timer++;
            if (e.timer > 120 && Math.abs(diff) < 0.2 && dist < 1200) {
               gs.projectiles.push({
                  x: e.x + Math.sin(e.angle)*30, z: e.z + Math.cos(e.angle)*30, y: 15,
                  vx: Math.sin(e.angle) * 15, vz: Math.cos(e.angle) * 15,
                  isPlayer: false, life: 80
               });
               e.timer = 0; playAudio('shoot');
            }
         } else if (e.type === 'saucer') {
            e.x += Math.sin(Date.now() * 0.001) * 5;
            e.z += Math.cos(Date.now() * 0.0013) * 5;
            e.y = 80 + Math.sin(Date.now() * 0.002) * 20; // Hover
         }
      });

      // Particles
      for (let i = gs.particles.length - 1; i >= 0; i--) {
         let pt = gs.particles[i];
         pt.x += pt.vx; pt.y += pt.vy; pt.z += pt.vz;
         pt.life--;
         if (pt.life <= 0) gs.particles.splice(i, 1);
      }
    };

    // --- RENDER ENGINE ---
    const draw = () => {
      let gs = state.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // CRT Background
      ctx.fillStyle = '#001100'; 
      ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);

      ctx.strokeStyle = '#0f0';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.shadowColor = '#0f0';
      ctx.shadowBlur = 8; // Vector glow effect

      if (gs.status === 'start') {
        ctx.textAlign = 'center'; ctx.font = '60px "VT323", monospace'; ctx.fillStyle = '#0f0';
        ctx.fillText("BATTLEZONE", NATIVE_W/2, 200);
        ctx.font = '30px "VT323", monospace'; ctx.fillText("1980 ATARI INC.", NATIVE_W/2, 260);
        ctx.font = '24px "VT323", monospace'; ctx.fillText("PRESS ENTER TO START", NATIVE_W/2, 380);
        ctx.fillText("WASD: LEFT TREAD  |  ARROWS: RIGHT TREAD", NATIVE_W/2, 450);
        ctx.fillText("SPACE: FIRE", NATIVE_W/2, 480);
        return;
      }

      let p = gs.player;

      // Horizon Line
      ctx.beginPath();
      ctx.moveTo(0, NATIVE_H/2 + 50); ctx.lineTo(NATIVE_W, NATIVE_H/2 + 50);
      ctx.stroke();

      // --- PAINTER'S ALGORITHM 3D RENDERING ---
      let renderQueue = [];

      const queueModel = (modelData, wx, wy, wz, wAngle, isEnemy = false) => {
         modelData.faces.forEach(face => {
            let projectedFace = [];
            let avgZ = 0;
            let valid = true;

            for (let pt of face) {
               let camPt = transformPoint(pt[0], pt[1], pt[2], wx, wz, wAngle, p.x, p.z, p.angle);
               // Add global Y offset
               camPt.y += wy; 
               if (camPt.z < 10) { valid = false; break; } // Clip faces crossing camera plane entirely
               
               avgZ += camPt.z;
               projectedFace.push(projectToScreen(camPt));
            }

            if (valid && projectedFace.length > 0) {
               renderQueue.push({
                  zDist: avgZ / face.length,
                  pts: projectedFace,
                  isEnemy
               });
            }
         });
      };

      // Queue Obstacles
      gs.obstacles.forEach(o => queueModel(MODELS[o.type], o.x, 0, o.z, o.angle));
      
      // Queue Enemies
      gs.enemies.forEach(e => {
         let h = e.type === 'saucer' ? (e.y || 80) : 0;
         queueModel(MODELS[e.type], e.x, h, e.z, e.angle, true);
      });

      // Queue Projectiles (Draw them as glowing diamonds)
      gs.projectiles.forEach(pr => {
         let camPt = transformPoint(0, 0, 0, pr.x, pr.z, 0, p.x, p.z, p.angle);
         camPt.y += pr.y;
         if (camPt.z >= 10) {
            let screenPt = projectToScreen(camPt);
            let s = Math.max(1, 1000 / camPt.z);
            renderQueue.push({
               zDist: camPt.z,
               isProjectile: true,
               pts: [
                  {x: screenPt.x, y: screenPt.y - s},
                  {x: screenPt.x + s, y: screenPt.y},
                  {x: screenPt.x, y: screenPt.y + s},
                  {x: screenPt.x - s, y: screenPt.y}
               ]
            });
         }
      });

      // Sort Back-To-Front
      renderQueue.sort((a, b) => b.zDist - a.zDist);

      // Draw Queue
      renderQueue.forEach(item => {
         ctx.beginPath();
         item.pts.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
         });
         ctx.closePath();

         // Solid fill to hide lines behind it
         ctx.fillStyle = '#001100'; 
         ctx.fill();

         // Over-glow stroke
         ctx.strokeStyle = item.isEnemy ? '#f00' : (item.isProjectile ? '#fff' : '#0f0');
         ctx.shadowColor = ctx.strokeStyle;
         ctx.stroke();
      });

      // Draw Particles (Lines stretching outwards)
      ctx.beginPath();
      gs.particles.forEach(pt => {
         let camPt1 = transformPoint(0, 0, 0, pt.x, pt.z, 0, p.x, p.z, p.angle); camPt1.y += pt.y;
         let camPt2 = transformPoint(0, 0, 0, pt.x - pt.vx*2, pt.z - pt.vz*2, 0, p.x, p.z, p.angle); camPt2.y += pt.y - pt.vy*2;
         
         if (camPt1.z >= 10 && camPt2.z >= 10) {
            let s1 = projectToScreen(camPt1); let s2 = projectToScreen(camPt2);
            ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y);
         }
      });
      ctx.strokeStyle = '#fa0'; ctx.shadowColor = '#fa0'; ctx.stroke();

      // --- HUD RENDERING ---
      ctx.fillStyle = '#0f0'; ctx.shadowColor = '#0f0'; ctx.textAlign = 'left'; ctx.font = '24px "VT323", monospace';
      ctx.fillText(`SCORE  ${gs.score}`, 20, 30);
      
      // Radar (Top Center)
      ctx.beginPath();
      ctx.arc(NATIVE_W/2, 60, 40, 0, Math.PI * 2);
      ctx.stroke();
      
      // Radar Sweep
      ctx.beginPath();
      ctx.moveTo(NATIVE_W/2, 60);
      ctx.lineTo(NATIVE_W/2 + Math.cos(gs.radarAngle) * 40, 60 + Math.sin(gs.radarAngle) * 40);
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; ctx.stroke();

      // Radar Blips
      ctx.fillStyle = '#f00'; ctx.shadowColor = '#f00';
      gs.enemies.forEach(e => {
         let dx = e.x - p.x; let dz = e.z - p.z;
         let dist = Math.hypot(dx, dz);
         if (dist < 4000) {
            let angle = Math.atan2(dz, dx) - p.angle - Math.PI/2;
            let rDist = (dist / 4000) * 40;
            let bx = NATIVE_W/2 + Math.cos(angle) * rDist;
            let by = 60 + Math.sin(angle) * rDist;
            ctx.fillRect(bx - 2, by - 2, 4, 4);

            // Radar Beep if sweep passes blip
            let sweepDiff = Math.abs(angle - gs.radarAngle);
            if (sweepDiff < 0.1 || Math.abs(sweepDiff - Math.PI*2) < 0.1) playAudio('radar');
         }
      });

      // Crosshair
      ctx.strokeStyle = '#0f0'; ctx.shadowColor = '#0f0';
      ctx.beginPath();
      ctx.moveTo(NATIVE_W/2 - 20, NATIVE_H/2 + 50); ctx.lineTo(NATIVE_W/2 - 5, NATIVE_H/2 + 50);
      ctx.moveTo(NATIVE_W/2 + 20, NATIVE_H/2 + 50); ctx.lineTo(NATIVE_W/2 + 5, NATIVE_H/2 + 50);
      ctx.moveTo(NATIVE_W/2, NATIVE_H/2 + 30); ctx.lineTo(NATIVE_W/2, NATIVE_H/2 + 45);
      ctx.moveTo(NATIVE_W/2, NATIVE_H/2 + 70); ctx.lineTo(NATIVE_W/2, NATIVE_H/2 + 55);
      ctx.stroke();

      if (gs.status === 'gameover') {
         ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 0; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
         ctx.fillStyle = '#f00'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 8; ctx.textAlign = 'center'; ctx.font = '80px "VT323", monospace';
         ctx.fillText("DESTROYED", NATIVE_W/2, NATIVE_H/2);
         ctx.fillStyle = '#0f0'; ctx.shadowColor = '#0f0'; ctx.font = '30px "VT323", monospace';
         ctx.fillText("PRESS ENTER TO RESTART", NATIVE_W/2, NATIVE_H/2 + 60);
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
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-contain bg-black cursor-none" />
    </div>
  );
}
import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- ASSET LOADER --- 
const ASSETS = {
  enemy0: "data:image/svg+xml,%3Csvg viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23f0f' d='M6 0h4v2H6zm-2 2h8v2H4zm-2 2h12v2H2zM0 6h16v2H0zm0 2h4v2H0zm12 0h4v2h-4zm-8 2h8v2H4zm-2 2h4v2H2zm8 0h4v2h-4z'/%3E%3Cpath fill='%230ff' d='M4 6h2v2H4zm6 0h2v2h-2z'/%3E%3C/svg%3E",
  enemy1: "data:image/svg+xml,%3Csvg viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23f00' d='M6 0h4v2H6zm-4 2h12v2H2zm-2 2h16v4H0zm2 4h2v2H2zm10 0h2v2h-2zm-6 2h4v2H6zm-4 2h2v2H2zm10 0h2v2h-2z'/%3E%3Cpath fill='%23ff0' d='M4 4h2v2H4zm6 0h2v2h-2zm-2 4h2v2H8z'/%3E%3C/svg%3E",
  enemy2: "data:image/svg+xml,%3Csvg viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%230f0' d='M4 0h8v2H4zm-2 2h12v2H2zM0 4h16v4H0zm4 4h8v2H4zm-4 2h2v2H0zm14 0h2v2h-2zm-8 2h4v2H6z'/%3E%3Cpath fill='%23fff' d='M4 4h2v2H4zm6 0h2v2h-2z'/%3E%3C/svg%3E"
};

// --- Offline Audio Sequencer for BGM Tracks ---
const buildTracks = async (actx) => {
  const sr = actx.sampleRate;
  const WAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  
  const playSnare = (ctx, time, dest) => {
    let noiseBuf = ctx.createBuffer(1, sr * 0.5, sr);
    let nData = noiseBuf.getChannelData(0);
    for (let i = 0; i < nData.length; i++) nData[i] = Math.random() * 2 - 1;
    let nSrc = ctx.createBufferSource(); nSrc.buffer = noiseBuf;
    let nFilter = ctx.createBiquadFilter(); nFilter.type = 'bandpass'; nFilter.frequency.value = 1500;
    let nGain = ctx.createGain(); nGain.gain.setValueAtTime(0.3, time); nGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    nSrc.connect(nFilter).connect(nGain).connect(dest); nSrc.start(time); nSrc.stop(time + 0.15);
  };
  
  // ---------------- MENU TRACK ----------------
  const m1 = new WAudioContext(1, 16 * sr, sr);
  for(let beat=0; beat<64; beat++) {
    let t = beat * 0.25;
    let osc = m1.createOscillator(); osc.type = 'square';
    let notes = [220, 261.63, 329.63, 392.00, 440, 392.00, 329.63, 261.63];
    osc.frequency.value = notes[beat % 8];
    // Gentle, plucky synthwave arpeggio
    let gain = m1.createGain(); gain.gain.setValueAtTime(0.03, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.2);
    
    // Add a lush, low bass pad underneath
    if (beat % 16 === 0) {
        let pad = m1.createOscillator(); pad.type = 'sine'; pad.frequency.value = 110;
        let padGain = m1.createGain(); padGain.gain.setValueAtTime(0.05, t); padGain.gain.linearRampToValueAtTime(0.01, t+4.0);
        pad.connect(padGain).connect(m1.destination); pad.start(t); pad.stop(t+4.0);
    }
    
    osc.connect(gain).connect(m1.destination); osc.start(t); osc.stop(t+0.2);
  }
  const menuPlayBuf = await m1.startRendering();

  // ---------------- GALAGA TRACKS ----------------
  const o1 = new WAudioContext(1, 8 * sr, sr);
  for(let i=0; i<32; i++) {
    let t = i * 0.25;
    let osc = o1.createOscillator(); osc.type = 'triangle';
    osc.frequency.value = [130.81, 155.56, 196.00, 233.08][i%4] * (i%8 < 4 ? 1 : 1.5);
    let gain = o1.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.2);
    osc.connect(gain).connect(o1.destination); osc.start(t); osc.stop(t+0.2);
  }
  const galagaStartBuf = await o1.startRendering();

  const o2 = new WAudioContext(1, 64 * sr, sr);
  const galagaSections = [
    { bass: 32.70, pad: [130.81, 155.56, 196.00], arp: [261.63, 311.13, 392.00, 523.25] },
    { bass: 25.96, pad: [103.83, 130.81, 155.56], arp: [207.65, 261.63, 311.13, 415.30] },
    { bass: 43.65, pad: [87.31,  103.83, 130.81], arp: [174.61, 207.65, 261.63, 349.23] },
    { bass: 49.00, pad: [98.00,  123.47, 146.83], arp: [196.00, 246.94, 293.66, 392.00] }
  ];
  for(let beat=0; beat<128; beat++) {
    let t = beat * 0.5; let sec = galagaSections[Math.floor(beat / 32)];
    let k = o2.createOscillator(); k.type = 'square'; k.frequency.setValueAtTime(100, t); k.frequency.exponentialRampToValueAtTime(10, t+0.1);
    let kg = o2.createGain(); kg.gain.setValueAtTime(0.4, t); kg.gain.linearRampToValueAtTime(0.01, t+0.1);
    k.connect(kg).connect(o2.destination); k.start(t); k.stop(t+0.1);
    if (beat % 4 === 0) {
      sec.pad.forEach(freq => {
        let p = o2.createOscillator(); p.type = 'sine'; p.frequency.value = freq;
        let pg = o2.createGain(); pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(0.05, t + 0.5); pg.gain.setValueAtTime(0.05, t + 1.5); pg.gain.linearRampToValueAtTime(0, t + 2.0); 
        p.connect(pg).connect(o2.destination); p.start(t); p.stop(t+2.0);
      });
    }
    for(let step=0; step<4; step++) {
      let bt = t + step * 0.125; let b = o2.createOscillator(); b.type = 'triangle'; let freq = sec.bass; 
      if (step === 2 && beat % 2 === 0) freq *= 2; b.frequency.value = freq;
      let bg = o2.createGain(); bg.gain.setValueAtTime(0.18, bt); bg.gain.exponentialRampToValueAtTime(0.01, bt+0.1);
      b.connect(bg).connect(o2.destination); b.start(bt); b.stop(bt+0.1);
    }
    for(let step=0; step<2; step++) {
      let bt = t + step * 0.25; let m = o2.createOscillator(); m.type = 'sawtooth'; let arpIdx = (Math.floor(beat/32) % 2 === 0) ? ((beat * 2 + step) % 4) : (3 - ((beat * 2 + step) % 4));
      m.frequency.value = sec.arp[arpIdx]; let mg = o2.createGain(); mg.gain.setValueAtTime(0.04, bt); mg.gain.exponentialRampToValueAtTime(0.001, bt+0.2);
      m.connect(mg).connect(o2.destination); m.start(bt); m.stop(bt+0.2);
    }
  }
  const galagaPlayBuf = await o2.startRendering();

  const ow = new WAudioContext(1, 16 * sr, sr);
  for(let beat=0; beat<32; beat++) {
    let t = beat * 0.5; let k = ow.createOscillator(); k.type = 'square'; k.frequency.setValueAtTime(120, t); k.frequency.exponentialRampToValueAtTime(15, t+0.1);
    let kg = ow.createGain(); kg.gain.setValueAtTime(0.4, t); kg.gain.linearRampToValueAtTime(0.01, t+0.1); k.connect(kg).connect(ow.destination); k.start(t); k.stop(t+0.1);
    for(let step=0; step<8; step++) {
      let bt = t + step * 0.0625; let s = ow.createOscillator(); s.type = 'sine'; s.frequency.value = [523.25, 659.25, 783.99, 1046.50][step%4] * (beat%2===0?1:1.5);
      let sg = ow.createGain(); sg.gain.setValueAtTime(0.05, bt); sg.gain.exponentialRampToValueAtTime(0.001, bt+0.05); s.connect(sg).connect(ow.destination); s.start(bt); s.stop(bt+0.05);
    }
  }
  const galagaWarpBuf = await ow.startRendering();

  const o3 = new WAudioContext(1, 4 * sr, sr);
  for(let i=0; i<8; i++) {
    let t = i * 0.3; let osc = o3.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150 - i*15, t);
    let gain = o3.createGain(); gain.gain.setValueAtTime(0.2, t); gain.gain.linearRampToValueAtTime(0.01, t+0.4); osc.connect(gain).connect(o3.destination); osc.start(t); osc.stop(t+0.4);
  }
  const galagaOverBuf = await o3.startRendering();

  // ---------------- COMMANDO TRACKS ----------------
  const c1 = new WAudioContext(1, 8 * sr, sr);
  for(let i=0; i<16; i++) {
    let t = i * 0.5; let a = c1.createOscillator(); a.type = 'sine'; a.frequency.setValueAtTime(65.41, t); 
    let ag = c1.createGain(); ag.gain.setValueAtTime(0.3, t); ag.gain.exponentialRampToValueAtTime(0.01, t+0.4); a.connect(ag).connect(c1.destination); a.start(t); a.stop(t+0.4);
    playSnare(c1, t, c1.destination);
    if (i%4===3) { playSnare(c1, t+0.25, c1.destination); playSnare(c1, t+0.375, c1.destination); }
  }
  const commandoStartBuf = await c1.startRendering();

  const c2 = new WAudioContext(1, 64 * sr, sr);
  const cmdSections = [ { root: 65.41, chords: [130.81, 155.56, 196.00] }, { root: 65.41, chords: [130.81, 155.56, 196.00] }, { root: 51.91, chords: [103.83, 130.81, 155.56] }, { root: 58.27, chords: [116.54, 146.83, 174.61] } ];
  for(let beat=0; beat<128; beat++) {
    let t = beat * 0.5; let sec = cmdSections[Math.floor(beat / 32)]; const marchPattern = [1, 0, 0, 1, 1, 0, 1, 0];
    for(let step=0; step<2; step++) {
      let bt = t + step * 0.25; let patIdx = (beat * 2 + step) % 8;
      if (marchPattern[patIdx] === 1) {
        let b = c2.createOscillator(); b.type = 'triangle'; b.frequency.value = sec.root;
        let bg = c2.createGain(); bg.gain.setValueAtTime(0.25, bt); bg.gain.exponentialRampToValueAtTime(0.01, bt+0.2); b.connect(bg).connect(c2.destination); b.start(bt); b.stop(bt+0.2);
      }
    }
    if (beat % 2 === 0) {
      sec.chords.forEach(freq => {
        let p = c2.createOscillator(); p.type = 'sawtooth'; p.frequency.value = freq;
        let pg = c2.createGain(); pg.gain.setValueAtTime(0.08, t); pg.gain.exponentialRampToValueAtTime(0.01, t + 0.4); p.connect(pg).connect(c2.destination); p.start(t); p.stop(t+0.4);
      });
      playSnare(c2, t, c2.destination);
    }
  }
  const commandoPlayBuf = await c2.startRendering();

  const c3 = new WAudioContext(1, 4 * sr, sr);
  const taps = [ { f: 261.63, d: 0.4, s: 0 }, { f: 349.23, d: 0.4, s: 0.5 }, { f: 440.00, d: 0.8, s: 1.0 }, { f: 261.63, d: 0.4, s: 2.0 }, { f: 349.23, d: 0.4, s: 2.5 }, { f: 440.00, d: 1.0, s: 3.0 } ];
  taps.forEach(n => {
    let osc = c3.createOscillator(); osc.type = 'square'; osc.frequency.value = n.f;
    let gain = c3.createGain(); gain.gain.setValueAtTime(0, n.s); gain.gain.linearRampToValueAtTime(0.1, n.s + 0.05); gain.gain.linearRampToValueAtTime(0.01, n.s + n.d - 0.05);
    osc.connect(gain).connect(c3.destination); osc.start(n.s); osc.stop(n.s + n.d);
  });
  const commandoOverBuf = await c3.startRendering();

  // ---------------- SNAKE TRACKS ----------------
  const s1 = new WAudioContext(1, 4 * sr, sr);
  for(let i=0; i<16; i++) {
    let t = i * 0.15; let osc = s1.createOscillator(); osc.type = 'square'; osc.frequency.value = 220 * Math.pow(1.059463094359, i); 
    let gain = s1.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.1); osc.connect(gain).connect(s1.destination); osc.start(t); osc.stop(t+0.1);
  }
  const snakeStartBuf = await s1.startRendering();

  const s2 = new WAudioContext(1, 32 * sr, sr);
  for(let beat=0; beat<128; beat++) {
     let t = beat * 0.25; let osc = s2.createOscillator(); osc.type = 'triangle'; let notes = [110, 110, 220, 110, 130.81, 130.81, 261.63, 130.81]; osc.frequency.value = notes[beat % 8];
     let gain = s2.createGain(); gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.2); osc.connect(gain).connect(s2.destination); osc.start(t); osc.stop(t+0.2);
     if (beat % 2 === 0) {
       let m = s2.createOscillator(); m.type = 'square'; m.frequency.value = notes[(beat+2)%8] * 2;
       let mg = s2.createGain(); mg.gain.setValueAtTime(0.05, t); mg.gain.exponentialRampToValueAtTime(0.001, t+0.1); m.connect(mg).connect(s2.destination); m.start(t); m.stop(t+0.1);
     }
  }
  const snakePlayBuf = await s2.startRendering();

  const s3 = new WAudioContext(1, 2 * sr, sr);
  let s3Osc = s3.createOscillator(); s3Osc.type = 'sawtooth'; s3Osc.frequency.setValueAtTime(150, 0); s3Osc.frequency.exponentialRampToValueAtTime(10, 1.0);
  let s3Gain = s3.createGain(); s3Gain.gain.setValueAtTime(0.2, 0); s3Gain.gain.linearRampToValueAtTime(0.01, 1.0); s3Osc.connect(s3Gain).connect(s3.destination); s3Osc.start(0); s3Osc.stop(1.0);
  let snBuf = s3.createBuffer(1, sr, sr); let snDat = snBuf.getChannelData(0); for(let i=0; i<sr; i++) snDat[i] = Math.random()*2-1;
  let snSrc = s3.createBufferSource(); snSrc.buffer = snBuf; let snGain = s3.createGain(); snGain.gain.setValueAtTime(0.2, 0); snGain.gain.exponentialRampToValueAtTime(0.01, 1.0); snSrc.connect(snGain).connect(s3.destination); snSrc.start(0);
  const snakeOverBuf = await s3.startRendering();

// ---------------- 1941 TRACKS ----------------
  // Start Jingle (Military Reveille style)
  const a1 = new WAudioContext(1, 4 * sr, sr);
  const revNotes = [261.63, 349.23, 440.00, 523.25]; // C4, F4, A4, C5
  for(let i=0; i<4; i++) {
    let t = i * 0.15;
    let osc = a1.createOscillator(); osc.type = 'square'; osc.frequency.value = revNotes[i];
    let gain = a1.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.15);
    osc.connect(gain).connect(a1.destination); osc.start(t); osc.stop(t+0.15);
    playSnare(a1, t, a1.destination);
  }
  let hOsc = a1.createOscillator(); hOsc.type = 'square'; hOsc.frequency.value = 523.25;
  let hGain = a1.createGain(); hGain.gain.setValueAtTime(0.1, 0.6); hGain.gain.linearRampToValueAtTime(0.001, 2.0);
  hOsc.connect(hGain).connect(a1.destination); hOsc.start(0.6); hOsc.stop(2.0);
  const start1941Buf = await a1.startRendering();

  // Play Track (Driving 16th-note military march)
  const a2 = new WAudioContext(1, 32 * sr, sr);
  for(let beat=0; beat<128; beat++) {
    let t = beat * 0.25;
    
    // Marching bassline
    let b = a2.createOscillator(); b.type = 'triangle';
    let bassNotes = [65.41, 65.41, 65.41, 65.41, 77.78, 77.78, 87.31, 87.31];
    b.frequency.value = bassNotes[Math.floor(beat/16) % 8];
    let bg = a2.createGain(); bg.gain.setValueAtTime(0.2, t); bg.gain.exponentialRampToValueAtTime(0.01, t+0.2);
    b.connect(bg).connect(a2.destination); b.start(t); b.stop(t+0.2);

    // Snare drum pattern (beats 1, 3, and double tap on 4)
    if (beat % 4 === 0 || beat % 4 === 2) {
        playSnare(a2, t, a2.destination);
    } else if (beat % 4 === 3) {
        playSnare(a2, t, a2.destination);
        playSnare(a2, t + 0.125, a2.destination);
    }

    // Heroic Sawtooth Melody
    if (beat % 8 === 0) {
      let m = a2.createOscillator(); m.type = 'sawtooth';
      let melNotes = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 392.00, 311.13];
      m.frequency.value = melNotes[(beat/8) % 8];
      let mg = a2.createGain(); mg.gain.setValueAtTime(0.06, t); mg.gain.linearRampToValueAtTime(0.01, t+1.5);
      m.connect(mg).connect(a2.destination); m.start(t); m.stop(t+1.5);
    }
  }
  const play1941Buf = await a2.startRendering();

  // Game Over Track (Descending dive-bomb sound)
  const a3 = new WAudioContext(1, 4 * sr, sr);
  let fOsc = a3.createOscillator(); fOsc.type = 'sawtooth';
  fOsc.frequency.setValueAtTime(200, 0); fOsc.frequency.exponentialRampToValueAtTime(20, 2.0);
  let fGain = a3.createGain(); fGain.gain.setValueAtTime(0.2, 0); fGain.gain.exponentialRampToValueAtTime(0.01, 2.0);
  fOsc.connect(fGain).connect(a3.destination); fOsc.start(0); fOsc.stop(2.0);
  const over1941Buf = await a3.startRendering();

return { 
    galagaStart: galagaStartBuf, galagaPlay: galagaPlayBuf, galagaWarp: galagaWarpBuf, galagaOver: galagaOverBuf,
    commandoStart: commandoStartBuf, commandoPlay: commandoPlayBuf, commandoOver: commandoOverBuf,
    snakeStart: snakeStartBuf, snakePlay: snakePlayBuf, snakeOver: snakeOverBuf, 
    '1941Start': start1941Buf, '1941Play': play1941Buf, '1941Over': over1941Buf,
    menuPlay: menuPlayBuf
  };
};

// --- CONTROLLER MAPPING CONSTANTS ---
const DEFAULT_PAD_CONFIG = {
  mode: 'extended',
  btnMap: { 0: 'fire', 1: 'bomb', 2: 'fireAlt', 3: 'bombAlt', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' },
  axisMap: { '0_-1': 'left', '0_1': 'right', '1_-1': 'up', '1_1': 'down', '2_-1': 'aimLeft', '2_1': 'aimRight', '3_-1': 'aimUp', '3_1': 'aimDown' }
};

const REMAP_ORDER = {
  basic: ['up', 'down', 'left', 'right', 'fire', 'bomb', 'select', 'start'],
  extended: ['up', 'down', 'left', 'right', 'fire', 'bomb', 'select', 'start', 'fireAlt', 'bombAlt', 'aimUp', 'aimDown', 'aimLeft', 'aimRight']
};

const PAD_LABELS = {
  up: "D-PAD UP", down: "D-PAD DOWN", left: "D-PAD LEFT", right: "D-PAD RIGHT",
  fire: "PRIMARY FIRE (A/CROSS)", bomb: "SMART BOMB (B/CIRCLE)",
  select: "SELECT / COIN", start: "START / PAUSE",
  fireAlt: "ALT FIRE (X/SQUARE)", bombAlt: "ALT BOMB (Y/TRIANGLE)",
  aimUp: "RIGHT STICK UP", aimDown: "RIGHT STICK DOWN", aimLeft: "RIGHT STICK LEFT", aimRight: "RIGHT STICK RIGHT"
};

// --- GLOBAL GAMEPAD ENGINE (Programmable Twin-Stick) ---
const useGamepadEngine = () => {
  const activeKeys = useRef(new Set());
  const configRef = useRef(DEFAULT_PAD_CONFIG);

  useEffect(() => {
    // High-performance cache: Only reads localStorage once on mount or when updated
    const loadConfig = () => {
      try {
        let saved = localStorage.getItem('bass_pad_config');
        if (saved) configRef.current = JSON.parse(saved);
        else configRef.current = DEFAULT_PAD_CONFIG;
      } catch (e) {}
    };
    loadConfig();
    window.addEventListener('padConfigUpdated', loadConfig);

    let frame;
    const triggerKey = (key, isDown) => {
      if (!key) return;
      if (isDown && !activeKeys.current.has(key)) {
        activeKeys.current.add(key);
        window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      } else if (!isDown && activeKeys.current.has(key)) {
        activeKeys.current.delete(key);
        window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
      }
    };

    const loop = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = gamepads[0]; 

      if (pad) {
        const cfg = configRef.current;
        const act = { up: false, down: false, left: false, right: false, aimUp: false, aimDown: false, aimLeft: false, aimRight: false, fire: false, fireAlt: false, bomb: false, bombAlt: false, start: false, select: false };

        // Process Custom Mapped Buttons
        pad.buttons.forEach((b, idx) => {
          if (b.pressed && cfg.btnMap[idx]) act[cfg.btnMap[idx]] = true;
        });

        // Process Custom Mapped Axes
        const deadzone = 0.4;
        pad.axes.forEach((val, idx) => {
          if (val < -deadzone && cfg.axisMap[`${idx}_-1`]) act[cfg.axisMap[`${idx}_-1`]] = true;
          if (val > deadzone && cfg.axisMap[`${idx}_1`]) act[cfg.axisMap[`${idx}_1`]] = true;
        });

        // Fire Hardware Keys
        triggerKey('w', act.up); triggerKey('s', act.down);
        triggerKey('a', act.left); triggerKey('d', act.right);

        triggerKey('ArrowUp', act.aimUp); triggerKey('ArrowDown', act.aimDown);
        triggerKey('ArrowLeft', act.aimLeft); triggerKey('ArrowRight', act.aimRight);

        triggerKey(' ', act.fire || act.fireAlt);
        triggerKey('Shift', act.bomb || act.bombAlt);
        triggerKey('m', act.select);
        triggerKey('Enter', act.start || act.fire || act.fireAlt);
      }
      frame = requestAnimationFrame(loop);
    };
    
    loop();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('padConfigUpdated', loadConfig);
    };
  }, []);
};

// --- HELPER CRT TEXT DRAWING ---
const drawCRTText = (ctx, text, x, y, color, font, align = 'center') => {
  ctx.font = font; ctx.textAlign = align;
  // Subtle red/blue color convergence error (chromatic aberration)
  ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; ctx.fillText(text, x - 1, y);
  ctx.fillStyle = 'rgba(0, 0, 255, 0.4)'; ctx.fillText(text, x + 1, y);
  
  // Main text with absolutely ZERO shadow blur
  ctx.fillStyle = color; 
  ctx.shadowBlur = 0; 
  ctx.fillText(text, x, y);
};
// --- MENU COMPONENT ---
const GameMenu = ({ audioCtx, onSelect }) => {
  const canvasRef = useRef(null);
  const selectedIndex = useRef(0);
  const lastNavTime = useRef(0); 

  // Particle Engine State for Backgrounds
  const bgState = useRef({
    tick: 0,
    stars: Array(150).fill().map(() => ({ x: Math.random() * 800, y: Math.random() * 600, speed: 1 + Math.random() * 3, size: Math.random() > 0.5 ? 2 : 1 })),
    missiles: Array(10).fill().map(() => ({ x: Math.random() * 800, y: Math.random() * 600, speed: 4 + Math.random() * 4 })),
    asteroids: Array(6).fill().map(() => ({ x: Math.random() * 800, y: Math.random() * 600, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, rot: 0, rotSpeed: (Math.random()-0.5)*0.05, pts: Array(8).fill().map(()=> 20+Math.random()*20) })),
    controllers: Array(4).fill().map((_, i) => ({ x: Math.random() * 800, y: 150 + i * 100, vx: 1 + Math.random(), rot: Math.random()*Math.PI, rs: (Math.random()-0.5)*0.05 }))
  });

  const playAudio = (type) => {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const t = audioCtx.currentTime;
    if (type === 'scroll') {
      let osc = audioCtx.createOscillator(); osc.type = 'square';
      osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(50, t + 0.05);
      let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.05);
    } else if (type === 'select') {
      [440, 554.37, 659.25, 880].forEach((f, i) => {
         let osc = audioCtx.createOscillator(); osc.type = 'square'; osc.frequency.value = f;
         let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t + i*0.05); gain.gain.linearRampToValueAtTime(0, t + i*0.05 + 0.05);
         osc.connect(gain).connect(audioCtx.destination); osc.start(t + i*0.05); osc.stop(t + i*0.05 + 0.05);
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = e => {
      const now = Date.now();
      if (e.key === 'ArrowUp' || e.key === 'w') {
          if (now - lastNavTime.current < 150) return; 
          lastNavTime.current = now;
          selectedIndex.current = (selectedIndex.current - 1 + 10) % 10; 
          playAudio('scroll');
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
          if (now - lastNavTime.current < 150) return; 
          lastNavTime.current = now;
          selectedIndex.current = (selectedIndex.current + 1) % 10; 
          playAudio('scroll');
      }
      if (e.key === 'Enter') {
          if (now - lastNavTime.current < 200) return; 
          lastNavTime.current = now;
          playAudio('select');
          
          const games = ['galaga', 'commando', 'snake', 'asteroids', 'defender', 'oregon', 'invaders', '1941', 'robotron', 'controller'];
          setTimeout(() => onSelect(games[selectedIndex.current]), 200);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioCtx, onSelect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const drawWagon = (x, y) => {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x+35, y-5, 18, Math.PI, 0); ctx.fill();
        ctx.fillRect(x+17, y-15, 36, 10);
        ctx.fillStyle = '#a52'; ctx.fillRect(x+17, y-5, 36, 12);
        ctx.fillStyle = '#fff'; ctx.fillRect(x+75, y-5, 20, 14); // oxen
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x+25, y+5, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+45, y+5, 6, 0, Math.PI*2); ctx.fill();
    };

    const drawNESController = (x, y, rot) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.fillStyle = '#ccc'; ctx.fillRect(-35, -15, 70, 30); 
        ctx.fillStyle = '#333'; ctx.fillRect(-25, -4, 14, 6); ctx.fillRect(-20, -9, 4, 16); 
        ctx.fillStyle = '#f00'; ctx.beginPath(); ctx.arc(15, 4, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(28, -2, 5, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    };

    const draw = () => {
      let gs = bgState.current;
      gs.tick++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- DYNAMIC BACKGROUND ENGINE ---
      ctx.globalAlpha = 0.2; // Dim the background
      let sel = selectedIndex.current;

      if (sel === 0) { // GALAXY FIGHTER
        ctx.fillStyle = '#fff';
        gs.stars.forEach(s => {
           s.y += s.speed; if(s.y > 600) s.y = -10;
           ctx.fillRect(s.x, s.y, s.size, s.size + s.speed);
        });
      } else if (sel === 1) { // STATION COMMANDO
        ctx.strokeStyle = '#f0f'; ctx.lineWidth = 2;
        gs.missiles.forEach(m => {
           m.y += m.speed;
           ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x, m.y - 20); ctx.stroke();
           if(m.y > 600) { m.y = -50; m.x = Math.random()*800; }
        });
      } else if (sel === 2) { // CLASSIC SNAKEZ
        ctx.fillStyle = '#0f0';
        let sx = 400 + Math.sin(gs.tick * 0.05) * 150;
        let sy = 300 + Math.cos(gs.tick * 0.05) * 150;
        ctx.fillRect(sx, sy, 30, 30);
        ctx.fillRect(sx - 35, sy, 30, 30);
        ctx.fillRect(sx - 70, sy, 30, 30);
      } else if (sel === 3) { // SPACE ASTEROIDZ
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        gs.asteroids.forEach(a => {
          a.x += a.vx; a.y += a.vy; a.rot += a.rotSpeed;
          if(a.x > 850) a.x = -50; if(a.x < -50) a.x = 850;
          if(a.y > 650) a.y = -50; if(a.y < -50) a.y = 650;
          ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
          ctx.beginPath();
          a.pts.forEach((pt, i) => {
             let ang = (i/8)*Math.PI*2;
             if(i===0) ctx.moveTo(Math.cos(ang)*pt, Math.sin(ang)*pt); else ctx.lineTo(Math.cos(ang)*pt, Math.sin(ang)*pt);
          });
          ctx.closePath(); ctx.stroke(); ctx.restore();
        });
      } else if (sel === 4) { // SPACE DEFENDAZ
        ctx.strokeStyle = '#a52'; ctx.lineWidth = 4;
        ctx.beginPath();
        let dx = (gs.tick * 4) % 100;
        for(let i=-1; i<10; i++) {
           let rx = i*100 - dx; let ry = 400 + Math.sin((i + Math.floor(gs.tick/25)) * 0.8) * 80;
           if(i===-1) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.stroke();
      } else if (sel === 5) { // COUNTRY TRAIL
        ctx.fillStyle = '#852'; ctx.fillRect(0, 450, 800, 150);
        let wx = (gs.tick * 1.5) % 1000 - 150;
        drawWagon(wx, 440);
      } else if (sel === 6) { // SPACE INVADAZ
        ctx.fillStyle = '#0ff';
        let ix = 350 + Math.sin(gs.tick * 0.03) * 250;
        let iy = 250 + Math.sin(gs.tick * 0.15) * 30; 
        ctx.fillRect(ix, iy, 60, 40); ctx.fillRect(ix+10, iy-20, 40, 20);
      } else if (sel === 7) { // FLY FIGHT 1941
        ctx.fillStyle = '#001a44'; ctx.fillRect(0,0,800,600);
        ctx.fillStyle = '#004400';
        let dy = (gs.tick * 2) % 900 - 150;
        ctx.beginPath(); ctx.arc(200, dy, 120, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(600, dy - 300, 100, 0, Math.PI*2); ctx.fill();
      } else if (sel === 8) { // BADASSATRON 2084
        ctx.strokeStyle = `hsl(${(gs.tick * 5) % 360}, 100%, 50%)`;
        ctx.lineWidth = 6;
        let sz = (gs.tick * 6) % 800;
        ctx.strokeRect(400 - sz/2, 300 - sz/2, sz, sz);
      } else if (sel === 9) { // CONTROLLER SETUP
        gs.controllers.forEach(c => {
           c.x += c.vx; c.rot += c.rs;
           if(c.x > 900) c.x = -100;
           drawNESController(c.x, c.y, c.rot);
        });
      }

      ctx.globalAlpha = 1.0; // Reset alpha for text

      // --- FOREGROUND MENU UI ---
      drawCRTText(ctx, "GAMES MENU", 400, 100, '#fff', '50px "VT323", monospace');
      
      const opts = [
          { text: "GALAXY FIGHTER", game: 'galaga' },
          { text: "STATION COMMANDO", game: 'commando' },
          { text: "CLASSIC SNAKEZ", game: 'snake' },
          { text: "SPACE ASTEROIDZ", game: 'asteroids' },
          { text: "SPACE DEFENDAZ", game: 'defender' },
          { text: "COUNTRY TRAIL", game: 'oregon' },
          { text: "SPACE INVADAZ", game: 'invaders' },
          { text: "FLY FIGHT 1941", game: '1941' },
          { text: "BADASSATRON 2084", game: 'robotron' },
          { text: "- CONTROLLER SETUP -", game: 'controller' }
      ];

      opts.forEach((opt, idx) => {
          let isSel = selectedIndex.current === idx;
          let col = isSel ? '#fff' : '#666';
          let font = isSel ? '40px "VT323", monospace' : '30px "VT323", monospace';
          drawCRTText(ctx, opt.text, 400, 160 + (idx * 35), col, font);
      });
    };

    const loop = () => {
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent">
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-fill bg-transparent" />
    </div>
  );
};

// --- BASS 2084 (ROBOTRON CLONE) COMPONENT ---
const RobotronGame = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);

  const NATIVE_W = 640;
  const NATIVE_H = 480;

  const state = useRef({
    status: 'start',
    score: 0,
    highScore: 0,
    lives: 3,
    wave: 1,
    humanMultiplier: 1000,
    respawnTimer: 0,
    // ADDED: facingX and facingY to track which way to shoot
    player: { x: NATIVE_W/2, y: NATIVE_H/2, w: 15, h: 21, speed: 4.5, cooldown: 0, facingX: 1, facingY: 0 },
    bullets: [],
    enemies: [],
    humans: [],
    electrodes: [],
    particles: [],
    keys: {}
  });

  // Authentic 1982 Pixel Art Data
  const PALETTE = {
    'R': '#ff0000', 'B': '#0000ff', 'W': '#ffffff', 'G': '#00ff00',
    'C': '#00ffff', 'M': '#ff00ff', 'Y': '#ffff00', 'P': '#ff88ff'
  };

  const SPRITES = {
    player: [
      ".B.B.",
      "BBBBB",
      ".W.W.",
      ".WWW.",
      "RRRRR",
      ".R.R.",
      "R...R"
    ],
    grunt: [
      "MMMMM",
      "M.M.M",
      "MMMMM",
      ".C.C.",
      "C...C"
    ],
    hulk: [
      ".GGG.",
      "GGGGG",
      "G.G.G",
      "GGGGG",
      "G...G",
      "GG.GG"
    ],
    human: [
      ".PPP.",
      "..P..",
      "PPPPP",
      "..P..",
      ".P.P."
    ],
    electrode: [
      "..Y..",
      ".YYY.",
      "YYYYY",
      ".YYY.",
      "..Y.."
    ]
  };

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // --- SYNTHESIZED SOUND EFFECTS ---
    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      
      if (type === 'shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2000, t); osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.08, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.08);
      } else if (type === 'gruntHit') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.1);
      } else if (type === 'hulkHit') {
        let osc = audioCtx.createOscillator(); osc.type = 'triangle';
        osc.frequency.setValueAtTime(60, t); osc.frequency.linearRampToValueAtTime(40, t + 0.1);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.1);
      } else if (type === 'pickup') {
        [400, 600, 800, 1200].forEach((f, i) => {
           let osc = audioCtx.createOscillator(); osc.type = 'square'; osc.frequency.value = f;
           let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t + i*0.05); gain.gain.linearRampToValueAtTime(0, t + i*0.05 + 0.05);
           osc.connect(gain).connect(audioCtx.destination); osc.start(t + i*0.05); osc.stop(t + i*0.05 + 0.05);
        });
      } else if (type === 'death') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1000, t); osc.frequency.exponentialRampToValueAtTime(20, t + 1.0);
        
        let lfo = audioCtx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 20;
        let lfoGain = audioCtx.createGain(); lfoGain.gain.value = 500;
        lfo.connect(lfoGain).connect(osc.frequency); lfo.start(t); lfo.stop(t+1.0);
        
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, t); gain.gain.linearRampToValueAtTime(0.01, t + 1.0);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 1.0);
      }
    };

    const drawSprite = (spriteObj, x, y, scale = 3) => {
      let w = spriteObj[0].length * scale;
      let h = spriteObj.length * scale;
      let startX = x - w / 2;
      let startY = y - h / 2;
      for (let r = 0; r < spriteObj.length; r++) {
        for (let c = 0; c < spriteObj[r].length; c++) {
          let char = spriteObj[r][c];
          if (char === '.') continue;
          ctx.fillStyle = PALETTE[char];
          ctx.fillRect(Math.floor(startX + c * scale), Math.floor(startY + r * scale), scale, scale);
        }
      }
    };

    const spawnLevel = (gs) => {
      gs.enemies = []; gs.humans = []; gs.electrodes = []; gs.bullets = []; gs.particles = [];
      gs.humanMultiplier = 1000;
      
      const safeRadius = 150;
      const spawnRandom = () => {
        let ex, ey;
        do {
          ex = 20 + Math.random() * (NATIVE_W - 40);
          ey = 40 + Math.random() * (NATIVE_H - 60);
        } while (Math.hypot(ex - NATIVE_W/2, ey - NATIVE_H/2) < safeRadius);
        return {x: ex, y: ey};
      };

      // Spawn Grunts
      let gruntCount = 15 + gs.wave * 5;
      for(let i=0; i<gruntCount; i++) {
        let pos = spawnRandom();
        gs.enemies.push({ type: 'grunt', x: pos.x, y: pos.y, w: 15, h: 15, speed: 1 + Math.random()*0.5 });
      }

      // Spawn Hulks
      let hulkCount = 2 + Math.floor(gs.wave / 2);
      for(let i=0; i<hulkCount; i++) {
        let pos = spawnRandom();
        gs.enemies.push({ type: 'hulk', x: pos.x, y: pos.y, w: 15, h: 18, speed: 0.8, vx: Math.random()>0.5?0.8:-0.8, vy: Math.random()>0.5?0.8:-0.8 });
      }

      // Spawn Humans
      let humanCount = 4 + Math.floor(Math.random() * 3);
      for(let i=0; i<humanCount; i++) {
        let pos = spawnRandom();
        gs.humans.push({ x: pos.x, y: pos.y, w: 15, h: 15, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2 });
      }

      // Spawn Electrodes
      let electrodeCount = 5 + gs.wave * 2;
      for(let i=0; i<electrodeCount; i++) {
        let pos = spawnRandom();
        gs.electrodes.push({ x: pos.x, y: pos.y, w: 15, h: 15 });
      }
    };

    const killPlayer = (gs) => {
      gs.lives--;
      playAudio('death');
      gs.status = 'respawning';
      gs.respawnTimer = 120;
    };

    const formatScore = (s) => String(s).padStart(6, '0');

    // --- MAIN ENGINE LOOP ---
    const update = () => {
      let gs = state.current;
      let keys = gs.keys;

      if (keys['m'] || keys['M']) { onMenu(); return; }

      if (gs.status === 'start' && keys['Enter']) {
        gs.status = 'playing'; gs.score = 0; gs.lives = 3; gs.wave = 1;
        gs.player.x = NATIVE_W/2; gs.player.y = NATIVE_H/2;
        gs.player.facingX = 1; gs.player.facingY = 0;
        spawnLevel(gs);
      }

      if (gs.status === 'gameover' && keys['Enter']) {
        gs.status = 'start';
      }

      if (gs.status === 'levelcleared') {
        gs.wave++;
        gs.player.x = NATIVE_W/2; gs.player.y = NATIVE_H/2;
        spawnLevel(gs);
        gs.status = 'playing';
      }

      if (gs.status === 'respawning') {
        gs.respawnTimer--;
        if (gs.respawnTimer <= 0) {
          if (gs.lives <= 0) gs.status = 'gameover';
          else {
            gs.status = 'playing';
            gs.player.x = NATIVE_W/2; gs.player.y = NATIVE_H/2;
            gs.humanMultiplier = 1000;
            gs.enemies = gs.enemies.filter(e => Math.hypot(e.x - gs.player.x, e.y - gs.player.y) > 100);
            gs.electrodes = gs.electrodes.filter(e => Math.hypot(e.x - gs.player.x, e.y - gs.player.y) > 80);
          }
        }
        return; 
      }

      if (gs.status !== 'playing') return;

      let p = gs.player;
      if (p.cooldown > 0) p.cooldown--;

      // --- NEW: SINGLE STICK MOVEMENT (D-Pad or Left Stick) ---
      let dx = 0; let dy = 0;
      if (keys['a'] || keys['ArrowLeft']) dx -= 1;
      if (keys['d'] || keys['ArrowRight']) dx += 1;
      if (keys['w'] || keys['ArrowUp']) dy -= 1;
      if (keys['s'] || keys['ArrowDown']) dy += 1;
      
      if (dx !== 0 || dy !== 0) {
        // Normalize diagonals
        let length = Math.hypot(dx, dy);
        p.x += (dx / length) * p.speed;
        p.y += (dy / length) * p.speed;
        
        // Update the facing direction
        p.facingX = dx / length;
        p.facingY = dy / length;
      }

      p.x = Math.max(10, Math.min(NATIVE_W - 10, p.x));
      p.y = Math.max(40, Math.min(NATIVE_H - 10, p.y));

      // --- NEW: FACE BUTTON FIRING (A, B, X, Y all mapped to Space or Shift) ---
      if ((keys[' '] || keys['Shift']) && p.cooldown <= 0) {
        gs.bullets.push({ 
          x: p.x, y: p.y, 
          vx: p.facingX * 16, vy: p.facingY * 16, 
          life: 40 
        });
        p.cooldown = 6; 
        playAudio('shoot');
      }

      // Update Bullets
      for (let i = gs.bullets.length - 1; i >= 0; i--) {
        let b = gs.bullets[i];
        b.x += b.vx; b.y += b.vy; b.life--;
        if (b.life <= 0 || b.x < 0 || b.x > NATIVE_W || b.y < 30 || b.y > NATIVE_H) {
          gs.bullets.splice(i, 1); continue;
        }

        // Bullet vs Enemies
        let hit = false;
        for (let j = gs.enemies.length - 1; j >= 0; j--) {
          let e = gs.enemies[j];
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.w) {
            hit = true;
            if (e.type === 'grunt') {
              gs.enemies.splice(j, 1);
              gs.score += 100;
              playAudio('gruntHit');
              for(let k=0; k<10; k++) gs.particles.push({x: e.x, y: e.y, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 15, color: '#0ff', type: 'line'});
            } else if (e.type === 'hulk') {
              // Hulks are indestructible, bullets just push them back
              e.x += b.vx * 0.5; e.y += b.vy * 0.5;
              playAudio('hulkHit');
              gs.particles.push({x: b.x, y: b.y, vx: -b.vx*0.2, vy: -b.vy*0.2, life: 10, color: '#0f0', type: 'line'});
            }
            break;
          }
        }

        // Bullet vs Electrodes
        if (!hit) {
          for (let j = gs.electrodes.length - 1; j >= 0; j--) {
            let e = gs.electrodes[j];
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.w) {
              gs.electrodes.splice(j, 1); hit = true; playAudio('gruntHit');
              for(let k=0; k<8; k++) gs.particles.push({x: e.x, y: e.y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, life: 15, color: '#ff0', type: 'line'});
              break;
            }
          }
        }
        if (hit) gs.bullets.splice(i, 1);
      }

      // Update Humans
      gs.humans.forEach(h => {
        h.x += h.vx; h.y += h.vy;
        if (h.x < 15 || h.x > NATIVE_W - 15) h.vx *= -1;
        if (h.y < 45 || h.y > NATIVE_H - 15) h.vy *= -1;
        if (Math.random() < 0.02) { h.vx = (Math.random()-0.5)*2; h.vy = (Math.random()-0.5)*2; }

        // Player rescues human
        if (Math.hypot(h.x - p.x, h.y - p.y) < 20) {
          h.rescued = true;
          gs.score += gs.humanMultiplier;
          if (gs.score > gs.highScore) gs.highScore = gs.score;
          // Spawn floating score text particle
          gs.particles.push({x: h.x, y: h.y, vx: 0, vy: -1, life: 40, text: gs.humanMultiplier, color: '#f0f', type: 'text'});
          if (gs.humanMultiplier < 5000) gs.humanMultiplier += 1000;
          playAudio('pickup');
        }
      });
      gs.humans = gs.humans.filter(h => !h.rescued);

      // Update Enemies
      gs.enemies.forEach(e => {
        if (e.type === 'grunt') {
          e.x += Math.sign(p.x - e.x) * e.speed;
          e.y += Math.sign(p.y - e.y) * e.speed;
        } else if (e.type === 'hulk') {
          e.x += e.vx; e.y += e.vy;
          if (e.x < 15 || e.x > NATIVE_W - 15) e.vx *= -1;
          if (e.y < 45 || e.y > NATIVE_H - 15) e.vy *= -1;
          if (Math.random() < 0.01) { e.vx = (Math.random()>0.5?0.8:-0.8); e.vy = (Math.random()>0.5?0.8:-0.8); }
          
          for (let j = gs.humans.length - 1; j >= 0; j--) {
            if (Math.hypot(e.x - gs.humans[j].x, e.y - gs.humans[j].y) < 15) {
              gs.humans.splice(j, 1); playAudio('gruntHit');
            }
          }
        }

        if (Math.hypot(e.x - p.x, e.y - p.y) < 15) killPlayer(gs);
      });

      gs.electrodes.forEach(e => {
        if (Math.hypot(e.x - p.x, e.y - p.y) < 15) killPlayer(gs);
      });

      for (let i = gs.particles.length - 1; i >= 0; i--) {
        let pt = gs.particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.life--;
        if (pt.life <= 0) gs.particles.splice(i, 1);
      }

      if (gs.enemies.filter(e => e.type === 'grunt').length === 0 && gs.status === 'playing') {
        gs.status = 'levelcleared';
      }
    };

    // --- RENDER ENGINE ---
    const draw = () => {
      let gs = state.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);

      if (gs.status === 'start') {
        ctx.fillStyle = '#0ff'; ctx.font = '60px "VT323", monospace'; ctx.textAlign = 'center'; ctx.fillText("BASS 2084", NATIVE_W/2, 150);
        ctx.fillStyle = '#f0f'; ctx.font = '30px "VT323", monospace'; ctx.fillText("MUTANT CYBORG ATTACK", NATIVE_W/2, 200);
        ctx.fillStyle = '#fff';
        ctx.font = '24px "VT323", monospace'; ctx.fillText("PRESS ENTER TO START", NATIVE_W/2, 320);
        
        // UPDATED INSTRUCTIONS
        ctx.fillText("D-PAD/STICK: Move | A/B/X/Y: Fire", NATIVE_W/2, 380);
        return;
      }

      ctx.strokeStyle = '#f00'; ctx.lineWidth = 4;
      ctx.strokeRect(4, 30, NATIVE_W - 8, NATIVE_H - 34);

      gs.electrodes.forEach(e => drawSprite(SPRITES.electrode, e.x, e.y, 3));
      gs.humans.forEach(h => drawSprite(SPRITES.human, h.x, h.y, 3));
      gs.enemies.forEach(e => drawSprite(SPRITES[e.type], e.x, e.y, 3));

      ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3;
      gs.bullets.forEach(b => {
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx*1.5, b.y - b.vy*1.5); ctx.stroke();
      });

      gs.particles.forEach(p => {
        if (p.type === 'text') {
          ctx.fillStyle = p.color; ctx.font = '20px "VT323", monospace'; ctx.textAlign = 'center';
          ctx.fillText(p.text, p.x, p.y);
        } else {
          ctx.strokeStyle = p.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx*2, p.y - p.vy*2); ctx.stroke();
        }
      });

      if (gs.status === 'respawning') {
        let t = 120 - gs.respawnTimer;
        if (t < 40) {
          ctx.strokeStyle = `hsl(${t * 20}, 100%, 50%)`; 
          ctx.lineWidth = 3;
          ctx.strokeRect(gs.player.x - t*2, gs.player.y - t*2, t*4, t*4);
          if (t > 10) ctx.strokeRect(gs.player.x - (t-10)*3, gs.player.y - (t-10)*3, (t-10)*6, (t-10)*6);
          if (t > 20) ctx.strokeRect(gs.player.x - (t-20)*4, gs.player.y - (t-20)*4, (t-20)*8, (t-20)*8);
        } else {
          if (Math.floor(Date.now() / 150) % 2 === 0) drawSprite(SPRITES.player, gs.player.x, gs.player.y, 3);
        }
      } else if (gs.status === 'playing') {
        drawSprite(SPRITES.player, gs.player.x, gs.player.y, 3);
      }

      ctx.fillStyle = '#fff'; ctx.font = '24px "VT323", monospace'; ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${formatScore(gs.score)}`, 10, 22);
      ctx.textAlign = 'center'; ctx.fillText(`WAVE: ${gs.wave}`, NATIVE_W/2, 22);
      ctx.textAlign = 'right'; ctx.fillText(`LIVES: ${gs.lives}`, NATIVE_W - 10, 22);

      if (gs.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
        ctx.fillStyle = '#f00'; ctx.textAlign = 'center'; ctx.font = '60px "VT323", monospace';
        ctx.fillText("GAME OVER", NATIVE_W/2, NATIVE_H/2 - 10);
        ctx.fillStyle = '#fff'; ctx.font = '24px "VT323", monospace';
        ctx.fillText("PRESS ENTER TO RESTART", NATIVE_W/2, NATIVE_H/2 + 40);
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
      <canvas ref={canvasRef} width={NATIVE_W} height={NATIVE_H} style={{ imageRendering: 'pixelated' }} className="w-full h-full object-contain bg-black cursor-none" />
    </div>
  );
};

// --- ASTEROIDS GAME COMPONENT ---
const AsteroidsGame = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);

  const state = useRef({
    status: 'start',
    score: 0,
    highScore: 0,
    lives: 3,
    wave: 1,
    player: { x: 400, y: 300, vx: 0, vy: 0, angle: -Math.PI / 2, radius: 10, cooldown: 0, invuln: 0 },
    bullets: [],
    asteroids: [],
    particles: [],
    heartbeatDelay: 60,
    heartbeatTimer: 60,
    beatPhase: false,
    keys: {}
  });

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const playAudio = (type, size = 3) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      if (type === 'shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.15);
      } else if (type === 'thrust') {
        let osc = audioCtx.createOscillator(); osc.type = 'triangle';
        osc.frequency.setValueAtTime(50, t);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.1);
      } else if (type === 'bang') {
        let len = size === 3 ? 0.5 : size === 2 ? 0.3 : 0.15;
        let buf = audioCtx.createBuffer(1, audioCtx.sampleRate * len, audioCtx.sampleRate);
        let data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        let src = audioCtx.createBufferSource(); src.buffer = buf;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; 
        filter.frequency.value = size === 3 ? 400 : size === 2 ? 800 : 1200;
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + len);
        src.connect(filter).connect(gain).connect(audioCtx.destination); src.start(t);
      } else if (type === 'beat') {
        let osc = audioCtx.createOscillator(); osc.type = 'sine';
        osc.frequency.setValueAtTime(size ? 60 : 50, t); // size is bool for high/low beat
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.15);
      }
    };

    const createAsteroid = (x, y, size) => {
      const radii = size === 3 ? 40 : size === 2 ? 20 : 10;
      const points = [];
      const numPoints = 8 + Math.floor(Math.random() * 4);
      for(let i = 0; i < numPoints; i++) {
        points.push(radii * (0.7 + Math.random() * 0.5));
      }
      return { 
        x, y, 
        vx: (Math.random() - 0.5) * 3 / size, 
        vy: (Math.random() - 0.5) * 3 / size, 
        size, points, radius: radii, 
        rot: Math.random() * Math.PI * 2, 
        rotSpeed: (Math.random() - 0.5) * 0.05 
      };
    };

    const spawnWave = (waveNum) => {
      let asts = [];
      let count = 4 + waveNum;
      for (let i = 0; i < count; i++) {
        let ax, ay;
        // spawn away from center
        do {
          ax = Math.random() * 800;
          ay = Math.random() * 600;
        } while (Math.hypot(ax - 400, ay - 300) < 150);
        asts.push(createAsteroid(ax, ay, 3));
      }
      return asts;
    };

    const wrap = (obj) => {
      if (obj.x < 0) obj.x += 800;
      if (obj.x > 800) obj.x -= 800;
      if (obj.y < 0) obj.y += 600;
      if (obj.y > 600) obj.y -= 600;
    };

    const formatScore = (s) => String(s).padStart(6, '0');

    const update = () => {
      let gs = state.current;
      let keys = gs.keys;

      if (keys['m'] || keys['M']) {
        onMenu(); return;
      }

      if (gs.status === 'start' && keys['Enter']) {
        gs.status = 'playing';
        gs.score = 0; gs.lives = 3; gs.wave = 1;
        gs.asteroids = spawnWave(gs.wave);
        gs.player = { x: 400, y: 300, vx: 0, vy: 0, angle: -Math.PI / 2, radius: 10, cooldown: 0, invuln: 120 };
        gs.bullets = []; gs.particles = [];
        gs.heartbeatDelay = 60;
      }

      if (gs.status === 'gameover' && keys['Enter']) {
        gs.status = 'playing';
        gs.score = 0; gs.lives = 3; gs.wave = 1;
        gs.asteroids = spawnWave(gs.wave);
        gs.player = { x: 400, y: 300, vx: 0, vy: 0, angle: -Math.PI / 2, radius: 10, cooldown: 0, invuln: 120 };
        gs.bullets = []; gs.particles = [];
        gs.heartbeatDelay = 60;
      }

      if (gs.status === 'levelcleared') {
        gs.wave++;
        gs.asteroids = spawnWave(gs.wave);
        gs.player.x = 400; gs.player.y = 300; gs.player.vx = 0; gs.player.vy = 0; gs.player.invuln = 120;
        gs.bullets = []; gs.particles = [];
        gs.status = 'playing';
        gs.heartbeatDelay = 60;
      }

      if (gs.status !== 'playing') return;

      // Heartbeat
      gs.heartbeatTimer--;
      if (gs.heartbeatTimer <= 0) {
        playAudio('beat', gs.beatPhase);
        gs.beatPhase = !gs.beatPhase;
        gs.heartbeatDelay = Math.max(15, gs.heartbeatDelay - 0.5);
        gs.heartbeatTimer = gs.heartbeatDelay;
      }

      // Player mechanics
      let p = gs.player;
      if (p.invuln > 0) p.invuln--;
      if (p.cooldown > 0) p.cooldown--;

      if (p.invuln % 10 < 5) { // Only apply physics if not "dead" (invuln is positive but > 150 means dead)
        if (keys['ArrowLeft'] || keys['a']) p.angle -= 0.1;
        if (keys['ArrowRight'] || keys['d']) p.angle += 0.1;
        
        if (keys['ArrowUp'] || keys['w']) {
          p.vx += Math.cos(p.angle) * 0.15;
          p.vy += Math.sin(p.angle) * 0.15;
          if (Math.random() < 0.5) playAudio('thrust');
          // Thrust particle
          gs.particles.push({
            x: p.x - Math.cos(p.angle) * 10, y: p.y - Math.sin(p.angle) * 10,
            vx: -Math.cos(p.angle) * 2 + (Math.random() - 0.5), vy: -Math.sin(p.angle) * 2 + (Math.random() - 0.5),
            life: 15
          });
        }
        
        // Speed cap
        let speed = Math.hypot(p.vx, p.vy);
        if (speed > 8) {
          p.vx = (p.vx / speed) * 8;
          p.vy = (p.vy / speed) * 8;
        }

        // Slight drag
        p.vx *= 0.995; p.vy *= 0.995;

        p.x += p.vx; p.y += p.vy;
        wrap(p);

        // Shoot
        if (keys[' '] && p.cooldown <= 0) {
          gs.bullets.push({
            x: p.x + Math.cos(p.angle) * 10, y: p.y + Math.sin(p.angle) * 10,
            vx: Math.cos(p.angle) * 12, vy: Math.sin(p.angle) * 12,
            life: 45
          });
          p.cooldown = 12;
          playAudio('shoot');
        }

        // Hyperspace
        if ((keys['Shift'] || keys['ArrowDown'] || keys['s']) && p.cooldown <= 0) {
          p.x = Math.random() * 800; p.y = Math.random() * 600;
          p.vx = 0; p.vy = 0;
          p.cooldown = 60; // long cooldown for hyperspace
          if (Math.random() < 0.1) { // 10% chance to die
             p.invuln = 100; p.lives--; playAudio('bang', 3);
          }
        }
      }

      // Update Bullets
      for (let i = gs.bullets.length - 1; i >= 0; i--) {
        let b = gs.bullets[i];
        b.x += b.vx; b.y += b.vy;
        b.life--;
        wrap(b);
        if (b.life <= 0) gs.bullets.splice(i, 1);
      }

      // Update Particles
      for (let i = gs.particles.length - 1; i >= 0; i--) {
        let pt = gs.particles[i];
        pt.x += pt.vx; pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) gs.particles.splice(i, 1);
      }

      // Update Asteroids & Collisions
      for (let i = gs.asteroids.length - 1; i >= 0; i--) {
        let a = gs.asteroids[i];
        a.x += a.vx; a.y += a.vy;
        a.rot += a.rotSpeed;
        wrap(a);

        // Player collision
        if (p.invuln <= 0 && Math.hypot(p.x - a.x, p.y - a.y) < a.radius + p.radius) {
          gs.lives--;
          playAudio('bang', 3);
          for (let k = 0; k < 30; k++) {
            gs.particles.push({
              x: p.x, y: p.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 40
            });
          }
          if (gs.lives <= 0) {
            gs.status = 'gameover';
          } else {
            p.x = 400; p.y = 300; p.vx = 0; p.vy = 0; p.invuln = 150;
          }
        }

        // Bullet collision
        let hit = false;
        for (let j = gs.bullets.length - 1; j >= 0; j--) {
          let b = gs.bullets[j];
          if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius) {
            hit = true;
            gs.bullets.splice(j, 1);
            break;
          }
        }

        if (hit) {
          playAudio('bang', a.size);
          gs.score += a.size === 3 ? 20 : a.size === 2 ? 50 : 100;
          if (gs.score > gs.highScore) gs.highScore = gs.score;
          
          for (let k = 0; k < 10 * a.size; k++) {
            gs.particles.push({
              x: a.x, y: a.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 25
            });
          }

          if (a.size > 1) {
            gs.asteroids.push(createAsteroid(a.x, a.y, a.size - 1));
            gs.asteroids.push(createAsteroid(a.x, a.y, a.size - 1));
          }
          gs.asteroids.splice(i, 1);
        }
      }

      if (gs.asteroids.length === 0 && gs.status === 'playing') {
        gs.status = 'levelcleared';
      }
    };

    const draw = () => {
      let gs = state.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Very dark for vector look
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;

      if (gs.status === 'start') {
        drawCRTText(ctx, "BASS ASTEROIDS", 400, 250, '#f0f', '60px "VT323", monospace');
        drawCRTText(ctx, "VECTOR COMBAT SIM", 400, 300, '#fff', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO START", 400, 380, '#fff', '24px "VT323", monospace');
        drawCRTText(ctx, "PRESS M FOR MENU", 400, 420, '#fff', '20px "VT323", monospace');
        drawCRTText(ctx, "WASD: Move | SPACE: Fire | SHIFT: Hyper", 400, 470, '#fff', '20px "VT323", monospace');
        return;
      }

      // Draw Player
      let p = gs.player;
      if (p.invuln % 20 < 10 && gs.status !== 'gameover') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-8, 8);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, -8);
        ctx.closePath();
        ctx.stroke();
        
        // Thrust flame
        if ((gs.keys['ArrowUp'] || gs.keys['w']) && Math.random() > 0.3) {
          ctx.beginPath();
          ctx.moveTo(-4, 0);
          ctx.lineTo(-14, 0);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Asteroids
      gs.asteroids.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.rot);
        ctx.beginPath();
        a.points.forEach((pt, i) => {
          let ang = (i / a.points.length) * Math.PI * 2;
          if (i === 0) ctx.moveTo(Math.cos(ang) * pt, Math.sin(ang) * pt);
          else ctx.lineTo(Math.cos(ang) * pt, Math.sin(ang) * pt);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      });

      // Draw Bullets
      ctx.fillStyle = '#fff';
      gs.bullets.forEach(b => {
        ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
      });

      // Draw Particles
      gs.particles.forEach(pt => {
        ctx.globalAlpha = pt.life / 30;
        ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
      });
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0; // Turn off glow for HUD

      drawCRTText(ctx, `SCORE: ${formatScore(gs.score)}`, 40, 45, '#fff', '24px "VT323", monospace', 'left');
      drawCRTText(ctx, `HI-SCORE: ${formatScore(gs.highScore)}`, 400, 45, '#fff', '24px "VT323", monospace');
      drawCRTText(ctx, `LIVES: ${gs.lives}`, 760, 45, '#fff', '24px "VT323", monospace', 'right');

      if (gs.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,800,600);
        drawCRTText(ctx, "GAME OVER", 400, 280, '#f00', '80px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO RESTART", 400, 350, '#fff', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS M FOR MENU", 400, 400, '#fff', '24px "VT323", monospace');
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent">
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-fill bg-transparent cursor-none" />
    </div>
  );
};


// --- BASS COMMANDO GAME COMPONENT ---
const CommandoGame = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);
  
  const state = useRef({
    status: 'start', 
    introTimer: 0,
    score: 0,
    highScore: 0,
    wave: 1,
    cities: [100, 220, 340, 460, 580, 700].map(x => ({ x, y: 550, alive: true })),
    crosshair: { x: 400, y: 300, speed: 8 },
    incoming: [],
    outgoing: [],
    explosions: [],
    lastShot: 0
  });

  const keys = useRef({});

  useEffect(() => {
    const handleKeyDown = e => { keys.current[e.key] = true; };
    const handleKeyUp = e => { keys.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;
      if (type === 'launch') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t0); osc.frequency.exponentialRampToValueAtTime(100, t0+0.3);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t0); gain.gain.exponentialRampToValueAtTime(0.01, t0+0.3);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t0); osc.stop(t0+0.3);
      } else if (type === 'boom') {
        let bufSize = audioCtx.sampleRate * 0.4;
        let buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        let data = buf.getChannelData(0);
        for(let i=0; i<bufSize; i++) data[i] = Math.random()*2-1;
        let noise = audioCtx.createBufferSource(); noise.buffer = buf;
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, t0); gain.gain.exponentialRampToValueAtTime(0.01, t0+0.4);
        noise.connect(gain).connect(audioCtx.destination); noise.start(t0);
      } else if (type === 'siren') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, t0); 
        osc.frequency.linearRampToValueAtTime(1600, t0+1.0);
        osc.frequency.linearRampToValueAtTime(1200, t0+2.0);
        
        let lfo = audioCtx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 5;
        let lfoGain = audioCtx.createGain(); lfoGain.gain.value = 20;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start(t0); lfo.stop(t0+2.0);

        let gain = audioCtx.createGain(); 
        gain.gain.setValueAtTime(0, t0); 
        gain.gain.linearRampToValueAtTime(0.15, t0+0.2);
        gain.gain.linearRampToValueAtTime(0.15, t0+1.8);
        gain.gain.linearRampToValueAtTime(0, t0+2.0);

        osc.connect(gain).connect(audioCtx.destination); 
        osc.start(t0); osc.stop(t0+2.0);
      }
    };

    const handleMouseMove = (e) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      state.current.crosshair.x = Math.max(0, Math.min(800, (e.clientX - rect.left) * scaleX));
      state.current.crosshair.y = Math.max(0, Math.min(520, (e.clientY - rect.top) * scaleY));
    };

    const handleMouseDown = (e) => {
      let gs = state.current;
      if (gs.status === 'playing' && Date.now() - gs.lastShot > 300) {
        gs.outgoing.push({
          sx: 400, sy: 580, tx: gs.crosshair.x, ty: gs.crosshair.y,
          x: 400, y: 580, progress: 0, speed: 0.05
        });
        gs.lastShot = Date.now();
        playAudio('launch');
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);

    const spawnWave = (wave) => {
      let count = 5 + wave * 3;
      let inc = [];
      for(let i=0; i<count; i++) {
        let sx = Math.random() * 800;
        let tx = Math.random() * 800;
        let aliveCities = state.current.cities.filter(c => c.alive);
        if (aliveCities.length > 0 && Math.random() > 0.3) {
          tx = aliveCities[Math.floor(Math.random() * aliveCities.length)].x + 20;
        }
        inc.push({
          sx, sy: 0, tx, ty: 550, x: sx, y: 0,
          speed: 0.002 + (Math.random() * 0.002) + (wave * 0.0005),
          progress: -(Math.random() * 2) 
        });
      }
      return inc;
    };

    const formatScore = (s) => String(s).padStart(6, '0');

    const draw = () => {
      let gs = state.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (gs.status === 'start') {
        drawCRTText(ctx, "BASS COMMANDO", 400, 250, '#0ff', '60px "VT323", monospace');
        drawCRTText(ctx, "DEFEND THE SECTOR", 400, 300, '#fff', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO START", 400, 380, '#fff', '24px "VT323", monospace');
        drawCRTText(ctx, "PRESS M FOR MENU", 400, 420, '#fff', '20px "VT323", monospace');
        drawCRTText(ctx, "MOUSE: Aim  |  CLICK: Shoot", 400, 470, '#fff', '20px "VT323", monospace');
        return;
      }

      if (gs.status === 'wave_intro') {
        if (Math.floor(Date.now() / 200) % 2 === 0) {
          drawCRTText(ctx, "WARNING", 400, 250, '#f00', '80px "VT323", monospace');
          drawCRTText(ctx, "INCOMING NUCLEAR STRIKE", 400, 320, '#f00', '40px "VT323", monospace');
        }
      }

      gs.cities.forEach(c => {
        if (c.alive) {
          ctx.fillStyle = '#0ff'; ctx.shadowColor = '#0ff'; ctx.shadowBlur = 0;
          ctx.fillRect(c.x, c.y, 40, 20);
          ctx.fillRect(c.x + 10, c.y - 10, 20, 10);
        } else {
          ctx.fillStyle = '#333'; ctx.shadowBlur = 0;
          ctx.fillRect(c.x, c.y + 10, 40, 10);
        }
      });
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#0f0'; ctx.lineWidth = 2; ctx.shadowColor = '#0f0'; ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(gs.crosshair.x - 10, gs.crosshair.y); ctx.lineTo(gs.crosshair.x + 10, gs.crosshair.y);
      ctx.moveTo(gs.crosshair.x, gs.crosshair.y - 10); ctx.lineTo(gs.crosshair.x, gs.crosshair.y + 10);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#f0f'; ctx.lineWidth = 2; ctx.shadowColor = '#f0f'; ctx.shadowBlur = 0;
      gs.incoming.forEach(m => {
        if (m.progress > 0) {
          ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(m.x, m.y); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
        }
      });
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 0;
      gs.outgoing.forEach(m => {
        ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(m.x, m.y); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
      });
      ctx.shadowBlur = 0;

      gs.explosions.forEach(exp => {
        ctx.fillStyle = `rgba(255, 255, 255, ${exp.life / 60})`;
        ctx.shadowColor = '#0ff'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(exp.x, exp.y, exp.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.shadowBlur = 0;

      drawCRTText(ctx, `SCORE: ${formatScore(gs.score)}`, 20, 30, '#fff', '24px "VT323", monospace', 'left');
      drawCRTText(ctx, `WAVE: ${gs.wave}`, 400, 30, '#fff', '24px "VT323", monospace');
      
      if (gs.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,800,600);
        drawCRTText(ctx, "SYSTEM FAILURE", 400, 280, '#f00', '80px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO RESTART", 400, 350, '#fff', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS M FOR MENU", 400, 400, '#fff', '24px "VT323", monospace');
      }

      if (gs.status === 'levelcleared') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,800,600);
        drawCRTText(ctx, `SECTOR ${gs.wave} SECURED`, 400, 280, '#0ff', '60px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO CONTINUE", 400, 350, '#fff', '30px "VT323", monospace');
      }
    };

    const update = () => {
      let gs = state.current;

      if (keys.current['m'] || keys.current['M']) {
        onMenu();
        return;
      }

      if (gs.status === 'start' && keys.current['Enter']) {
        gs.status = 'wave_intro';
        gs.introTimer = 120;
        playAudio('siren');
        window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' }));
      }
      if (gs.status === 'gameover' && keys.current['Enter']) {
        gs.score = 0; gs.wave = 1;
        gs.cities.forEach(c => c.alive = true);
        gs.outgoing = []; gs.explosions = [];
        gs.status = 'wave_intro';
        gs.introTimer = 120;
        playAudio('siren');
        window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' }));
      }
      if (gs.status === 'levelcleared' && keys.current['Enter']) {
        gs.wave++;
        gs.outgoing = []; gs.explosions = [];
        gs.status = 'wave_intro';
        gs.introTimer = 120;
        playAudio('siren');
        window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' }));
      }

      if (gs.status === 'wave_intro') {
        gs.introTimer--;
        if (gs.introTimer <= 0) {
            gs.incoming = spawnWave(gs.wave);
            gs.status = 'playing';
            window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'commandoPlay' }));
        }
      }

      if (gs.status !== 'playing' && gs.status !== 'wave_intro') return;

      if (keys.current['ArrowLeft'] || keys.current['a']) gs.crosshair.x -= gs.crosshair.speed;
      if (keys.current['ArrowRight'] || keys.current['d']) gs.crosshair.x += gs.crosshair.speed;
      if (keys.current['ArrowUp'] || keys.current['w']) gs.crosshair.y -= gs.crosshair.speed;
      if (keys.current['ArrowDown'] || keys.current['s']) gs.crosshair.y += gs.crosshair.speed;
      gs.crosshair.x = Math.max(0, Math.min(800, gs.crosshair.x));
      gs.crosshair.y = Math.max(0, Math.min(520, gs.crosshair.y));

      if (keys.current[' '] && Date.now() - gs.lastShot > 300 && gs.status === 'playing') {
        gs.outgoing.push({
          sx: 400, sy: 580, tx: gs.crosshair.x, ty: gs.crosshair.y,
          x: 400, y: 580, progress: 0, speed: 0.05
        });
        gs.lastShot = Date.now();
        playAudio('launch');
      }

      for (let i = gs.outgoing.length - 1; i >= 0; i--) {
        let m = gs.outgoing[i];
        m.progress += m.speed;
        m.x = m.sx + (m.tx - m.sx) * m.progress;
        m.y = m.sy + (m.ty - m.sy) * m.progress;
        if (m.progress >= 1) {
          gs.explosions.push({ x: m.tx, y: m.ty, r: 0, maxR: 45, life: 60 });
          gs.outgoing.splice(i, 1);
          playAudio('boom');
        }
      }

      for (let i = gs.explosions.length - 1; i >= 0; i--) {
        let exp = gs.explosions[i];
        if (exp.life > 30) exp.r += (exp.maxR - exp.r) * 0.1;
        exp.life--;
        if (exp.life <= 0) gs.explosions.splice(i, 1);
      }

      for (let i = gs.incoming.length - 1; i >= 0; i--) {
        let m = gs.incoming[i];
        m.progress += m.speed;
        if (m.progress > 0) {
          m.x = m.sx + (m.tx - m.sx) * m.progress;
          m.y = m.sy + (m.ty - m.sy) * m.progress;
          
          let destroyed = false;
          for (let j = 0; j < gs.explosions.length; j++) {
            let exp = gs.explosions[j];
            let dist = Math.hypot(m.x - exp.x, m.y - exp.y);
            if (dist < exp.r) {
              destroyed = true; gs.score += 100;
              gs.explosions.push({ x: m.x, y: m.y, r: 0, maxR: 20, life: 30 });
              playAudio('boom');
              break;
            }
          }

          if (destroyed) { gs.incoming.splice(i, 1); continue; }

          if (m.progress >= 1) {
            gs.explosions.push({ x: m.x, y: m.y, r: 0, maxR: 30, life: 40 });
            playAudio('boom');
            gs.cities.forEach(c => {
              if (c.alive && Math.abs(c.x + 20 - m.x) < 30) c.alive = false;
            });
            gs.incoming.splice(i, 1);
          }
        }
      }

      let aliveCities = gs.cities.filter(c => c.alive).length;
      if (aliveCities === 0 && gs.status !== 'gameover') {
        gs.status = 'gameover';
        window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'commandoOver' }));
      } else if (gs.status === 'playing' && gs.incoming.length === 0 && gs.status !== 'levelcleared') {
        gs.status = 'levelcleared';
        gs.score += aliveCities * 500;
        window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' })); 
      }
    };

    const loop = () => {
      update(); draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
    };
  }, [audioCtx, onMenu]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent">
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-fill bg-transparent cursor-none" />
    </div>
  );
};
// --- DEFENDER GAME COMPONENT ---
const DefenderGame = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);

  // Original Williams Arcade Resolution
  const NATIVE_W = 320;
  const NATIVE_H = 256;
  const WORLD_WIDTH = 3200; 
  
  const state = useRef({
    status: 'start',
    score: 0,
    highScore: 0,
    lives: 3,
    smartBombs: 3,
    wave: 1,
    player: { x: 160, y: 120, vx: 0, vy: 0, facing: 1, cooldown: 0, invuln: 0 },
    terrain: [],
    bullets: [],
    enemyBullets: [],
    enemies: [],
    humans: [],
    particles: [],
    stars: [],
    smartBombFlash: 0,
    keys: {}
  });

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // --- AUTHENTIC AUDIO SYNTHESIS ---
    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      if (type === 'shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(3000, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.2);
      } else if (type === 'thrust') {
        if (Math.random() > 0.2) return; 
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(40 + Math.random()*20, t); osc.frequency.exponentialRampToValueAtTime(10, t + 0.1);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.linearRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.1);
      } else if (type === 'boom') {
        let buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
        let data = buf.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        let src = audioCtx.createBufferSource(); src.buffer = buf;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400;
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        src.connect(filter).connect(gain).connect(audioCtx.destination); src.start(t);
      } else if (type === 'smartbomb') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(100, t); osc.frequency.linearRampToValueAtTime(2000, t + 0.5);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.5);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.5);
      } else if (type === 'abduct') {
        let osc = audioCtx.createOscillator(); osc.type = 'sine';
        osc.frequency.setValueAtTime(500, t); osc.frequency.linearRampToValueAtTime(900, t + 0.2);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.2);
      }
    };

    const getDist = (x1, x2) => {
      let d = x2 - x1;
      if (d > WORLD_WIDTH / 2) d -= WORLD_WIDTH;
      if (d < -WORLD_WIDTH / 2) d += WORLD_WIDTH;
      return d;
    };

    const getRenderX = (targetX, camX) => {
      let dx = targetX - camX;
      if (dx > WORLD_WIDTH / 2) dx -= WORLD_WIDTH;
      if (dx < -WORLD_WIDTH / 2) dx += WORLD_WIDTH;
      return (NATIVE_W / 2) + dx;
    };

    const formatScore = (s) => String(s).padStart(6, '0');

    // --- LEVEL GENERATOR ---
    const generateLevel = (gs) => {
      gs.terrain = [];
      let cy = 200;
      for (let i = 0; i <= WORLD_WIDTH; i += 20) {
        gs.terrain.push({ x: i, y: cy });
        cy += (Math.random() - 0.5) * 30;
        if (cy < 170) cy = 170;
        if (cy > 230) cy = 230;
      }
      gs.terrain[gs.terrain.length - 1].y = gs.terrain[0].y; 

      gs.stars = [];
      for(let i=0; i<80; i++) {
        gs.stars.push({
          x: Math.random() * WORLD_WIDTH, y: Math.random() * NATIVE_H,
          speed: 0.1 + Math.random() * 0.8,
          color: Math.random() > 0.5 ? '#fff' : (Math.random() > 0.5 ? '#0ff' : '#f0f')
        });
      }

      gs.humans = [];
      for(let i=0; i<10; i++) {
        let hx = Math.random() * WORLD_WIDTH;
        let hy = 200;
        for(let j=0; j<gs.terrain.length-1; j++) {
           if(hx >= gs.terrain[j].x && hx <= gs.terrain[j+1].x) {
              let t = (hx - gs.terrain[j].x) / 20;
              hy = gs.terrain[j].y * (1-t) + gs.terrain[j+1].y * t;
              break;
           }
        }
        gs.humans.push({ x: hx, y: hy - 4, state: 'ground', ty: hy, id: i });
      }

      gs.enemies = [];
      let landerCount = 10 + gs.wave * 2;
      for(let i=0; i<landerCount; i++) {
        gs.enemies.push({
          type: 'lander',
          x: Math.random() * WORLD_WIDTH, y: 40 + Math.random() * 80,
          vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.3, // VERY slow
          state: 'patrol', targetHuman: null, timer: Math.random() * 100
        });
      }
    };

    // --- GAME ENGINE UPDATE ---
    const update = () => {
      let gs = state.current;
      let keys = gs.keys;

      if (keys['m'] || keys['M']) { onMenu(); return; }

      if (gs.status === 'start' && keys['Enter']) {
        gs.status = 'playing'; gs.score = 0; gs.lives = 3; gs.wave = 1; gs.smartBombs = 3;
        gs.player = { x: 160, y: 120, vx: 0, vy: 0, facing: 1, cooldown: 0, invuln: 120 };
        gs.bullets = []; gs.enemyBullets = []; gs.particles = [];
        generateLevel(gs);
      }

      if (gs.status === 'gameover' && keys['Enter']) {
        gs.status = 'playing'; gs.score = 0; gs.lives = 3; gs.wave = 1; gs.smartBombs = 3;
        gs.player = { x: 160, y: 120, vx: 0, vy: 0, facing: 1, cooldown: 0, invuln: 120 };
        gs.bullets = []; gs.enemyBullets = []; gs.particles = [];
        generateLevel(gs);
      }

      if (gs.status === 'levelcleared') {
        gs.wave++;
        gs.player = { x: gs.player.x, y: 120, vx: 0, vy: 0, facing: 1, cooldown: 0, invuln: 120 };
        gs.bullets = []; gs.enemyBullets = []; gs.particles = [];
        generateLevel(gs);
        gs.status = 'playing';
      }

      if (gs.status !== 'playing') return;

      if (gs.smartBombFlash > 0) gs.smartBombFlash--;

      let p = gs.player;
      if (p.invuln > 0) p.invuln--;
      if (p.cooldown > 0) p.cooldown--;

      // --- AUTHENTIC PLAYER PHYSICS ---
      if (p.invuln % 10 < 5) {
        if (keys['ArrowUp'] || keys['w']) p.vy -= 0.15;
        if (keys['ArrowDown'] || keys['s']) p.vy += 0.15;
        
        if (keys['ArrowLeft'] || keys['a']) { p.facing = -1; p.vx -= 0.2; playAudio('thrust'); }
        if (keys['ArrowRight'] || keys['d']) { p.facing = 1; p.vx += 0.2; playAudio('thrust'); }
        
        // Rainbow Thrust Particles
        if ((keys['ArrowLeft'] || keys['a'] || keys['ArrowRight'] || keys['d'])) {
            const colors = ['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#fff'];
            gs.particles.push({
                x: p.x - (p.facing * 12), y: p.y + (Math.random() * 4 - 2),
                vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
                life: 15 + Math.random() * 15,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
        
        p.vx *= 0.96; p.vy *= 0.92; 
        p.vx = Math.max(-5, Math.min(5, p.vx));
        p.vy = Math.max(-3, Math.min(3, p.vy));

        p.x += p.vx; p.y += p.vy;

        if (p.x < 0) p.x += WORLD_WIDTH;
        if (p.x >= WORLD_WIDTH) p.x -= WORLD_WIDTH;
        if (p.y < 35) p.y = 35;   
        if (p.y > 215) p.y = 215; 

        // Authentic Massive Laser Beam
        if (keys[' '] && p.cooldown <= 0) {
          gs.bullets.push({
            x: p.x + (p.facing * 8), y: p.y, 
            w: 120, // MASSIVE beam
            vx: p.vx + (p.facing * 18), 
            life: 15, facing: p.facing 
          });
          p.cooldown = 15;
          playAudio('shoot');
        }

        // Smart Bomb
        if (keys['Shift'] && gs.smartBombs > 0 && p.cooldown <= 0) {
          gs.smartBombs--;
          playAudio('smartbomb');
          gs.smartBombFlash = 20; 
          p.cooldown = 30;
          
          for (let i = gs.enemies.length - 1; i >= 0; i--) {
            let e = gs.enemies[i];
            let dist = getDist(p.x, e.x);
            if (Math.abs(dist) < NATIVE_W) { 
              gs.score += e.type === 'mutant' ? 500 : 150;
              for(let k=0; k<15; k++) gs.particles.push({x: e.x, y: e.y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, life: 25, color: Math.random()>0.5?'#f00':'#ff0'});
              if (e.targetHuman && e.state === 'lifting') {
                 let h = gs.humans.find(h => h.id === e.targetHuman);
                 if (h) { h.state = 'falling'; }
              }
              gs.enemies.splice(i, 1);
            }
          }
        }

        // Hyperspace
        if (keys['Control'] && p.cooldown <= 0) {
          p.x = Math.random() * WORLD_WIDTH; p.y = 80 + Math.random() * 100;
          p.vx = 0; p.vy = 0; p.cooldown = 60;
          if (Math.random() < 0.15) { p.invuln = 100; gs.lives--; playAudio('boom'); }
        }
      }

      // Update Player Lasers
      for (let i = gs.bullets.length - 1; i >= 0; i--) {
        let b = gs.bullets[i];
        b.x += b.vx;
        if (b.x < 0) b.x += WORLD_WIDTH;
        if (b.x >= WORLD_WIDTH) b.x -= WORLD_WIDTH;
        b.life--;
        if (b.life <= 0) { gs.bullets.splice(i, 1); continue; }

        let hit = false;
        for (let j = gs.enemies.length - 1; j >= 0; j--) {
          let e = gs.enemies[j];
          let dist = getDist(b.x, e.x);
          
          // Collision logic matching the long beam
          let beamStart = b.facing === 1 ? 0 : -b.w;
          let beamEnd = b.facing === 1 ? b.w : 0;
          
          if (dist >= beamStart && dist <= beamEnd && Math.abs(b.y - e.y) < 10) {
            hit = true;
            gs.score += e.type === 'mutant' ? 500 : 150;
            playAudio('boom');
            for(let k=0; k<15; k++) gs.particles.push({x: e.x, y: e.y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, life: 25, color: Math.random()>0.5?'#f00':'#ff0'});
            if (e.targetHuman && e.state === 'lifting') {
                let h = gs.humans.find(h => h.id === e.targetHuman);
                if (h) { h.state = 'falling'; }
            }
            gs.enemies.splice(j, 1);
            break;
          }
        }
      }

      // Enemy Bullets
      for (let i = gs.enemyBullets.length - 1; i >= 0; i--) {
        let eb = gs.enemyBullets[i];
        eb.x += eb.vx; eb.y += eb.vy;
        if (eb.x < 0) eb.x += WORLD_WIDTH;
        if (eb.x >= WORLD_WIDTH) eb.x -= WORLD_WIDTH;
        eb.life--;
        if (eb.life <= 0) { gs.enemyBullets.splice(i, 1); continue; }

        if (p.invuln <= 0) {
           let dist = getDist(eb.x, p.x);
           if (Math.abs(dist) < 6 && Math.abs(eb.y - p.y) < 4) {
              gs.enemyBullets.splice(i, 1);
              p.invuln = 150; gs.lives--; playAudio('boom');
              for(let k=0; k<30; k++) gs.particles.push({x: p.x, y: p.y, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 30, color: '#fff'});
           }
        }
      }

      // Particles
      for (let i = gs.particles.length - 1; i >= 0; i--) {
        let pt = gs.particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.life--;
        if (pt.x < 0) pt.x += WORLD_WIDTH;
        if (pt.x >= WORLD_WIDTH) pt.x -= WORLD_WIDTH;
        if (pt.life <= 0) gs.particles.splice(i, 1);
      }

      // --- AUTHENTIC ENEMIES AI (Slowed Down) ---
      gs.enemies.forEach(e => {
        if (e.type === 'lander') {
          if (e.state === 'patrol') {
            e.x += e.vx; e.y += e.vy;
            if (e.y < 40) e.vy = Math.abs(e.vy);
            if (e.y > 180) e.vy = -Math.abs(e.vy);
            e.timer--;
            if (e.timer <= 0) {
              let groundHumans = gs.humans.filter(h => h.state === 'ground');
              if (groundHumans.length > 0) {
                let target = groundHumans[Math.floor(Math.random() * groundHumans.length)];
                e.targetHuman = target.id; e.state = 'hunting';
              }
              e.timer = 100 + Math.random() * 200;
            }
          } else if (e.state === 'hunting') {
            let h = gs.humans.find(hum => hum.id === e.targetHuman);
            if (!h || h.state !== 'ground') { e.state = 'patrol'; return; }
            let dx = getDist(e.x, h.x);
            e.x += dx * 0.02; // Very slow lock-on
            if (Math.abs(dx) < 5) e.y += 0.8; else e.y += (150 - e.y) * 0.01;
            if (Math.abs(dx) < 5 && e.y >= h.y - 6) { e.state = 'lifting'; h.state = 'abducted'; playAudio('abduct'); }
          } else if (e.state === 'lifting') {
            e.y -= 0.5; // Very slow lift
            let h = gs.humans.find(hum => hum.id === e.targetHuman);
            if (h) { h.x = e.x; h.y = e.y + 6; }
            if (e.y < 35) {
              e.type = 'mutant'; e.state = 'mutant';
              if (h) { h.state = 'dead'; } 
            }
          }
          if (e.x < 0) e.x += WORLD_WIDTH;
          if (e.x >= WORLD_WIDTH) e.x -= WORLD_WIDTH;
          
          if (Math.random() < 0.005) {
            let dx = getDist(e.x, p.x); let dy = p.y - e.y;
            if (Math.abs(dx) < 200) {
              let angle = Math.atan2(dy, dx);
              gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle)*3, vy: Math.sin(angle)*3, life: 100 });
            }
          }
        } 
        else if (e.type === 'mutant') {
          // Mutants hover around, gently tracking but mainly maintaining erratic momentum
          let dx = getDist(e.x, p.x); let dy = p.y - e.y;
          let angle = Math.atan2(dy, dx);
          
          e.vx += Math.cos(angle) * 0.02; // Very weak steering
          e.vy += Math.sin(angle) * 0.02;
          
          let spd = Math.hypot(e.vx, e.vy);
          if (spd > 2.0) { e.vx = (e.vx/spd)*2.0; e.vy = (e.vy/spd)*2.0; } // Slower max speed
          
          e.x += e.vx; e.y += e.vy + (Math.sin(Date.now() * 0.01) * 0.5); // Add jitter
          
          if (e.x < 0) e.x += WORLD_WIDTH;
          if (e.x >= WORLD_WIDTH) e.x -= WORLD_WIDTH;

          if (Math.random() < 0.01 && Math.abs(dx) < 150) {
             gs.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(angle)*3.5, vy: Math.sin(angle)*3.5, life: 100 });
          }
        }

        if (p.invuln <= 0) {
          let pDist = getDist(e.x, p.x);
          if (Math.abs(pDist) < 10 && Math.abs(e.y - p.y) < 8) {
             p.invuln = 150; gs.lives--; playAudio('boom');
             for(let k=0; k<30; k++) gs.particles.push({x: p.x, y: p.y, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 30, color: '#fff'});
          }
        }
      });

      // --- HUMANS ---
      gs.humans.forEach(h => {
        if (h.state === 'falling') {
          h.y += 0.8;
          let pDist = getDist(h.x, p.x);
          if (Math.abs(pDist) < 12 && Math.abs(h.y - p.y) < 8) {
            h.state = 'caught'; gs.score += 500; playAudio('abduct');
          }
          if (h.y >= h.ty) {
             h.state = 'dead';
             for(let k=0; k<10; k++) gs.particles.push({x: h.x, y: h.y, vx: (Math.random()-0.5)*3, vy: -(Math.random()*3), life: 20, color: '#0ff'});
          }
        } else if (h.state === 'caught') {
          h.x = p.x; h.y = p.y + 6;
          if (p.y > 180) { 
            h.state = 'ground'; h.y = h.ty; gs.score += 500; playAudio('abduct');
          }
        }
      });

      gs.humans = gs.humans.filter(h => h.state !== 'dead');

      if (gs.enemies.length === 0 && gs.status === 'playing') gs.status = 'levelcleared';
      if (gs.lives <= 0) gs.status = 'gameover';
    };

    // --- RENDER ENGINE ---
    const draw = () => {
      let gs = state.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (gs.status === 'start') {
        ctx.fillStyle = '#f00'; ctx.font = '20px "VT323", monospace'; ctx.textAlign = 'center'; ctx.fillText("BASS DEFENDER", 160, 80);
        ctx.fillStyle = '#fff'; ctx.font = '12px "VT323", monospace'; ctx.fillText("SAVE THE HUMANOIDS", 160, 110);
        ctx.fillText("PRESS ENTER TO START", 160, 140);
        ctx.fillText("ARROWS: Move | SPACE: Fire | SHIFT: Smart Bomb", 160, 170);
        return;
      }

      if (gs.smartBombFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${gs.smartBombFlash / 20})`;
        ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
      }

      let p = gs.player;
      let camX = p.x; 

      // Background Stars
      gs.stars.forEach(s => {
         let rx = Math.floor(getRenderX(s.x, camX * (1 - s.speed))); 
         if (rx >= 0 && rx <= NATIVE_W) {
            ctx.fillStyle = s.color;
            ctx.fillRect(rx, Math.floor(s.y), 1, 1);
         }
      });

      // Authentic Defender Terrain
      ctx.strokeStyle = '#a52'; ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;
      for (let i = -1; i <= gs.terrain.length; i++) {
         let idx = (i + gs.terrain.length) % gs.terrain.length;
         let pt = gs.terrain[idx];
         let rx = Math.floor(getRenderX(pt.x, camX));
         if (i === -1) rx = Math.floor(getRenderX(gs.terrain[gs.terrain.length-1].x, camX) - WORLD_WIDTH); 
         if (rx >= -20 && rx <= NATIVE_W + 20) {
           if (!started) { ctx.moveTo(rx, Math.floor(pt.y)); started = true; }
           else ctx.lineTo(rx, Math.floor(pt.y));
         } else {
           started = false;
         }
      }
      ctx.stroke();

      // Humans (Cyan Pixel Art)
      gs.humans.forEach(h => {
        let rx = Math.floor(getRenderX(h.x, camX));
        let ry = Math.floor(h.y);
        if (rx >= -5 && rx <= NATIVE_W + 5) {
          ctx.fillStyle = '#0ff';
          ctx.fillRect(rx-1, ry-2, 2, 2); // Head
          ctx.fillRect(rx-1, ry, 2, 3); // Body
          ctx.fillRect(rx-2, ry+1, 4, 1); // Arms
          ctx.fillRect(rx-2, ry+3, 1, 2); // Left leg
          ctx.fillRect(rx+1, ry+3, 1, 2); // Right leg
        }
      });

      // Enemies (Pixel Perfect Replicas)
      gs.enemies.forEach(e => {
        let rx = Math.floor(getRenderX(e.x, camX));
        let ry = Math.floor(e.y);
        if (rx >= -10 && rx <= NATIVE_W + 10) {
          if (e.type === 'lander') {
             ctx.fillStyle = '#0f0';
             ctx.fillRect(rx - 3, ry - 3, 6, 3); // dome
             ctx.fillRect(rx - 5, ry, 10, 2); // rim
             ctx.fillRect(rx - 3, ry + 2, 2, 3); // left leg
             ctx.fillRect(rx + 1, ry + 2, 2, 3); // right leg
             if (Math.floor(Date.now() / 100) % 2 === 0) { ctx.fillStyle = '#f00'; ctx.fillRect(rx - 1, ry - 2, 2, 2); }
          } else if (e.type === 'mutant') {
             ctx.fillStyle = '#f0f';
             let frame = Math.floor(Date.now() / 100) % 2;
             if (frame === 0) {
                 ctx.fillRect(rx - 3, ry - 3, 6, 6);
                 ctx.fillStyle = '#000'; ctx.fillRect(rx - 1, ry - 1, 2, 2); 
             } else {
                 ctx.fillRect(rx - 4, ry - 1, 8, 2);
                 ctx.fillRect(rx - 1, ry - 4, 2, 8);
             }
          }
        }
      });

      // Massive Arcade Lasers (Flickering Solid Beam)
      gs.bullets.forEach(b => {
         let rx = Math.floor(getRenderX(b.x, camX));
         if (rx >= -150 && rx <= NATIVE_W + 150) {
             let startX = rx + (b.facing === 1 ? -b.w : 0);
             ctx.fillStyle = Math.random() > 0.5 ? '#ff0' : '#fff'; // Flash logic
             ctx.fillRect(startX, Math.floor(b.y), b.w, 1);
             ctx.fillStyle = '#fff';
             ctx.fillRect(rx + (b.facing === 1 ? -5 : -b.w), Math.floor(b.y)-1, 5, 3); // Bright tip
         }
      });

      ctx.fillStyle = '#fff';
      gs.enemyBullets.forEach(eb => {
         let rx = Math.floor(getRenderX(eb.x, camX));
         if (rx >= -2 && rx <= NATIVE_W + 2) ctx.fillRect(rx - 1, Math.floor(eb.y) - 1, 2, 2);
      });

      // Player Ship (Gray Body, Red Engine, Blue Cockpit)
      if (p.invuln % 20 < 10 && gs.status !== 'gameover') {
         ctx.save();
         ctx.translate(NATIVE_W / 2, Math.floor(p.y)); 
         ctx.scale(p.facing, 1);
         
         ctx.fillStyle = '#aaa'; ctx.fillRect(-6, -2, 10, 4); // Grey body
         ctx.fillStyle = '#0f0'; ctx.fillRect(4, -1, 3, 2);   // Green nose
         ctx.fillStyle = '#00f'; ctx.fillRect(-3, -4, 5, 2);  // Blue top
         ctx.fillStyle = '#f00'; ctx.fillRect(-8, -2, 2, 4);  // Red back engine
         ctx.restore();
      }

      // Rainbow Engine / Explosion Particles
      gs.particles.forEach(pt => {
         let rx = Math.floor(getRenderX(pt.x, camX));
         if (rx >= -5 && rx <= NATIVE_W + 5) {
            ctx.fillStyle = pt.color;
            ctx.fillRect(rx, Math.floor(pt.y), 2, 1); // Long pixel chunks
         }
      });

      // --- AUTHENTIC TOP HUD ---
      ctx.fillStyle = '#0f0'; ctx.font = '12px "VT323", monospace'; ctx.textAlign = 'left';
      ctx.fillText(gs.score, 5, 12);
      
      for(let i=0; i<gs.smartBombs; i++) {
        ctx.fillStyle = '#888'; ctx.fillRect(45, 4 + i*5, 5, 3);
        ctx.fillStyle = '#f00'; ctx.fillRect(47, 3 + i*5, 1, 5);
      }

      ctx.fillStyle = '#0f0'; ctx.textAlign = 'right';
      ctx.fillText("LIVES: " + gs.lives, NATIVE_W - 5, 12);

      // --- CENTRAL MINIMAP (Scanner) ---
      const mapX = 80; const mapY = 2; const mapW = 160; const mapH = 30;
      ctx.strokeStyle = '#00a'; ctx.lineWidth = 1;
      ctx.strokeRect(mapX, mapY, mapW, mapH);
      ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(mapX, 32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mapX+mapW, 32); ctx.lineTo(NATIVE_W, 32); ctx.stroke();
      
      const getMapX = (worldX) => mapX + ((worldX / WORLD_WIDTH) * mapW);
      
      ctx.strokeStyle = '#a52';
      ctx.beginPath();
      for (let i = 0; i < gs.terrain.length; i++) {
         let pt = gs.terrain[i];
         let mpx = Math.floor(getMapX(pt.x));
         let mpy = Math.floor(mapY + 5 + ((pt.y - 150) / 120) * (mapH - 10));
         if (i === 0) ctx.moveTo(mpx, mpy); else ctx.lineTo(mpx, mpy);
      }
      ctx.stroke();

      let vpx = getMapX(camX) - (NATIVE_W/2 / WORLD_WIDTH) * mapW;
      if (vpx < mapX) vpx += mapW;
      ctx.strokeStyle = '#fff';
      let vpWidth = (NATIVE_W/WORLD_WIDTH)*mapW;
      ctx.strokeRect(Math.floor(vpx), mapY, Math.floor(vpWidth), mapH);
      if (vpx + vpWidth > mapX + mapW) { 
         ctx.strokeRect(mapX, mapY, Math.floor((vpx + vpWidth) - (mapX + mapW)), mapH);
      }

      ctx.fillStyle = '#0f0'; // Enemies
      gs.enemies.forEach(e => ctx.fillRect(Math.floor(getMapX(e.x)), Math.floor(mapY + 5 + ((e.y-40)/200)*(mapH-10)), 1, 1));
      ctx.fillStyle = '#0ff'; // Humans
      gs.humans.forEach(h => ctx.fillRect(Math.floor(getMapX(h.x)), Math.floor(mapY + 5 + ((h.y-40)/200)*(mapH-10)), 1, 1));
      if (p.invuln % 20 < 10 && gs.status !== 'gameover') {
         ctx.fillStyle = '#fff'; // Player
         ctx.fillRect(Math.floor(getMapX(p.x)), Math.floor(mapY + 5 + ((p.y-40)/200)*(mapH-10)), 1, 1);
      }

      if (gs.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
        ctx.fillStyle = '#f00'; ctx.textAlign = 'center'; ctx.font = '24px "VT323", monospace';
        ctx.fillText("GAME OVER", NATIVE_W/2, NATIVE_H/2 - 10);
        ctx.fillStyle = '#fff'; ctx.font = '12px "VT323", monospace';
        ctx.fillText("PRESS ENTER TO RESTART", NATIVE_W/2, NATIVE_H/2 + 20);
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent">
      <canvas 
        ref={canvasRef} 
        width={320} 
        height={256} 
        style={{ imageRendering: 'pixelated' }} 
        className="w-full h-full object-fill bg-transparent cursor-none" 
      />
    </div>
  );
};

// --- BASS SNAKE GAME COMPONENT ---
const SnakeGame = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);
  
  const state = useRef({
    status: 'start', 
    score: 0,
    highScore: 0,
    snake: [{x: 18, y: 12}, {x: 18, y: 13}, {x: 18, y: 14}],
    dir: {x: 0, y: -1},
    nextDir: {x: 0, y: -1},
    food: {x: 10, y: 10},
    tickCounter: 0,
    speed: 8 
  });

  const keys = useRef({});

  useEffect(() => {
    const handleKeyDown = e => { 
        keys.current[e.key] = true; 
        let sd = state.current.dir;
        let snd = state.current.nextDir;
        if ((e.key === 'ArrowUp' || e.key === 'w') && sd.y === 0) snd = {x: 0, y: -1};
        if ((e.key === 'ArrowDown' || e.key === 's') && sd.y === 0) snd = {x: 0, y: 1};
        if ((e.key === 'ArrowLeft' || e.key === 'a') && sd.x === 0) snd = {x: -1, y: 0};
        if ((e.key === 'ArrowRight' || e.key === 'd') && sd.x === 0) snd = {x: 1, y: 0};
        state.current.nextDir = snd;
    };
    const handleKeyUp = e => { keys.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const spawnFood = (gs) => {
        let newFood;
        while(true) {
            newFood = { x: Math.floor(Math.random() * 36), y: Math.floor(Math.random() * 24) };
            let conflict = gs.snake.some(s => s.x === newFood.x && s.y === newFood.y);
            if (!conflict) break;
        }
        gs.food = newFood;
    };

    const formatScore = (s) => String(s).padStart(6, '0');

    const draw = () => {
      let gs = state.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (gs.status === 'start') {
        drawCRTText(ctx, "BASS SNAKE", 400, 250, '#0f0', '60px "VT323", monospace');
        drawCRTText(ctx, "NOKIA CLASSIC MODULE", 400, 300, '#fff', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO START", 400, 380, '#fff', '24px "VT323", monospace');
        drawCRTText(ctx, "PRESS M FOR MENU", 400, 420, '#fff', '20px "VT323", monospace');
        return;
      }

      ctx.strokeStyle = '#0ff'; ctx.lineWidth = 4;
      ctx.shadowColor = '#0ff'; ctx.shadowBlur = 0;
      ctx.strokeRect(38, 78, 724, 484);
      ctx.shadowBlur = 0;

      if (Math.floor(Date.now() / 200) % 2 === 0) {
          ctx.fillStyle = '#f0f';
          ctx.shadowColor = '#f0f'; ctx.shadowBlur = 0;
          ctx.fillRect(40 + gs.food.x * 20, 80 + gs.food.y * 20, 20, 20);
          ctx.shadowBlur = 0;
      }

      gs.snake.forEach((s, i) => {
          ctx.fillStyle = i === 0 ? '#fff' : '#0f0'; 
          ctx.shadowColor = i === 0 ? '#fff' : '#0f0'; 
          ctx.shadowBlur = 0;
          ctx.fillRect(40 + s.x * 20, 80 + s.y * 20, 20, 20);
      });
      ctx.shadowBlur = 0;

      drawCRTText(ctx, `SCORE: ${formatScore(gs.score)}`, 40, 45, '#fff', '24px "VT323", monospace', 'left');
      drawCRTText(ctx, `HI-SCORE: ${formatScore(gs.highScore)}`, 400, 45, '#fff', '24px "VT323", monospace');
      
      if (gs.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,800,600);
        drawCRTText(ctx, "GAME OVER", 400, 280, '#f00', '80px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO RESTART", 400, 350, '#fff', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS M FOR MENU", 400, 400, '#fff', '24px "VT323", monospace');
      }
    };

    const update = () => {
      let gs = state.current;

      if (keys.current['m'] || keys.current['M']) {
        onMenu();
        return;
      }

      if (gs.status === 'start' && keys.current['Enter']) {
        gs.status = 'playing';
        spawnFood(gs);
        window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'snakePlay' }));
      }

      if (gs.status === 'gameover' && keys.current['Enter']) {
        gs.score = 0; gs.speed = 8;
        gs.snake = [{x: 18, y: 12}, {x: 18, y: 13}, {x: 18, y: 14}];
        gs.dir = {x: 0, y: -1}; gs.nextDir = {x: 0, y: -1};
        spawnFood(gs);
        gs.status = 'playing';
        window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'snakePlay' }));
      }

      if (gs.status !== 'playing') return;

      gs.tickCounter++;
      if (gs.tickCounter >= gs.speed) {
          gs.tickCounter = 0;
          gs.dir = gs.nextDir;
          let head = gs.snake[0];
          let next = { x: head.x + gs.dir.x, y: head.y + gs.dir.y };

          if (next.x < 0 || next.x >= 36 || next.y < 0 || next.y >= 24) {
              gs.status = 'gameover';
              window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'snakeOver' }));
              return;
          }

          if (gs.snake.some(s => s.x === next.x && s.y === next.y)) {
              gs.status = 'gameover';
              window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'snakeOver' }));
              return;
          }

          gs.snake.unshift(next);

          if (next.x === gs.food.x && next.y === gs.food.y) {
              gs.score += 50;
              if (gs.score > gs.highScore) gs.highScore = gs.score;
              gs.speed = Math.max(3, 8 - Math.floor(gs.score / 500)); 
              spawnFood(gs);
          } else {
              gs.snake.pop();
          }
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent">
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-fill bg-transparent" />
    </div>
  );
};

// --- SECRET GALAGA-STYLE GAME COMPONENT ---
const GalagaGame = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);
  
  // Pixel Art Dictionary for the Player Ship
  const SHIP_SPRITE = [
    ".......W.......",
    ".......W.......",
    "......WWW......",
    "..R...WWW...R..",
    "..R...WWW...R..",
    "..R..BWWWB..R..",
    "..WWWWWRWWWWW..",
    "..WWWW.R.WWWW..",
    "..WWWRRRRRWWW..",
    "..WWWWWWWWWWW..",
    ".WWWWWWWWWWWWW.",
    "WWWW.......WWWW",
    "WWW.........WWW"
  ];

  const state = useRef({
    status: 'start', 
    respawnTimer: 0,
    introTimer: 0,
    warpTimer: 0,
    score: 0,
    highScore: 0,
    nextLifeScore: 150000,
    asteroidsMissed: 0,
    lives: 3,
    wave: 1,
    globalSpeed: 1.0,
    isAsteroidLevel: false,
    spaceHeldFrames: 0, 
    overdriveCount: 0,
    cooldownTimer: 0,
    // UPDATED: Adjusted width and height (34x28) to perfectly fit the new pixel art hitbox
    player: { x: 380, y: 530, w: 34, h: 28, speed: 6, tilt: 0, thrust: 1 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    asteroids: [],
    particles: [],
    stars: Array(120).fill().map(() => {
      const isColored = Math.random() < 0.20; 
      const colors = [
        'rgba(0, 255, 255, 0.4)',   
        'rgba(255, 0, 255, 0.4)',   
        'rgba(255, 255, 0, 0.4)'    
      ];
      const starColor = isColored ? colors[Math.floor(Math.random() * colors.length)] : '#ffffff';
      return { 
        x: Math.random() * 800, 
        y: Math.random() * 600, 
        speed: (3 + Math.random() * 8) * 0.75, 
        color: starColor,
        isColored: isColored,
        shadow: isColored ? starColor : 'rgba(255, 255, 255, 0.5)',
        twinkleTimer: Math.random() * 100
      };
    }),
    lastShot: 0
  });

  const keys = useRef({});

  useEffect(() => {
    const handleKeyDown = e => { keys.current[e.key] = true; };
    const handleKeyUp = e => { keys.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const playShoot = () => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1); 
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    };

    const playEnemyShoot = () => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime); 
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15); 
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    };

    const playExplode = () => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const bufferSize = audioCtx.sampleRate * 0.25;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      noise.connect(gain).connect(audioCtx.destination);
      noise.start();
    };

    const playPlayerDeath = () => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;
      
      let bufSize = audioCtx.sampleRate * 0.5;
      let buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      let data = buf.getChannelData(0);
      for(let i=0; i<bufSize; i++) data[i] = Math.random()*2-1;
      let noise = audioCtx.createBufferSource(); noise.buffer = buf;
      let nFilter = audioCtx.createBiquadFilter(); nFilter.type = 'lowpass'; nFilter.frequency.value = 800;
      let nGain = audioCtx.createGain(); nGain.gain.setValueAtTime(0.5, t0); nGain.gain.exponentialRampToValueAtTime(0.01, t0+0.5);
      
      let delay = audioCtx.createDelay(); delay.delayTime.value = 0.15;
      let feedback = audioCtx.createGain(); feedback.gain.value = 0.4;
      delay.connect(feedback); feedback.connect(delay);
      
      noise.connect(nFilter).connect(nGain);
      nGain.connect(audioCtx.destination);
      nGain.connect(delay).connect(audioCtx.destination);
      noise.start(t0);
      
      let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t0); osc.frequency.exponentialRampToValueAtTime(10, t0+0.5);
      let oGain = audioCtx.createGain(); oGain.gain.setValueAtTime(0.4, t0); oGain.gain.exponentialRampToValueAtTime(0.01, t0+0.5);
      osc.connect(oGain).connect(audioCtx.destination);
      oGain.connect(delay);
      osc.start(t0); osc.stop(t0+0.5);
    };

    const playFanfare = () => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;
      [440, 554.37, 659.25, 880].forEach((f, i) => {
         let osc = audioCtx.createOscillator(); osc.type = 'square'; osc.frequency.value = f;
         let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t0 + i*0.1); gain.gain.linearRampToValueAtTime(0, t0 + i*0.1 + 0.1);
         osc.connect(gain).connect(audioCtx.destination); osc.start(t0 + i*0.1); osc.stop(t0 + i*0.1 + 0.1);
      });
    };

    const playWarpSound = () => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;
      let osc = audioCtx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(100, t0); osc.frequency.exponentialRampToValueAtTime(800, t0+1.5);
      let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.2, t0); gain.gain.linearRampToValueAtTime(0, t0+1.5);
      osc.connect(gain).connect(audioCtx.destination); osc.start(t0); osc.stop(t0+1.5);
    };

    const playAlarm = () => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;
      let osc = audioCtx.createOscillator(); osc.type = 'square';
      osc.frequency.setValueAtTime(800, t0); osc.frequency.setValueAtTime(600, t0+0.15);
      let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t0); gain.gain.setValueAtTime(0, t0+0.3);
      osc.connect(gain).connect(audioCtx.destination); osc.start(t0); osc.stop(t0+0.3);
    };

    const playExtraLife = () => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t0 = audioCtx.currentTime;
      [659.25, 880, 1318.51].forEach((f, i) => {
         let osc = audioCtx.createOscillator(); osc.type = 'square'; osc.frequency.value = f;
         let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t0 + i*0.1); gain.gain.linearRampToValueAtTime(0, t0 + i*0.1 + 0.1);
         osc.connect(gain).connect(audioCtx.destination); osc.start(t0 + i*0.1); osc.stop(t0 + i*0.1 + 0.1);
      });
    };

    const addScore = (gs, pts) => {
      gs.score += pts;
      if (gs.score > gs.highScore) gs.highScore = gs.score;
      if (gs.score >= gs.nextLifeScore) {
          gs.lives++;
          playExtraLife();
          if (gs.nextLifeScore === 150000) gs.nextLifeScore = 450000;
          else gs.nextLifeScore += 300000;
      }
    };

    const spawnWave = (waveNum) => {
      const arr = [];
      const rows = Math.min(6, 2 + waveNum);
      const cols = 12; 
      const spacingX = 40;
      const spacingY = 35;
      const offsetX = (800 - (cols * spacingX)) / 2;
      
      let idx = 0;
      let total = rows * cols;
      
      for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
          let group = Math.floor((idx / total) * 4); 
          
          let startX, startY, ctrlX, ctrlY;
          if (group === 0) { startX = -50; startY = 650; ctrlX = 200; ctrlY = 100; }
          else if (group === 1) { startX = 850; startY = -50; ctrlX = 400; ctrlY = 500; }
          else if (group === 2) { startX = -50; startY = -50; ctrlX = 400; ctrlY = 500; }
          else { startX = 850; startY = 650; ctrlX = 600; ctrlY = 100; }

          arr.push({ 
            x: startX, 
            y: startY, 
            w: 24, h: 24, 
            baseX: offsetX + c * spacingX, baseY: 40 + r * spacingY, 
            phase: Math.random() * Math.PI * 2,
            type: r % 4, 
            state: 'spawning',
            spawnDelay: group * 60 + Math.floor(c/2) * 10, 
            pathTimer: 0,
            startX, startY, ctrlX, ctrlY,
            attackTimer: 0,
            attackStartX: 0,
            attackStartY: 0
          });
          idx++;
        }
      }
      return arr;
    };

    const spawnAsteroids = (waveNum) => {
      let count = Math.floor((10 + waveNum * 2) * 0.98); 
      let asts = [];
      for (let i = 0; i < count; i++) {
          asts.push({
              x: Math.random() * 800,
              y: -50 - Math.random() * 1500, 
              vx: (Math.random() - 0.5) * 2,
              vy: 0.5 + Math.random() * 1.5,
              size: 3, 
              radius: 30,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.1,
              points: Array(8).fill(0).map(() => 0.6 + Math.random() * 0.4) 
          });
      }
      return asts;
    };

    if (state.current.enemies.length === 0 && state.current.asteroids.length === 0) {
       if (state.current.wave % 4 === 0) {
         state.current.isAsteroidLevel = true;
         state.current.asteroids = spawnAsteroids(state.current.wave);
       } else {
         state.current.enemies = spawnWave(state.current.wave);
       }
    }

    const fireEnemyBullet = (e, gs) => {
      let dx = gs.player.x + gs.player.w/2 - (e.x + e.w/2);
      let dy = gs.player.y + gs.player.h/2 - (e.y + e.h/2);
      if (dy <= 0) return; 

      let angle = Math.atan2(dy, dx);
      let centerAngle = Math.PI / 2; 
      let maxAngle = 20 * Math.PI / 180; 
      
      if (angle < centerAngle - maxAngle) angle = centerAngle - maxAngle;
      if (angle > centerAngle + maxAngle) angle = centerAngle + maxAngle;

      let speed = 4 + gs.wave * 0.5;
      gs.enemyBullets.push({
          x: e.x + e.w/2 - 2, y: e.y + e.h, w: 4, h: 10,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed
      });
      playEnemyShoot();
    };

    const killPlayer = (gs) => {
      gs.lives--;
      gs.spaceHeldFrames = 0; 
      gs.cooldownTimer = 0;
      gs.overdriveCount = 0;
      playPlayerDeath();
      
      for(let p=0; p<40; p++) {
        gs.particles.push({
          x: gs.player.x + gs.player.w/2, y: gs.player.y + gs.player.h/2,
          vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15,
          life: 40
        });
      }
      gs.enemyBullets = []; 
      window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' })); 
      
      if (gs.lives <= 0) {
        gs.status = 'gameover';
      } else {
        gs.status = 'respawning';
        gs.respawnTimer = 180; 
        gs.enemies.forEach(e => { if(e.state === 'attacking') e.state = 'returning'; }); 
      }
    };

    const formatScore = (s) => String(s).padStart(6, '0');
    
    const getTwinkleColor = (s, isWarp) => {
      if (isWarp && Math.random() > 0.3) {
          const warpColors = ['rgba(0, 255, 255, 0.8)', 'rgba(255, 0, 255, 0.8)', 'rgba(255, 255, 0, 0.8)', '#ffffff'];
          let c = warpColors[Math.floor(Math.random() * warpColors.length)];
          return { c: c, shadow: 'rgba(255,255,255,0.8)' };
      }
      if (!s.isColored) return { c: '#ffffff', shadow: 'rgba(255,255,255,0.5)' };
      const colors = [
          {c: 'rgba(0, 255, 255, 0.6)', shadow: 'rgba(0, 255, 255, 0.8)'},   
          {c: 'rgba(255, 0, 255, 0.6)', shadow: 'rgba(255, 0, 255, 0.8)'},   
          {c: 'rgba(255, 255, 0, 0.6)', shadow: 'rgba(255, 255, 0, 0.8)'},
          {c: 'rgba(255, 0, 0, 0.6)', shadow: 'rgba(255, 0, 0, 0.8)'},
          {c: 'rgba(0, 255, 0, 0.6)', shadow: 'rgba(0, 255, 0, 0.8)'}
      ];
      let cIdx = Math.floor(s.twinkleTimer / 15) % colors.length;
      return colors[cIdx];
    };

    const draw = () => {
      let gs = state.current;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let isWarp = gs.globalSpeed > 2.0;

      gs.stars.forEach(s => { 
        s.twinkleTimer++;
        let tc = getTwinkleColor(s, isWarp);
        ctx.fillStyle = tc.c;
        ctx.shadowColor = 'transparent'; 
        ctx.shadowBlur = 0;
        let size = (s.isColored || isWarp) ? 3 : 2;
        let stretch = isWarp ? s.speed * gs.globalSpeed * 0.5 : 0;
        ctx.fillRect(s.x, s.y, size, size + stretch); 
      });
      ctx.shadowBlur = 0;

      if (gs.status === 'start') {
        drawCRTText(ctx, "BASS SPACE ADVENTURES", 400, 250, '#0f0', '60px "VT323", monospace');
        drawCRTText(ctx, "CHRONICLES OF CAPTAIN MERK", 400, 300, '#fff', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO START", 400, 380, '#fff', '24px "VT323", monospace');
        drawCRTText(ctx, "PRESS M FOR MENU", 400, 460, '#fff', '20px "VT323", monospace');
        drawCRTText(ctx, "WASD/ARROWS: Move  |  SPACE: Shoot", 400, 500, '#fff', '20px "VT323", monospace');
        return;
      }

      if (gs.status === 'level_intro') {
          if (Math.floor(gs.introTimer / 15) % 2 === 0) {
              drawCRTText(ctx, "ENEMY ALERT", 400, 300, '#f00', '50px "VT323", monospace');
          }
      }

      let isOverdrive = gs.spaceHeldFrames > 60;
      let isCooldown = gs.cooldownTimer > 0;
      let playerVisible = (gs.status === 'playing' || gs.status === 'level_intro' || gs.status === 'warp_transition' || (gs.status === 'respawning' && gs.respawnTimer < 90));

      // --- PLAYER RENDERING (Pixel Art Swapped) ---
      if (playerVisible) {
        ctx.save();
        let cx = gs.player.x + gs.player.w / 2;
        let cy = gs.player.y + gs.player.h / 2;
        let tilt = gs.player.tilt || 0;
        let thrust = gs.player.thrust !== undefined ? gs.player.thrust : 1;

        ctx.translate(cx, cy);

        // Apply a subtle banking tilt
        ctx.scale(1 - Math.abs(tilt)*0.2, 1);
        ctx.rotate(tilt * 0.3);

        if (isOverdrive && !isCooldown) {
            ctx.translate((Math.random() - 0.5)*4, (Math.random() - 0.5)*4);
        }

        let scale = 2.5;
        let w = SHIP_SPRITE[0].length * scale;
        let h = SHIP_SPRITE.length * scale;
        let startX = -w / 2;
        let startY = -h / 2;

        for (let r = 0; r < SHIP_SPRITE.length; r++) {
          for (let c = 0; c < SHIP_SPRITE[r].length; c++) {
            let char = SHIP_SPRITE[r][c];
            if (char === '.') continue;
            
            if (isCooldown) {
               if (char === 'W') ctx.fillStyle = '#555555';
               else if (char === 'R') ctx.fillStyle = '#440000';
               else if (char === 'B') ctx.fillStyle = '#004455';
            } else {
               if (char === 'W') ctx.fillStyle = '#ffffff';
               else if (char === 'R') ctx.fillStyle = '#ff0000';
               else if (char === 'B') ctx.fillStyle = '#00aaff';
            }
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.fillRect(startX + c * scale, startY + r * scale, scale, scale);
          }
        }

        // Dynamic Engine Thrust behind the ship
        if (!isCooldown && thrust > 0) {
           let tLen = (thrust > 1 || gs.status === 'warp_transition') ? 20 + Math.random()*8 : 8 + Math.random()*4;
           let tCol = (thrust > 1 || gs.status === 'warp_transition') ? '#0ff' : '#fa0';
           ctx.fillStyle = tCol;
           ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
           ctx.fillRect(startX + 3 * scale, startY + h - scale, 2 * scale, tLen);
           ctx.fillRect(startX + 10 * scale, startY + h - scale, 2 * scale, tLen);
        }

        ctx.restore();
        
        if (isCooldown) {
            drawCRTText(ctx, "OVERHEATED", cx, cy - 25, '#f00', '14px "VT323", monospace');
        }
      }

      if (gs.status === 'warp_transition') {
        if (gs.isAsteroidLevel) {
          drawCRTText(ctx, `ASTEROID FIELD CLEARED!`, 400, 280, '#0f0', '60px "VT323", monospace');
        } else {
          drawCRTText(ctx, `WAVE ${gs.wave} CLEARED!`, 400, 280, '#0f0', '60px "VT323", monospace');
        }
      }

      if (gs.status === 'respawning' && gs.respawnTimer < 90) {
        drawCRTText(ctx, "READY", 400, 320, '#0f0', '40px "VT323", monospace');
      }

      if (gs.status === 'playing' || gs.status === 'respawning' || gs.status === 'level_intro') {
        if (gs.isAsteroidLevel) {
          ctx.strokeStyle = '#fa0';
          ctx.fillStyle = '#000';
          ctx.lineWidth = 2;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          gs.asteroids.forEach(a => {
              ctx.save();
              ctx.translate(a.x, a.y);
              ctx.rotate(a.rotation);
              ctx.beginPath();
              for (let i = 0; i < 8; i++) {
                  let angle = (i / 8) * Math.PI * 2;
                  let r = a.radius * a.points[i];
                  if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                  else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();
          });
          ctx.shadowBlur = 0;
        } else {
          gs.enemies.forEach(e => {
            if (e.state === 'spawning' && e.spawnDelay > 0) return; 
            
            ctx.save();
            ctx.translate(e.x + e.w/2, e.y + e.h/2);
            
            let tilt = Math.sin((Date.now()/500) + e.phase) * 0.3;
            if (e.state === 'attacking' || e.state === 'returning') {
                tilt = (e.x - e.baseX) * 0.005; 
                tilt = Math.max(-0.5, Math.min(0.5, tilt));
            }

            let roll = tilt * Math.PI / 4; 
            const p = (x, y) => {
                let z = x * Math.sin(roll);
                let x2 = x * Math.cos(roll);
                let scale = 25 / (25 + z); 
                return { x: x2 * scale, y: y * scale };
            };

            const poly = (pts, fill) => {
                ctx.fillStyle = fill;
                ctx.shadowColor = 'transparent'; 
                ctx.shadowBlur = 0;              
                ctx.beginPath();
                pts.forEach((pt, i) => {
                    let pr = p(pt[0], pt[1]);
                    if (i===0) ctx.moveTo(pr.x, pr.y); else ctx.lineTo(pr.x, pr.y);
                });
                ctx.closePath();
                ctx.fill();
            };

            let color;
            if (e.type === 0) color = '#f0f';
            else if (e.type === 1) color = '#f00';
            else if (e.type === 2) color = '#0f0';
            else color = '#0ff'; 
            
            if (e.type === 0) { 
                poly([
                    [0,-10], [4,-4], [12,-6], [10,2], [6,8], [2,4], [0,10],
                    [-2,4], [-6,8], [-10,2], [-12,-6], [-4,-4]
                ], color);
                poly([[-4,-2], [-2,0], [-4,2], [-6,0]], '#0ff');
                poly([[4,-2], [6,0], [4,2], [2,0]], '#0ff');
            } else if (e.type === 1) { 
                poly([
                    [-8,-8], [-4,-10], [4,-10], [8,-8], [12,-2], [10,6], [4,8], [2,4],
                    [-2,4], [-4,8], [-10,6], [-12,-2]
                ], color);
                poly([[-12,2], [-16,6], [-14,10], [-10,8]], color);
                poly([[12,2], [16,6], [14,10], [10,8]], color);
                poly([[-4,0], [-2,2], [-4,4], [-6,2]], '#ff0');
                poly([[4,0], [6,2], [4,4], [2,2]], '#ff0');
            } else if (e.type === 2) { 
                poly([
                    [0,-12], [6,-8], [8,-2], [14,0], [14,6], [8,8], [4,12], [0,8],
                    [-4,12], [-8,8], [-14,6], [-14,0], [-8,-2], [-6,-8]
                ], color);
                poly([[-6,0], [-2,2], [-6,4], [-10,2]], '#fff');
                poly([[6,0], [10,2], [6,4], [2,2]], '#fff');
            } else {
                poly([
                    [0,-12], [4,-8], [12,-4], [8,0], [12,4], [4,8], [0,12],
                    [-4,8], [-12,4], [-8,0], [-12,-4], [-4,-8]
                ], color);
                poly([[-4,0], [-2,2], [-4,4], [-6,2]], '#f0f');
                poly([[4,0], [6,2], [4,4], [2,2]], '#f0f');
            }
            ctx.restore();
          });
        }
      }

      let pulse = Math.abs(Math.sin(Date.now() * 0.02)) * 4;
      ctx.fillStyle = '#0ff'; 
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      gs.bullets.forEach(b => ctx.fillRect(b.x - pulse/2, b.y, b.w + pulse, b.h));
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f00';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      gs.enemyBullets.forEach(eb => ctx.fillRect(eb.x, eb.y, eb.w, eb.h));
      ctx.shadowBlur = 0;

      gs.particles.forEach(p => {
        ctx.fillStyle = `rgba(255, 150, 0, ${p.life / 30})`;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillRect(p.x, p.y, 4, 4);
      });
      ctx.shadowBlur = 0;

      drawCRTText(ctx, `SCORE: ${formatScore(gs.score)}`, 20, 30, '#fff', '24px "VT323", monospace', 'left');
      drawCRTText(ctx, `HI-SCORE: ${formatScore(gs.highScore)}`, 400, 30, '#fff', '24px "VT323", monospace');
      drawCRTText(ctx, `LIVES:`, 680, 30, '#fff', '24px "VT323", monospace', 'right');
      
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      for(let i=0; i<gs.lives; i++) {
        let lx = 690 + (i * 25);
        ctx.fillStyle = '#ccc'; ctx.beginPath();
        ctx.moveTo(lx + 8, 10); ctx.lineTo(lx + 16, 26); ctx.lineTo(lx, 26); ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (gs.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,800,600);
        drawCRTText(ctx, "GAME OVER", 400, 280, '#f00', '80px "VT323", monospace');
        drawCRTText(ctx, "PRESS ENTER TO RESTART", 400, 350, '#fff', '30px "VT323", monospace');
        drawCRTText(ctx, "PRESS M FOR MENU", 400, 400, '#fff', '24px "VT323", monospace');
      }
    };

    const update = () => {
      let gs = state.current;

      if (keys.current['m'] || keys.current['M']) {
        onMenu();
        return;
      }

      let targetSpeed = 1.0;
      if (gs.status === 'level_intro' || gs.isAsteroidLevel || gs.status === 'warp_transition') {
          targetSpeed = 5.0;
      }
      gs.globalSpeed += (targetSpeed - gs.globalSpeed) * 0.05; 

      gs.stars.forEach(s => {
        s.y += s.speed * gs.globalSpeed;
        if (s.y > 600) { s.y = -20; s.x = Math.random() * 800; }
      });

      if (gs.status === 'start') {
        if (keys.current['Enter']) { 
          gs.status = 'level_intro'; 
          gs.introTimer = 150;
          window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'galagaWarp' }));
        }
        return;
      }

      if (gs.status === 'warp_transition') {
        gs.warpTimer--;
        if (gs.warpTimer <= 0) {
          gs.wave++;
          gs.isAsteroidLevel = (gs.wave % 4 === 0);
          gs.asteroidsMissed = 0;
          if (gs.isAsteroidLevel) {
            gs.asteroids = spawnAsteroids(gs.wave);
            gs.enemies = [];
          } else {
            gs.enemies = spawnWave(gs.wave);
            gs.asteroids = [];
          }
          gs.bullets = []; gs.enemyBullets = []; gs.particles = [];
          gs.status = 'level_intro';
          gs.introTimer = 150;
          playWarpSound();
          window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'galagaWarp' }));
        }
        return;
      }

      if (gs.status === 'gameover') {
        if (keys.current['Enter']) {
          gs.status = 'level_intro';
          gs.introTimer = 150;
          gs.score = 0; gs.lives = 3; gs.wave = 1;
          gs.isAsteroidLevel = false;
          gs.enemies = spawnWave(gs.wave);
          gs.asteroids = [];
          gs.player.x = 380; gs.player.y = 530; gs.player.tilt = 0; gs.player.thrust = 1;
          gs.bullets = []; gs.enemyBullets = []; gs.particles = [];
          gs.spaceHeldFrames = 0; gs.cooldownTimer = 0; gs.overdriveCount = 0;
          window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'galagaWarp' }));
        }
        return;
      }

      if (gs.status === 'level_intro') {
          gs.introTimer--;
          if (gs.introTimer % 30 === 0) playAlarm();
          if (gs.introTimer <= 0) {
              gs.status = 'playing';
              window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'galagaPlay' }));
          }
      }

      if (gs.status === 'respawning') {
        gs.respawnTimer--;
        if (gs.respawnTimer <= 0) {
          gs.status = 'playing';
          gs.player.x = 380;
          gs.player.y = 530;
          gs.player.tilt = 0;
          gs.player.thrust = 1;
          gs.spaceHeldFrames = 0;
          window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'galagaPlay' }));
        }
      }

      if (gs.status === 'playing' || gs.status === 'level_intro' || gs.status === 'warp_transition') {
        
        if (keys.current[' '] && gs.cooldownTimer <= 0 && gs.status === 'playing') {
          gs.spaceHeldFrames++;
        } else {
          gs.spaceHeldFrames = Math.max(0, gs.spaceHeldFrames - 2);
        }

        if (gs.cooldownTimer > 0) gs.cooldownTimer--;

        if (gs.spaceHeldFrames > 180) { 
           if (gs.overdriveCount === 0) {
               gs.overdriveCount++;
               gs.cooldownTimer = 180; 
               gs.spaceHeldFrames = 0;
               playExplode();
               for(let p=0; p<15; p++) {
                 gs.particles.push({
                   x: gs.player.x + gs.player.w/2, y: gs.player.y + gs.player.h/2,
                   vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 20
                 });
               }
           } else {
               killPlayer(gs);
           }
        }

        let isOverdrive = gs.spaceHeldFrames > 60;
        let fireDelay = 250; 
        if (isOverdrive) {
            if (gs.spaceHeldFrames < 120) {
                fireDelay = 80;
            } else {
                let t = (gs.spaceHeldFrames - 120) / 60; 
                fireDelay = 80 + (t * 400); 
            }
        }

        let movingX = 0;
        if (keys.current['ArrowLeft'] || keys.current['a']) { gs.player.x -= gs.player.speed; movingX = -1; }
        if (keys.current['ArrowRight'] || keys.current['d']) { gs.player.x += gs.player.speed; movingX = 1; }
        
        let thrust = 1;
        if (keys.current['ArrowUp'] || keys.current['w']) { gs.player.y -= gs.player.speed; thrust = 2; }
        if (keys.current['ArrowDown'] || keys.current['s']) { gs.player.y += gs.player.speed; thrust = 0; }
        gs.player.thrust = thrust;

        gs.player.x = Math.max(0, Math.min(800 - gs.player.w, gs.player.x));
        gs.player.y = Math.max(400, Math.min(600 - gs.player.h - 10, gs.player.y));

        if (movingX < 0) gs.player.tilt = Math.max(-0.4, (gs.player.tilt || 0) - 0.08);
        else if (movingX > 0) gs.player.tilt = Math.min(0.4, (gs.player.tilt || 0) + 0.08);
        else gs.player.tilt = (gs.player.tilt || 0) * 0.8;

        if (gs.status === 'playing' && (keys.current[' ']) && gs.cooldownTimer <= 0 && Date.now() - gs.lastShot > fireDelay) {
          gs.bullets.push({ x: gs.player.x + gs.player.w/2 - 2, y: gs.player.y, w: 4, h: 12, vy: -15 });
          gs.lastShot = Date.now();
          playShoot();
        }

        for (let i = gs.bullets.length - 1; i >= 0; i--) {
          let b = gs.bullets[i];
          b.y += b.vy;
          if (b.y < 0) { gs.bullets.splice(i, 1); continue; }
          
          let hit = false;

          if (gs.isAsteroidLevel) {
            for (let j = gs.asteroids.length - 1; j >= 0; j--) {
              let a = gs.asteroids[j];
              if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius) {
                  hit = true;
                  playExplode();
                  addScore(gs, 50 * a.size);
                  
                  for(let p=0; p<10*a.size; p++) {
                      gs.particles.push({
                          x: a.x, y: a.y,
                          vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 30
                      });
                  }

                  if (a.size > 1) {
                      let newSize = a.size - 1;
                      let newRad = newSize === 2 ? 20 : 10;
                      gs.asteroids.push({
                          x: a.x, y: a.y, vx: a.vx - 1 - Math.random(), vy: a.vy,
                          size: newSize, radius: newRad, rotation: a.rotation, rotSpeed: a.rotSpeed * 1.5,
                          points: Array(8).fill(0).map(() => 0.6 + Math.random() * 0.4)
                      });
                      gs.asteroids.push({
                          x: a.x, y: a.y, vx: a.vx + 1 + Math.random(), vy: a.vy,
                          size: newSize, radius: newRad, rotation: a.rotation, rotSpeed: -a.rotSpeed * 1.5,
                          points: Array(8).fill(0).map(() => 0.6 + Math.random() * 0.4)
                      });
                  }
                  gs.asteroids.splice(j, 1);
                  break;
              }
            }
          } else {
            for (let j = gs.enemies.length - 1; j >= 0; j--) {
              let e = gs.enemies[j];
              if (e.state === 'spawning' && e.spawnDelay > 0) continue; 

              if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
                gs.enemies.splice(j, 1);
                hit = true;
                addScore(gs, 150);
                playExplode();
                for(let p=0; p<15; p++) {
                  gs.particles.push({
                    x: e.x + e.w/2, y: e.y + e.h/2,
                    vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 30
                  });
                }
                break;
              }
            }
          }
          if (hit) gs.bullets.splice(i, 1);
        }
      }

      if (!gs.isAsteroidLevel) {
        for (let i = gs.enemyBullets.length - 1; i >= 0; i--) {
          let eb = gs.enemyBullets[i];
          eb.x += eb.vx; eb.y += eb.vy;
          if (eb.y > 600 || eb.x < 0 || eb.x > 800) { gs.enemyBullets.splice(i, 1); continue; }
          
          if (gs.status === 'playing') {
            if (eb.x < gs.player.x + gs.player.w && eb.x + eb.w > gs.player.x &&
                eb.y < gs.player.y + gs.player.h && eb.y + eb.h > gs.player.y) {
                gs.enemyBullets.splice(i, 1);
                killPlayer(gs);
                break;
            }
          }
        }

        let formX = Math.sin(Date.now() / 1500) * (40 + Math.min(gs.wave * 2, 60)) * 0.85; 
        
        if (gs.status === 'playing' && Math.random() < (0.015 + (gs.wave * 0.002)) * 0.85) {
          let formEnemies = gs.enemies.filter(e => e.state === 'formation');
          if(formEnemies.length > 0) {
            let randE = formEnemies[Math.floor(Math.random() * formEnemies.length)];
            randE.state = 'attacking';
            randE.attackStartX = randE.x;
            randE.attackStartY = randE.y;
            randE.attackTimer = 0;
          }
        }

        for (let i = gs.enemies.length - 1; i >= 0; i--) {
          let e = gs.enemies[i];
          
          if (e.state === 'spawning') {
            if (e.spawnDelay > 0) {
              e.spawnDelay--;
            } else {
              e.pathTimer++;
              let t = e.pathTimer / 100;
              if (t >= 1) {
                 e.state = 'formation';
                 e.x = e.baseX + formX;
                 e.y = e.baseY + Math.cos((Date.now() / 500) + e.phase) * 10;
              } else {
                 let invT = 1 - t;
                 let tx = e.baseX + formX;
                 let ty = e.baseY + Math.cos((Date.now() / 500) + e.phase) * 10;
                 e.x = invT*invT * e.startX + 2 * invT * t * e.ctrlX + t*t * tx;
                 e.y = invT*invT * e.startY + 2 * invT * t * e.ctrlY + t*t * ty;
              }
            }
          }
          else if (e.state === 'formation') {
            e.x = e.baseX + formX;
            e.y = e.baseY + Math.cos((Date.now() / 500) + e.phase) * 10;
          } 
          else if (e.state === 'attacking') {
            e.attackTimer++;
            e.y = e.attackStartY + (e.attackTimer * (4 + gs.wave * 0.3));
            e.x = e.attackStartX + Math.sin(e.attackTimer * 0.05) * 100;
            e.x = Math.max(0, Math.min(800 - e.w, e.x));

            if (gs.status === 'playing' && Math.random() < 0.015 + (gs.wave * 0.002)) {
              fireEnemyBullet(e, gs);
            }

            if (e.y > 600) {
              e.y = -50;
              e.state = 'returning';
            }
          } 
          else if (e.state === 'returning') {
            let tx = e.baseX + formX;
            let ty = e.baseY + Math.cos((Date.now() / 500) + e.phase) * 10;
            e.x += (tx - e.x) * 0.05;
            e.y += (ty - e.y) * 0.05;
            if (Math.abs(e.x - tx) < 5 && Math.abs(e.y - ty) < 5) {
               e.state = 'formation';
               e.x = tx; e.y = ty;
            }
          }

          if (gs.status === 'playing' && e.state !== 'spawning') {
            if (e.x < gs.player.x + gs.player.w && e.x + e.w > gs.player.x && 
                e.y < gs.player.y + gs.player.h && e.y + e.h > gs.player.y) {
                killPlayer(gs);
                gs.enemies.splice(i, 1);
            }
          }
        }
      } else {
        for (let i = gs.asteroids.length - 1; i >= 0; i--) {
          let a = gs.asteroids[i];
          a.x += a.vx;
          a.y += a.vy;
          a.rotation += a.rotSpeed;

          if (gs.status === 'playing') {
              let dx = (gs.player.x + gs.player.w/2) - a.x;
              let dy = (gs.player.y + gs.player.h/2) - a.y;
              if (Math.hypot(dx, dy) < a.radius + 8) {
                  killPlayer(gs);
              }
          }

          if (a.y > 600 + a.radius || a.x < -a.radius || a.x > 800 + a.radius) {
              gs.asteroidsMissed = (gs.asteroidsMissed || 0) + 1;
              gs.asteroids.splice(i, 1);
          }
        }
      }

      for (let i = gs.particles.length - 1; i >= 0; i--) {
        let p = gs.particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) gs.particles.splice(i, 1);
      }

      if (gs.status === 'playing' && gs.enemies.length === 0 && gs.asteroids.length === 0) {
        gs.status = 'warp_transition';
        gs.warpTimer = 90; 
        playFanfare();
        if (gs.isAsteroidLevel && gs.asteroidsMissed === 0) {
            addScore(gs, 0); 
            gs.lives++;
            playExtraLife();
        }
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent">
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-fill bg-transparent cursor-none" />
    </div>
  );
};

// --- BASS 1941 (VERTICAL SHOOTER) COMPONENT ---
const AirplaneGame = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);

  const NATIVE_W = 640;
  const NATIVE_H = 480;

  const state = useRef({
    status: 'start',
    score: 0,
    highScore: 0,
    lives: 3,
    nextLifeScore: 50000,
    level: 1,
    levelTick: 0,
    bgScrollY: 0,
    islands: [],
    respawnTimer: 0,
    messageTimer: 0,
    messageText: '',
    
    // Weapon & Inventory State
    bombs: 3,
    weapon: 'twin', // 'twin', 'increase', 'spread', 'laser', 'missile'
    weaponLevel: 1,
    
    // Enemy Kill Counters for Drops
    kills: { basic: 0, medium: 0, heavy: 0 },
    
    player: { x: 320, y: 400, w: 45, h: 30, speed: 5, cooldown: 0, invuln: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    boss: null,
    keys: {}
  });

  const THEMES = [
    { water: '#001a44', sand: '#887733', jungle: '#004400', name: "MISSION 1: PACIFIC SEA" },
    { water: '#003366', sand: '#aa9955', jungle: '#226622', name: "MISSION 2: DAYBREAK" },
    { water: '#221133', sand: '#554422', jungle: '#112211', name: "MISSION 3: DUSK STRIKE" },
    { water: '#050511', sand: '#222211', jungle: '#001100', name: "MISSION 4: NIGHT OPERATION" }
  ];

  const PALETTE = {
    'R': '#e52521', 'G': '#a0a0a0', 'D': '#505050', 'B': '#185add',
    'Y': '#e5c721', 'O': '#335522', 'W': '#ffffff', 'X': '#ffaa00',
    'P': '#ff00ff', 'C': '#00ffff'
  };

  const SPRITES = {
    player: [
      ".......D.......", ".......G.......", "......GDG......",
      "..D...GBG...D..", "..G...GGG...G..", "..G.GGGGGGG.G..",
      ".GGGGGGGGGGGGG.", ".G.G..GDG..G.G.", "D..G.......G..D",
      "...GG.....GG..."
    ],
    fighter: [ // Old fighter, now slow/medium
      ".......D.......", ".......Y.......", "......YYY......",
      "....YYYYYYY....", "..YYYYYYYYYYY..", ".Y.Y.YYYYY.Y.Y.",
      ".....Y.R.Y.....", "......YYY......", ".......Y......."
    ],
    tinyFighter: [ // Fast interceptors
      "...D...", "..YYY..", ".Y.R.Y.", "...Y..."
    ],
    bomber: [
      ".........D.........", "........OOO........", ".......OOOOO.......",
      "......OOOOOOO......", "...D..OOOOOOO..D...", "...O..OOOOOOO..O...",
      "..OO..OO.R.OO..OO..", ".OOOOOOOOOOOOOOOOO.", "OOOOOOOOOOOOOOOOOOO",
      "O.O.O.OOOOOOO.O.O.O", "......OOOOOOO......", ".......OOOOO.......",
      ".......O...O......."
    ],
    boat: [
      ".....D.....", "....GGG....", "...GGGGG...", "...GGGGG...",
      "...GGGGG...", "...GGOGG...", "...GGGGG...", "...GGGGG...",
      "....GGG....", "...W...W...", "..W.....W.." 
    ],
    boss: [ // Massive End-Level Boss
      ".............D.............",
      "............RRR............",
      "...........RRRRR...........",
      "........D..RRRRR..D........",
      ".......RR.RRRRRRR.RR.......",
      "......RRRRRRRRRRRRRRR......",
      ".....RRRRRRR.B.RRRRRRR.....",
      "....RRRRRRRRRRRRRRRRRRR....",
      "...RR.RR.RRRRRRRRR.RR.RR...",
      ".RRRRRRRRRRRRRRRRRRRRRRRRR.",
      "RRRRRRRRRRRRRRRRRRRRRRRRRRR",
      "R.R.R.R.RRRRRRRRRRR.R.R.R.R",
      "..........RRRRRRR..........",
      "...........RR.RR...........",
      "...........R...R..........."
    ]
  };

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // --- AUDIO SYSTEM ---
    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      if (type === 'shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(1200, t); osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.04, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.1);
      } else if (type === 'laser') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t); osc.frequency.linearRampToValueAtTime(1000, t + 0.15);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.03, t); gain.gain.linearRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.15);
      } else if (type === 'hit') {
        let buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
        let data = buf.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        let src = audioCtx.createBufferSource(); src.buffer = buf;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800;
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        src.connect(filter).connect(gain).connect(audioCtx.destination); src.start(t);
      } else if (type === 'boom' || type === 'bomb') {
        let len = type === 'bomb' ? 1.5 : 0.6;
        let buf = audioCtx.createBuffer(1, audioCtx.sampleRate * len, audioCtx.sampleRate);
        let data = buf.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        let src = audioCtx.createBufferSource(); src.buffer = buf;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = type === 'bomb' ? 200 : 400;
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(type === 'bomb' ? 0.6 : 0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + len);
        src.connect(filter).connect(gain).connect(audioCtx.destination); src.start(t);
      } else if (type === 'powerup') {
        [400, 600, 800, 1000].forEach((f, i) => {
           let osc = audioCtx.createOscillator(); osc.type = 'square'; osc.frequency.value = f;
           let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t + i*0.05); gain.gain.linearRampToValueAtTime(0, t + i*0.05 + 0.05);
           osc.connect(gain).connect(audioCtx.destination); osc.start(t + i*0.05); osc.stop(t + i*0.05 + 0.05);
        });
      }
    };

    const generateIsland = (yOffset) => {
      let shapes = [];
      let numShapes = 4 + Math.floor(Math.random() * 5);
      let baseX = Math.random() * NATIVE_W;
      for(let i=0; i<numShapes; i++) {
        shapes.push({ ox: (Math.random() - 0.5) * 100, oy: (Math.random() - 0.5) * 100, r: 40 + Math.random() * 50 });
      }
      return { x: baseX, y: yOffset, shapes };
    };

    const initMap = (gs) => {
      gs.islands = [];
      for(let i=0; i<6; i++) gs.islands.push(generateIsland(-i * 200));
    };

    const drawSprite = (spriteObj, x, y, scale = 3, isShadow = false) => {
      let w = spriteObj[0].length * scale; let h = spriteObj.length * scale;
      let startX = x - w / 2; let startY = y - h / 2;
      for (let r = 0; r < spriteObj.length; r++) {
        for (let c = 0; c < spriteObj[r].length; c++) {
          let char = spriteObj[r][c];
          if (char === '.') continue;
          ctx.fillStyle = isShadow ? 'rgba(0, 0, 50, 0.4)' : PALETTE[char];
          ctx.fillRect(Math.floor(startX + c * scale), Math.floor(startY + r * scale), scale, scale);
        }
      }
    };

    const formatScore = (s) => String(s).padStart(6, '0');

    // --- GAME LOGIC HANDLERS ---
    const addScore = (gs, pts) => {
      gs.score += pts;
      if (gs.score > gs.highScore) gs.highScore = gs.score;
      if (gs.score >= gs.nextLifeScore) {
          gs.lives++;
          gs.nextLifeScore += 50000;
          playAudio('powerup');
          showMessage(gs, "1 UP!");
      }
    };

    const showMessage = (gs, msg) => {
      gs.messageText = msg;
      gs.messageTimer = 120;
    };

    const spawnPowerup = (gs, x, y) => {
      const types = ['increase', 'spread', 'laser', 'missile'];
      const type = types[Math.floor(Math.random() * types.length)];
      gs.powerups.push({ x, y, type, vy: 1.5, w: 16, h: 16 });
    };

    const triggerBomb = (gs) => {
      if (gs.bombs <= 0) return;
      gs.bombs--;
      playAudio('bomb');
      gs.enemyBullets = [];
      
      // Screen flash effect via particles
      gs.particles.push({x: NATIVE_W/2, y: NATIVE_H/2, life: 30, isFlash: true});
      
      // Destroy normal enemies
      for (let i = gs.enemies.length - 1; i >= 0; i--) {
        let e = gs.enemies[i];
        addScore(gs, e.pts);
        for(let k=0; k<10; k++) {
          gs.particles.push({ x: e.x, y: e.y, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 20 + Math.random()*20, color: '#ffaa00' });
        }
        gs.enemies.splice(i, 1);
      }
      
      // Damage Boss
      if (gs.boss && gs.boss.state === 'fighting') {
        gs.boss.hp -= gs.boss.maxHp * 0.1;
      }
    };

    const fireEnemyBullet = (gs, ex, ey, speed, spread = 0) => {
      let dx = gs.player.x - ex; let dy = gs.player.y - ey;
      let dist = Math.hypot(dx, dy);
      let angle = Math.atan2(dy, dx) + spread;
      gs.enemyBullets.push({
        x: ex, y: ey,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 4
      });
    };

    const playerHit = (gs) => {
      gs.lives--;
      playAudio('boom');
      gs.weaponLevel = Math.max(1, gs.weaponLevel - 1); // Lose weapon power
      for(let k=0; k<60; k++) {
        gs.particles.push({
          x: gs.player.x, y: gs.player.y, 
          vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12, 
          life: 40 + Math.random()*40, color: Math.random() > 0.5 ? '#f00' : '#ffaa00'
        });
      }
      gs.bullets = []; gs.enemyBullets = [];
      if (gs.lives <= 0) gs.status = 'gameover';
      else {
        gs.status = 'respawning'; gs.respawnTimer = 120;
        gs.player.x = NATIVE_W / 2; gs.player.y = NATIVE_H - 80; gs.player.cooldown = 0;
      }
    };

    const spawnBoss = (gs) => {
      gs.boss = {
        x: NATIVE_W/2, y: -100, w: 90, h: 45, 
        maxHp: 500 * Math.ceil(gs.level/4), hp: 500 * Math.ceil(gs.level/4),
        state: 'entering', tick: 0, pts: 5000
      };
      showMessage(gs, "WARNING: HEAVY BOMBER APPROACHING");
    };

    // --- CORE LOOP ---
    const update = () => {
      let gs = state.current;
      let keys = gs.keys;

      if (keys['m'] || keys['M']) { onMenu(); return; }

      if (gs.status === 'start' && keys['Enter']) {
        gs.status = 'playing'; gs.score = 0; gs.lives = 3; gs.level = 1; gs.levelTick = 0;
        gs.bombs = 3; gs.weapon = 'twin'; gs.weaponLevel = 1;
        gs.player = { x: NATIVE_W/2, y: NATIVE_H - 80, w: 45, h: 30, speed: 5, cooldown: 0, invuln: 120 };
        gs.bullets = []; gs.enemyBullets = []; gs.enemies = []; gs.powerups = []; gs.particles = []; gs.boss = null;
        initMap(gs);
        showMessage(gs, THEMES[0].name);
      }

      if (gs.status === 'gameover' && keys['Enter']) gs.status = 'start';

      if (gs.status === 'playing' || gs.status === 'respawning') {
        gs.bgScrollY += 0.8;
        for (let i = gs.islands.length - 1; i >= 0; i--) {
          gs.islands[i].y += 0.8;
          if (gs.islands[i].y > NATIVE_H + 150) {
            gs.islands.splice(i, 1); gs.islands.push(generateIsland(-150)); 
          }
        }
        for (let i = gs.particles.length - 1; i >= 0; i--) {
          let pt = gs.particles[i];
          if (!pt.isFlash) { pt.x += pt.vx; pt.y += pt.vy; }
          pt.life--;
          if (pt.life <= 0) gs.particles.splice(i, 1);
        }
        if (gs.messageTimer > 0) gs.messageTimer--;
      }

      if (gs.status === 'respawning') {
        gs.respawnTimer--;
        if (gs.respawnTimer <= 0) { gs.status = 'playing'; gs.player.invuln = 120; }
        return; 
      }

      if (gs.status !== 'playing') return;

      gs.tick++;
      gs.levelTick++;
      let p = gs.player;

      // LEVEL PROGRESSION
      const MAX_TICK = 3000;
      if (!gs.boss) {
        if (gs.levelTick === Math.floor(MAX_TICK * 0.4) || gs.levelTick === Math.floor(MAX_TICK * 0.8)) {
           spawnPowerup(gs, 50 + Math.random()*(NATIVE_W-100), -20);
        }
        if (gs.levelTick >= MAX_TICK) {
           if (gs.level % 4 === 0) spawnBoss(gs);
           else {
             gs.level++; gs.levelTick = 0; gs.bombs++;
             showMessage(gs, THEMES[(gs.level-1)%4].name);
             initMap(gs); // Swap palettes
           }
        }
      }

      if (p.invuln > 0) p.invuln--;
      if (p.cooldown > 0) p.cooldown--;

      if (keys['ArrowLeft'] || keys['a']) p.x -= p.speed;
      if (keys['ArrowRight'] || keys['d']) p.x += p.speed;
      if (keys['ArrowUp'] || keys['w']) p.y -= p.speed;
      if (keys['ArrowDown'] || keys['s']) p.y += p.speed;
      p.x = Math.max(20, Math.min(NATIVE_W - 20, p.x));
      p.y = Math.max(20, Math.min(NATIVE_H - 20, p.y));

      // SMART BOMB
      if ((keys['Shift'] || keys['e']) && gs.bombs > 0 && p.cooldown <= 0) {
         triggerBomb(gs);
         p.cooldown = 60;
      }

      // PLAYER SHOOTING
      if (keys[' '] && p.cooldown <= 0) {
        let wLvl = Math.min(3, gs.weaponLevel);
        if (gs.weapon === 'twin') {
          gs.bullets.push({ x: p.x - 12, y: p.y - 15, vx: 0, vy: -12 - wLvl*2, w: 3+wLvl, h: 12+wLvl*2, type: 'bullet' });
          gs.bullets.push({ x: p.x + 9, y: p.y - 15, vx: 0, vy: -12 - wLvl*2, w: 3+wLvl, h: 12+wLvl*2, type: 'bullet' });
          p.cooldown = Math.max(6, 12 - wLvl*2);
          playAudio('shoot');
        } else if (gs.weapon === 'increase') {
          for(let i=0; i<=wLvl; i++) {
            gs.bullets.push({ x: p.x - 6 + (i*6), y: p.y - 15 - (i%2*5), vx: 0, vy: -16, w: 4, h: 16, type: 'bullet' });
            gs.bullets.push({ x: p.x - 6 - (i*6), y: p.y - 15 - (i%2*5), vx: 0, vy: -16, w: 4, h: 16, type: 'bullet' });
          }
          p.cooldown = 8; playAudio('shoot');
        } else if (gs.weapon === 'spread') {
          gs.bullets.push({ x: p.x, y: p.y - 15, vx: 0, vy: -12, w: 4, h: 12, type: 'bullet' });
          gs.bullets.push({ x: p.x, y: p.y - 15, vx: -3, vy: -11, w: 4, h: 12, type: 'bullet' });
          gs.bullets.push({ x: p.x, y: p.y - 15, vx: 3, vy: -11, w: 4, h: 12, type: 'bullet' });
          if (wLvl >= 2) {
            gs.bullets.push({ x: p.x, y: p.y - 15, vx: -6, vy: -10, w: 4, h: 12, type: 'bullet' });
            gs.bullets.push({ x: p.x, y: p.y - 15, vx: 6, vy: -10, w: 4, h: 12, type: 'bullet' });
          }
          p.cooldown = 14; playAudio('shoot');
        } else if (gs.weapon === 'missile') {
          gs.bullets.push({ x: p.x - 10, y: p.y, vx: 0, vy: -6 - wLvl, w: 6, h: 16, type: 'missile' });
          gs.bullets.push({ x: p.x + 8, y: p.y, vx: 0, vy: -6 - wLvl, w: 6, h: 16, type: 'missile' });
          p.cooldown = 25; playAudio('boom');
        } else if (gs.weapon === 'laser') {
          gs.bullets.push({ x: p.x - 2, y: p.y - 40, vx: 0, vy: -30, w: 6 + wLvl*2, h: 80, type: 'laser' });
          p.cooldown = 10; playAudio('laser');
        }
      }

      // Update Player Bullets
      for (let i = gs.bullets.length - 1; i >= 0; i--) {
        let b = gs.bullets[i];
        b.x += b.vx; b.y += b.vy;
        if (b.y < -40) gs.bullets.splice(i, 1);
      }

      // Update Powerups
      for (let i = gs.powerups.length - 1; i >= 0; i--) {
        let pu = gs.powerups[i];
        pu.y += pu.vy;
        if (Math.hypot(pu.x - p.x, pu.y - p.y) < 25) {
           if (gs.weapon === pu.type) gs.weaponLevel++;
           else { gs.weapon = pu.type; gs.weaponLevel = 1; }
           addScore(gs, 500); playAudio('powerup');
           gs.powerups.splice(i, 1);
           showMessage(gs, `${pu.type.toUpperCase()} LVL ${gs.weaponLevel}`);
           continue;
        }
        if (pu.y > NATIVE_H + 20) gs.powerups.splice(i, 1);
      }

      // Update Enemy Bullets
      for (let i = gs.enemyBullets.length - 1; i >= 0; i--) {
        let eb = gs.enemyBullets[i];
        eb.x += eb.vx; eb.y += eb.vy;
        if (eb.y > NATIVE_H + 20 || eb.x < -20 || eb.x > NATIVE_W + 20) {
          gs.enemyBullets.splice(i, 1); continue;
        }
        if (p.invuln <= 0 && Math.hypot(eb.x - p.x, eb.y - p.y) < 10) {
          playerHit(gs); break; 
        }
      }

      // Enemy Spawning (Stops if Boss is present or approaching)
      if (!gs.boss && gs.levelTick < MAX_TICK - 100) {
        let spawnRate = Math.max(20, 70 - (gs.level * 3));
        if (gs.tick % spawnRate === 0) {
          let rand = Math.random();
          let startX = 30 + Math.random() * (NATIVE_W - 60);
          
          if (rand < 0.4) {
            // TINY SQUADRON (Fast, V-formation, leader shoots)
            let count = Math.random() > 0.5 ? 5 : 3;
            for(let i=0; i<count; i++) {
              let offsetX = (i - Math.floor(count/2)) * 30;
              let offsetY = Math.abs(i - Math.floor(count/2)) * -25;
              gs.enemies.push({ tier: 'basic', class: 'tiny', x: startX + offsetX, y: -30 + offsetY, hp: 1, pts: 20, tick: 0, startX: startX + offsetX, isLeader: i === Math.floor(count/2) });
            }
          } else if (rand < 0.7) {
            // SLOW FIGHTER
            gs.enemies.push({ tier: 'basic', class: 'fighter', x: startX, y: -30, hp: 2, pts: 50, tick: 0, startX: startX });
          } else if (rand < 0.9) {
            // BOMBER
            gs.enemies.push({ tier: 'heavy', class: 'bomber', x: startX, y: -40, hp: 8, pts: 150, tick: 0, startX: startX });
          } else {
            // BOAT
            gs.enemies.push({ tier: 'medium', class: 'boat', x: Math.random() > 0.5 ? -30 : NATIVE_W + 30, y: 80 + Math.random() * 200, hp: 5, pts: 200, tick: 0, dir: Math.random() > 0.5 ? 1 : -1 });
          }
        }
      }

      // Boss Logic
      if (gs.boss) {
        let b = gs.boss;
        b.tick++;
        if (b.state === 'entering') {
          b.y += 1; if (b.y >= 80) b.state = 'fighting';
        } else if (b.state === 'fighting') {
          b.x = NATIVE_W/2 + Math.sin(b.tick * 0.02) * (NATIVE_W/2 - 60);
          if (b.tick % 60 === 0) {
             fireEnemyBullet(gs, b.x - 30, b.y + 20, 5, 0);
             fireEnemyBullet(gs, b.x + 30, b.y + 20, 5, 0);
          }
          if (b.tick % 150 === 0) {
             for(let i=-2; i<=2; i++) fireEnemyBullet(gs, b.x, b.y + 30, 4, i * 0.2);
          }
        }
        
        // Boss Player Collision
        if (p.invuln <= 0 && Math.hypot(b.x - p.x, b.y - p.y) < b.w/2) {
           playerHit(gs);
        }
      }

      // Enemy Logic
      for (let i = gs.enemies.length - 1; i >= 0; i--) {
        let e = gs.enemies[i];
        e.tick++;

        if (e.class === 'tiny') {
          e.y += 6; e.x = e.startX + Math.sin(e.tick * 0.1) * 20;
          if (e.isLeader && e.tick % 30 === 0 && Math.random() < 0.5) fireEnemyBullet(gs, e.x, e.y, 6);
        } else if (e.class === 'fighter') {
          e.y += 2.5; e.x = e.startX + Math.sin(e.tick * 0.03) * 60;
          if (e.tick % 80 === 0 && Math.random() < 0.4) fireEnemyBullet(gs, e.x, e.y, 4);
        } else if (e.class === 'bomber') {
          e.y += 1.2;
          if (e.tick % 50 === 0) fireEnemyBullet(gs, e.x, e.y, 4.5);
        } else if (e.class === 'boat') {
          e.x += 1.0 * e.dir; e.y += 0.8; 
          if (e.tick % 70 === 0) fireEnemyBullet(gs, e.x, e.y, 4);
        }

        if (e.y > NATIVE_H + 50 || e.x < -60 || e.x > NATIVE_W + 60) {
          gs.enemies.splice(i, 1); continue;
        }

        if (p.invuln <= 0 && e.class !== 'boat' && Math.hypot(e.x - p.x, e.y - p.y) < 18) {
          playerHit(gs); e.hp = 0; 
        }
      }

      // General Bullet Collision Processing
      for (let j = gs.bullets.length - 1; j >= 0; j--) {
        let b = gs.bullets[j];
        let bulletHit = false;

        // Check Boss
        if (gs.boss && gs.boss.state === 'fighting') {
           if (Math.abs(b.x - gs.boss.x) < gs.boss.w/2 && Math.abs(b.y - gs.boss.y) < gs.boss.h/2) {
              gs.boss.hp -= (b.type === 'missile' ? 5 : (b.type === 'laser' ? 2 : 1));
              bulletHit = true;
              gs.particles.push({x: b.x, y: b.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 10, color: '#fff'});
              
              if (gs.boss.hp <= 0) {
                 addScore(gs, gs.boss.pts);
                 playAudio('boom');
                 for(let k=0; k<100; k++) gs.particles.push({x: gs.boss.x + (Math.random()-0.5)*gs.boss.w, y: gs.boss.y + (Math.random()-0.5)*gs.boss.h, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 40 + Math.random()*60, color: Math.random()>0.5?'#f00':'#ff0'});
                 gs.boss = null;
                 gs.status = 'levelcleared';
                 gs.level++; gs.levelTick = 0;
                 showMessage(gs, "BOSS DESTROYED");
                 setTimeout(() => initMap(gs), 3000); // Swap palettes after pause
              }
           }
        }

        // Check Normal Enemies
        if (!bulletHit) {
          for (let i = gs.enemies.length - 1; i >= 0; i--) {
            let e = gs.enemies[i];
            let hitbox = e.class === 'bomber' ? 22 : (e.class === 'tiny' ? 10 : 14);
            if (Math.hypot(b.x - e.x, b.y - e.y) < hitbox) {
              e.hp -= (b.type === 'missile' ? 5 : (b.type === 'laser' ? 2 : 1));
              bulletHit = true;
              
              if (b.type === 'missile') { // Splash damage
                 playAudio('boom');
                 gs.particles.push({x: b.x, y: b.y, life: 15, isFlash: true, color: 'rgba(255,100,0,0.5)'});
                 gs.enemies.forEach(ex => { if(Math.hypot(ex.x - b.x, ex.y - b.y) < 60) ex.hp -= 3; });
              } else {
                 playAudio('hit');
                 gs.particles.push({x: b.x, y: b.y, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, life: 10, color: '#ffaa00'});
              }
              break;
            }
          }
        }

        // Process enemy deaths from this frame
        for (let i = gs.enemies.length - 1; i >= 0; i--) {
            let e = gs.enemies[i];
            if (e.hp <= 0) {
              addScore(gs, e.pts);
              playAudio('boom');
              let explosionCount = e.class === 'bomber' ? 25 : 10;
              for(let k=0; k<explosionCount; k++) {
                gs.particles.push({ x: e.x + (Math.random()-0.5)*10, y: e.y + (Math.random()-0.5)*10, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 20 + Math.random()*25, color: Math.random() > 0.5 ? '#f00' : '#ffaa00' });
              }
              
              // Drop Logic
              gs.kills[e.tier]++;
              if ((e.tier === 'basic' && gs.kills.basic >= 15) || 
                  (e.tier === 'medium' && gs.kills.medium >= 5) || 
                  (e.tier === 'heavy' && gs.kills.heavy >= 2)) {
                  spawnPowerup(gs, e.x, e.y);
                  gs.kills[e.tier] = 0;
              }
              gs.enemies.splice(i, 1);
            }
        }

        if (bulletHit && b.type !== 'laser') gs.bullets.splice(j, 1);
      }
    };

    // --- RENDER ENGINE ---
    const draw = () => {
      let gs = state.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let theme = THEMES[(gs.level - 1) % 4];
      ctx.fillStyle = theme.water;
      ctx.fillRect(0, 0, NATIVE_W, NATIVE_H);

      if (gs.status === 'start') {
        ctx.fillStyle = '#ffaa00'; ctx.font = '60px "VT323", monospace'; ctx.textAlign = 'center'; ctx.fillText("BASS 1941", NATIVE_W/2, 160);
        ctx.fillStyle = '#fff'; ctx.font = '30px "VT323", monospace'; ctx.fillText("PACIFIC STRIKE", NATIVE_W/2, 200);
        ctx.font = '24px "VT323", monospace'; ctx.fillText("PRESS ENTER TO START", NATIVE_W/2, 300);
        ctx.fillStyle = '#aaa'; ctx.font = '18px "VT323", monospace';
        ctx.fillText("WASD: Move | SPACE: Fire | SHIFT: Smart Bomb", NATIVE_W/2, 350);
        return;
      }

      gs.islands.forEach(isl => {
        ctx.fillStyle = theme.sand;
        isl.shapes.forEach(sh => { ctx.beginPath(); ctx.arc(Math.floor(isl.x + sh.ox), Math.floor(isl.y + sh.oy), sh.r, 0, Math.PI*2); ctx.fill(); });
        ctx.fillStyle = theme.jungle;
        isl.shapes.forEach(sh => { ctx.beginPath(); ctx.arc(Math.floor(isl.x + sh.ox), Math.floor(isl.y + sh.oy), sh.r * 0.75, 0, Math.PI*2); ctx.fill(); });
      });

      const shadowOffset = 12;
      gs.enemies.forEach(e => { if (e.class !== 'boat') drawSprite(SPRITES[e.class === 'tiny' ? 'tinyFighter' : e.class], e.x + shadowOffset, e.y + shadowOffset, e.class === 'tiny' ? 2 : 3, true); });
      if (gs.boss) drawSprite(SPRITES.boss, gs.boss.x + shadowOffset*2, gs.boss.y + shadowOffset*2, 3, true);
      if ((gs.status === 'playing' || gs.status === 'respawning') && gs.player.invuln % 10 < 5) {
         drawSprite(SPRITES.player, gs.player.x + shadowOffset, gs.player.y + shadowOffset, 3, true);
      }

      gs.enemies.forEach(e => { if (e.class === 'boat') drawSprite(SPRITES.boat, e.x, e.y, 3, false); });
      gs.enemies.forEach(e => { if (e.class !== 'boat') drawSprite(SPRITES[e.class === 'tiny' ? 'tinyFighter' : e.class], e.x, e.y, e.class === 'tiny' ? 2 : 3, false); });
      if (gs.boss) drawSprite(SPRITES.boss, gs.boss.x, gs.boss.y, 3, false);

      gs.powerups.forEach(pu => {
         ctx.fillStyle = pu.type === 'increase' ? '#f00' : pu.type === 'spread' ? '#0f0' : pu.type === 'missile' ? '#ff0' : '#0ff';
         ctx.fillRect(pu.x - pu.w/2, pu.y - pu.h/2, pu.w, pu.h);
         ctx.fillStyle = '#fff'; ctx.font = '14px "VT323", monospace'; ctx.textAlign = 'center';
         ctx.fillText(pu.type.charAt(0).toUpperCase(), pu.x, pu.y + 4);
      });

      if (gs.status === 'playing' && gs.player.invuln % 10 < 5) {
        drawSprite(SPRITES.player, gs.player.x, gs.player.y, 3, false);
      } else if (gs.status === 'respawning' && gs.respawnTimer < 60) {
        ctx.fillStyle = '#0f0'; ctx.font = '40px "VT323", monospace'; ctx.textAlign = 'center'; ctx.fillText("READY", NATIVE_W/2, NATIVE_H/2);
        if (Math.floor(Date.now() / 150) % 2 === 0) drawSprite(SPRITES.player, gs.player.x, gs.player.y, 3, false);
      }

      gs.bullets.forEach(b => {
         ctx.fillStyle = b.type === 'missile' ? '#ff0' : b.type === 'laser' ? '#0ff' : '#ffaa00';
         ctx.fillRect(Math.floor(b.x), Math.floor(b.y), b.w, b.h);
      });

      gs.enemyBullets.forEach(eb => {
        ctx.fillStyle = Math.floor(Date.now() / 100) % 2 === 0 ? '#ff0000' : '#ffaa00';
        ctx.beginPath(); ctx.arc(Math.floor(eb.x), Math.floor(eb.y), eb.r, 0, Math.PI*2); ctx.fill();
      });

      gs.particles.forEach(p => {
        if (p.isFlash) {
           ctx.fillStyle = p.color || `rgba(255, 255, 255, ${p.life/30})`;
           ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
        } else {
           ctx.fillStyle = p.color;
           let size = Math.max(2, Math.floor((p.life / 20) * 4));
           ctx.fillRect(Math.floor(p.x), Math.floor(p.y), size, size);
        }
      });

      ctx.fillStyle = '#fff'; ctx.font = '24px "VT323", monospace'; ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${formatScore(gs.score)}`, 10, 25);
      
      // Draw Bombs
      for(let i=0; i<gs.bombs; i++) {
        ctx.fillStyle = '#f00'; ctx.beginPath(); ctx.arc(10 + i*15, 45, 5, 0, Math.PI*2); ctx.fill();
      }

      ctx.textAlign = 'right';
      ctx.fillText(`LIVES: ${gs.lives}`, NATIVE_W - 10, 25);

      if (gs.messageTimer > 0) {
        ctx.fillStyle = '#0ff'; ctx.textAlign = 'center'; ctx.font = '30px "VT323", monospace';
        ctx.fillText(gs.messageText, NATIVE_W/2, NATIVE_H/2 - 50);
      }

      if (gs.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,NATIVE_W,NATIVE_H);
        ctx.fillStyle = '#f00'; ctx.textAlign = 'center'; ctx.font = '50px "VT323", monospace';
        ctx.fillText("MISSION FAILED", NATIVE_W/2, NATIVE_H/2 - 10);
        ctx.fillStyle = '#fff'; ctx.font = '24px "VT323", monospace';
        ctx.fillText("PRESS ENTER TO RESTART", NATIVE_W/2, NATIVE_H/2 + 30);
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
      <canvas 
        ref={canvasRef} 
        width={NATIVE_W} 
        height={NATIVE_H} 
        style={{ imageRendering: 'pixelated' }} 
        className="w-full h-full object-contain bg-black cursor-none" 
      />
    </div>
  );
};

// --- BASS OREGON TRAIL COMPONENT ---
const OregonTrailGame = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);

  // Original-style low resolution scaled up
  const NATIVE_W = 640;
  const NATIVE_H = 480;

  const state = useRef({
    screen: 'main_menu', // main_menu, travel, size_up, event
    inputBuffer: '',
    blinkTimer: 0,
    animTick: 0,
    
    // Game Data
    party: [
      { name: 'Merk', health: 100, disease: null },
      { name: 'Mary', health: 100, disease: null },
      { name: 'John', health: 100, disease: null },
      { name: 'Luke', health: 100, disease: null }
    ],
    inventory: { money: 400, oxen: 4, food: 200, clothing: 10, ammo: 50, wheels: 3, axles: 2, tongues: 2 },
    trail: { miles: 0, nextLandmark: 102, weather: 'cool', pace: 2, rations: 2 },
    date: { month: 4, day: 1, year: 1848 }, // Starts May 1st (0-indexed months)
    
    // Event System
    currentEvent: null,
    eventTimer: 0,
    
    keys: {}
  });

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WEATHER_TYPES = ["very cold", "cold", "cool", "mild", "warm", "hot", "very hot"];

  useEffect(() => {
    const handleKeyDown = e => {
      let gs = state.current;
      
      // Global Menu Exit
      if (e.key === 'Escape') { onMenu(); return; }

      // Custom Text Input Handler
      if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
        gs.inputBuffer += e.key;
        playAudio('type');
      } else if (e.key === 'Backspace') {
        gs.inputBuffer = gs.inputBuffer.slice(0, -1);
        playAudio('type');
      } else if (e.key === 'Enter') {
        processInput(gs.inputBuffer);
        gs.inputBuffer = '';
        playAudio('enter');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMenu]);

  // --- AUDIO SYSTEM ---
  const playAudio = (type) => {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const t = audioCtx.currentTime;
    if (type === 'type') {
      let osc = audioCtx.createOscillator(); osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.05);
    } else if (type === 'enter') {
      let osc = audioCtx.createOscillator(); osc.type = 'square';
      osc.frequency.setValueAtTime(400, t); osc.frequency.setValueAtTime(600, t+0.05);
      let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.15);
    } else if (type === 'event') {
      let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t); osc.frequency.linearRampToValueAtTime(100, t+0.5);
      let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.2, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.5);
      osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.5);
    }
  };

  // --- LOGIC PARSERS ---
  const processInput = (input) => {
    let gs = state.current;
    let cmd = input.trim().toLowerCase();

    if (gs.screen === 'main_menu') {
      if (cmd === '1') { gs.screen = 'travel'; }
      else if (cmd === '6') { onMenu(); }
    } 
    else if (gs.screen === 'travel') {
      gs.screen = 'size_up';
    }
    else if (gs.screen === 'size_up') {
      if (cmd === '1') { gs.screen = 'travel'; } 
      else if (cmd === '4') { 
        gs.trail.pace = gs.trail.pace === 3 ? 1 : gs.trail.pace + 1;
      }
      else if (cmd === '5') { 
        gs.trail.rations = gs.trail.rations === 3 ? 1 : gs.trail.rations + 1;
      }
    }
    else if (gs.screen === 'event') {
      gs.screen = 'travel';
      gs.currentEvent = null;
    }
  };

  const advanceDay = (gs) => {
    // Date Logic
    gs.date.day++;
    let daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][gs.date.month];
    if (gs.date.day > daysInMonth) {
      gs.date.day = 1;
      gs.date.month++;
      if (gs.date.month > 11) { gs.date.month = 0; gs.date.year++; }
      let wIdx = 3 - Math.abs(6 - gs.date.month); 
      wIdx = Math.max(0, Math.min(6, wIdx + 2 + Math.floor(Math.random()*3 - 1)));
      gs.trail.weather = WEATHER_TYPES[wIdx];
    }

    // Consumption
    let livingMembers = gs.party.filter(p => p.health > 0).length;
    if (livingMembers === 0) { gs.screen = 'gameover'; return; }
    
    let foodEaten = livingMembers * gs.trail.rations;
    gs.inventory.food -= foodEaten;
    if (gs.inventory.food < 0) {
      gs.inventory.food = 0;
      gs.party.forEach(p => { if(p.health > 0) p.health -= 15; });
    }

    // Distance
    let milesMoved = (10 + (gs.trail.pace * 5)) + Math.floor(Math.random() * 5);
    if (gs.inventory.oxen <= 0) milesMoved = 0;
    
    gs.trail.miles += milesMoved;
    gs.trail.nextLandmark -= milesMoved;

    if (gs.trail.nextLandmark <= 0) {
      gs.trail.nextLandmark = 100 + Math.floor(Math.random() * 150);
      triggerEvent(gs, "You reached a landmark!");
      return;
    }

    // Random Events
    if (Math.random() < 0.05) {
      let randPerson = gs.party[Math.floor(Math.random() * gs.party.length)];
      if (randPerson.health > 0) {
        let diseases = ["dysentery", "cholera", "exhaustion", "a broken arm", "snakebite"];
        let illness = diseases[Math.floor(Math.random() * diseases.length)];
        randPerson.health -= 30;
        triggerEvent(gs, `${randPerson.name} has ${illness}.`);
      } else {
        triggerEvent(gs, "A wagon wheel broke.");
        gs.inventory.wheels--;
      }
    }
  };

  const triggerEvent = (gs, text) => {
    gs.currentEvent = text;
    gs.screen = 'event';
    playAudio('event');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let lastTime = Date.now();
    let dayTimer = 0;

    // --- DRAWING HELPERS ---
    const drawText = (text, x, y, color, size = 20) => {
      ctx.fillStyle = color;
      ctx.font = `${size}px "VT323", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(text, x, y);
    };

    const drawRightText = (text, x, y, color, size = 20) => {
      ctx.fillStyle = color;
      ctx.font = `${size}px "VT323", monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(text, x, y);
    };

    const drawCenterText = (text, y, color, size = 20) => {
      ctx.fillStyle = color;
      ctx.font = `${size}px "VT323", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(text, NATIVE_W / 2, y);
    };

    const drawUIBorder = (y) => {
      ctx.fillStyle = '#DA8A67'; 
      ctx.fillRect(40, y, NATIVE_W - 80, 4);
      ctx.beginPath(); ctx.moveTo(NATIVE_W/2, y - 6); ctx.lineTo(NATIVE_W/2 + 10, y + 2); 
      ctx.lineTo(NATIVE_W/2, y + 10); ctx.lineTo(NATIVE_W/2 - 10, y + 2); ctx.fill();
    };

    const drawMountains = (offset) => {
      ctx.save();
      ctx.translate(-offset % 640, 0); 
      for(let i=0; i<3; i++) {
        let x = i * 400;
        ctx.fillStyle = '#A0A';
        ctx.beginPath(); ctx.moveTo(x, 180); ctx.lineTo(x+150, 80); ctx.lineTo(x+250, 120); ctx.lineTo(x+350, 60); ctx.lineTo(x+500, 180); ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.moveTo(x+110, 105); ctx.lineTo(x+150, 80); ctx.lineTo(x+190, 100); ctx.lineTo(x+150, 120); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x+300, 100); ctx.lineTo(x+350, 60); ctx.lineTo(x+400, 100); ctx.lineTo(x+350, 120); ctx.fill();
        ctx.fillStyle = '#00A';
        ctx.beginPath(); ctx.moveTo(x+150, 120); ctx.lineTo(x+190, 100); ctx.lineTo(x+250, 120); ctx.lineTo(x+200, 150); ctx.fill();
      }
      ctx.restore();
    };

    const drawWagon = (x, y, tick) => {
      let bounce = (tick % 20 < 10) ? 0 : 2;
      ctx.save(); ctx.translate(x, y + bounce);
      ctx.fillStyle = '#FFF';
      ctx.beginPath(); ctx.arc(20, 30, 12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(70, 30, 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(20, 30, 10, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(70, 30, 10, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2;
      ctx.save(); ctx.translate(20, 30); ctx.rotate(tick * 0.1);
      ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(10,0); ctx.moveTo(0,-10); ctx.lineTo(0,10); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(70, 30); ctx.rotate(tick * 0.1);
      ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(10,0); ctx.moveTo(0,-10); ctx.lineTo(0,10); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#AA5500'; ctx.fillRect(10, 10, 70, 15);
      ctx.fillStyle = '#FFF';
      ctx.beginPath(); ctx.arc(45, 10, 35, Math.PI, 0); ctx.fill();
      ctx.fillRect(10, -10, 70, 20);
      ctx.strokeStyle = '#000'; ctx.beginPath();
      ctx.moveTo(30, 10); ctx.lineTo(30, -15); ctx.moveTo(50, 10); ctx.lineTo(50, -20); ctx.stroke();
      ctx.restore();
    };

    const drawOxen = (x, y, tick) => {
      let stride = (tick % 40 < 20) ? 0 : 1;
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, 40, 20);
      ctx.fillStyle = '#AA5500'; ctx.fillRect(10, 5, 10, 10); ctx.fillRect(30, 0, 10, 8);
      ctx.fillStyle = '#FFF';
      if (stride === 0) {
        ctx.fillRect(5, 20, 4, 15); ctx.fillRect(15, 20, 4, 15);
        ctx.fillRect(30, 20, 4, 15); ctx.fillRect(38, 20, 4, 15);
      } else {
        ctx.beginPath(); ctx.moveTo(5, 20); ctx.lineTo(0, 35); ctx.lineTo(4, 35); ctx.lineTo(9, 20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(15, 20); ctx.lineTo(20, 35); ctx.lineTo(24, 35); ctx.lineTo(19, 20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(30, 20); ctx.lineTo(25, 35); ctx.lineTo(29, 35); ctx.lineTo(34, 20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(38, 20); ctx.lineTo(43, 35); ctx.lineTo(47, 35); ctx.lineTo(42, 20); ctx.fill();
      }
      ctx.fillRect(-15, -5, 15, 15);
      ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-15, -15); ctx.moveTo(-5, -5); ctx.lineTo(0, -15); ctx.stroke();
      ctx.fillStyle = '#AA5500'; ctx.fillRect(-5, 5, 8, 4); ctx.fillRect(40, 10, 40, 4);
      ctx.restore();
    };

    const draw = () => {
      let gs = state.current;
      gs.blinkTimer++;
      gs.animTick++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (gs.screen === 'main_menu') {
        drawCenterText("The Oregon Trail", 80, '#FFF', 60);
        drawUIBorder(120);
        
        // FIXED MENU Y-COORDINATES (Proper spacing)
        let startY = 180;
        drawText("You may:", 150, startY, '#FFF', 24);
        drawText("1. Travel the trail", 180, startY + 40, '#FFF', 24);
        drawText("2. Learn about the trail", 180, startY + 70, '#FFF', 24);
        drawText("3. See the Oregon Top Ten", 180, startY + 100, '#FFF', 24);
        drawText("4. Turn sound off", 180, startY + 130, '#FFF', 24);
        drawText("5. Choose Management Options", 180, startY + 160, '#FFF', 24);
        drawText("6. End (Return to Hub)", 180, startY + 190, '#FFF', 24);

        let inputStr = `What is your choice? ${gs.inputBuffer}${gs.blinkTimer % 60 < 30 ? '_' : ''}`;
        drawText(inputStr, 150, startY + 250, '#FFF', 24);
        drawUIBorder(450);
      }

      else if (gs.screen === 'travel' || gs.screen === 'size_up' || gs.screen === 'event') {
        drawCenterText("The Oregon Trail", 50, '#DA8A67', 50);
        
        ctx.fillStyle = '#000'; ctx.fillRect(0, 60, NATIVE_W, 180); 
        drawMountains(gs.screen === 'travel' ? gs.animTick * 2 : 0);
        
        ctx.fillStyle = '#0A0'; ctx.fillRect(200, 160, 240, 40); 
        ctx.fillStyle = '#00A'; ctx.fillRect(220, 170, 200, 10); 
        
        ctx.fillStyle = '#FCB473'; 
        ctx.fillRect(0, 220, NATIVE_W, 100);

        drawOxen(350, 170, gs.screen === 'travel' ? gs.animTick : 0);
        drawWagon(420, 160, gs.screen === 'travel' ? gs.animTick : 0);

        drawUIBorder(290);

        // HUD Background
        ctx.fillStyle = '#FFF';
        ctx.fillRect(30, 330, NATIVE_W - 60, 140);

        if (gs.screen === 'size_up') {
          ctx.fillStyle = '#000'; ctx.fillRect(30, 305, NATIVE_W - 60, 25);
          drawCenterText("Press 1 to continue, 4 for Pace, 5 for Rations", 325, '#FFF', 22);
        } else {
          ctx.fillStyle = '#000'; ctx.fillRect(30, 305, NATIVE_W - 60, 25);
          drawCenterText("Press ENTER to size up the situation", 325, '#FFF', 24);
        }

        let hlth = gs.party.filter(p => p.health > 0).length === 0 ? "Dead" : (gs.party[0].health > 70 ? "good" : "poor");
        let paces = ["stopped", "steady", "strenuous", "grueling"];
        let rats = ["none", "bare bones", "meager", "filling"];

        // FIXED 2-COLUMN HUD ALIGNMENT
        drawRightText(`Date:`, 240, 360, '#000', 22); 
        drawText(`${MONTHS[gs.date.month]} ${gs.date.day}, ${gs.date.year}`, 250, 360, '#000', 22);
        
        drawRightText(`Weather:`, 240, 385, '#000', 22); 
        drawText(`${gs.trail.weather}`, 250, 385, '#000', 22);
        
        drawRightText(`Health:`, 240, 410, '#000', 22); 
        drawText(`${hlth}`, 250, 410, '#000', 22);
        
        drawRightText(`Food:`, 240, 435, '#000', 22); 
        drawText(`${gs.inventory.food} pounds`, 250, 435, '#000', 22);

        drawRightText(`Next landmark:`, 480, 360, '#000', 22); 
        drawText(`${gs.trail.nextLandmark} miles`, 490, 360, '#000', 22);
        
        drawRightText(`Miles traveled:`, 480, 385, '#000', 22); 
        drawText(`${gs.trail.miles} miles`, 490, 385, '#000', 22);
        
        drawRightText(`Pace:`, 480, 410, '#000', 22); 
        drawText(`${paces[gs.trail.pace]}`, 490, 410, '#000', 22);
        
        drawRightText(`Rations:`, 480, 435, '#000', 22); 
        drawText(`${rats[gs.trail.rations]}`, 490, 435, '#000', 22);

        if (gs.screen === 'event') {
           ctx.fillStyle = '#000';
           ctx.fillRect(80, 340, NATIVE_W - 160, 60);
           ctx.strokeStyle = '#FFF'; ctx.lineWidth = 4;
           ctx.strokeRect(82, 342, NATIVE_W - 164, 56);
           drawCenterText(gs.currentEvent, 375, '#FFF', 24);
           if (gs.blinkTimer % 60 < 30) drawCenterText("Press ENTER", 395, '#0f0', 16);
        }
      }
      
      else if (gs.screen === 'gameover') {
        drawCenterText("GAME OVER", 200, '#F00', 60);
        drawCenterText("All members of your wagon party have died.", 260, '#FFF', 24);
        drawCenterText("Press ESC to return to Hub.", 350, '#FFF', 20);
      }

      // Draw subtle internal border frame so the edges define the screen boundary
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    };

    const update = () => {
      let gs = state.current;
      let now = Date.now();
      let dt = now - lastTime;
      lastTime = now;

      if (gs.screen === 'travel') {
        dayTimer += dt;
        if (dayTimer > 2000) { 
          dayTimer = 0;
          advanceDay(gs);
        }
      }
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [audioCtx, onMenu]);

  return (
    // ADDED PADDING (p-6 md:p-12) to push the canvas inside the safe zone away from the curved bezel!
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent p-6 md:p-12">
      <canvas 
        ref={canvasRef} 
        width={NATIVE_W} 
        height={NATIVE_H} 
        style={{ imageRendering: 'pixelated' }} 
        className="w-full h-full object-contain bg-black cursor-none" 
      />
    </div>
  );
};

// --- BASS SPACE INVADERS COMPONENT ---
const InvadersGame = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);

  const state = useRef({
    status: 'start',
    score: 0,
    highScore: 0,
    lives: 3,
    wave: 1,
    respawnTimer: 0, // NEW: Tracks the pause duration
    player: { x: 380, y: 530, w: 34, h: 28, speed: 5, cooldown: 0 },
    bullets: [],
    enemyBullets: [],
    fleet: { x: 50, y: 80, dx: 1, speed: 60, tick: 0, dropNext: false, stepCount: 0 },
    enemies: [],
    shields: [],
    ufo: { active: false, x: 0, y: 50, dx: 0, timer: 1000 },
    particles: [],
    stars: Array(120).fill().map(() => {
      const isColored = Math.random() < 0.25; 
      const colors = ['rgba(0, 255, 255, 0.6)', 'rgba(255, 0, 255, 0.6)', 'rgba(255, 255, 0, 0.6)', 'rgba(255, 0, 0, 0.6)', 'rgba(0, 255, 0, 0.6)'];
      return { 
        x: Math.random() * 800, y: Math.random() * 600, 
        speed: (2 + Math.random() * 5) * 0.75, 
        color: isColored ? colors[Math.floor(Math.random() * colors.length)] : '#ffffff',
        twinkleTimer: Math.random() * 100
      };
    }),
    keys: {}
  });

  // Pixel Art Dictionaries
  const SHIP_SPRITE = [
    ".......W.......",
    ".......W.......",
    "......WWW......",
    "..R...WWW...R..",
    "..R...WWW...R..",
    "..R..BWWWB..R..",
    "..WWWWWRWWWWW..",
    "..WWWW.R.WWWW..",
    "..WWWRRRRRWWW..",
    "..WWWWWWWWWWW..",
    ".WWWWWWWWWWWWW.",
    "WWWW.......WWWW",
    "WWW.........WWW"
  ];

  const VIRUS_SPRITES = {
    // Type 3: Yellow Amoeba
    0: ["..Y.YYYYY.Y..", ".YYYYYYYYYYY.", "YY.YY.Y.YY.YY", "YYYY.YYY.YYYY", "YYYYYYYYYYYYY", "YYY..YYY..YYY", ".Y.Y..Y..Y.Y."],
    // Type 2: Magenta Crawler
    1: ["...MMMMMMM...", ".MMMMMMMMMMM.", "MMM..MMM..MMM", "MMMM.MMM.MMMM", "MMMMMMMMMMMMM", ".M.M.M.M.M.M.", "..M...M...M.."],
    // Type 1: Cyan Spiky
    2: ["..C..C.C..C..", ".CCCCCCCCCCC.", "CC.CC.C.CC.CC", "CCCCCCCCCCCCC", "CCC..CCC..CCC", ".C.C.C.C.C.C.", "C...C...C...C"]
  };

  const SHIELD_SPRITE = [
    ".SSSSS.",
    "SSSSSSS",
    "SSSSSSS",
    "SSS.SSS",
    "SS...SS"
  ];

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // --- AUDIO ---
    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      if (type === 'shoot') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.15);
      } else if (type === 'hit') {
        let buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
        let data = buf.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        let src = audioCtx.createBufferSource(); src.buffer = buf;
        let filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400;
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        src.connect(filter).connect(gain).connect(audioCtx.destination); src.start(t);
      } else if (type === 'step') {
        let osc = audioCtx.createOscillator(); osc.type = 'square';
        const notes = [100, 90, 80, 70];
        osc.frequency.setValueAtTime(notes[state.current.fleet.stepCount % 4], t);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.05);
      } else if (type === 'ufo') {
        let osc = audioCtx.createOscillator(); osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t); osc.frequency.linearRampToValueAtTime(1200, t+0.2); osc.frequency.linearRampToValueAtTime(800, t+0.4);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.4);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.4);
      }
    };

    // --- SPAWNERS ---
    const buildShields = () => {
      let shields = [];
      const startX = 120; const spacing = 180;
      for (let s = 0; s < 4; s++) {
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 7; c++) {
            if (SHIELD_SPRITE[r][c] === 'S') {
              shields.push({ x: startX + (s * spacing) + (c * 8), y: 450 + (r * 8), w: 8, h: 8, hp: 4 });
            }
          }
        }
      }
      return shields;
    };

    const buildFleet = (wave) => {
      let enemies = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 11; col++) {
          let type = row === 0 ? 0 : (row < 3 ? 1 : 2);
          enemies.push({ r: row, c: col, type: type, alive: true, pts: type === 0 ? 30 : (type === 1 ? 20 : 10) });
        }
      }
      return { enemies, x: 50, y: 80 + (wave > 1 ? 20 : 0), dx: 15, speed: Math.max(5, 55 - (wave * 5)), tick: 0, dropNext: false, stepCount: 0 };
    };

    const resetLevel = (gs, fullReset = false) => {
      if (fullReset) { gs.score = 0; gs.lives = 3; gs.wave = 1; }
      
      const newFleet = buildFleet(gs.wave);
      gs.enemies = newFleet.enemies;
      gs.fleet = { x: newFleet.x, y: newFleet.y, dx: newFleet.dx, speed: newFleet.speed, tick: 0, dropNext: false, stepCount: 0 };
      
      gs.shields = buildShields();
      gs.bullets = []; gs.enemyBullets = []; gs.particles = [];
      gs.player = { x: 380, y: 530, w: 34, h: 28, speed: 5, cooldown: 0 };
      gs.ufo = { active: false, x: 0, y: 50, dx: 0, timer: 800 };
    };

    // --- NEW: DEATH HANDLER ---
    const killPlayer = (gs) => {
      gs.lives--; 
      playAudio('hit');
      
      // Massive explosion sequence
      for(let k=0; k<50; k++) {
        gs.particles.push({
          x: gs.player.x + 17, 
          y: gs.player.y + 14, 
          vx: (Math.random()-0.5)*15, 
          vy: (Math.random()-0.5)*15, 
          life: 60, // Lasts longer to cover the pause
          color: Math.random() > 0.5 ? '#f00' : '#fa0'
        });
      }
      
      // Clear the screen of stray bullets for fairness upon respawn
      gs.bullets = [];
      gs.enemyBullets = [];
      
      if (gs.lives <= 0) {
        gs.status = 'gameover';
      } else {
        gs.status = 'respawning';
        gs.respawnTimer = 120; // Pauses gameplay for 2 seconds (at 60fps)
        gs.player.x = 380; // Reset player to center spawn point
        gs.player.cooldown = 0;
      }
    };

    // --- DRAWING HELPERS ---
    const drawSprite = (spriteArr, x, y, scale = 2) => {
      for (let r = 0; r < spriteArr.length; r++) {
        for (let c = 0; c < spriteArr[r].length; c++) {
          let char = spriteArr[r][c];
          if (char === '.') continue;
          if (char === 'W') ctx.fillStyle = '#ffffff';
          if (char === 'R') ctx.fillStyle = '#ff0000';
          if (char === 'B') ctx.fillStyle = '#00aaff';
          if (char === 'Y') ctx.fillStyle = '#ffff00';
          if (char === 'M') ctx.fillStyle = '#ff00ff';
          if (char === 'C') ctx.fillStyle = '#00ffff';
          ctx.shadowBlur = 0; // Absolute crispness
          ctx.fillRect(x + (c * scale), y + (r * scale), scale, scale);
        }
      }
    };

    const draw = () => {
      let gs = state.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield (Galaga style)
      gs.stars.forEach(s => { 
        s.twinkleTimer++;
        ctx.fillStyle = s.color;
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        let size = (Math.floor(s.twinkleTimer / 10) % 2 === 0) ? 3 : 1;
        ctx.fillRect(s.x, s.y, size, size + s.speed); 
      });

      if (gs.status === 'start') {
        ctx.fillStyle = '#0f0'; ctx.font = '60px "VT323", monospace'; ctx.textAlign = 'center'; ctx.fillText("BASS INVADERS", 400, 250);
        ctx.fillStyle = '#fff'; ctx.font = '30px "VT323", monospace'; ctx.fillText("VIRAL INCURSION", 400, 300);
        ctx.font = '24px "VT323", monospace'; ctx.fillText("PRESS ENTER TO START", 400, 380);
        ctx.font = '20px "VT323", monospace'; ctx.fillText("PRESS M FOR MENU", 400, 420);
        ctx.fillText("A/D: Move | SPACE: Fire Laser", 400, 470);
        return;
      }

      // Draw Player & Respawn HUD
      if (gs.status === 'playing' || gs.status === 'levelcleared') {
        drawSprite(SHIP_SPRITE, gs.player.x, gs.player.y, 2.5);
      } else if (gs.status === 'respawning') {
        // Wait 1 second (60 frames) to let the explosion finish, then blink the ship & show READY
        if (gs.respawnTimer < 60) {
          ctx.fillStyle = '#0f0'; ctx.font = '40px "VT323", monospace'; ctx.textAlign = 'center';
          ctx.fillText("READY", 400, 320);
          if (Math.floor(Date.now() / 150) % 2 === 0) {
            drawSprite(SHIP_SPRITE, gs.player.x, gs.player.y, 2.5);
          }
        }
      }

      // Draw Fleet
      gs.enemies.forEach(e => {
        if (e.alive) {
          let ex = gs.fleet.x + (e.c * 45);
          let ey = gs.fleet.y + (e.r * 35);
          let animSprite = [...VIRUS_SPRITES[e.type]];
          if (gs.fleet.stepCount % 2 !== 0) animSprite[6] = animSprite[6].split('').reverse().join(''); 
          drawSprite(animSprite, ex, ey, 2.5);
        }
      });

      // Draw UFO
      if (gs.ufo.active) {
        ctx.fillStyle = '#f00'; ctx.fillRect(gs.ufo.x, gs.ufo.y, 40, 16);
        ctx.fillStyle = '#fff'; ctx.fillRect(gs.ufo.x + 10, gs.ufo.y - 8, 20, 8);
        if (Math.floor(Date.now() / 100) % 2 === 0) { ctx.fillStyle = '#ff0'; ctx.fillRect(gs.ufo.x + 4, gs.ufo.y + 4, 32, 4); }
      }

      // Draw Shields
      gs.shields.forEach(s => {
        ctx.fillStyle = s.hp > 2 ? '#0f0' : (s.hp === 2 ? '#fa0' : '#f00');
        ctx.fillRect(s.x, s.y, s.w, s.h);
      });

      // Draw Player Laser
      ctx.fillStyle = '#f00'; ctx.shadowBlur = 0;
      let pulse = Math.abs(Math.sin(Date.now() * 0.05)) * 4;
      gs.bullets.forEach(b => ctx.fillRect(b.x - pulse/2, b.y, 6 + pulse, 35));

      // Draw Enemy Bullets
      ctx.fillStyle = '#fff';
      gs.enemyBullets.forEach(eb => {
        ctx.fillRect(eb.x, eb.y, 4, 12);
        if (Math.floor(Date.now() / 50) % 2 === 0) { ctx.fillStyle = '#ff0'; ctx.fillRect(eb.x-2, eb.y+4, 8, 4); ctx.fillStyle='#fff';}
      });

      // Draw Particles
      gs.particles.forEach(p => {
        ctx.fillStyle = p.color || '#fff'; ctx.fillRect(p.x, p.y, 3, 3);
      });

      // HUD
      ctx.fillStyle = '#fff'; ctx.font = '24px "VT323", monospace'; ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${String(gs.score).padStart(6, '0')}`, 20, 30);
      ctx.textAlign = 'center'; ctx.fillText(`WAVE: ${gs.wave}`, 400, 30);
      ctx.textAlign = 'right'; ctx.fillText(`LIVES: ${gs.lives}`, 780, 30);

      if (gs.status === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,800,600);
        ctx.fillStyle = '#f00'; ctx.font = '80px "VT323", monospace'; ctx.textAlign = 'center'; ctx.fillText("GAME OVER", 400, 280);
        ctx.fillStyle = '#fff'; ctx.font = '30px "VT323", monospace'; ctx.fillText("PRESS ENTER TO RESTART", 400, 350);
        ctx.font = '24px "VT323", monospace'; ctx.fillText("PRESS M FOR MENU", 400, 400);
      }
    };

    const update = () => {
      let gs = state.current;
      let keys = gs.keys;

      if (keys['m'] || keys['M']) { onMenu(); return; }

      // Starfield always moves
      gs.stars.forEach(s => {
        s.y += s.speed;
        if (s.y > 600) { s.y = -20; s.x = Math.random() * 800; }
      });

      if (gs.status === 'start' && keys['Enter']) { resetLevel(gs, true); gs.status = 'playing'; }
      if (gs.status === 'gameover' && keys['Enter']) { resetLevel(gs, true); gs.status = 'playing'; }
      if (gs.status === 'levelcleared') {
        gs.wave++; resetLevel(gs, false); gs.status = 'playing';
      }

      // --- NEW: RESPAWN PAUSE LOGIC ---
      if (gs.status === 'respawning') {
        gs.respawnTimer--;
        
        // Still animate the explosion particles during the freeze!
        for (let i = gs.particles.length - 1; i >= 0; i--) {
          let p = gs.particles[i];
          p.x += p.vx; p.y += p.vy; p.life--;
          if (p.life <= 0) gs.particles.splice(i, 1);
        }

        // Resume game when timer hits 0
        if (gs.respawnTimer <= 0) gs.status = 'playing';
        
        return; // EARLY EXIT: Freezes enemies, UFO, bullets, and player movement
      }

      if (gs.status !== 'playing') return;

      // Player Movement
      if (keys['ArrowLeft'] || keys['a']) gs.player.x -= gs.player.speed;
      if (keys['ArrowRight'] || keys['d']) gs.player.x += gs.player.speed;
      gs.player.x = Math.max(10, Math.min(800 - gs.player.w - 10, gs.player.x));

      // Player Shoot
      if (gs.player.cooldown > 0) gs.player.cooldown--;
      if (keys[' '] && gs.player.cooldown <= 0 && gs.bullets.length < 2) {
        gs.bullets.push({ x: gs.player.x + gs.player.w / 2 - 3, y: gs.player.y - 20 });
        gs.player.cooldown = 15;
        playAudio('shoot');
      }

      // Move Bullets & Check Shield Collisions
      for (let i = gs.bullets.length - 1; i >= 0; i--) {
        let b = gs.bullets[i];
        b.y -= 18; 
        if (b.y < 0) { gs.bullets.splice(i, 1); continue; }
        
        let hit = false;
        for (let j = gs.shields.length - 1; j >= 0; j--) {
          let s = gs.shields[j];
          if (b.x + 6 > s.x && b.x < s.x + s.w && b.y + 35 > s.y && b.y < s.y + s.h) {
            s.hp -= 2; hit = true;
            if (s.hp <= 0) gs.shields.splice(j, 1);
            break;
          }
        }
        if (hit) gs.bullets.splice(i, 1);
      }

      for (let i = gs.enemyBullets.length - 1; i >= 0; i--) {
        let eb = gs.enemyBullets[i];
        eb.y += 6;
        if (eb.y > 600) { gs.enemyBullets.splice(i, 1); continue; }

        let hit = false;
        for (let j = gs.shields.length - 1; j >= 0; j--) {
          let s = gs.shields[j];
          if (eb.x + 4 > s.x && eb.x < s.x + s.w && eb.y + 12 > s.y && eb.y < s.y + s.h) {
            s.hp--; hit = true;
            if (s.hp <= 0) gs.shields.splice(j, 1);
            break;
          }
        }
        if (hit) { gs.enemyBullets.splice(i, 1); continue; }

        // --- UPDATED: TRIGGER DEATH SEQUENCE ---
        if (eb.x + 4 > gs.player.x && eb.x < gs.player.x + gs.player.w && eb.y + 12 > gs.player.y && eb.y < gs.player.y + gs.player.h) {
          gs.enemyBullets.splice(i, 1);
          killPlayer(gs);
          break; // Stop evaluating bullets since player is dead
        }
      }

      // Particle update
      for (let i = gs.particles.length - 1; i >= 0; i--) {
        let p = gs.particles[i];
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) gs.particles.splice(i, 1);
      }

      // Fleet Logic
      let aliveEnemies = gs.enemies.filter(e => e.alive);
      if (aliveEnemies.length === 0) { gs.status = 'levelcleared'; return; }

      let currentSpeed = Math.max(2, gs.fleet.speed - ((55 - aliveEnemies.length) * 0.8));
      
      gs.fleet.tick++;
      if (gs.fleet.tick >= currentSpeed) {
        gs.fleet.tick = 0;
        gs.fleet.stepCount++;
        playAudio('step');

        if (gs.fleet.dropNext) {
          gs.fleet.y += 20;
          gs.fleet.dx *= -1;
          gs.fleet.dropNext = false;
        } else {
          gs.fleet.x += gs.fleet.dx;
          let edgeHit = false;
          aliveEnemies.forEach(e => {
            let ex = gs.fleet.x + (e.c * 45);
            if (ex < 20 || ex > 750) edgeHit = true;
          });
          if (edgeHit) gs.fleet.dropNext = true;
        }

        // Enemy Shooting
        if (Math.random() < 0.3) {
          let shooters = [];
          for (let c = 0; c < 11; c++) {
            let colEnemies = aliveEnemies.filter(e => e.c === c);
            if (colEnemies.length > 0) {
              let bottomMost = colEnemies.reduce((prev, current) => (prev.r > current.r) ? prev : current);
              shooters.push(bottomMost);
            }
          }
          if (shooters.length > 0) {
            let shooter = shooters[Math.floor(Math.random() * shooters.length)];
            gs.enemyBullets.push({ x: gs.fleet.x + (shooter.c * 45) + 14, y: gs.fleet.y + (shooter.r * 35) + 20 });
          }
        }
      }

      // Bullet vs Enemy Collisions
      for (let i = gs.bullets.length - 1; i >= 0; i--) {
        let b = gs.bullets[i];
        let hit = false;
        for (let j = 0; j < gs.enemies.length; j++) {
          let e = gs.enemies[j];
          if (!e.alive) continue;
          let ex = gs.fleet.x + (e.c * 45);
          let ey = gs.fleet.y + (e.r * 35);
          if (b.x + 6 > ex && b.x < ex + 28 && b.y + 35 > ey && b.y < ey + 24) {
            e.alive = false; hit = true; gs.score += e.pts; playAudio('hit');
            let pColor = e.type === 0 ? '#ff0' : (e.type === 1 ? '#f0f' : '#0ff');
            for(let k=0; k<15; k++) gs.particles.push({x: ex + 14, y: ey + 12, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, life: 20, color: pColor});
            break;
          }
        }
        if (hit) gs.bullets.splice(i, 1);
      }

      // Enemy vs Shield & Player (Invasion)
      aliveEnemies.forEach(e => {
        let ex = gs.fleet.x + (e.c * 45);
        let ey = gs.fleet.y + (e.r * 35) + 24; 
        if (ey > 450) { 
          for (let j = gs.shields.length - 1; j >= 0; j--) {
            let s = gs.shields[j];
            if (ex + 28 > s.x && ex < s.x + s.w && ey > s.y && ey - 24 < s.y + s.h) {
              gs.shields.splice(j, 1); 
            }
          }
        }
        if (ey >= gs.player.y) gs.status = 'gameover'; // Invaders landed!
      });

      // UFO Logic
      if (!gs.ufo.active) {
        gs.ufo.timer--;
        if (gs.ufo.timer <= 0) {
          gs.ufo.active = true;
          gs.ufo.x = Math.random() > 0.5 ? -40 : 800;
          gs.ufo.dx = gs.ufo.x < 0 ? 3 : -3;
        }
      } else {
        gs.ufo.x += gs.ufo.dx;
        if (Math.floor(Date.now() / 200) % 2 === 0) playAudio('ufo');
        if (gs.ufo.x < -50 || gs.ufo.x > 850) {
          gs.ufo.active = false; gs.ufo.timer = 800 + Math.random() * 800;
        }
        // Player shoots UFO
        for (let i = gs.bullets.length - 1; i >= 0; i--) {
          let b = gs.bullets[i];
          if (b.x + 6 > gs.ufo.x && b.x < gs.ufo.x + 40 && b.y + 35 > gs.ufo.y && b.y < gs.ufo.y + 16) {
            gs.score += Math.floor(Math.random() * 4 + 1) * 50; 
            gs.ufo.active = false; gs.ufo.timer = 800 + Math.random() * 800;
            gs.bullets.splice(i, 1); playAudio('hit');
            for(let k=0; k<30; k++) gs.particles.push({x: gs.ufo.x + 20, y: gs.ufo.y + 8, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 30, color: '#f00'});
            break;
          }
        }
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent">
      <canvas ref={canvasRef} width={800} height={600} style={{ imageRendering: 'pixelated' }} className="w-full h-full object-fill bg-transparent cursor-none" />
    </div>
  );
};

// --- CONTROLLER DIAGNOSTICS & SETUP MENU ---
const ControllerSetup = ({ audioCtx, onMenu }) => {
  const canvasRef = useRef(null);

  const state = useRef({
    menuIdx: 0,
    isRemapping: false,
    remapStep: 0,
    config: null,
    lastButtons: [],
    lastAxes: [],
    lastNavTime: 0,
    keys: {}
  });

  useEffect(() => {
    let cfg = localStorage.getItem('bass_pad_config');
    state.current.config = cfg ? JSON.parse(cfg) : JSON.parse(JSON.stringify(DEFAULT_PAD_CONFIG));

    const handleKeyDown = e => { state.current.keys[e.key] = true; };
    const handleKeyUp = e => { state.current.keys[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const playAudio = (type) => {
      if (!audioCtx || audioCtx.state !== 'running') return;
      const t = audioCtx.currentTime;
      if (type === 'scroll') {
        let osc = audioCtx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(50, t + 0.05);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.05);
      } else if (type === 'select') {
        let osc = audioCtx.createOscillator(); osc.type = 'square'; osc.frequency.setValueAtTime(600, t); osc.frequency.setValueAtTime(800, t+0.05);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.15);
      } else if (type === 'boom') {
        let osc = audioCtx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, t); osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
        let gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.connect(gain).connect(audioCtx.destination); osc.start(t); osc.stop(t + 0.3);
      }
    };

    const update = () => {
      let gs = state.current;
      let now = Date.now();
      const pad = navigator.getGamepads ? navigator.getGamepads()[0] : null;

      if (!gs.isRemapping) {
        // MENU NAVIGATION
        if ((gs.keys['w'] || gs.keys['ArrowUp']) && now - gs.lastNavTime > 150) {
           gs.menuIdx = (gs.menuIdx - 1 + 4) % 4; gs.lastNavTime = now; playAudio('scroll');
        }
        if ((gs.keys['s'] || gs.keys['ArrowDown']) && now - gs.lastNavTime > 150) {
           gs.menuIdx = (gs.menuIdx + 1) % 4; gs.lastNavTime = now; playAudio('scroll');
        }
        if (gs.keys['Enter'] && now - gs.lastNavTime > 300) {
           gs.lastNavTime = now;
           if (gs.menuIdx === 0) onMenu();
           if (gs.menuIdx === 1) {
              gs.config.mode = gs.config.mode === 'basic' ? 'extended' : 'basic';
              localStorage.setItem('bass_pad_config', JSON.stringify(gs.config));
              window.dispatchEvent(new CustomEvent('padConfigUpdated'));
              playAudio('select');
           }
           if (gs.menuIdx === 2) {
              gs.isRemapping = true; gs.remapStep = 0;
              gs.config.btnMap = {}; gs.config.axisMap = {}; // Wipe slate clean
              playAudio('select');
           }
           if (gs.menuIdx === 3) {
              gs.config = JSON.parse(JSON.stringify(DEFAULT_PAD_CONFIG));
              localStorage.setItem('bass_pad_config', JSON.stringify(gs.config));
              window.dispatchEvent(new CustomEvent('padConfigUpdated'));
              playAudio('boom');
           }
        }
      } else if (pad) {
        // REMAPPING WIZARD
        let mapped = false;
        let actionList = REMAP_ORDER[gs.config.mode];
        let currentAction = actionList[gs.remapStep];

        // Map Buttons
        for (let i=0; i<pad.buttons.length; i++) {
           if (pad.buttons[i].pressed && !gs.lastButtons[i]) {
              Object.keys(gs.config.btnMap).forEach(k => { if(gs.config.btnMap[k] === currentAction) delete gs.config.btnMap[k]; });
              gs.config.btnMap[i] = currentAction;
              mapped = true; break;
           }
        }

        // Map Axes
        if (!mapped) {
           for (let i=0; i<pad.axes.length; i++) {
              if (Math.abs(pad.axes[i]) > 0.5 && Math.abs(gs.lastAxes[i] || 0) <= 0.5) {
                 let dir = pad.axes[i] > 0 ? 1 : -1;
                 Object.keys(gs.config.axisMap).forEach(k => { if(gs.config.axisMap[k] === currentAction) delete gs.config.axisMap[k]; });
                 gs.config.axisMap[`${i}_${dir}`] = currentAction;
                 mapped = true; break;
              }
           }
        }

        if (mapped) {
           playAudio('scroll');
           gs.remapStep++;
           if (gs.remapStep >= actionList.length) {
              gs.isRemapping = false;
              localStorage.setItem('bass_pad_config', JSON.stringify(gs.config));
              window.dispatchEvent(new CustomEvent('padConfigUpdated'));
              playAudio('select');
           }
        }
      }

      if (pad) {
        gs.lastButtons = pad.buttons.map(b => b.pressed);
        gs.lastAxes = [...pad.axes];
      }
    };

    const draw = () => {
      let gs = state.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 20, 0.9)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!gs.isRemapping) {
        drawCRTText(ctx, "I/O CONTROLLER SETUP", 400, 100, '#0ff', '60px "VT323", monospace');
        
        let opts = [
          "RETURN TO MENU",
          `CONTROLLER MODE: [ ${gs.config.mode.toUpperCase()} ]`,
          "REMAP ALL CONTROLS",
          "RESET TO DEFAULTS"
        ];

        opts.forEach((o, i) => {
           drawCRTText(ctx, (gs.menuIdx === i ? "> " : "  ") + o, 400, 240 + i * 50, gs.menuIdx === i ? '#ff0' : '#fff', '30px "VT323", monospace');
        });
        
        ctx.fillStyle = '#555'; ctx.fillRect(100, 430, 600, 2);
        drawCRTText(ctx, "EXTENDED: Enables Joysticks, Triggers, & X/Y Buttons.", 400, 470, '#aaa', '20px "VT323", monospace');
        drawCRTText(ctx, "BASIC: Limits inputs to D-Pad, A, B, Start, Select.", 400, 500, '#aaa', '20px "VT323", monospace');
        drawCRTText(ctx, "(Perfect for USB NES/SNES Controllers)", 400, 525, '#888', '16px "VT323", monospace');

      } else {
        drawCRTText(ctx, "MAPPING MODE", 400, 150, '#f0f', '50px "VT323", monospace');
        
        let actionList = REMAP_ORDER[gs.config.mode];
        let currentAction = actionList[gs.remapStep];
        
        drawCRTText(ctx, "PRESS BUTTON OR TILT AXIS FOR:", 400, 260, '#fff', '30px "VT323", monospace');
        
        if (Math.floor(Date.now() / 250) % 2 === 0) {
           drawCRTText(ctx, PAD_LABELS[currentAction], 400, 340, '#0f0', '50px "VT323", monospace');
        }

        drawCRTText(ctx, `STEP ${gs.remapStep + 1} OF ${actionList.length}`, 400, 480, '#555', '24px "VT323", monospace');
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent">
      <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-fill bg-transparent cursor-none" />
    </div>
  );
};

// --- STREAMLINED APP WRAPPER ---
export default function App() {
  const [gameState, setGameState] = useState('off'); 

  useGamepadEngine(); 

  const audioContextRef = useRef(null);
  const bgmBuffersRef = useRef({});
  const bgmNodeRef = useRef(null);

  // Setup Global Game Audio Listener
  useEffect(() => {
    const handleBgm = (e) => {
      if (bgmNodeRef.current) { try { bgmNodeRef.current.stop(); } catch(err){} }
      const trackName = e.detail;
      if (trackName === 'none') return;
      const actx = audioContextRef.current;
      if (!bgmBuffersRef.current[trackName] || !actx || actx.state !== 'running') return;
      
      const src = actx.createBufferSource();
      src.buffer = bgmBuffersRef.current[trackName];
      if (!trackName.includes('Over')) src.loop = true;
      src.connect(actx.destination);
      src.start();
      bgmNodeRef.current = src;
    };
    window.addEventListener('bgmTrack', handleBgm);
    return () => window.removeEventListener('bgmTrack', handleBgm);
  }, []);

const handleReturnToMenu = useCallback(() => {
    setGameState('menu');
    // ADDED: Resume menu music when exiting a game
    window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'menuPlay' })); 
  }, []);

  const handleStart = async () => {
    if (document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen(); } catch (err) {}
    }
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    
    buildTracks(audioContextRef.current).then(bufs => {
      bgmBuffersRef.current = bufs;
      // ADDED: Boot up the menu music as soon as the buffers finish rendering!
      window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'menuPlay' }));
    });

    setGameState('menu');
  };

  const handleGameSelect = (game) => {
    setGameState(game);
    if (game === 'galaga') window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'galagaStart' }));
    else if (game === 'commando') window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'commandoStart' }));
    else if (game === 'snake') window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'snakeStart' }));
    else if (game === 'asteroids') window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' })); // Asteroids handles its own audio
    else if (game === 'defender') window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' })); // Defender handles its own audio
    else if (game === 'oregon') window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' }));
    else if (game === 'invaders') window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' }));
    else if (game === '1941') window.dispatchEvent(new CustomEvent('bgmTrack', { detail: '1941Start' }));
    else if (game === 'robotron') window.dispatchEvent(new CustomEvent('bgmTrack', { detail: 'none' }));
  };

  return (
    <>
<style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

          .vcr-font {
            font-family: 'VT323', monospace;
            color: #fff;
            font-size: 1.8rem;
            letter-spacing: 0.1em;
            line-height: 1.4;
            /* Pure raw pixels with slight chromatic aberration. ZERO blur. */
            text-shadow: 
              -1px 0 0 rgba(255, 0, 0, 0.4), 
               1px 0 0 rgba(0, 0, 255, 0.4);
          }

          @media (min-width: 768px) {
            .vcr-font { font-size: 2.5rem; letter-spacing: 0.15em; }
          }

          /* --- NEW CRT ENGINE CSS --- */

          /* CRT Tube Vignette (Darkens the corners of the curved glass) */
          .crt-vignette {
            position: absolute; 
            inset: 0; 
            z-index: 58;
            pointer-events: none;
            background: radial-gradient(circle at center, rgba(0,0,0,0) 65%, rgba(0,0,0,0.6) 100%);
          }

          .global-sharp-wrap {
            /* ZERO blur. Just contrast and brightness to compensate for the darkening effect of the multiply mask. */
            filter: contrast(120%) brightness(1.4);
          }

          /* ENHANCE THE RGB APERTURE GRILLE */
          .crt-rgb-mask {
            position: absolute; inset: 0; z-index: 57;
            pointer-events: none;
            /* Using MULTIPLY cuts the R, G, and B stripes directly into the bright pixels beneath it,
               just like a physical Trinitron shadow mask, leaving blacks perfectly black. */
            background: linear-gradient(90deg, 
              rgba(255, 0, 0, 0.45) 0%, rgba(255, 0, 0, 0.45) 33.3%, 
              rgba(0, 255, 0, 0.45) 33.3%, rgba(0, 255, 0, 0.45) 66.6%, 
              rgba(0, 0, 255, 0.45) 66.6%, rgba(0, 0, 255, 0.45) 100%
            );
            background-size: 3px 100%;
            mix-blend-mode: multiply;
          }

          /* SHARPEN THE SCANLINES */
          /* Tighter 4px gap and slightly darker lines to segment the horizontal pixels */
          .scanlines-overlay {
            position: absolute; inset: 0; z-index: 56;
            background: linear-gradient(to bottom, rgba(255,255,255,0) 50%, rgba(0, 0, 0, 0.55) 50%);
            background-size: 100% 4px; 
            pointer-events: none;
          }

          /* DYNAMIC RGB PHOSPHOR NOISE */
          .crt-rgb-noise {
            position: absolute; 
            inset: 0; 
            z-index: 54;
            pointer-events: none;
            /* Generates microscopic, randomized pixel noise natively in the browser */
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            background-size: 150px 150px;
            /* Cranks the contrast and saturation to force the grey noise into pure RGB pixels */
            filter: contrast(400%) saturate(500%) brightness(0.8);
            mix-blend-mode: color-dodge;
            opacity: 1.2; /* Tweak this up or down for more/less intense noise */
            animation: noise-dance 0.15s steps(3) infinite;
          }

          /* Jumps the noise map around rapidly to emulate static motion */
          @keyframes noise-dance {
            0% { background-position: 0px 0px; }
            33% { background-position: 25px 50px; }
            66% { background-position: -50px -25px; }
            100% { background-position: 15px -35px; }
          }
          
          .blink-text { animation: blink 1s step-end infinite; }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        `}
      </style>

      <div className="relative w-full h-screen bg-[#020202] p-2 sm:p-6 md:p-12 flex items-center justify-center overflow-hidden">
        
        {/* Main TV Frame */}
        <div className="relative w-[max(100vw,177.78vh)] h-[max(100vh,56.25vw)] shrink-0 bg-[#000] overflow-hidden flex items-center justify-center global-sharp-wrap">

          {/* Active Signal Layer */}
          <div className="relative z-10 h-[86.5%] aspect-[4/3] rounded-[4%] overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,1)]">
            
            {/* DANCING RGB NOISE */}
            <div className="crt-rgb-noise"></div>

            {/* MAIN CONTENT (Games & Menus) */}
            
            {/* --- MOVED INITIALIZATION SCREEN --- */}
            {gameState === 'off' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-transparent p-4 text-center pointer-events-auto">
                <h1 className="vcr-font text-[#0f0] text-4xl md:text-6xl mb-8 blink-text">SYSTEM READY</h1>
                <button 
                  onClick={handleStart}
                  className="vcr-font text-2xl md:text-4xl px-6 py-3 border-4 border-[#0f0] text-[#0f0] hover:bg-[#0f0] hover:text-black transition-colors duration-200 uppercase cursor-pointer"
                >
                  INITIALIZE
                </button>
              </div>
            )}

            {/* UPDATED: Added audioCtx={audioContextRef.current} */}
            {gameState === 'menu' && <GameMenu audioCtx={audioContextRef.current} onSelect={handleGameSelect} />}            
            {gameState === 'galaga' && <GalagaGame audioCtx={audioContextRef.current} onMenu={handleReturnToMenu} />} 
            {gameState === 'commando' && <CommandoGame audioCtx={audioContextRef.current} onMenu={handleReturnToMenu} />}
            {gameState === 'snake' && <SnakeGame audioCtx={audioContextRef.current} onMenu={handleReturnToMenu} />}
            {gameState === 'asteroids' && <AsteroidsGame audioCtx={audioContextRef.current} onMenu={handleReturnToMenu} />}
            {gameState === 'defender' && <DefenderGame audioCtx={audioContextRef.current} onMenu={handleReturnToMenu} />}
            {gameState === 'oregon' && <OregonTrailGame audioCtx={audioContextRef.current} onMenu={handleReturnToMenu} />}
            {gameState === 'invaders' && <InvadersGame audioCtx={audioContextRef.current} onMenu={handleReturnToMenu} />}
            {gameState === 'robotron' && <RobotronGame audioCtx={audioContextRef.current} onMenu={handleReturnToMenu} />}
            {gameState === '1941' && <AirplaneGame audioCtx={audioContextRef.current} onMenu={handleReturnToMenu} />}
            {gameState === 'controller' && <ControllerSetup onMenu={handleReturnToMenu} />}

            {/* CRT TUBE VIGNETTE (Darkens corners) */}
            <div className="crt-vignette"></div>

            {/* TRUE ELECTRON BEAM SCANLINES */}
            <div className="scanlines-overlay"></div>

            {/* TRUE SUB-PIXEL RGB APERTURE GRILLE */}
            <div className="crt-rgb-mask"></div>
          </div>
          
          {/* TOP MOST BEZEL OVERLAY */}
          <img 
            src="https://s3-eu-west-1.amazonaws.com/forums.recalbox.com/74c99c26-fe76-4ef7-8690-a45258a908e7.png" 
            alt="CRT Glare Overlay" 
            className="absolute inset-0 w-full h-full z-[100] pointer-events-none object-fill" 
          />

        </div>
      </div>
    </>
  );
}
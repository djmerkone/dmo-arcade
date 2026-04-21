import React, { useEffect, useRef, useState } from 'react';

/**
 * ============================================================================
 * LUNAR LANDER (1979) - VECTOR ARCADE REPLICA (CINEMATIC EDITION)
 * ============================================================================
 * Features:
 * - Realistic Vector Terrain (Fractal/Perlin Noise generation)
 * - Deep Parallax Easter Eggs (Scaled down to 50% for depth)
 * - Narrative-Driven Cinematic Crash Reports
 * - High-Speed Orbital Approach sequence with Cinematic Easing
 * - Fast-streaking, motion-blurred starfield during warp
 * - Tuned Micro-Gravity Physics (Extremely floaty, Momentum-based)
 * - True 2-Axis Follow Camera (Tracks perfectly into deep craters)
 * - Authentic NASA Quindar Tones
 * - Universal Input: Keyboard, Mouse, Gamepad
 * ============================================================================
 */

const GRAVITY = 0.006;        
const THRUST_POWER = 0.022;   
const ROTATION_SPEED = 0.04;  
const FUEL_MAX = 1200; 
const FUEL_CONSUMPTION = 1.0;

const MAX_LANDING_VY = 0.6;   
const MAX_LANDING_VX = 0.4;
const MAX_LANDING_ROT = 0.15; 

const VIEW_W = 1000;
const VIEW_H = 800;

// --- VECTOR SHAPES (SCALED TO 50%) ---
const LANDER_BODY = [
    [-5, 2.5], [5, 2.5], [7, -1], [5, -4], [-5, -4], [-7, -1] 
];
const LANDER_LEGS = [
    { start: [5, 2.5], end: [7.5, 9] },    
    { start: [7.5, 9], end: [4, 9] },      
    { start: [-5, 2.5], end: [-7.5, 9] },  
    { start: [-7.5, 9], end: [-4, 9] },    
    { start: [2.5, 2.5], end: [3, 6] },    
    { start: [-2.5, 2.5], end: [-3, 6] },  
    { start: [-3, 6], end: [3, 6] }        
];

const LANDER_COLLISION = [
    [0, -9], [5, -4], [7, -1], [7.5, 9], [-7.5, 9], [-7, -1], [-5, -4]
];

const FLAME_SHAPE = [
    [2, 6], [0, 14], [-2, 6]
];

// --- CINEMATIC CRASH REPORTS ---
const CRASH_REPORTS = [
    "MISSION APOLLO 18 FAILED. The descent module struck the surface at terminal velocity, vaporizing the crew instantly. You left a 400-meter crater in the Sea of Tranquility. NASA funding has been permanently suspended.",
    "CRITICAL HULL FAILURE. You failed to arrest your momentum before impact, causing the fuel reserves to detonate. The resulting explosion destroyed the lunar outpost payload. The crater is visible from Earth.",
    "CATASTROPHIC PILOT ERROR. The ascent stage shattered upon impact with the Mare Imbrium ridge. The classified geological samples are lost, and the 120-meter scar you left will remain for a million years.",
    "STRUCTURAL INTEGRITY ZERO. You clipped a lunar mountain and sent the lander into an uncontrollable spin. The impact scattered debris across a 2-mile radius, abandoning the Artemis colony to freeze.",
    "TERMINAL IMPACT DETECTED. The landing struts snapped under immense pressure, driving the engine bell through the crew cabin. Your failure leaves a permanent 80-meter crater in the Shackleton basin."
];

// --- AUDIO SYNTHESIS ENGINE ---
class LunarAudio {
    constructor(ctx) {
        this.ctx = ctx;
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);

        const bufferSize = this.ctx.sampleRate * 2; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        this.noiseBuffer = buffer;
        this.thrustSource = null;
        this.thrustGain = this.ctx.createGain();
        this.thrustGain.gain.value = 0;
        this.thrustFilter = this.ctx.createBiquadFilter();
        this.thrustFilter.type = 'lowpass';
        this.thrustFilter.frequency.value = 100; 
        
        this.thrustGain.connect(this.thrustFilter);
        this.thrustFilter.connect(this.master);
        this.isThrusting = false;

        this.transmissionActive = false;
    }

    playTransmission() {
        if (this.transmissionActive) return;
        this.transmissionActive = true;

        const playTone = (freq, timeOffset) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + timeOffset);
            
            gain.gain.setValueAtTime(0, this.ctx.currentTime + timeOffset);
            gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + timeOffset + 0.01);
            gain.gain.setValueAtTime(0.08, this.ctx.currentTime + timeOffset + 0.24);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + timeOffset + 0.25); 
            
            osc.connect(gain);
            gain.connect(this.master);
            
            osc.start(this.ctx.currentTime + timeOffset);
            osc.stop(this.ctx.currentTime + timeOffset + 0.3);
        };
        
        playTone(2525, 0); 
        const duration = 1.5 + Math.random() * 3;
        playTone(2475, duration); 
        
        const staticSrc = this.ctx.createBufferSource();
        staticSrc.buffer = this.noiseBuffer;
        
        const staticFilter = this.ctx.createBiquadFilter();
        staticFilter.type = 'bandpass';
        staticFilter.frequency.value = 2000; 
        staticFilter.Q.value = 0.5;
        
        const staticGain = this.ctx.createGain();
        staticGain.gain.setValueAtTime(0.02, this.ctx.currentTime); 
        
        staticSrc.connect(staticFilter).connect(staticGain).connect(this.master);
        staticSrc.start(this.ctx.currentTime);
        staticSrc.stop(this.ctx.currentTime + duration);

        setTimeout(() => { this.transmissionActive = false; }, (duration * 1000) + 500);
    }

    startThrust() {
        if (this.isThrusting) return;
        this.isThrusting = true;
        this.thrustSource = this.ctx.createBufferSource();
        this.thrustSource.buffer = this.noiseBuffer;
        this.thrustSource.loop = true;
        this.thrustSource.connect(this.thrustGain);
        this.thrustSource.start();
        this.thrustGain.gain.setTargetAtTime(0.8, this.ctx.currentTime, 0.05);
        this.thrustFilter.frequency.setTargetAtTime(600, this.ctx.currentTime, 0.1);
    }

    stopThrust() {
        if (!this.isThrusting) return;
        this.isThrusting = false;
        this.thrustGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        this.thrustFilter.frequency.setTargetAtTime(100, this.ctx.currentTime, 0.1);
        setTimeout(() => {
            if (this.thrustSource && !this.isThrusting) {
                this.thrustSource.stop();
                this.thrustSource.disconnect();
                this.thrustSource = null;
            }
        }, 150);
    }

    playBeep(freq, duration, vol = 0.1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playCrash() {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 1.0);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.0);
        
        src.connect(filter).connect(gain).connect(this.master);
        src.start();
        src.stop(this.ctx.currentTime + 1.5);
    }
}

// --- MATH UTILITIES ---
function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = ((x2 - x1) * (y4 - y3)) - ((y2 - y1) * (x4 - x3));
    if (denominator === 0) return false;
    const a = y1 - y3;
    const b = x1 - x3;
    const n1 = ((x4 - x3) * a) - ((y4 - y3) * b);
    const n2 = ((x2 - x1) * a) - ((y2 - y1) * b);
    const a1 = n1 / denominator;
    const a2 = n2 / denominator;
    if (a1 > 0 && a1 < 1 && a2 > 0 && a2 < 1) {
        return { x: x1 + (a1 * (x2 - x1)), y: y1 + (a1 * (y2 - y1)) };
    }
    return false;
}

// --- REALISTIC TERRAIN GENERATOR (Perlin/Fractal Approach) ---
function generateTerrain(level) {
    const segments = [];
    const pads = [];
    
    const mapWidth = VIEW_W * (5 + (level * 5)); 
    
    // Generates a smooth, continuous noise value
    const noise = (x) => {
        return Math.sin(x * 0.005) * 50 + 
               Math.sin(x * 0.012) * 30 + 
               Math.sin(x * 0.03) * 15 + 
               Math.sin(x * 0.1) * 5;
    };

    let curX = 0;
    let baseHeight = 500;

    const addSegment = (x, y, isPad = false, mult = 1) => {
        let py = y;
        if (!isPad) {
            // Apply fractal noise to natural terrain
            const heightVariance = 100 + (level * 40); 
            py = baseHeight + (noise(x) * (heightVariance / 50)); 
            // Clamp to screen bounds
            if (py > VIEW_H + 200) py = VIEW_H + 200;
            if (py < 150) py = 150;
        }
        
        // Ensure starting point connects cleanly
        let startY = segments.length > 0 ? segments[segments.length-1].y2 : baseHeight + noise(0);

        segments.push({ x1: curX, y1: startY, x2: x, y2: py, isPad, mult });
        if (isPad) pads.push({ x1: curX, x2: x, y: py, mult });
        
        curX = x;
    };

    while (curX < mapWidth) {
        const padChance = Math.max(0.05, 0.15 - (level * 0.02)); 
        
        if (Math.random() < padChance && curX > 200 && curX < mapWidth - 200) {
            // Flat Pad
            const padWidth = Math.max(20, (40 + Math.random() * 60) - (level * 5));
            let padY = segments.length > 0 ? segments[segments.length-1].y2 : baseHeight;
            let mult = 1;
            if (padWidth < 30) mult = 5;
            else if (padWidth < 50 || padY < 200) mult = 2;
            
            addSegment(curX + padWidth, padY, true, mult);
            // Reset base height so terrain continues smoothly from the pad
            baseHeight = padY - noise(curX); 
        } else {
            // Smooth step size for realistic curves
            const stepSize = 20 + Math.random() * 30;
            addSegment(curX + stepSize, 0, false, 1); 
        }
    }
    return { segments, pads, width: curX };
}

function generateStars() {
    const stars = [];
    const colors = ['#ffffff', '#aaddff', '#ffddaa', '#ffaaaa', '#ffffff'];
    for(let i=0; i<300; i++) {
        stars.push({
            x: Math.random() * VIEW_W,
            y: Math.random() * VIEW_H,
            size: Math.random() * 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: (Math.random() * 0.5) + 0.1,
            twinkleBase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.02 + Math.random() * 0.05
        });
    }
    return stars;
}

function generateCelestialBody(level) {
    const bodies = [
        { type: 'earth', color: '#4488ff', size: 30, x: 700, y: 550 },
        { type: 'mars', color: '#ff5533', size: 15, x: 300, y: 480 },
        { type: 'sun', color: '#ffffff', size: 50, x: 500, y: 650, glow: true }, 
        { type: 'jupiter', color: '#ddaa88', size: 40, x: 800, y: 500 },
        { type: 'andromeda', color: '#8844ff', size: 85, x: 400, y: 400, isGalaxy: true }
    ];
    return bodies[level % bodies.length];
}

// --- MAIN COMPONENT ---
export default function LunarLander({ audioCtx, onMenu }) {
    const canvasRef = useRef(null);
    const audioRef = useRef(null);
    
    const engine = useRef({
        status: 'START', 
        level: 1,
        lander: { x: VIEW_W / 2, y: 100, vx: 0, vy: 0, rotation: 0 },
        camera: { x: 0, y: 0, zoom: 1 },
        fuel: FUEL_MAX,
        score: 0,
        time: 0,
        altitude: 0,
        terrain: null,
        stars: generateStars(),
        celestial: generateCelestialBody(1),
        particles: [],
        debris: [], 
        distantObjects: [], 
        crashMessage: "",
        countdown: 0, 
        keys: {},
        mouse: { x: 0, y: 0, down: false, rightDown: false }
    });

    useEffect(() => {
        engine.current.terrain = generateTerrain(engine.current.level);

        const handleKeyDown = (e) => { engine.current.keys[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { engine.current.keys[e.key.toLowerCase()] = false; };
        
        const handleMouseMove = (e) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = VIEW_W / rect.width;
            const scaleY = VIEW_H / rect.height;
            engine.current.mouse.x = (e.clientX - rect.left) * scaleX;
            engine.current.mouse.y = (e.clientY - rect.top) * scaleY;
        };
        const handleMouseDown = (e) => { 
            if (e.button === 0) engine.current.mouse.down = true; 
            if (e.button === 2) engine.current.mouse.rightDown = true; 
        };
        const handleMouseUp = (e) => { 
            if (e.button === 0) engine.current.mouse.down = false; 
            if (e.button === 2) engine.current.mouse.rightDown = false; 
        };
        const handleContextMenu = (e) => e.preventDefault(); 

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('contextmenu', handleContextMenu);
            if (audioRef.current) audioRef.current.stopThrust();
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let frameId;
        let lastTime = performance.now();
        let currentSecond = 4; 

        const shatterShip = (x, y, vx, vy) => {
            const state = engine.current;
            for(let i=0; i<8; i++) {
                state.debris.push({
                    x, y,
                    vx: (vx * 0.5) + (Math.random() - 0.5) * 6,
                    vy: (vy * 0.5) - Math.random() * 8, 
                    rot: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.5,
                    points: [[-2,-2], [2,-2], [Math.random()*4, 3], [-Math.random()*4, 3]],
                    life: 1.0
                });
            }
            for (let i = 0; i < 60; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6;
                state.particles.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0,
                    decay: 0.005 + Math.random() * 0.015,
                    color: Math.random() > 0.5 ? '#ffffff' : '#ffaa00'
                });
            }
        };

        const resetShip = (nextLevel = false) => {
            const state = engine.current;
            if (nextLevel) {
                state.level++;
                state.terrain = generateTerrain(state.level);
                state.celestial = generateCelestialBody(state.level);
                state.fuel += 400; 
            } else {
                state.score = 0; 
                state.fuel = FUEL_MAX;
            }
            
            state.lander = { 
                x: Math.random() * 800 + 200, 
                y: -600, 
                vx: 3 + Math.random() * 2, 
                vy: 0.5, 
                rotation: 0 
            };
            state.time = 0;
            state.particles = [];
            state.debris = [];
            state.distantObjects = [];
            state.status = 'READY';
            state.countdown = 5.0; 
            
            state.camera.zoom = 8.0;
            state.camera.x = state.lander.x - (VIEW_W / 2) / 8.0;
            state.camera.y = state.lander.y - (VIEW_H / 2) / 8.0;
            
            currentSecond = 4;
        };

        const update = () => {
            const state = engine.current;
            const dt = (performance.now() - lastTime) / 16.66; 
            lastTime = performance.now();

            if (state.keys['m']) {
                state.status = 'EXITING';
                if (audioRef.current) audioRef.current.stopThrust();
                onMenu();
                return;
            }

            if (state.status === 'START') {
                if (state.keys['enter'] || state.mouse.down || (navigator.getGamepads()[0] && navigator.getGamepads()[0].buttons[9].pressed)) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (!audioRef.current) audioRef.current = new LunarAudio(audioCtx || new AudioContext());
                    if (audioRef.current.ctx.state === 'suspended') audioRef.current.ctx.resume();
                    resetShip(false);
                }
                return;
            }

            if (state.status === 'CRASHED' || state.status === 'LANDED' || state.status === 'OUT_OF_FUEL') {
                if (audioRef.current) audioRef.current.stopThrust();
                
                state.debris.forEach(d => {
                    d.x += d.vx; d.y += d.vy; d.vy += GRAVITY; d.rot += d.rotSpeed; d.life -= 0.005;
                });
                state.particles.forEach(p => {
                    p.x += p.vx; p.y += p.vy; p.vy += GRAVITY * 0.5; p.life -= p.decay;
                });
                
                state.particles = state.particles.filter(p => p.life > 0);
                state.debris = state.debris.filter(d => d.life > 0);

                if (state.keys['enter'] || state.mouse.down || (navigator.getGamepads()[0] && navigator.getGamepads()[0].buttons[9].pressed)) {
                    resetShip(state.status === 'LANDED');
                }
                return;
            }

            const l = state.lander;

            // --- CINEMATIC ORBITAL APPROACH (READY PHASE) ---
            if (state.status === 'READY') {
                state.countdown -= 0.016 * dt;
                
                let sec = Math.ceil(state.countdown);
                if (sec <= 3 && sec > 0 && sec < currentSecond) {
                    if (audioRef.current) audioRef.current.playBeep(2500, 0.1, 0.15);
                    currentSecond = sec;
                } else if (sec === 0 && currentSecond > 0) {
                    if (audioRef.current) audioRef.current.playBeep(2000, 0.4, 0.15);
                    currentSecond = 0;
                    state.status = 'PLAYING';
                    if (audioRef.current) audioRef.current.playTransmission();
                }

                l.x += l.vx * dt;
                l.y += l.vy * dt;
                
                if (state.countdown > 3.0) {
                    let progress = (5.0 - state.countdown) / 2.0; 
                    state.camera.zoom = 8.0 - (progress * 4.0);
                } else {
                    let progress = (3.0 - state.countdown) / 3.0; 
                    let ease = 1 - Math.pow(1 - progress, 3); 
                    state.camera.zoom = 4.0 - (ease * 3.0); 
                }

                // Locked center tracking during approach
                state.camera.x = l.x - (VIEW_W / 2) / state.camera.zoom;
                state.camera.y = l.y - (VIEW_H / 2) / state.camera.zoom;
                
                state.stars.forEach(s => {
                    let speedMult = state.countdown > 3.0 ? 40 : 1 + (state.countdown / 3.0) * 39;
                    s.x -= s.speed * speedMult * dt;
                    if (s.x < 0) { s.x += VIEW_W; s.y = Math.random() * VIEW_H; }
                });

                return; 
            }

            // --- NORMAL GAMEPLAY LOOP ---
            
            state.stars.forEach(s => {
                s.x -= s.speed * 0.5 * dt;
                if (s.x < 0) { s.x += VIEW_W; s.y = Math.random() * VIEW_H; }
            });

            // Random Easter Egg Spawner
            if (Math.random() < 0.002) { 
                const types = ['ufo', 'satellite', 'meteor', 'falcon', 'xwing', 'tie', 'enterprise', 'borg', 'santa'];
                state.distantObjects.push({
                    type: types[Math.floor(Math.random() * types.length)],
                    x: l.x + (Math.random() > 0.5 ? VIEW_W : -VIEW_W), 
                    y: Math.random() * 400,
                    vx: (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 3.5),
                    vy: (Math.random() - 0.5) * 0.5,
                    life: 2000,
                    rot: 0,
                    rotSpeed: (Math.random() - 0.5) * 0.05
                });
            }

            state.distantObjects.forEach(obj => {
                obj.x += obj.vx * dt;
                obj.y += obj.vy * dt;
                obj.rot += obj.rotSpeed * dt;
                obj.life -= dt;
            });
            state.distantObjects = state.distantObjects.filter(o => o.life > 0);

            if (Math.random() < 0.00125 && audioRef.current) {
                audioRef.current.playTransmission();
            }

            state.time += 0.016 * dt;

            // --- INPUT HANDLING ---
            const pads = navigator.getGamepads();
            const gp = pads[0];
            
            let isThrusting = false;
            let rotInput = 0;

            if (state.keys['w'] || state.keys['arrowup'] || state.keys[' ']) isThrusting = true;
            if (state.keys['a'] || state.keys['arrowleft']) rotInput = -1;
            if (state.keys['d'] || state.keys['arrowright']) rotInput = 1;

            if (gp) {
                if (gp.buttons[0].pressed || gp.buttons[7].pressed) isThrusting = true; 
                if (gp.axes[0] < -0.2 || gp.buttons[14].pressed) rotInput = -1; 
                if (gp.axes[0] > 0.2 || gp.buttons[15].pressed) rotInput = 1;   
            }

            if (state.mouse.down) isThrusting = true;
            if (state.mouse.rightDown) {
                const dx = state.mouse.x - (VIEW_W / 2); 
                if (dx < -50) rotInput = -1;
                if (dx > 50) rotInput = 1;
            }

            // --- PHYSICS ---
            if (isThrusting && state.fuel > 0) {
                l.vx += Math.sin(l.rotation) * THRUST_POWER * dt;
                l.vy -= Math.cos(l.rotation) * THRUST_POWER * dt;
                state.fuel -= FUEL_CONSUMPTION * dt;
                
                if (audioRef.current) audioRef.current.startThrust();

                if (Math.random() < 0.7) {
                    const fx = l.x - Math.sin(l.rotation) * 8;
                    const fy = l.y + Math.cos(l.rotation) * 8;
                    state.particles.push({
                        x: fx + (Math.random() - 0.5) * 2,
                        y: fy + (Math.random() - 0.5) * 2,
                        vx: l.vx - Math.sin(l.rotation) * 3 + (Math.random() - 0.5),
                        vy: l.vy + Math.cos(l.rotation) * 3 + (Math.random() - 0.5),
                        life: 1.0, decay: 0.05, color: '#ffffff'
                    });
                }
            } else {
                if (audioRef.current) audioRef.current.stopThrust();
            }

            if (state.fuel <= 0 && state.status !== 'OUT_OF_FUEL') {
                state.fuel = 0;
                state.status = 'OUT_OF_FUEL';
            }

            l.rotation += rotInput * ROTATION_SPEED * dt;
            l.vy += GRAVITY * dt;
            l.x += l.vx * dt;
            l.y += l.vy * dt;

            if (l.x < 0) l.x = state.terrain.width;
            if (l.x > state.terrain.width) l.x = 0;

            // --- COLLISION DETECTION ---
            const cos = Math.cos(l.rotation);
            const sin = Math.sin(l.rotation);
            const worldLander = LANDER_COLLISION.map(pt => ({
                x: l.x + (pt[0] * cos - pt[1] * sin),
                y: l.y + (pt[0] * sin + pt[1] * cos)
            }));

            let collided = false;
            let landedOnPad = null;

            const minX = Math.min(...worldLander.map(p => p.x));
            const maxX = Math.max(...worldLander.map(p => p.x));

            for (let i = 0; i < state.terrain.segments.length; i++) {
                const seg = state.terrain.segments[i];
                if (Math.max(seg.x1, seg.x2) < minX || Math.min(seg.x1, seg.x2) > maxX) continue;

                for (let j = 0; j < worldLander.length; j++) {
                    const p1 = worldLander[j];
                    const p2 = worldLander[(j + 1) % worldLander.length];
                    
                    const hit = linesIntersect(p1.x, p1.y, p2.x, p2.y, seg.x1, seg.y1, seg.x2, seg.y2);
                    if (hit) {
                        collided = true;
                        if (seg.isPad) landedOnPad = seg;
                        break;
                    }
                }
                if (collided) break;
            }

            if (collided) {
                if (audioRef.current) audioRef.current.stopThrust();

                const isUpright = Math.abs(l.rotation % (Math.PI * 2)) < MAX_LANDING_ROT;
                const isSlowVert = Math.abs(l.vy) < MAX_LANDING_VY;
                const isSlowHoriz = Math.abs(l.vx) < MAX_LANDING_VX;
                
                const leftFoot = worldLander[4].x;
                const rightFoot = worldLander[3].x;
                const isFullyOnPad = landedOnPad && 
                                     Math.min(leftFoot, rightFoot) >= landedOnPad.x1 && 
                                     Math.max(leftFoot, rightFoot) <= landedOnPad.x2;

                if (isFullyOnPad && isUpright && isSlowVert && isSlowHoriz) {
                    const scoreGained = Math.floor(state.fuel * landedOnPad.mult);
                    state.score += scoreGained;
                    if (audioRef.current) audioRef.current.playBeep(800, 0.5, 0.2);
                    state.status = 'LANDED';
                    l.rotation = 0;
                    l.y = landedOnPad.y1 - 9; 
                } else {
                    shatterShip(l.x, l.y, l.vx, l.vy);
                    state.crashMessage = CRASH_REPORTS[Math.floor(Math.random() * CRASH_REPORTS.length)];
                    if (audioRef.current) audioRef.current.playCrash();
                    state.status = 'CRASHED';
                }
            }

            let altitude = VIEW_H;
            for (let i = 0; i < state.terrain.segments.length; i++) {
                const seg = state.terrain.segments[i];
                if (l.x >= seg.x1 && l.x <= seg.x2) {
                    const t = (l.x - seg.x1) / (seg.x2 - seg.x1);
                    const segY = seg.y1 + t * (seg.y2 - seg.y1);
                    altitude = segY - l.y;
                    break;
                }
            }
            state.altitude = Math.max(0, Math.floor(altitude - 9));

            // Dynamic camera zoom
            let targetZoom = 1;
            if (altitude < 250) targetZoom = 1 + ((250 - altitude) / 250) * 1.5;
            state.camera.zoom += (targetZoom - state.camera.zoom) * 0.05 * dt;

            // Perfect tracking on BOTH axis for craters
            let targetCamX = l.x - (VIEW_W / 2) / state.camera.zoom;
            let targetCamY = l.y - (VIEW_H / 2) / state.camera.zoom;
            state.camera.x += (targetCamX - state.camera.x) * 0.15 * dt;
            state.camera.y += (targetCamY - state.camera.y) * 0.15 * dt;

            state.particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.life > 0.5) p.vy += GRAVITY; 
                p.life -= p.decay;
            });
            state.particles = state.particles.filter(p => p.life > 0);
        };

        const draw = () => {
            const state = engine.current;
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);

            ctx.lineCap = 'square'; 
            ctx.lineJoin = 'miter';

            // --- DEEP PARALLAX BACKGROUND ---
            ctx.save();
            ctx.translate(-(state.camera.x * 0.02), -(state.camera.y * 0.02));
            
            const isApproaching = state.status === 'READY';
            const warpSpeed = isApproaching && state.countdown > 3.0 ? 30 : (isApproaching ? 5 : 1);
            
            state.stars.forEach(s => {
                const twinkle = Math.abs(Math.sin((performance.now() * s.twinkleSpeed) + s.twinkleBase));
                ctx.fillStyle = s.color;
                ctx.globalAlpha = 0.2 + (twinkle * 0.8); 
                let stretch = isApproaching ? (warpSpeed * s.speed * 3) : 0;
                ctx.fillRect(s.x, s.y, s.size + stretch, s.size);
            });
            ctx.globalAlpha = 1.0;

            const cb = state.celestial;
            ctx.save();
            ctx.translate(cb.x, cb.y);
            if (cb.isGalaxy) {
                ctx.rotate(Math.PI / 6);
                ctx.beginPath();
                ctx.ellipse(0, 0, cb.size, cb.size * 0.3, 0, 0, Math.PI*2);
                ctx.fillStyle = cb.color;
                ctx.shadowBlur = 30; ctx.shadowColor = cb.color;
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(0, 0, cb.size * 0.3, cb.size * 0.1, 0, 0, Math.PI*2);
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 50; ctx.shadowColor = '#ffffff';
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, cb.size, 0, Math.PI*2);
                ctx.fillStyle = cb.color;
                if (cb.glow) { ctx.shadowBlur = 40; ctx.shadowColor = cb.color; }
                ctx.fill();
                if (cb.type === 'jupiter') {
                    ctx.strokeStyle = '#aa7755'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.ellipse(0, 0, cb.size*1.8, cb.size*0.3, 0, 0, Math.PI*2); ctx.stroke();
                }
            }
            ctx.restore();
            ctx.restore();

            // --- FOREGROUND CAMERA TRANSFORM ---
            ctx.save();
            ctx.scale(state.camera.zoom, state.camera.zoom);
            ctx.translate(-state.camera.x, -state.camera.y);

            // --- DRAW DISTANT EASTER EGGS (Occluded by terrain, 50% scale) ---
            state.distantObjects.forEach(obj => {
                ctx.save();
                ctx.translate(obj.x, obj.y);
                ctx.rotate(obj.rot);
                ctx.scale(0.5, 0.5); // 50% Scale for depth
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; 
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1.0 / (state.camera.zoom * 0.5); // Keep lines crisp
                ctx.beginPath();
                
                if (obj.type === 'ufo') {
                    ctx.ellipse(0, 0, 15, 4, 0, 0, Math.PI*2);
                    ctx.moveTo(-6, -2); ctx.lineTo(-4, -6); ctx.lineTo(4, -6); ctx.lineTo(6, -2);
                    ctx.stroke();
                } else if (obj.type === 'satellite') {
                    ctx.rect(-10, -4, 8, 8); ctx.rect(2, -4, 8, 8);
                    ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.arc(0, 0, 2, 0, Math.PI*2);
                    ctx.stroke();
                } else if (obj.type === 'falcon') {
                    ctx.moveTo(0,-4); ctx.lineTo(-4,4); ctx.lineTo(-1,4); ctx.lineTo(-1,6); ctx.lineTo(1,6); ctx.lineTo(1,4); ctx.lineTo(4,4); ctx.closePath();
                    ctx.stroke();
                } else if (obj.type === 'xwing') {
                    ctx.moveTo(-4,-3); ctx.lineTo(4,3); ctx.moveTo(4,-3); ctx.lineTo(-4,3); ctx.moveTo(0,-4); ctx.lineTo(0,4);
                    ctx.stroke();
                } else if (obj.type === 'tie') {
                    ctx.moveTo(-3,-4); ctx.lineTo(-3,4); ctx.moveTo(3,-4); ctx.lineTo(3,4); ctx.moveTo(-3,0); ctx.lineTo(3,0); ctx.arc(0,0,1,0,Math.PI*2);
                    ctx.stroke();
                } else if (obj.type === 'enterprise') {
                    ctx.ellipse(3, -2, 4, 1.5, 0, 0, Math.PI*2); ctx.moveTo(0,-2); ctx.lineTo(-2,0); ctx.lineTo(-5,0); ctx.moveTo(-2,0); ctx.lineTo(-2,2); ctx.moveTo(-4,2); ctx.lineTo(1,2);
                    ctx.stroke();
                } else if (obj.type === 'borg') {
                    ctx.rect(-3, -3, 6, 6); ctx.stroke();
                } else if (obj.type === 'santa') {
                    ctx.moveTo(-4,0); ctx.lineTo(4,0); ctx.moveTo(2,0); ctx.lineTo(3,-2); ctx.lineTo(1,-2); ctx.closePath(); ctx.moveTo(-1,0); ctx.lineTo(-2,-1); ctx.moveTo(-3,0); ctx.lineTo(-4,-1);
                    ctx.stroke();
                } else if (obj.type === 'meteor') {
                    ctx.moveTo(-10, -10); ctx.lineTo(0,0); ctx.stroke();
                    ctx.beginPath(); ctx.arc(0,0,1,0,Math.PI*2); ctx.fill();
                }
                
                ctx.restore();
            });

            // --- DRAW SOLID TERRAIN ---
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0 / state.camera.zoom; 

            ctx.beginPath();
            ctx.moveTo(state.terrain.segments[0].x1, state.terrain.segments[0].y1);
            state.terrain.segments.forEach(seg => {
                ctx.lineTo(seg.x2, seg.y2);
            });
            
            const lastSeg = state.terrain.segments[state.terrain.segments.length - 1];
            const firstSeg = state.terrain.segments[0];
            ctx.lineTo(lastSeg.x2, VIEW_H + 2000); 
            ctx.lineTo(firstSeg.x1, VIEW_H + 2000); 
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();

            state.terrain.pads.forEach(pad => {
                ctx.strokeStyle = '#ffffff'; 
                ctx.lineWidth = 1.5 / state.camera.zoom;
                ctx.beginPath();
                ctx.moveTo(pad.x1, pad.y);
                ctx.lineTo(pad.x2, pad.y);
                ctx.stroke();

                ctx.save();
                ctx.translate(pad.x1 + (pad.x2 - pad.x1)/2, pad.y + 20);
                ctx.scale(1 / state.camera.zoom, 1 / state.camera.zoom);
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${pad.mult}X`, 0, 0);
                ctx.restore();
            });

            // --- DRAW DEBRIS ---
            if (state.debris.length > 0) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.0 / state.camera.zoom;
                state.debris.forEach(d => {
                    ctx.save();
                    ctx.translate(d.x, d.y);
                    ctx.rotate(d.rot);
                    ctx.globalAlpha = d.life;
                    ctx.beginPath();
                    ctx.moveTo(d.points[0][0], d.points[0][1]);
                    d.points.forEach(pt => ctx.lineTo(pt[0], pt[1]));
                    ctx.closePath();
                    ctx.stroke();
                    ctx.restore();
                });
                ctx.globalAlpha = 1.0;
            }

            // --- DRAW LANDER ---
            if (state.status !== 'CRASHED') {
                const l = state.lander;
                ctx.save();
                ctx.translate(l.x, l.y);
                ctx.rotate(l.rotation);

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.0 / state.camera.zoom; 
                
                ctx.beginPath();
                ctx.moveTo(LANDER_BODY[0][0], LANDER_BODY[0][1]);
                LANDER_BODY.forEach(pt => ctx.lineTo(pt[0], pt[1]));
                ctx.closePath(); ctx.stroke();

                ctx.beginPath();
                ctx.arc(0, -4.5, 4, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                LANDER_LEGS.forEach(line => {
                    ctx.moveTo(line.start[0], line.start[1]);
                    ctx.lineTo(line.end[0], line.end[1]);
                });
                ctx.stroke();

                if (state.status !== 'READY' && (state.keys['w'] || state.keys['arrowup'] || state.keys[' '] || state.mouse.down || (navigator.getGamepads()[0] && navigator.getGamepads()[0].buttons[0].pressed))) {
                    if (state.fuel > 0) {
                        ctx.strokeStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.moveTo(FLAME_SHAPE[0][0], FLAME_SHAPE[0][1]);
                        const flicker = 8 + Math.random() * 10;
                        ctx.lineTo(0, flicker);
                        ctx.lineTo(FLAME_SHAPE[2][0], FLAME_SHAPE[2][1]);
                        ctx.stroke();
                    }
                }
                ctx.restore();
            }

            // --- DRAW PARTICLES ---
            ctx.lineWidth = 1.0 / state.camera.zoom;
            state.particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fillRect(p.x, p.y, 1/state.camera.zoom, 1/state.camera.zoom);
            });
            ctx.globalAlpha = 1.0;

            ctx.restore(); // END CAMERA TRANSFORM

            // --- DRAW HUD ---
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px monospace';
            ctx.textAlign = 'left';
            
            ctx.fillText(`SCORE: ${String(engine.current.score).padStart(4, '0')}`, 20, 30);
            ctx.fillText(`TIME:  ${String(Math.floor(engine.current.time)).padStart(3, '0')}`, 20, 55);
            ctx.fillText(`FUEL:  ${String(Math.floor(engine.current.fuel)).padStart(4, '0')}`, 20, 80);
            ctx.fillText(`LEVEL: ${engine.current.level}`, 20, 105);

            ctx.textAlign = 'right';
            let currentVxUI = Math.floor(engine.current.lander.vx * 100);
            let currentVyUI = Math.floor(engine.current.lander.vy * 100);
            ctx.fillText(`ALTITUDE: ${String(engine.current.altitude).padStart(4, '0')}`, VIEW_W - 20, 30);
            ctx.fillText(`HORIZ SPD: ${String(Math.abs(currentVxUI)).padStart(3, '0')} ${currentVxUI > 0 ? '▶' : '◀'}`, VIEW_W - 20, 55);
            ctx.fillText(`VERT SPD:  ${String(Math.abs(currentVyUI)).padStart(3, '0')} ${currentVyUI > 0 ? '▼' : '▲'}`, VIEW_W - 20, 80);

            ctx.textAlign = 'center';
            
            if (state.status === 'START') {
                ctx.font = '40px monospace';
                ctx.fillText("LUNAR LANDER", VIEW_W / 2, VIEW_H / 2 - 40);
                ctx.font = '20px monospace';
                if (Math.floor(performance.now() / 500) % 2 === 0) {
                    ctx.fillText("PRESS ENTER OR CLICK TO START", VIEW_W / 2, VIEW_H / 2 + 20);
                }
                ctx.fillStyle = '#888888';
                ctx.fillText("W/A/D or Arrows to Fly", VIEW_W / 2, VIEW_H / 2 + 70);
                ctx.fillText("Left Click = Thrust | Mouse = Aim | M = Menu", VIEW_W / 2, VIEW_H / 2 + 100);
            }
            else if (state.status === 'READY') {
                if (state.countdown > 3.0) {
                    ctx.font = '40px monospace';
                    ctx.fillStyle = '#00ffff';
                    ctx.fillText(`APPROACHING LUNAR ORBIT`, VIEW_W / 2, VIEW_H / 2 - 20);
                } else {
                    ctx.font = '40px monospace';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`PREPARE FOR MANUAL DESCENT`, VIEW_W / 2, VIEW_H / 2 - 40);
                    
                    ctx.font = '60px monospace';
                    ctx.fillStyle = '#ffaa00';
                    let sec = Math.ceil(state.countdown);
                    if (sec > 0) {
                        ctx.fillText(`T-MINUS ${sec}`, VIEW_W / 2, VIEW_H / 2 + 30);
                    }
                }
            }
            else if (state.status === 'CRASHED') {
                ctx.font = '40px monospace';
                ctx.fillStyle = '#ff0000';
                ctx.fillText("MISSION FAILURE", VIEW_W / 2, VIEW_H / 2 - 90);
                
                ctx.font = '16px monospace';
                ctx.fillStyle = '#ffaa00';
                const words = state.crashMessage.split(' ');
                let line = '';
                let yOff = -40;
                words.forEach(w => {
                    if (ctx.measureText(line + w).width > 600) {
                        ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 + yOff);
                        line = w + ' ';
                        yOff += 25;
                    } else {
                        line += w + ' ';
                    }
                });
                ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 + yOff);

                ctx.font = '20px monospace';
                ctx.fillStyle = '#ffffff';
                if (Math.floor(performance.now() / 500) % 2 === 0) {
                    ctx.fillText("PRESS ENTER TO RESTART MISSION", VIEW_W / 2, VIEW_H / 2 + yOff + 60);
                }
            }
            else if (state.status === 'LANDED') {
                ctx.font = '40px monospace';
                ctx.fillStyle = '#00ff00';
                ctx.fillText("EXCELLENT LANDING", VIEW_W / 2, VIEW_H / 2 - 20);
                ctx.font = '20px monospace';
                ctx.fillStyle = '#ffffff';
                ctx.fillText("PRESS ENTER TO COMMENCE NEXT MISSION", VIEW_W / 2, VIEW_H / 2 + 30);
            }
            else if (state.status === 'OUT_OF_FUEL') {
                ctx.font = '40px monospace';
                ctx.fillStyle = '#ffaa00';
                ctx.fillText("OUT OF FUEL", VIEW_W / 2, VIEW_H / 2 - 20);
                ctx.font = '20px monospace';
                if (Math.floor(performance.now() / 250) % 2 === 0) {
                    ctx.fillStyle = '#ff0000';
                    ctx.fillText("BRACE FOR IMPACT", VIEW_W / 2, VIEW_H / 2 + 30);
                }
            }
        };

        const loop = () => {
            if (engine.current.status === 'EXITING') return; 
            update();
            draw();
            frameId = requestAnimationFrame(loop);
        };

        loop();

        return () => cancelAnimationFrame(frameId);
    }, [audioCtx, onMenu]);

    return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-transparent">
            <canvas
                ref={canvasRef}
                width={VIEW_W}
                height={VIEW_H}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000',
                    cursor: 'crosshair'
                }}
            />
            {/* Authentic CRT Artifacting */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                backgroundSize: '100% 4px, 6px 100%',
                pointerEvents: 'none',
                zIndex: 10
            }} />
        </div>
    );
}
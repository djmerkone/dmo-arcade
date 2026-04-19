import React, { useEffect, useRef, useState } from 'react';
import { TANK_LEVELS } from './tanklevel.js';

// --- ADVANCED HARDWARE AUDIO SYNTHESIZER ---
class TankAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.master = this.ctx?.createGain();
        if (this.master) {
            this.master.gain.value = 0.4;
            this.master.connect(this.ctx.destination);
        }
        
        // Continuous deep engine rumble generator
        if (this.ctx) {
            this.engineNoise = this.ctx.createBufferSource();
            const bufSize = this.ctx.sampleRate * 2;
            const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for(let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;
            this.engineNoise.buffer = buf;
            this.engineNoise.loop = true;
            
            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.value = 80; // Sub-bass rumble
            
            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.value = 0; 
            
            this.engineNoise.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
        }
    }

    ensure() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    
    startEngine() {
        this.ensure();
        if (this.engineNoise && !this.engineStarted) {
            this.engineNoise.start();
            this.engineStarted = true;
        }
        if (this.engineGain) this.engineGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.1);
    }
    
    stopEngine() {
        if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }

    shoot() {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        // Punchy square wave pitch drop
        let osc = this.ctx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        
        osc.connect(gain).connect(this.master);
        osc.start(t); osc.stop(t + 0.15);

        // White noise "Crack"
        let bufSize = this.ctx.sampleRate * 0.1;
        let buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        let data = buf.getChannelData(0);
        for(let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;
        let noise = this.ctx.createBufferSource(); noise.buffer = buf;
        let nFilter = this.ctx.createBiquadFilter(); nFilter.type = 'highpass'; nFilter.frequency.value = 1000;
        let nGain = this.ctx.createGain(); nGain.gain.setValueAtTime(0.4, t); nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        noise.connect(nFilter).connect(nGain).connect(this.master);
        noise.start(t);
    }

    hitWall() {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.1);
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.connect(gain).connect(this.master);
        osc.start(t); osc.stop(t + 0.1);
    }

    explode() {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        
        // Massive Sub-Bass Boom
        let osc = this.ctx.createOscillator(); osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.8);
        let oGain = this.ctx.createGain();
        oGain.gain.setValueAtTime(0.6, t);
        oGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
        osc.connect(oGain).connect(this.master);
        osc.start(t); osc.stop(t + 0.8);

        // Distorted noise crunch
        let bufSize = this.ctx.sampleRate * 0.8;
        let buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        let data = buf.getChannelData(0);
        for(let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;
        let noise = this.ctx.createBufferSource(); noise.buffer = buf;
        let filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
        let gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.8, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
        noise.connect(filter).connect(gain).connect(this.master);
        noise.start(t);
    }

    score() {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, i) => {
            let osc = this.ctx.createOscillator(); osc.type = 'square';
            osc.frequency.value = freq;
            let gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.1, t + i*0.1); gain.gain.linearRampToValueAtTime(0, t + i*0.1 + 0.1);
            osc.connect(gain).connect(this.master);
            osc.start(t + i*0.1); osc.stop(t + i*0.1 + 0.1);
        });
    }
}

export default function TankGame({ audioCtx, onMenu }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = false;

        const audio = new TankAudio(audioCtx);
        let animationFrameId;

        const state = {
            status: 'start', 
            players: 1,      
            width: 800,
            height: 600,
            score: { p1: 0, p2: 0 },
            currentLevel: 0,
            flashTimer: 0,
            tick: 0,
            // RotSpeed is gone, Zelda logic uses instant angle snapping
            p1: { x: 0, y: 0, angle: 0, speed: 0, maxSpeed: 2.5, cooldown: 0, color: '#0f0', isAI: false },
            p2: { x: 0, y: 0, angle: 0, speed: 0, maxSpeed: 2.5, cooldown: 0, color: '#f0f', isAI: true, stuckTicks: 0 },
            bullets: [],
            particles: [],
            treads: []
        };

        const resetTanks = () => {
            const levelData = TANK_LEVELS[state.currentLevel];
            state.p1.x = levelData.p1Spawn.x; state.p1.y = levelData.p1Spawn.y; state.p1.angle = levelData.p1Spawn.angle; 
            state.p1.cooldown = 0;
            state.p2.x = levelData.p2Spawn.x; state.p2.y = levelData.p2Spawn.y; state.p2.angle = levelData.p2Spawn.angle; 
            state.p2.cooldown = 0; state.p2.stuckTicks = 0;
            
            state.bullets = [];
            state.particles = [];
            state.treads = [];
            state.p2.isAI = (state.players === 1);
        };

        const handleResize = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            ctx.scale(rect.width / 800, rect.height / 600);
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        setIsReady(true);

        const keys = {};
        const handleKeyDown = e => { 
            if (e.key === ' ') e.preventDefault();
            keys[e.key.toLowerCase()] = true; 
            if(e.key.toLowerCase() === 'm') { audio.stopEngine(); onMenu(); }
            
            if (state.status === 'start') {
                if (e.key === 'w' || e.key === 'ArrowUp') state.players = 1;
                if (e.key === 's' || e.key === 'ArrowDown') state.players = 2;
            }
            if(e.key === 'Enter' || e.key.toLowerCase() === 'enter') {
                if (state.status === 'start' || state.status === 'gameover') {
                    state.score.p1 = 0; state.score.p2 = 0;
                    state.currentLevel = 0;
                    state.status = 'playing';
                    audio.startEngine();
                    resetTanks();
                }
            }
        };
        const handleKeyUp = e => { keys[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // --- ADVANCED SLIDING COLLISION PHYSICS ---
        const checkCollision = (x, y, radius) => {
            const maze = TANK_LEVELS[state.currentLevel].maze;
            const checkPt = (tx, ty) => {
                let col = Math.floor(tx / 50);
                let row = Math.floor(ty / 50);
                if (row < 0 || row >= 12 || col < 0 || col >= 16) return 1; 
                return maze[row][col];
            };
            let tl = checkPt(x - radius, y - radius);
            let tr = checkPt(x + radius, y - radius);
            let bl = checkPt(x - radius, y + radius);
            let br = checkPt(x + radius, y + radius);
            return Math.max(tl, tr, bl, br); 
        };

        const createExplosion = (x, y, color) => {
            audio.explode();
            for(let i=0; i<40; i++) {
                state.particles.push({
                    x: x, y: y,
                    vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12,
                    life: 40 + Math.random()*30,
                    color: Math.random() > 0.5 ? color : '#ffaa00' // Mix tank color with fire
                });
            }
        };

        const scorePoint = (winner) => {
            if (winner === 1) state.score.p1++;
            else state.score.p2++;
            
            audio.score();
            state.status = 'scored';
            state.flashTimer = 90; 

            if (state.score.p1 >= 10 || state.score.p2 >= 10) {
                state.status = 'gameover';
                audio.stopEngine();
            } else {
                // Cycle to the next maze layout automatically!
                state.currentLevel = (state.currentLevel + 1) % TANK_LEVELS.length;
            }
        };

        // --- MASTER LOOP ---
        const loop = () => {
            state.tick++;
            const virtualKeys = { ...keys };
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp1 = gamepads[0]; 
            const gp2 = gamepads[1]; 
            const deadz = 0.3;

            // Universal Hardware Poller
            if (gp1) {
                if (gp1.buttons[8]?.pressed) { audio.stopEngine(); onMenu(); return; }
                if (state.status === 'start') {
                    if (gp1.axes[1] < -deadz || gp1.buttons[12]?.pressed) state.players = 1;
                    if (gp1.axes[1] >  deadz || gp1.buttons[13]?.pressed) state.players = 2;
                }
                if (gp1.buttons[9]?.pressed) {
                    if (state.status === 'start' || state.status === 'gameover') {
                        state.score.p1 = 0; state.score.p2 = 0; state.currentLevel = 0; state.status = 'playing'; audio.startEngine(); resetTanks();
                    }
                }
                if (gp1.axes[1] < -deadz || gp1.buttons[12]?.pressed) virtualKeys['w'] = true;
                if (gp1.axes[1] >  deadz || gp1.buttons[13]?.pressed) virtualKeys['s'] = true;
                if (gp1.axes[0] < -deadz || gp1.buttons[14]?.pressed) virtualKeys['a'] = true;
                if (gp1.axes[0] >  deadz || gp1.buttons[15]?.pressed) virtualKeys['d'] = true;
                if (gp1.buttons[0]?.pressed || gp1.buttons[1]?.pressed || gp1.buttons[2]?.pressed || gp1.buttons[3]?.pressed || gp1.buttons[7]?.pressed) virtualKeys[' '] = true;
            }

            if (gp2 && state.players === 2) {
                if (gp2.axes[1] < -deadz || gp2.buttons[12]?.pressed) virtualKeys['arrowup'] = true;
                if (gp2.axes[1] >  deadz || gp2.buttons[13]?.pressed) virtualKeys['arrowdown'] = true;
                if (gp2.axes[0] < -deadz || gp2.buttons[14]?.pressed) virtualKeys['arrowleft'] = true;
                if (gp2.axes[0] >  deadz || gp2.buttons[15]?.pressed) virtualKeys['arrowright'] = true;
                if (gp2.buttons[0]?.pressed || gp2.buttons[1]?.pressed || gp2.buttons[7]?.pressed) virtualKeys['enter'] = true;
            }

            // Dynamic Engine Audio Modulation
            let isMoving = virtualKeys['w'] || virtualKeys['s'] || virtualKeys['a'] || virtualKeys['d'] || virtualKeys['arrowup'] || virtualKeys['arrowdown'] || virtualKeys['arrowleft'] || virtualKeys['arrowright'];
            if (state.status === 'playing' && audio.engineFilter) {
                audio.engineFilter.frequency.setTargetAtTime(isMoving ? 250 : 80, audio.ctx.currentTime, 0.1);
            }

            if (state.status === 'playing') {
                // --- PLAYER 1 (ZELDA OMNIDIRECTIONAL PHYSICS) ---
                let p1vx = 0; let p1vy = 0;
                if (virtualKeys['w']) p1vy -= state.p1.maxSpeed;
                if (virtualKeys['s']) p1vy += state.p1.maxSpeed;
                if (virtualKeys['a']) p1vx -= state.p1.maxSpeed;
                if (virtualKeys['d']) p1vx += state.p1.maxSpeed;

                if (p1vx !== 0 || p1vy !== 0) {
                    // Normalize diagonal movement
                    let len = Math.hypot(p1vx, p1vy);
                    p1vx = (p1vx / len) * state.p1.maxSpeed;
                    p1vy = (p1vy / len) * state.p1.maxSpeed;

                    // Instantly snap rotation to movement direction
                    state.p1.angle = Math.atan2(p1vy, p1vx);

                    let nextX = state.p1.x + p1vx;
                    let nextY = state.p1.y + p1vy;
                    let hit = checkCollision(nextX, nextY, 12);
                    
                    if (hit === 0) { 
                        state.p1.x = nextX; state.p1.y = nextY; 
                    } else if (hit === 1) {
                        // Advanced Wall Sliding (Slide horizontally if blocked vertically, etc)
                        let hitX = checkCollision(nextX, state.p1.y, 12);
                        if (hitX === 0) state.p1.x = nextX;
                        let hitY = checkCollision(state.p1.x, nextY, 12);
                        if (hitY === 0) state.p1.y = nextY;
                    } else if (hit === 2) { 
                        createExplosion(state.p1.x, state.p1.y, state.p1.color); scorePoint(2); 
                    }

                    // Leave Tread Marks
                    if (state.tick % 3 === 0) {
                        state.treads.push({x: state.p1.x, y: state.p1.y, angle: state.p1.angle, life: 100});
                    }
                }

                if (virtualKeys[' '] && state.p1.cooldown <= 0) {
                    state.bullets.push({
                        x: state.p1.x + Math.cos(state.p1.angle) * 20,
                        y: state.p1.y + Math.sin(state.p1.angle) * 20,
                        vx: Math.cos(state.p1.angle) * 10,
                        vy: Math.sin(state.p1.angle) * 10,
                        owner: 1, life: 100
                    });
                    state.p1.cooldown = 45;
                    audio.shoot();
                }
                if (state.p1.cooldown > 0) state.p1.cooldown--;


                // --- PLAYER 2 / AI UPDATE ---
                if (!state.p2.isAI) {
                    let p2vx = 0; let p2vy = 0;
                    if (virtualKeys['arrowup']) p2vy -= state.p2.maxSpeed;
                    if (virtualKeys['arrowdown']) p2vy += state.p2.maxSpeed;
                    if (virtualKeys['arrowleft']) p2vx -= state.p2.maxSpeed;
                    if (virtualKeys['arrowright']) p2vx += state.p2.maxSpeed;
                    
                    if (p2vx !== 0 || p2vy !== 0) {
                        let len = Math.hypot(p2vx, p2vy);
                        p2vx = (p2vx / len) * state.p2.maxSpeed;
                        p2vy = (p2vy / len) * state.p2.maxSpeed;

                        state.p2.angle = Math.atan2(p2vy, p2vx);

                        let nextX = state.p2.x + p2vx;
                        let nextY = state.p2.y + p2vy;
                        let hit = checkCollision(nextX, nextY, 12);
                        
                        if (hit === 0) { 
                            state.p2.x = nextX; state.p2.y = nextY; 
                        } else if (hit === 1) {
                            let hitX = checkCollision(nextX, state.p2.y, 12);
                            if (hitX === 0) state.p2.x = nextX;
                            let hitY = checkCollision(state.p2.x, nextY, 12);
                            if (hitY === 0) state.p2.y = nextY;
                        } else if (hit === 2) { 
                            createExplosion(state.p2.x, state.p2.y, state.p2.color); scorePoint(1); 
                        }

                        if (state.tick % 3 === 0) {
                            state.treads.push({x: state.p2.x, y: state.p2.y, angle: state.p2.angle, life: 100});
                        }
                    }

                    if ((virtualKeys['enter'] || virtualKeys['shift']) && state.p2.cooldown <= 0) {
                        state.bullets.push({
                            x: state.p2.x + Math.cos(state.p2.angle) * 20, y: state.p2.y + Math.sin(state.p2.angle) * 20,
                            vx: Math.cos(state.p2.angle) * 10, vy: Math.sin(state.p2.angle) * 10,
                            owner: 2, life: 100
                        });
                        state.p2.cooldown = 45;
                        audio.shoot();
                    }
                } else {
                    // --- ZELDA-STYLE OMNIDIRECTIONAL AI ---
                    let dx = state.p1.x - state.p2.x;
                    let dy = state.p1.y - state.p2.y;
                    let dist = Math.hypot(dx, dy);

                    if (dist > 0) {
                        // AI moves straight towards player
                        let p2vx = (dx / dist) * (state.p2.maxSpeed * 0.7);
                        let p2vy = (dy / dist) * (state.p2.maxSpeed * 0.7);
                        
                        // Face the direction of movement
                        state.p2.angle = Math.atan2(p2vy, p2vx);

                        let nextX = state.p2.x + p2vx;
                        let nextY = state.p2.y + p2vy;
                        let hit = checkCollision(nextX, nextY, 12);

                        if (hit === 0) {
                            state.p2.x = nextX; state.p2.y = nextY;
                        } else if (hit === 1) {
                            // AI Wall Sliding
                            let hitX = checkCollision(nextX, state.p2.y, 12);
                            if (hitX === 0) { state.p2.x = nextX; state.p2.angle = Math.atan2(0, p2vx); }
                            
                            let hitY = checkCollision(state.p2.x, nextY, 12);
                            if (hitY === 0) { state.p2.y = nextY; state.p2.angle = Math.atan2(p2vy, 0); }
                        } else if (hit === 2) {
                            createExplosion(state.p2.x, state.p2.y, state.p2.color); scorePoint(1);
                        }

                        if (state.tick % 4 === 0) state.treads.push({x: state.p2.x, y: state.p2.y, angle: state.p2.angle, life: 100});

                        // Shoot if player is generally in front of them
                        // AI aims perfectly now since it uses Zelda movement directly at player
                        if (state.p2.cooldown <= 0 && Math.random() < 0.05) {
                            state.bullets.push({
                                x: state.p2.x + Math.cos(state.p2.angle) * 20, y: state.p2.y + Math.sin(state.p2.angle) * 20,
                                vx: Math.cos(state.p2.angle) * 10, vy: Math.sin(state.p2.angle) * 10, owner: 2, life: 100
                            });
                            state.p2.cooldown = 60;
                            audio.shoot();
                        }
                    }
                }
                if (state.p2.cooldown > 0) state.p2.cooldown--;

                // --- BULLET PHYSICS ---
                for (let i = state.bullets.length - 1; i >= 0; i--) {
                    let b = state.bullets[i];
                    b.x += b.vx;
                    b.y += b.vy;
                    b.life--;

                    // Bullet vs Walls / Mines
                    let envHit = checkCollision(b.x, b.y, 2);
                    if (envHit > 0) {
                        state.bullets.splice(i, 1);
                        audio.hitWall();
                        for(let p=0; p<5; p++) state.particles.push({x: b.x, y: b.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 10, color: '#fff'});
                        continue;
                    }
                    if (b.life <= 0) { state.bullets.splice(i, 1); continue; }

                    // Bullet vs Tanks
                    if (b.owner !== 1 && Math.hypot(b.x - state.p1.x, b.y - state.p1.y) < 14) {
                        state.bullets.splice(i, 1);
                        createExplosion(state.p1.x, state.p1.y, state.p1.color);
                        scorePoint(2);
                        break;
                    }
                    if (b.owner !== 2 && Math.hypot(b.x - state.p2.x, b.y - state.p2.y) < 14) {
                        state.bullets.splice(i, 1);
                        createExplosion(state.p2.x, state.p2.y, state.p2.color);
                        scorePoint(1);
                        break;
                    }
                }
            }

            // Update Trails & Particles
            for (let i = state.particles.length - 1; i >= 0; i--) {
                let p = state.particles[i];
                p.x += p.vx; p.y += p.vy; p.life--;
                if (p.life <= 0) state.particles.splice(i, 1);
            }
            for (let i = state.treads.length - 1; i >= 0; i--) {
                state.treads[i].life--;
                if (state.treads[i].life <= 0) state.treads.splice(i, 1);
            }

            if (state.status === 'scored') {
                state.flashTimer--;
                if (state.flashTimer <= 0) {
                    state.status = 'playing';
                    resetTanks();
                }
            }

            // --- RENDERER ---
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, state.width, state.height);

            // Draw Treads (Underneath Maze)
            state.treads.forEach(t => {
                ctx.save();
                ctx.translate(t.x, t.y);
                ctx.rotate(t.angle);
                ctx.fillStyle = `rgba(30, 30, 30, ${t.life / 100})`;
                ctx.fillRect(-12, -12, 6, 4);
                ctx.fillRect(-12, 8, 6, 4);
                ctx.restore();
            });

            // Draw Maze
            const currentMaze = TANK_LEVELS[state.currentLevel].maze;
            for (let r = 0; r < 12; r++) {
                for (let c = 0; c < 16; c++) {
                    let val = currentMaze[r][c];
                    let bx = c * 50; let by = r * 50;
                    if (val === 1) {
                        ctx.fillStyle = '#113311'; ctx.fillRect(bx, by, 50, 50); // Bezel Glow
                        ctx.fillStyle = '#225522'; ctx.fillRect(bx+2, by+2, 46, 46); // Inner Block
                    } else if (val === 2) {
                        // Mine
                        ctx.strokeStyle = '#f00'; ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.moveTo(bx + 15, by + 15); ctx.lineTo(bx + 35, by + 35);
                        ctx.moveTo(bx + 35, by + 15); ctx.lineTo(bx + 15, by + 35);
                        ctx.stroke();
                    }
                }
            }

            // Draw Particles
            state.particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 50;
                ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            });
            ctx.globalAlpha = 1.0;

            const drawTank = (t) => {
                ctx.save();
                ctx.translate(t.x, t.y);
                ctx.rotate(t.angle);
                
                // Treads
                ctx.fillStyle = '#333';
                ctx.fillRect(-14, -14, 28, 6);
                ctx.fillRect(-14, 8, 28, 6);
                
                // Body
                ctx.fillStyle = t.color;
                ctx.fillRect(-10, -10, 20, 20);
                
                // Barrel
                ctx.fillRect(0, -2, 18, 4);
                
                ctx.restore();
            };

            // Only draw tanks if not exploding
            if (state.status === 'playing' || (state.status === 'scored' && state.flashTimer % 10 < 5)) {
                drawTank(state.p1);
                drawTank(state.p2);
            }

            // Draw Bullets
            ctx.fillStyle = '#fff';
            state.bullets.forEach(b => {
                ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
                ctx.fillStyle = b.owner === 1 ? state.p1.color : state.p2.color;
                ctx.fillRect(b.x - 4, b.y - 4, 8, 8); // Colored Glow
                ctx.fillStyle = '#fff';
            });

            // UI Overlays
            ctx.fillStyle = '#ffffff';
            ctx.font = '60px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(state.score.p1, state.width / 4, 60);
            ctx.fillText(state.score.p2, (state.width / 4) * 3, 60);

            if (state.status === 'start') {
                ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, state.width, state.height);
                ctx.fillStyle = '#fff';
                ctx.font = '80px "VT323", monospace'; ctx.fillText("TANK", state.width / 2, state.height / 2 - 80);
                
                ctx.font = '40px "VT323", monospace';
                ctx.fillStyle = state.players === 1 ? '#0f0' : '#888';
                ctx.fillText(state.players === 1 ? "> 1 PLAYER (VS AI) <" : "1 PLAYER (VS AI)", state.width / 2, state.height / 2 + 10);
                
                ctx.fillStyle = state.players === 2 ? '#f0f' : '#888';
                ctx.fillText(state.players === 2 ? "> 2 PLAYERS (PVP) <" : "2 PLAYERS (PVP)", state.width / 2, state.height / 2 + 70);

                ctx.font = '30px "VT323", monospace';
                ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? '#fff' : '#888';
                ctx.fillText("PRESS ENTER TO START", state.width / 2, state.height / 2 + 160);
                
                ctx.fillStyle = '#aaa'; ctx.font = '20px "VT323", monospace';
                ctx.fillText("P1: WASD+SPACE | P2: ARROWS+ENTER", state.width / 2, state.height - 30);
            } else if (state.status === 'gameover') {
                ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, state.width, state.height);
                ctx.fillStyle = '#fff'; ctx.font = '80px "VT323", monospace';
                let winner = state.score.p1 >= 10 ? "PLAYER 1" : "PLAYER 2";
                ctx.fillStyle = state.score.p1 >= 10 ? state.p1.color : state.p2.color;
                ctx.fillText(`${winner} WINS!`, state.width / 2, state.height / 2 - 40);
                ctx.fillStyle = '#fff'; ctx.font = '30px "VT323", monospace';
                ctx.fillText("PRESS ENTER TO REPLAY", state.width / 2, state.height / 2 + 40);
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if(audio) audio.stopEngine();
        };
    }, [audioCtx, onMenu]);

    return (
        <div ref={containerRef} className="absolute inset-0 z-20 bg-black pointer-events-auto flex items-center justify-center overflow-hidden">
            {!isReady && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black bg-opacity-90">
                    <h2 className="text-[#0f0] text-4xl font-['VT323'] blink-text">INSERT COIN...</h2>
                </div>
            )}
            <canvas ref={canvasRef} className="block cursor-none" />
        </div>
    );
}
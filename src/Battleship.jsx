import React, { useEffect, useRef, useState } from 'react';

/**
 * ============================================================================
 * BATTLE TACTICS (1983) - CINEMATIC NAVAL WARFARE
 * ============================================================================
 * Features:
 * - Dynamic Grids (8x8 up to 14x14 based on level)
 * - Deep Blue Tactical CRT Visuals
 * - 2 Game Modes (Campaign with Story, Endurance for infinite play)
 * - Visual Strike Animations (Jets & Gunboats)
 * - High-Fidelity Audio (Splashes, Hits, Sinking Groans, Doppler Jets)
 * - Strategic Mine Laying (Right-click to lay, Space to detonate)
 * ============================================================================
 */

const VIEW_W = 800;
const VIEW_H = 600;

// --- AUDIO ENGINE ---
class NavalAudio {
    constructor(ctx) {
        this.ctx = ctx;
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);

        // Echo Network for underwater/distant feel
        this.delay = this.ctx.createDelay();
        this.delay.delayTime.value = 0.5;
        this.feedback = this.ctx.createGain();
        this.feedback.gain.value = 0.3;
        this.delay.connect(this.feedback);
        this.feedback.connect(this.delay);
        this.delay.connect(this.master);

        const bufferSize = this.ctx.sampleRate * 2.0;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    }

    playFlyby() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 2.0;
        // Doppler effect: sweeps from high to low pitch
        filter.frequency.setValueAtTime(3000, t);
        filter.frequency.exponentialRampToValueAtTime(300, t + 0.8);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.exponentialRampToValueAtTime(0.8, t + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
        
        src.connect(filter).connect(gain).connect(this.master);
        src.start(t); src.stop(t + 0.8);
    }

    playSplash() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        // "Bloop" sound sweeping down into the water
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.5);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        
        src.connect(filter).connect(gain).connect(this.master);
        src.start(t); src.stop(t + 0.5);
    }

    playHit() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.4);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.0, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        
        src.connect(filter).connect(gain).connect(this.master);
        src.start(t); src.stop(t + 0.4);
    }

    playSink() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const t = this.ctx.currentTime;
        
        // Multiple staggered explosions
        for(let i=0; i<4; i++) {
            let offset = t + (i * 0.3);
            const src = this.ctx.createBufferSource();
            src.buffer = this.noiseBuffer;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800 - (i*100), offset);
            filter.frequency.exponentialRampToValueAtTime(40, offset + 0.8);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(1.0, offset);
            gain.gain.exponentialRampToValueAtTime(0.01, offset + 0.8);
            src.connect(filter).connect(gain).connect(this.master);
            src.connect(filter).connect(gain).connect(this.delay); // Echo out
            src.start(offset); src.stop(offset + 0.8);
        }

        // Metallic groaning hull sound
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(50, t + 1.5);
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 5;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain).connect(osc.frequency);
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, t);
        oscGain.gain.linearRampToValueAtTime(0.01, t + 1.5);
        
        osc.connect(oscGain).connect(this.master);
        lfo.start(t); osc.start(t);
        lfo.stop(t + 1.5); osc.stop(t + 1.5);
    }
}

// --- GAME LOGIC HELPER ---
const getFleetForLevel = (level) => {
    let base = [
        { id: 1, name: "CARRIER", size: 5, color: "#00aaff" },
        { id: 2, name: "BATTLESHIP", size: 4, color: "#00ffaa" },
        { id: 3, name: "CRUISER", size: 3, color: "#00ffff" },
        { id: 4, name: "SUBMARINE", size: 3, color: "#00ccff" },
        { id: 5, name: "DESTROYER", size: 2, color: "#0088ff" }
    ];
    // Add extra ships for higher levels
    if (level > 1) base.push({ id: 6, name: "ATTACK SUB", size: 3, color: "#00ccff" });
    if (level > 2) base.push({ id: 7, name: "FRIGATE", size: 2, color: "#0088ff" });
    return base;
};

// --- MAIN COMPONENT ---
export default function BattleshipGame({ audioCtx, onMenu }) {
    const canvasRef = useRef(null);
    const audioRef = useRef(null);

    const engine = useRef({
        status: 'TITLE', // TITLE, CINEMATIC, PLACEMENT, PLAYER_TURN, ANIMATING, AI_TURN, GAMEOVER
        mode: 'CAMPAIGN', // CAMPAIGN or ENDURANCE
        level: 1,
        gridSize: 8,
        
        fleet: [],
        p1Grid: [], p2Grid: [],
        p1Shots: [], p2Shots: [],
        p1ShipData: [], p2ShipData: [], // Tracks HP of ships to detect sinking
        
        p1Mines: 3,
        placedMines: [], // Array of {x, y} on enemy grid
        
        currentShipIdx: 0,
        isHorizontal: true,
        hoverCell: null,
        
        activeAnimation: null, // { type: 'jet', tx, ty, x, y, progress, isPlayer }
        cinematicText: "",
        cinematicChars: 0,
        
        particles: [],
        tick: 0,
        keys: {},
        mouse: { x: 0, y: 0, clicked: false, rightClicked: false }
    });

    useEffect(() => {
        const handleKeyDown = (e) => { engine.current.keys[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { engine.current.keys[e.key.toLowerCase()] = false; };
        
        const handleMouseMove = (e) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            engine.current.mouse.x = (e.clientX - rect.left) * (VIEW_W / rect.width);
            engine.current.mouse.y = (e.clientY - rect.top) * (VIEW_H / rect.height);
            engine.current.mouse.clicked = false; 
            engine.current.mouse.rightClicked = false;
        };
        const handleMouseDown = (e) => { 
            if (e.button === 0) engine.current.mouse.clicked = true; 
            if (e.button === 2) engine.current.mouse.rightClicked = true; 
        };
        const handleContextMenu = (e) => e.preventDefault(); 

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let frameId;

        const initLevel = (level) => {
            const state = engine.current;
            state.level = level;
            state.gridSize = Math.min(14, 6 + (level * 2)); // 8, 10, 12, 14 max
            state.fleet = getFleetForLevel(level);
            
            const gSize = state.gridSize;
            state.p1Grid = Array(gSize).fill().map(() => Array(gSize).fill(0));
            state.p2Grid = Array(gSize).fill().map(() => Array(gSize).fill(0));
            state.p1Shots = Array(gSize).fill().map(() => Array(gSize).fill(0));
            state.p2Shots = Array(gSize).fill().map(() => Array(gSize).fill(0));
            
            state.p1ShipData = state.fleet.map(s => ({ ...s, hits: 0 }));
            state.p2ShipData = state.fleet.map(s => ({ ...s, hits: 0 }));
            
            state.p1Mines = 3 + Math.floor(level / 2);
            state.placedMines = [];
            
            state.currentShipIdx = 0;
            state.particles = [];
            
            if (state.mode === 'CAMPAIGN') {
                state.status = 'CINEMATIC';
                state.cinematicChars = 0;
                if (level === 1) state.cinematicText = "INTELLIGENCE REPORT:\n\nHOSTILE FLEET DETECTED IN SECTOR ALPHA.\nENGAGE AND DESTROY ALL TARGETS.\n\nPREPARE FLEET DEPLOYMENT.";
                else if (level === 2) state.cinematicText = "INTELLIGENCE REPORT:\n\nENEMY REINFORCEMENTS ARRIVING.\nTHEATRE OF OPERATIONS HAS EXPANDED.\n\nDEPLOY CAREFULLY.";
                else state.cinematicText = "INTELLIGENCE REPORT:\n\nMASSIVE ENEMY ARMADA DETECTED.\nTHIS IS THE FINAL STAND.\nNO RETREAT.";
            } else {
                state.status = 'PLACEMENT';
            }
        };

        const checkPlacementValid = (grid, size, x, y, isHoriz) => {
            const gSize = engine.current.gridSize;
            if (isHoriz && x + size > gSize) return false;
            if (!isHoriz && y + size > gSize) return false;
            for (let i = 0; i < size; i++) {
                const cx = isHoriz ? x + i : x;
                const cy = isHoriz ? y : y + i;
                if (grid[cy][cx] !== 0) return false;
            }
            return true;
        };

        const placeShip = (grid, shipId, size, x, y, isHoriz) => {
            for (let i = 0; i < size; i++) {
                const cx = isHoriz ? x + i : x;
                const cy = isHoriz ? y : y + i;
                grid[cy][cx] = shipId;
            }
        };

        const placeAIShips = () => {
            const state = engine.current;
            state.fleet.forEach(ship => {
                let placed = false;
                while (!placed) {
                    const isHoriz = Math.random() > 0.5;
                    const x = Math.floor(Math.random() * state.gridSize);
                    const y = Math.floor(Math.random() * state.gridSize);
                    if (checkPlacementValid(state.p2Grid, ship.size, x, y, isHoriz)) {
                        placeShip(state.p2Grid, ship.id, ship.size, x, y, isHoriz);
                        placed = true;
                    }
                }
            });
        };

        const spawnParticles = (px, py, color, type = 'hit') => {
            const state = engine.current;
            const count = type === 'hit' ? 40 : (type === 'sink' ? 80 : 15);
            const speed = type === 'sink' ? 6 : 3;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                state.particles.push({
                    x: px, y: py,
                    vx: Math.cos(angle) * (Math.random() * speed),
                    vy: Math.sin(angle) * (Math.random() * speed),
                    life: 1.0,
                    decay: 0.015 + Math.random() * 0.02,
                    color: color
                });
            }
        };

        const executeStrike = (tx, ty, isPlayer) => {
            const state = engine.current;
            const gSize = state.gridSize;
            const cellSize = 300 / gSize; 
            
            const targetGrid = isPlayer ? state.p2Grid : state.p1Grid;
            const shotsGrid = isPlayer ? state.p1Shots : state.p2Shots;
            const shipData = isPlayer ? state.p2ShipData : state.p1ShipData;
            const targetXOffset = isPlayer ? 450 : 50;
            
            const px = targetXOffset + tx * cellSize + cellSize/2;
            const py = 150 + ty * cellSize + cellSize/2;

            const shipId = targetGrid[ty][tx];
            const isHit = shipId !== 0;
            shotsGrid[ty][tx] = isHit ? 2 : 1;

            if (isHit) {
                const shipObj = shipData.find(s => s.id === shipId);
                shipObj.hits++;
                
                if (shipObj.hits >= shipObj.size) {
                    if (audioRef.current) audioRef.current.playSink();
                    spawnParticles(px, py, '#ff0000', 'sink');
                    // Draw massive explosion across the whole ship
                    for(let y=0; y<gSize; y++) {
                        for(let x=0; x<gSize; x++) {
                            if (targetGrid[y][x] === shipId) {
                                spawnParticles(targetXOffset + x*cellSize + cellSize/2, 150 + y*cellSize + cellSize/2, '#ffaa00', 'hit');
                            }
                        }
                    }
                } else {
                    if (audioRef.current) audioRef.current.playHit();
                    spawnParticles(px, py, '#ff5500', 'hit');
                }
            } else {
                if (audioRef.current) audioRef.current.playSplash();
                spawnParticles(px, py, '#00ffff', 'miss');
            }

            // Check Win
            const totalHitsNeeded = state.fleet.reduce((sum, s) => sum + s.size, 0);
            let currentHits = 0;
            for(let y=0; y<gSize; y++) {
                for(let x=0; x<gSize; x++) {
                    if (shotsGrid[y][x] === 2) currentHits++;
                }
            }

            if (currentHits >= totalHitsNeeded) {
                state.status = 'GAMEOVER';
                state.winner = isPlayer ? 'PLAYER' : 'AI';
            } else {
                if (isPlayer) {
                    state.status = 'AI_TURN';
                    setTimeout(aiTakeTurn, 800);
                } else {
                    state.status = 'PLAYER_TURN';
                }
            }
        };

        const aiTakeTurn = () => {
            const state = engine.current;
            if (state.status === 'GAMEOVER') return;

            const gSize = state.gridSize;
            let tx = -1, ty = -1;
            let valid = false;

            // Very simple AI: random hunting
            while (!valid) {
                tx = Math.floor(Math.random() * gSize);
                ty = Math.floor(Math.random() * gSize);
                if (state.p2Shots[ty][tx] === 0) valid = true;
            }

            // Launch Animation
            state.status = 'ANIMATING';
            if (audioRef.current) audioRef.current.playFlyby();
            state.activeAnimation = {
                type: Math.random() > 0.3 ? 'jet' : 'boat',
                tx, ty,
                x: 900, y: 50, // Fly in from top right
                progress: 0,
                isPlayer: false
            };
        };

        const detonateMines = () => {
            const state = engine.current;
            if (state.placedMines.length === 0) return;
            
            state.status = 'ANIMATING';
            
            state.placedMines.forEach((m, idx) => {
                setTimeout(() => {
                    executeStrike(m.x, m.y, true);
                }, idx * 400); // Stagger explosions
            });
            
            // After all mines pop, pass turn to AI
            setTimeout(() => {
                state.placedMines = [];
                if (state.status !== 'GAMEOVER') {
                    state.status = 'AI_TURN';
                    setTimeout(aiTakeTurn, 800);
                }
            }, state.placedMines.length * 400);
        };

        const update = () => {
            const state = engine.current;
            state.tick++;

            if (state.keys['m']) {
                onMenu();
                return;
            }

            if (state.status === 'TITLE') {
                if (state.keys['1'] || state.keys['2']) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (!audioRef.current) audioRef.current = new NavalAudio(audioCtx || new AudioContext());
                    if (audioRef.current.ctx.state === 'suspended') audioRef.current.ctx.resume();
                    
                    state.mode = state.keys['1'] ? 'CAMPAIGN' : 'ENDURANCE';
                    initLevel(1);
                }
                return;
            }

            if (state.status === 'CINEMATIC') {
                if (state.tick % 2 === 0) state.cinematicChars++;
                if (state.keys['enter']) {
                    state.status = 'PLACEMENT';
                    state.keys['enter'] = false;
                }
                return;
            }

            if (state.status === 'GAMEOVER') {
                if (state.keys['enter']) {
                    if (state.winner === 'PLAYER' && (state.mode === 'ENDURANCE' || state.level < 3)) {
                        initLevel(state.level + 1);
                    } else {
                        state.status = 'TITLE';
                    }
                    state.keys['enter'] = false;
                }
                return;
            }

            const gSize = state.gridSize;
            const cellSize = 300 / gSize; // Fixed 300px width for grids
            
            let mx = -1, my = -1;
            let hoverGrid = 0; 
            
            if (state.mouse.x >= 50 && state.mouse.x < 50 + 300 &&
                state.mouse.y >= 150 && state.mouse.y < 150 + 300) {
                mx = Math.floor((state.mouse.x - 50) / cellSize);
                my = Math.floor((state.mouse.y - 150) / cellSize);
                hoverGrid = 1;
            } else if (state.mouse.x >= 450 && state.mouse.x < 450 + 300 &&
                       state.mouse.y >= 150 && state.mouse.y < 150 + 300) {
                mx = Math.floor((state.mouse.x - 450) / cellSize);
                my = Math.floor((state.mouse.y - 150) / cellSize);
                hoverGrid = 2;
            }

            state.hoverCell = hoverGrid > 0 ? { grid: hoverGrid, x: mx, y: my } : null;

            if (state.mouse.rightClicked) {
                if (state.status === 'PLACEMENT') {
                    state.isHorizontal = !state.isHorizontal;
                } else if (state.status === 'PLAYER_TURN' && hoverGrid === 2 && state.p1Mines > 0) {
                    // Lay Mine
                    if (!state.placedMines.some(m => m.x === mx && m.y === my) && state.p1Shots[my][mx] === 0) {
                        state.placedMines.push({x: mx, y: my});
                        state.p1Mines--;
                    }
                }
                state.mouse.rightClicked = false;
            }

            if (state.status === 'PLACEMENT') {
                if (state.mouse.clicked && hoverGrid === 1) {
                    const ship = state.fleet[state.currentShipIdx];
                    if (checkPlacementValid(state.p1Grid, ship.size, mx, my, state.isHorizontal)) {
                        placeShip(state.p1Grid, ship.id, ship.size, mx, my, state.isHorizontal);
                        state.currentShipIdx++;
                        if (state.currentShipIdx >= state.fleet.length) {
                            placeAIShips();
                            state.status = 'PLAYER_TURN';
                        }
                    }
                }
            } 
            else if (state.status === 'PLAYER_TURN') {
                if (state.keys[' ']) {
                    detonateMines();
                    state.keys[' '] = false;
                }
                else if (state.mouse.clicked && hoverGrid === 2) {
                    if (state.p1Shots[my][mx] === 0 && !state.placedMines.some(m => m.x === mx && m.y === my)) {
                        state.status = 'ANIMATING';
                        if (audioRef.current) audioRef.current.playFlyby();
                        state.activeAnimation = {
                            type: Math.random() > 0.3 ? 'jet' : 'boat',
                            tx: mx, ty: my,
                            x: -100, y: 500, // Fly from bottom left
                            progress: 0,
                            isPlayer: true
                        };
                    }
                }
            }

            if (state.status === 'ANIMATING' && state.activeAnimation) {
                let anim = state.activeAnimation;
                anim.progress += 0.04;
                
                const targetX = (anim.isPlayer ? 450 : 50) + anim.tx * cellSize + cellSize/2;
                const targetY = 150 + anim.ty * cellSize + cellSize/2;

                anim.x += (targetX - anim.x) * 0.15;
                anim.y += (targetY - anim.y) * 0.15;

                if (anim.progress >= 1.0 || (Math.abs(anim.x - targetX) < 5 && Math.abs(anim.y - targetY) < 5)) {
                    executeStrike(anim.tx, anim.ty, anim.isPlayer);
                    state.activeAnimation = null;
                }
            }

            // Update particles
            state.particles.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.life -= p.decay;
            });
            state.particles = state.particles.filter(p => p.life > 0);

            state.mouse.clicked = false; 
        };

        const drawGrid = (offsetX, offsetY, title, isTargetGrid) => {
            const state = engine.current;
            const gSize = state.gridSize;
            const cellSize = 300 / gSize;
            
            // Deep sea glowing background
            ctx.fillStyle = 'rgba(0, 20, 50, 0.7)';
            ctx.fillRect(offsetX, offsetY, 300, 300);

            // Vector Lines
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i <= gSize; i++) {
                ctx.moveTo(offsetX + i * cellSize, offsetY);
                ctx.lineTo(offsetX + i * cellSize, offsetY + 300);
                ctx.moveTo(offsetX, offsetY + i * cellSize);
                ctx.lineTo(offsetX + 300, offsetY + i * cellSize);
            }
            ctx.stroke();

            // Text
            ctx.fillStyle = '#00ffff';
            ctx.font = '20px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
            ctx.fillText(title, offsetX + 150, offsetY - 15);
            ctx.shadowBlur = 0;

            const gridData = isTargetGrid ? state.p2Grid : state.p1Grid;
            const shotsData = isTargetGrid ? state.p1Shots : state.p2Shots;
            const shipData = isTargetGrid ? state.p2ShipData : state.p1ShipData;

            // Draw Ships
            for (let y = 0; y < gSize; y++) {
                for (let x = 0; x < gSize; x++) {
                    const cx = offsetX + x * cellSize;
                    const cy = offsetY + y * cellSize;
                    
                    const shipId = gridData[y][x];
                    if (shipId !== 0) {
                        const shipObj = shipData.find(s => s.id === shipId);
                        const isSunk = shipObj && shipObj.hits >= shipObj.size;
                        
                        // Only show if it's player grid, OR if game over, OR if ship is fully sunk
                        if (!isTargetGrid || state.status === 'GAMEOVER' || isSunk) {
                            ctx.strokeStyle = isSunk ? '#ff0055' : '#00ffff';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(cx + 4, cy + 4, cellSize - 8, cellSize - 8);
                            
                            // Crosshatch interior for wireframe look
                            ctx.beginPath();
                            ctx.moveTo(cx+4, cy+4); ctx.lineTo(cx+cellSize-4, cy+cellSize-4);
                            ctx.moveTo(cx+cellSize-4, cy+4); ctx.lineTo(cx+4, cy+cellSize-4);
                            ctx.strokeStyle = isSunk ? 'rgba(255, 0, 80, 0.3)' : 'rgba(0, 255, 255, 0.3)';
                            ctx.stroke();
                        }
                    }

                    // Draw Shots
                    const shot = shotsData[y][x];
                    if (shot === 1) { // Miss (Cyan Circle)
                        ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
                        ctx.beginPath();
                        ctx.arc(cx + cellSize/2, cy + cellSize/2, cellSize * 0.2, 0, Math.PI*2);
                        ctx.fill();
                    } else if (shot === 2) { // Hit (Red X)
                        ctx.strokeStyle = '#ff0055';
                        ctx.lineWidth = 3;
                        ctx.shadowBlur = 5; ctx.shadowColor = '#ff0055';
                        ctx.beginPath();
                        ctx.moveTo(cx + 6, cy + 6); ctx.lineTo(cx + cellSize - 6, cy + cellSize - 6);
                        ctx.moveTo(cx + cellSize - 6, cy + 6); ctx.lineTo(cx + 6, cy + cellSize - 6);
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    }

                    // Draw Placed Mines
                    if (isTargetGrid && state.placedMines.some(m => m.x === x && m.y === y)) {
                        ctx.fillStyle = '#ffaa00';
                        ctx.beginPath();
                        ctx.arc(cx + cellSize/2, cy + cellSize/2, cellSize * 0.3, 0, Math.PI*2);
                        ctx.fill();
                        if (Math.floor(state.tick / 10) % 2 === 0) {
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(cx + cellSize/2 - 2, cy + cellSize/2 - 2, 4, 4);
                        }
                    }
                }
            }

            // Outline
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(offsetX, offsetY, 300, 300);
        };

        const draw = () => {
            const state = engine.current;
            ctx.fillStyle = '#000814'; 
            ctx.fillRect(0, 0, VIEW_W, VIEW_H);

            if (state.status === 'TITLE') {
                ctx.fillStyle = '#00ffff';
                ctx.font = '70px "VT323", monospace';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 20; ctx.shadowColor = '#00ffff';
                ctx.fillText("BATTLE TACTICS", VIEW_W / 2, 200);
                ctx.shadowBlur = 0;

                ctx.font = '30px "VT323", monospace';
                ctx.fillStyle = '#ffffff';
                ctx.fillText("PRESS [1] FOR CAMPAIGN", VIEW_W / 2, 350);
                ctx.fillText("PRESS [2] FOR ENDURANCE", VIEW_W / 2, 400);
                
                ctx.fillStyle = '#00aa00';
                ctx.font = '20px "VT323", monospace';
                ctx.fillText("PRESS M TO RETURN TO OS", VIEW_W / 2, 500);
                return;
            }

            if (state.status === 'CINEMATIC') {
                ctx.fillStyle = '#00ffff';
                ctx.font = '24px "VT323", monospace';
                ctx.textAlign = 'left';
                
                const currentText = state.cinematicText.substring(0, state.cinematicChars);
                const lines = currentText.split('\n');
                lines.forEach((line, i) => {
                    ctx.fillText(line, 100, 150 + (i * 35));
                });

                if (state.cinematicChars >= state.cinematicText.length && Math.floor(state.tick / 20) % 2 === 0) {
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.fillText("PRESS ENTER TO COMMENCE", VIEW_W / 2, 500);
                }
                return;
            }

            drawGrid(50, 150, "SECTOR ALPHA", false);
            drawGrid(450, 150, "SECTOR OMEGA", true);

            const gSize = state.gridSize;
            const cellSize = 300 / gSize;

            // Hover Highlights
            if (state.status === 'PLACEMENT' && state.hoverCell && state.hoverCell.grid === 1) {
                const ship = state.fleet[state.currentShipIdx];
                const hx = state.hoverCell.x;
                const hy = state.hoverCell.y;
                const isValid = checkPlacementValid(state.p1Grid, ship.size, hx, hy, state.isHorizontal);
                
                ctx.fillStyle = isValid ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 0, 80, 0.4)';
                for(let i = 0; i < ship.size; i++) {
                    const drawX = 50 + (state.isHorizontal ? hx + i : hx) * cellSize;
                    const drawY = 150 + (state.isHorizontal ? hy : hy + i) * cellSize;
                    if (drawX < 50 + 300 && drawY < 150 + 300) {
                        ctx.fillRect(drawX + 2, drawY + 2, cellSize - 4, cellSize - 4);
                    }
                }
            }

            if (state.status === 'PLAYER_TURN' && state.hoverCell && state.hoverCell.grid === 2) {
                const hx = state.hoverCell.x;
                const hy = state.hoverCell.y;
                if (state.p1Shots[hy][hx] === 0) {
                    const cx = 450 + hx * cellSize + cellSize/2;
                    const cy = 150 + hy * cellSize + cellSize/2;
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
                    ctx.moveTo(cx - cellSize, cy); ctx.lineTo(cx + cellSize, cy);
                    ctx.moveTo(cx, cy - cellSize); ctx.lineTo(cx, cy + cellSize);
                    ctx.stroke();
                }
            }

            // Draw Active Strike Animation
            if (state.status === 'ANIMATING' && state.activeAnimation) {
                let anim = state.activeAnimation;
                ctx.save();
                ctx.translate(anim.x, anim.y);
                
                // Point towards target
                const targetX = (anim.isPlayer ? 450 : 50) + anim.tx * cellSize + cellSize/2;
                const targetY = 150 + anim.ty * cellSize + cellSize/2;
                ctx.rotate(Math.atan2(targetY - anim.y, targetX - anim.x));
                
                ctx.strokeStyle = anim.isPlayer ? '#00ffff' : '#ff0055';
                ctx.lineWidth = 2;
                
                if (anim.type === 'jet') {
                    // Vector Jet shape
                    ctx.beginPath();
                    ctx.moveTo(15, 0); ctx.lineTo(-10, 10); ctx.lineTo(-5, 0); ctx.lineTo(-10, -10); ctx.closePath();
                    ctx.stroke();
                } else {
                    // Vector Torpedo/Sub
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI*2);
                    ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-12, 4); ctx.stroke();
                }
                ctx.restore();
            }

            // Particles
            state.particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fillRect(p.x, p.y, 3, 3);
            });
            ctx.globalAlpha = 1.0;

            // UI Text
            ctx.fillStyle = '#00ffff';
            ctx.font = '24px "VT323", monospace';
            ctx.textAlign = 'center';

            if (state.status === 'PLACEMENT') {
                const ship = state.fleet[state.currentShipIdx];
                ctx.fillText(`COMMANDER, DEPLOY YOUR FLEET`, VIEW_W / 2, 50);
                ctx.fillText(`CURRENT SHIP: ${ship.name} (SIZE ${ship.size})`, VIEW_W / 2, 80);
                ctx.fillStyle = '#00aa00';
                ctx.font = '18px "VT323", monospace';
                ctx.fillText("LEFT CLICK TO PLACE | RIGHT CLICK TO ROTATE", VIEW_W / 2, 110);
            }
            else if (state.status === 'PLAYER_TURN') {
                ctx.fillText(`AWAITING STRIKE COORDINATES...`, VIEW_W / 2, 50);
                ctx.fillStyle = '#ffaa00';
                ctx.fillText(`MINES AVAILABLE: ${state.p1Mines}`, VIEW_W / 2, 80);
                ctx.fillStyle = '#00aa00';
                ctx.font = '18px "VT323", monospace';
                ctx.fillText("L-CLICK: AIRSTRIKE | R-CLICK: LAY MINE | SPACE: DETONATE MINES", VIEW_W / 2, 110);
            }
            else if (state.status === 'AI_TURN' || state.status === 'ANIMATING') {
                ctx.fillStyle = '#ff0055';
                if (Math.floor(Date.now() / 200) % 2 === 0) {
                    ctx.fillText(`HOSTILE ACTION DETECTED.`, VIEW_W / 2, 60);
                }
            }
            else if (state.status === 'GAMEOVER') {
                ctx.font = '50px "VT323", monospace';
                if (state.winner === 'PLAYER') {
                    ctx.fillStyle = '#00ffff';
                    ctx.fillText("SECTOR OMEGA ANNIHILATED. VICTORY.", VIEW_W / 2, 60);
                } else {
                    ctx.fillStyle = '#ff0055';
                    ctx.fillText("ALLIED FLEET DESTROYED. DEFEAT.", VIEW_W / 2, 60);
                }
                ctx.font = '24px "VT323", monospace';
                ctx.fillStyle = '#ffffff';
                if (Math.floor(Date.now() / 500) % 2 === 0) {
                    ctx.fillText("PRESS ENTER TO CONTINUE", VIEW_W / 2, 100);
                }
            }
        };

        const loop = () => {
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
                    backgroundColor: '#000814',
                    cursor: 'crosshair'
                }}
            />
            {/* CRT Grid Glow overlay */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(rgba(0, 20, 50, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(0, 255, 255, 0.03), rgba(0, 0, 0, 0))',
                backgroundSize: '100% 4px, 4px 100%',
                pointerEvents: 'none',
                zIndex: 10
            }} />
        </div>
    );
}
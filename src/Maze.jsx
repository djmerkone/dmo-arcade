import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { generateMaze } from './mazelevels';

// --- CUSTOM 8-DIGIT ALPHANUMERIC PASSWORD SYSTEM ---
const encodePassword = (level, score) => {
    let val = ((level & 0xFF) << 20) | (score & 0xFFFFF);
    val ^= 0x5A5A5A5A; 
    let str = Math.abs(val).toString(36).toUpperCase().padStart(7, 'A');
    let c = 0; 
    for(let i=0; i<7; i++) c += str.charCodeAt(i);
    return str + String.fromCharCode(65 + (c % 26)); 
};

const decodePassword = (pwd) => {
    if (!pwd || pwd.length !== 8) return null;
    let base = pwd.substring(0, 7).toUpperCase();
    let c = 0; 
    for(let i=0; i<7; i++) c += base.charCodeAt(i);
    if (pwd[7].toUpperCase() !== String.fromCharCode(65 + (c % 26))) return null;
    let val = parseInt(base, 36) ^ 0x5A5A5A5A;
    let level = (val >> 20) & 0xFF;
    let score = val & 0xFFFFF;
    if (isNaN(level) || isNaN(score) || level <= 0) return null;
    return { level, score };
};

// --- CREEPY HARSH AUDIO SYNTHESIZER ---
class MazeAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.master = this.ctx?.createGain();
        if (this.master) {
            this.master.gain.value = 0.5;
            this.master.connect(this.ctx.destination);
            
            this.delay = this.ctx.createDelay();
            this.delay.delayTime.value = 0.3; // Longer, caverous echo
            this.feedback = this.ctx.createGain();
            this.feedback.gain.value = 0.6; 
            this.delay.connect(this.feedback);
            this.feedback.connect(this.delay);
            this.delay.connect(this.master);
        }
        this.droneOsc1 = null; this.droneOsc2 = null;
        this.droneGain = null; this.creepyLoop = null;
    }
    
    ensure() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    
    playAmbient() {
        this.ensure();
        if (!this.ctx || this.droneOsc1) return;
        
        // Terrifying sub-bass dissonant beating
        this.droneOsc1 = this.ctx.createOscillator();
        this.droneOsc2 = this.ctx.createOscillator();
        this.droneOsc1.type = 'sawtooth';
        this.droneOsc2.type = 'square';
        this.droneOsc1.frequency.value = 30; 
        this.droneOsc2.frequency.value = 31.5; 
        
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 80; 
        
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 1.0;
        
        this.droneOsc1.connect(filter);
        this.droneOsc2.connect(filter);
        filter.connect(this.droneGain).connect(this.master);
        
        this.droneOsc1.start();
        this.droneOsc2.start();

        // Random ambient terrors
        this.creepyLoop = setInterval(() => {
            let rand = Math.random();
            if(rand < 0.15) {
                // High metallic screech
                const t = this.ctx.currentTime;
                let osc = this.ctx.createOscillator();
                osc.type = 'sawtooth'; 
                osc.frequency.setValueAtTime(3000 + Math.random()*2000, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.6);
                let gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
                osc.connect(gain).connect(this.delay); 
                osc.start(); osc.stop(t + 0.6);
            } else if (rand < 0.3) {
                // Distant monster roar
                this.playMonsterRoar();
            }
        }, 2500);
    }
    
    stopAmbient() {
        if (this.droneOsc1) {
            this.droneOsc1.stop(); this.droneOsc1.disconnect(); this.droneOsc1 = null;
            this.droneOsc2.stop(); this.droneOsc2.disconnect(); this.droneOsc2 = null;
            clearInterval(this.creepyLoop);
        }
    }

    playMonsterRoar() {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
        osc.frequency.exponentialRampToValueAtTime(40, t + 1.2);
        
        let lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 30;
        let lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 80;
        lfo.connect(lfoGain).connect(osc.frequency);
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.exponentialRampToValueAtTime(0.2, t + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
        
        osc.connect(gain).connect(this.delay); // Echo heavily through the maze
        lfo.start(t); osc.start(t);
        lfo.stop(t+1.2); osc.stop(t+1.2);
    }

    playMonsterAttack(isBoss = false) {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(isBoss ? 60 : 120, t);
        osc.frequency.exponentialRampToValueAtTime(isBoss ? 20 : 40, t + 0.5);
        
        let lfo = this.ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = isBoss ? 15 : 25;
        let lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain).connect(osc.frequency);
        
        let filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.5);

        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isBoss ? 0.8 : 0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        
        osc.connect(filter).connect(gain).connect(this.master);
        lfo.start(t); osc.start(t); 
        lfo.stop(t + 0.5); osc.stop(t + 0.5);
    }

    playGunshot() {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        let buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
        let data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        let src = this.ctx.createBufferSource(); src.buffer = buf;
        
        let filter = this.ctx.createBiquadFilter(); 
        filter.type = 'lowpass'; 
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        
        let gain = this.ctx.createGain(); 
        gain.gain.setValueAtTime(0.6, t); 
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        
        src.connect(filter).connect(gain).connect(this.master);
        
        // Add a low thud
        let osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
        let oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.6, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(oscGain).connect(this.master);
        
        src.start(t);
        osc.start(t); osc.stop(t + 0.3);
    }

    playHit() {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        let buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
        let data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; 
        let src = this.ctx.createBufferSource(); src.buffer = buf;
        let filter = this.ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1500;
        let gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.6, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        src.connect(filter).connect(gain).connect(this.master);
        src.start();
    }

    playPickup(type) {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(type === 'hp' ? 400 : 600, t);
        osc.frequency.linearRampToValueAtTime(type === 'hp' ? 800 : 1200, t + 0.15);
        let gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.2, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain).connect(this.master);
        osc.start(); osc.stop(t + 0.15);
    }

    playPlayerDamage() {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t); osc.frequency.linearRampToValueAtTime(20, t + 0.6);
        let gain = this.ctx.createGain(); gain.gain.setValueAtTime(1.0, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.6);
        osc.connect(gain).connect(this.master);
        osc.start(); osc.stop(t + 0.6);
    }
    
    playEmpty() {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); osc.type = 'square';
        osc.frequency.setValueAtTime(800, t); osc.frequency.setValueAtTime(0, t + 0.05);
        let gain = this.ctx.createGain(); gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain).connect(this.master);
        osc.start(); osc.stop(t + 0.05);
    }
}

// --- TEXTURE GENERATOR (Pitch Black Concrete) ---
function createGridTexture(color = '#010101', lines = '#040404') {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
    
    for(let i=0; i<4000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#080808';
        ctx.fillRect(Math.random()*256, Math.random()*256, 2, 2);
    }

    ctx.strokeStyle = lines; ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

// --- MAIN COMPONENT ---
export default function MazeGame({ audioCtx, onMenu }) {
    const containerRef = useRef(null);
    const [uiState, setUiState] = useState('menu'); 
    const [passwordInput, setPasswordInput] = useState('');
    const [saveCode, setSaveCode] = useState('');
    
    const [hud, setHud] = useState({ hp: 100, ammo: 25, score: 0, level: 1 });

    const engine = useRef({
        running: false,
        level: 1, score: 0, hp: 100, ammo: 25,
        scene: null, camera: null, renderer: null,
        player: { pitch: null, yaw: null, velocity: new THREE.Vector3() },
        enemies: [], pickups: [], projectiles: [], enemyProjectiles: [], traps: [],
        mapData: [],
        keys: { w: false, a: false, s: false, d: false, m: false },
        audio: null, lastShotTime: 0
    });

    useEffect(() => {
        if (!containerRef.current) return;
        
        engine.current.audio = new MazeAudio(audioCtx || new (window.AudioContext || window.webkitAudioContext)());

        const scene = new THREE.Scene();
        // Thick fog, pitch black
        scene.fog = new THREE.FogExp2(0x000000, 0.12); 

        const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 1000);
        
        const renderer = new THREE.WebGLRenderer({ 
            canvas: containerRef.current, 
            antialias: false 
        });
        renderer.setSize(800, 600, false);

        const pitchObj = new THREE.Object3D();
        pitchObj.add(camera);
        const yawObj = new THREE.Object3D();
        yawObj.position.y = 0.5; 
        yawObj.add(pitchObj);
        scene.add(yawObj);

        // Flashlight: Brighter and pierces the dark
        const light = new THREE.SpotLight(0xffffff, 4.0, 20, Math.PI / 4, 0.8, 1.5);
        pitchObj.add(light); 
        light.position.set(0, 0, 0);
        light.target.position.set(0, 0, -1);
        pitchObj.add(light.target);
        
        // Barely visible ambient light
        scene.add(new THREE.AmbientLight(0x020202)); 

        engine.current.scene = scene;
        engine.current.camera = camera;
        engine.current.renderer = renderer;
        engine.current.player.pitch = pitchObj;
        engine.current.player.yaw = yawObj;

        const onKeyDown = (e) => {
            if (e.key === 'w' || e.key === 'ArrowUp') engine.current.keys.w = true;
            if (e.key === 's' || e.key === 'ArrowDown') engine.current.keys.s = true;
            if (e.key === 'a' || e.key === 'ArrowLeft') engine.current.keys.a = true;
            if (e.key === 'd' || e.key === 'ArrowRight') engine.current.keys.d = true;
            if (e.key.toLowerCase() === 'm') engine.current.keys.m = true;
            
            if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
                if (engine.current.running && engine.current.hp > 0) document.exitPointerLock();
            }
        };
        const onKeyUp = (e) => {
            if (e.key === 'w' || e.key === 'ArrowUp') engine.current.keys.w = false;
            if (e.key === 's' || e.key === 'ArrowDown') engine.current.keys.s = false;
            if (e.key === 'a' || e.key === 'ArrowLeft') engine.current.keys.a = false;
            if (e.key === 'd' || e.key === 'ArrowRight') engine.current.keys.d = false;
            if (e.key.toLowerCase() === 'm') engine.current.keys.m = false;
        };
        
        const onMouseMove = (e) => {
            if (document.pointerLockElement === renderer.domElement && engine.current.running) {
                yawObj.rotation.y -= e.movementX * 0.002;
                pitchObj.rotation.x -= e.movementY * 0.002;
                pitchObj.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitchObj.rotation.x));
            }
        };

        const onMouseDown = (e) => {
            if (e.button === 0 && document.pointerLockElement === renderer.domElement && engine.current.running) {
                firePlayerProjectile();
            } else if (engine.current.running) {
                renderer.domElement.requestPointerLock();
            }
        };

        const onPointerLockChange = () => {
            if (document.pointerLockElement !== renderer.domElement && engine.current.running) {
                engine.current.running = false;
                setSaveCode(encodePassword(engine.current.level, engine.current.score));
                setUiState('paused'); 
                engine.current.audio.stopAmbient();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        document.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('mousedown', onMouseDown);
        document.addEventListener('pointerlockchange', onPointerLockChange);

        let lastTime = performance.now();
        let frameId;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            const now = performance.now();
            let dt = (now - lastTime) / 1000;
            lastTime = now;
            if (dt > 0.1) dt = 0.1; 

            const pads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = pads[0];
            if (engine.current.running && (engine.current.keys.m || (gp && gp.buttons[8] && gp.buttons[8].pressed))) {
                engine.current.keys.m = false; 
                document.exitPointerLock(); 
            }

            if (engine.current.running) updatePhysics(dt);
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            document.removeEventListener('mousemove', onMouseMove);
            renderer.domElement.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('pointerlockchange', onPointerLockChange);
            engine.current.audio.stopAmbient();
            renderer.dispose();
        };
    }, []);

    // --- GAMEPLAY MECHANICS ---
    const buildLevel = (levelIndex) => {
        const eng = engine.current;
        const scene = eng.scene;
        
        while(scene.children.length > 0){ 
            if(scene.children[0] !== eng.player.yaw) scene.remove(scene.children[0]); 
            else break;
        }

        const map = generateMaze(levelIndex);
        eng.mapData = map;
        eng.enemies = [];
        eng.pickups = [];
        eng.projectiles = [];
        eng.enemyProjectiles = [];
        eng.traps = [];

        const floorMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 1.0 });
        const planeGeo = new THREE.PlaneGeometry(map.length, map.length);
        
        const floor = new THREE.Mesh(planeGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(map.length/2, -0.5, map.length/2);
        scene.add(floor);
        
        const ceil = new THREE.Mesh(planeGeo, floorMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(map.length/2, 1.0, map.length/2);
        scene.add(ceil);

        const wallGeo = new THREE.BoxGeometry(1, 1.5, 1);
        const standardMat = new THREE.MeshStandardMaterial({ map: createGridTexture('#010101', '#030303'), roughness: 0.9, metalness: 0.1 });
        const illusionMat = new THREE.MeshStandardMaterial({ map: createGridTexture('#010101', '#030303'), roughness: 0.9, metalness: 0.1 }); 

        const wallInstanced = new THREE.InstancedMesh(wallGeo, standardMat, map.length * map.length);
        let wallCount = 0;
        const dummy = new THREE.Object3D();

        const enemyGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const bossGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        
        const healthGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8);
        const ammoGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        
        const trapGeo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
        const trapMat = new THREE.MeshStandardMaterial({ color: 0x220000, roughness: 0.9 });

        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const char = map[y][x];
                
                if (char === '#') {
                    dummy.position.set(x + 0.5, 0.25, y + 0.5); 
                    dummy.updateMatrix();
                    wallInstanced.setMatrixAt(wallCount++, dummy.matrix);
                } 
                else if (char === '?') {
                    const iWall = new THREE.Mesh(wallGeo, illusionMat);
                    iWall.position.set(x + 0.5, 0.25, y + 0.5);
                    scene.add(iWall);
                }
                else if (char === 'T') {
                    const mesh = new THREE.Mesh(trapGeo, trapMat);
                    mesh.position.set(x + 0.5, -0.45, y + 0.5); 
                    scene.add(mesh);
                    eng.traps.push({ mesh, lastTrigger: 0 });
                }
                else if (char === 'P') {
                    eng.player.yaw.position.set(x + 0.5, 0.5, y + 0.5);
                    if (map[y][x+1] === ' ') eng.player.yaw.rotation.y = -Math.PI/2; 
                    else if (map[y+1][x] === ' ') eng.player.yaw.rotation.y = Math.PI; 
                    else if (map[y][x-1] === ' ') eng.player.yaw.rotation.y = Math.PI/2; 
                    else eng.player.yaw.rotation.y = 0; 
                } 
                else if (char === 'X') {
                    const exitGeo = new THREE.BoxGeometry(0.8, 1.4, 0.8);
                    const exitMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x050505 }); 
                    const exit = new THREE.Mesh(exitGeo, exitMat);
                    exit.position.set(x + 0.5, 0.2, y + 0.5);
                    scene.add(exit);
                } 
                else if (char === 'E' || char === 'R' || char === 'B') {
                    const isBoss = char === 'B';
                    const isShooter = char === 'R' || char === 'B';
                    const mat = new THREE.MeshStandardMaterial({ 
                        color: isBoss ? 0xaa0000 : (isShooter ? 0x660000 : 0x444444), 
                        emissive: isBoss ? 0x440000 : (isShooter ? 0x330000 : 0x111111),
                        roughness: 0.5
                    });
                    const mesh = new THREE.Mesh(isBoss ? bossGeo : enemyGeo, mat);
                    mesh.position.set(x + 0.5, isBoss ? 0.5 : 0.2, y + 0.5);
                    scene.add(mesh);
                    eng.enemies.push({
                        mesh, hp: isBoss ? 20 + (levelIndex*5) : (isShooter ? 2 : 1), 
                        type: char, 
                        speed: isBoss ? 1.0 : (isShooter ? 1.5 : 2.5),
                        lastShot: 0
                    });
                }
                else if (char === 'H' || char === 'A') {
                    const mat = new THREE.MeshStandardMaterial({ 
                        color: char === 'H' ? 0x008800 : 0x004488, 
                        emissive: char === 'H' ? 0x002200 : 0x001133
                    });
                    const mesh = new THREE.Mesh(char === 'H' ? healthGeo : ammoGeo, mat);
                    mesh.position.set(x + 0.5, -0.2, y + 0.5);
                    scene.add(mesh);
                    eng.pickups.push({ mesh, type: char });
                }
            }
        }
        wallInstanced.count = wallCount;
        scene.add(wallInstanced);
    };

    const firePlayerProjectile = () => {
        const eng = engine.current;
        if (Date.now() - eng.lastShotTime < 300) return; 
        
        if (eng.ammo <= 0) {
            eng.audio.playEmpty();
            eng.lastShotTime = Date.now();
            return;
        }

        eng.ammo--;
        eng.audio.playGunshot();
        eng.lastShotTime = Date.now();
        
        const dir = new THREE.Vector3();
        eng.camera.getWorldDirection(dir);
        
        const geo = new THREE.SphereGeometry(0.1, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x888888 }); 
        const mesh = new THREE.Mesh(geo, mat);
        
        mesh.position.copy(eng.player.yaw.position);
        eng.scene.add(mesh);
        
        eng.projectiles.push({ mesh, dir: dir.multiplyScalar(20), life: 2.0 });
    };

    const fireEnemyProjectile = (enemyPos, dirToPlayer, isBoss) => {
        const eng = engine.current;
        eng.audio.playMonsterAttack(isBoss);
        
        const fireSingle = (spreadAngle) => {
            const geo = new THREE.SphereGeometry(isBoss ? 0.25 : 0.15, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(enemyPos);
            eng.scene.add(mesh);
            
            let adjustedDir = dirToPlayer.clone();
            adjustedDir.applyAxisAngle(new THREE.Vector3(0,1,0), spreadAngle);
            eng.enemyProjectiles.push({ mesh, dir: adjustedDir.normalize().multiplyScalar(isBoss ? 12 : 8), life: 3.0 });
        }

        if (isBoss) {
            fireSingle(0); fireSingle(-0.2); fireSingle(0.2); 
        } else {
            fireSingle(0);
        }
    };

    // Uses a radius collision buffer so the camera cannot physically clip into a wall
    const checkPlayerCollision = (x, z) => {
        const map = engine.current.mapData;
        const r = 0.25; 
        const corners = [[x-r, z-r], [x+r, z-r], [x-r, z+r], [x+r, z+r]];
        for (let c of corners) {
            let gx = Math.floor(c[0]);
            let gz = Math.floor(c[1]);
            if (gz < 0 || gz >= map.length || gx < 0 || gx >= map[0].length) return true;
            if (map[gz][gx] === '#') return true;
        }
        return false;
    };

    const checkPointCollision = (x, z) => {
        const map = engine.current.mapData;
        const gridX = Math.floor(x);
        const gridZ = Math.floor(z);
        if (gridZ < 0 || gridZ >= map.length || gridX < 0 || gridX >= map[0].length) return true;
        return map[gridZ][gridX] === '#'; 
    };

    const updatePhysics = (dt) => {
        const eng = engine.current;

        // --- PLAYER MOVEMENT ---
        const dir = new THREE.Vector3();
        const right = new THREE.Vector3();
        eng.camera.getWorldDirection(dir);
        dir.y = 0; dir.normalize();
        right.crossVectors(eng.camera.up, dir).normalize();

        const moveSpeed = 4.0;
        let velX = 0, velZ = 0;
        
        if (eng.keys.w) { velX += dir.x; velZ += dir.z; }
        if (eng.keys.s) { velX -= dir.x; velZ -= dir.z; }
        if (eng.keys.a) { velX += right.x; velZ += right.z; }
        if (eng.keys.d) { velX -= right.x; velZ -= right.z; }

        if (velX !== 0 || velZ !== 0) {
            const mag = Math.sqrt(velX*velX + velZ*velZ);
            velX = (velX/mag) * moveSpeed * dt;
            velZ = (velZ/mag) * moveSpeed * dt;

            let newX = eng.player.yaw.position.x + velX;
            let newZ = eng.player.yaw.position.z + velZ;

            if (!checkPlayerCollision(newX, eng.player.yaw.position.z)) {
                eng.player.yaw.position.x = newX;
            }
            if (!checkPlayerCollision(eng.player.yaw.position.x, newZ)) {
                eng.player.yaw.position.z = newZ;
            }
        }

        const pPos = eng.player.yaw.position;

        // --- FLOOR TRAPS ---
        eng.traps.forEach(t => {
            if (pPos.distanceTo(t.mesh.position) < 0.6) {
                if (Date.now() - t.lastTrigger > 1000) {
                    eng.hp -= 20;
                    eng.audio.playPlayerDamage();
                    t.lastTrigger = Date.now();
                }
            }
        });

        // --- PICKUPS ---
        for (let i = eng.pickups.length - 1; i >= 0; i--) {
            let p = eng.pickups[i];
            p.mesh.rotation.y += dt * 2;
            p.mesh.rotation.x += dt;
            if (pPos.distanceTo(p.mesh.position) < 1.0) {
                if (p.type === 'H') eng.hp = Math.min(100, eng.hp + 25);
                else if (p.type === 'A') eng.ammo += 15;
                
                eng.audio.playPickup(p.type === 'H' ? 'hp' : 'ammo');
                eng.score += 50;
                eng.scene.remove(p.mesh);
                eng.pickups.splice(i, 1);
            }
        }

        // --- PLAYER PROJECTILES ---
        for (let i = eng.projectiles.length - 1; i >= 0; i--) {
            let p = eng.projectiles[i];
            p.mesh.position.addScaledVector(p.dir, dt);
            p.life -= dt;
            
            let hit = false;
            if (checkPointCollision(p.mesh.position.x, p.mesh.position.z)) hit = true;
            
            if (!hit) {
                for (let j = eng.enemies.length - 1; j >= 0; j--) {
                    let e = eng.enemies[j];
                    if (p.mesh.position.distanceTo(e.mesh.position) < (e.type === 'B' ? 1.2 : 0.8)) {
                        e.hp--;
                        hit = true;
                        eng.audio.playHit();
                        if (e.hp <= 0) {
                            eng.scene.remove(e.mesh);
                            eng.enemies.splice(j, 1);
                            eng.score += (e.type === 'B' ? 1000 : (e.type === 'R' ? 100 : 50));
                        }
                        break;
                    }
                }
            }

            if (hit || p.life <= 0) {
                eng.scene.remove(p.mesh);
                eng.projectiles.splice(i, 1);
            }
        }

        // --- ENEMY AI & PROJECTILES ---
        eng.enemies.forEach(e => {
            e.mesh.rotation.y += dt;
            if (e.type === 'B') { e.mesh.rotation.x += dt * 0.5; e.mesh.rotation.z += dt * 0.5; }
            
            const dist = e.mesh.position.distanceTo(pPos);
            
            let hasLOS = true;
            let rayDir = new THREE.Vector3().subVectors(pPos, e.mesh.position);
            let steps = Math.floor(dist * 2);
            let stepVec = rayDir.clone().divideScalar(steps);
            let checkPos = e.mesh.position.clone();
            for(let k=0; k<steps; k++) {
                checkPos.add(stepVec);
                if (checkPointCollision(checkPos.x, checkPos.z)) { hasLOS = false; break; }
            }

            if (hasLOS && dist < 18) {
                if (e.type === 'E') {
                    const moveDir = rayDir.normalize().multiplyScalar(e.speed * dt);
                    let nx = e.mesh.position.x + moveDir.x;
                    let nz = e.mesh.position.z + moveDir.z;
                    if (!checkPointCollision(nx, e.mesh.position.z)) e.mesh.position.x = nx;
                    if (!checkPointCollision(e.mesh.position.x, nz)) e.mesh.position.z = nz;
                    
                    if (dist < 0.8) {
                        eng.hp -= 15; 
                        e.mesh.position.sub(moveDir.multiplyScalar(10)); 
                        eng.audio.playPlayerDamage();
                    }
                } else if (e.type === 'R' || e.type === 'B') {
                    if (dist > (e.type === 'B' ? 8 : 6)) {
                        const moveDir = rayDir.normalize().multiplyScalar(e.speed * dt);
                        if (!checkPointCollision(e.mesh.position.x + moveDir.x, e.mesh.position.z)) e.mesh.position.x += moveDir.x;
                        if (!checkPointCollision(e.mesh.position.x, e.mesh.position.z + moveDir.z)) e.mesh.position.z += moveDir.z;
                    }
                    
                    const fireRate = e.type === 'B' ? 1000 : 1500;
                    if (Date.now() - e.lastShot > fireRate) {
                        fireEnemyProjectile(e.mesh.position, rayDir, e.type === 'B');
                        e.lastShot = Date.now();
                    }
                }
            }
        });

        for (let i = eng.enemyProjectiles.length - 1; i >= 0; i--) {
            let p = eng.enemyProjectiles[i];
            p.mesh.position.addScaledVector(p.dir, dt);
            p.life -= dt;
            
            let hit = false;
            if (checkPointCollision(p.mesh.position.x, p.mesh.position.z)) hit = true;
            else if (p.mesh.position.distanceTo(pPos) < 0.8) {
                hit = true;
                eng.hp -= 10;
                eng.audio.playPlayerDamage();
            }

            if (hit || p.life <= 0) {
                eng.scene.remove(p.mesh);
                eng.enemyProjectiles.splice(i, 1);
            }
        }

        // --- CHECK LEVEL EXIT ---
        const map = eng.mapData;
        const px = Math.floor(pPos.x);
        const pz = Math.floor(pPos.z);
        if (map[pz] && map[pz][px] === 'X') {
            eng.running = false;
            eng.audio.stopAmbient();
            setUiState('levelcleared');
            document.exitPointerLock();
        }

        if (eng.hp <= 0) {
            eng.running = false;
            eng.audio.stopAmbient();
            setUiState('gameover');
            document.exitPointerLock();
        }

        setHud({ hp: eng.hp, ammo: eng.ammo, score: eng.score, level: eng.level });
    };

    const startGame = (startLevel, startScore = 0) => {
        engine.current.level = startLevel;
        engine.current.score = startScore;
        engine.current.hp = 100;
        engine.current.ammo = 25; 
        engine.current.running = true;
        buildLevel(startLevel);
        engine.current.audio.playAmbient();
        setUiState('playing');
        if (engine.current.renderer) engine.current.renderer.domElement.requestPointerLock();
    };

    const handlePasswordSubmit = () => {
        const data = decodePassword(passwordInput);
        if (data) startGame(data.level, data.score);
        else alert("INVALID ACCESS CODE");
    };

    return (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto bg-black font-['VT323'] select-none">
            <div className="w-full h-full relative bg-black">
                
                {/* WebGL Canvas fills 100% of the CRT Window via CSS */}
                <canvas ref={containerRef} className="absolute inset-0 z-10 w-full h-full block" />

                {/* CRT SCANLINES */}
                <div className="absolute inset-0 z-30 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />

                {/* IN-GAME HUD */}
                {uiState === 'playing' && (
                    <div className="absolute inset-0 z-40 pointer-events-none p-6 flex flex-col justify-between">
                        <div className="flex justify-between w-full">
                            <div className="text-[#888] text-3xl">SECTOR: {hud.level}</div>
                            <div className="text-[#0ff] text-3xl">AMMO: {hud.ammo}</div>
                            <div className="text-[#555] text-3xl">SCORE: {hud.score}</div>
                        </div>
                        <div className="flex justify-center items-center h-full">
                            <div className="w-2 h-2 bg-[#fff] rounded-full opacity-30 shadow-[0_0_5px_#fff]"></div>
                        </div>
                        <div className="w-full h-8 border-2 border-[#500] p-1">
                            <div className="h-full bg-[#f00] transition-all duration-300 opacity-60" style={{ width: `${Math.max(0, hud.hp)}%` }}></div>
                        </div>
                    </div>
                )}

                {/* MENUS & OVERLAYS */}
                {uiState === 'menu' && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-95">
                        <h1 className="text-[#f00] text-7xl mb-8 tracking-widest opacity-80">MAZE WAR: EVOLVED</h1>
                        <button onClick={() => startGame(1)} className="text-3xl text-[#fff] hover:text-[#f00] mb-4">NEW CAMPAIGN</button>
                        <button onClick={() => setUiState('password')} className="text-3xl text-[#aaa] hover:text-[#fff] mb-4">ENTER ACCESS CODE</button>
                        <button onClick={onMenu} className="text-3xl text-[#555] hover:text-[#f00] mt-8">SYSTEM REBOOT</button>
                    </div>
                )}

                {uiState === 'password' && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-95">
                        <h1 className="text-[#f00] text-5xl mb-8">ENTER ACCESS CODE</h1>
                        <input 
                            type="text" 
                            maxLength={8}
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value.toUpperCase())}
                            className="bg-transparent border-b-4 border-[#f00] text-[#f00] text-5xl text-center w-64 outline-none uppercase mb-8"
                        />
                        <div className="flex space-x-8">
                            <button onClick={handlePasswordSubmit} className="text-3xl text-[#fff] hover:text-[#f00]">VERIFY</button>
                            <button onClick={() => setUiState('menu')} className="text-3xl text-[#aaa] hover:text-[#fff]">CANCEL</button>
                        </div>
                    </div>
                )}

                {/* THE "ARE YOU SURE YOU WANT TO QUIT" PAUSE MENU */}
                {uiState === 'paused' && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#000] bg-opacity-90 backdrop-blur-sm">
                        <h1 className="text-[#f00] text-7xl mb-4 blink-text">ABORT MISSION?</h1>
                        <p className="text-[#aaa] text-2xl mb-2">ALL UNSAVED PROGRESS WILL BE LOST.</p>
                        <p className="text-[#ff0] text-4xl mb-8">ACCESS CODE: <span className="text-white">{saveCode}</span></p>
                        <button onClick={() => { engine.current.running = true; engine.current.audio.playAmbient(); setUiState('playing'); engine.current.renderer.domElement.requestPointerLock(); }} className="text-4xl text-[#0f0] hover:text-[#fff] mb-4">RESUME MISSION</button>
                        <button onClick={onMenu} className="text-3xl text-[#555] hover:text-[#f00] mt-4">CONFIRM ABORT</button>
                    </div>
                )}

                {uiState === 'levelcleared' && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#000] bg-opacity-90">
                        <h1 className="text-[#555] text-7xl mb-4">SECTOR {engine.current.level} SECURED</h1>
                        <p className="text-[#aaa] text-3xl mb-8">ACCESS CODE: <span className="text-[#fff]">{encodePassword(engine.current.level + 1, engine.current.score)}</span></p>
                        <button onClick={() => startGame(engine.current.level + 1, engine.current.score)} className="text-[#fff] text-4xl hover:text-[#f00] blink-text">
                            DESCEND TO SECTOR {engine.current.level + 1}
                        </button>
                    </div>
                )}

                {uiState === 'gameover' && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#100000] bg-opacity-95">
                        <h1 className="text-[#f00] text-8xl mb-4">SIGNAL LOST</h1>
                        <p className="text-[#aaa] text-4xl mb-8">FINAL SCORE: {engine.current.score}</p>
                        <button onClick={() => setUiState('menu')} className="text-3xl text-[#fff] hover:text-[#f00] blink-text">RETURN TO OS</button>
                    </div>
                )}
            </div>
        </div>
    );
}
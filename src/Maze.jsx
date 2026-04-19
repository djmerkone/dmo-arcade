import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { mazeLevels } from './mazelevels'; 

// --- POLYFILL FOR THREE.JS VERSION COMPATIBILITY ---
const BoxGeo = THREE.BoxBufferGeometry || THREE.BoxGeometry;
const SphereGeo = THREE.SphereBufferGeometry || THREE.SphereGeometry;
const PlaneGeo = THREE.PlaneBufferGeometry || THREE.PlaneGeometry;

// --- HARDWARE AUDIO SYNTHESIZER ---
class MazeAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.master = this.ctx?.createGain();
        if (this.master) {
            this.master.gain.value = 0.3;
            this.master.connect(this.ctx.destination);
        }
    }
    ensure() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    play(freqStart, freqEnd, type, duration, vol = 1) {
        this.ensure();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator(); osc.type = type;
        osc.frequency.setValueAtTime(freqStart, t);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        osc.connect(gain).connect(this.master);
        osc.start(t); osc.stop(t + duration);
    }
    shoot() { this.play(2000, 100, 'sawtooth', 0.2); }
    enemyHit() { this.play(800, 50, 'square', 0.4, 0.8); }
    playerHit() { this.play(300, 40, 'sawtooth', 0.6, 1.2); }
    robotAlert() { this.play(400, 600, 'square', 0.3); }
}

// --- 3D ENGINE & PHYSICS ---
class MazeEngine {
    constructor(canvas, audio) {
        this.canvas = canvas;
        this.audio = audio;
        this.CELL_SIZE = 10;
        this.state = { status: 'playing', score: 0, health: 100, level: 0 };
        this.initThree();
        this.buildLevel();
    }

    initThree() {
        // Read true canvas dimensions instead of the window to avoid aspect-ratio warping!
        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.5, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false });
        this.renderer.setSize(width, height, false); // false prevents inline style overrides
        
        this.player = {
            velocity: new THREE.Vector3(),
            direction: new THREE.Vector3(),
            speed: 50.0, 
            turnSpeed: 2.5, 
            radius: 2,
            canShoot: true
        };
        
        this.projectiles = [];
        this.enemies = [];
        this.walls = [];
        this.traps = [];
        this.exits = []; 

        this.matWallFace = new THREE.MeshBasicMaterial({ color: 0x000000 }); 
        this.matWallEdge = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        this.matFloor = new THREE.MeshBasicMaterial({ color: 0x003300, wireframe: true });
        this.matEyeballFace = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.matEyeballEdge = new THREE.LineBasicMaterial({ color: 0xffffff });
        this.matPupil = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.matRobotFace = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.matRobotEdge = new THREE.LineBasicMaterial({ color: 0xff00ff });
        this.matTrap = new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true });
        this.matLaser = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        this.matExitFace = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.matExitEdge = new THREE.LineBasicMaterial({ color: 0x0088ff });

        // Prevents solid black faces from Z-fighting with wireframe edges
        [this.matWallFace, this.matEyeballFace, this.matRobotFace, this.matExitFace].forEach(mat => {
            mat.polygonOffset = true;
            mat.polygonOffsetFactor = 1;
            mat.polygonOffsetUnits = 1;
        });
    }

    createWireframeBox(geo, faceMat, edgeMat) {
        let group = new THREE.Group();
        let mesh = new THREE.Mesh(geo, faceMat);
        let edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
        group.add(mesh);
        group.add(edges);
        return group;
    }

    buildLevel() {
        this.walls.forEach(w => this.scene.remove(w));
        this.traps.forEach(t => this.scene.remove(t.mesh));
        this.enemies.forEach(e => this.scene.remove(e.mesh));
        this.exits.forEach(ex => this.scene.remove(ex.mesh));
        this.projectiles.forEach(p => this.scene.remove(p.mesh));
        
        this.walls = []; this.traps = []; this.enemies = []; this.exits = []; this.projectiles = [];

        const map = mazeLevels[this.state.level];
        if (!map) return;

        this.gridWidth = map[0].length;
        this.gridHeight = map.length;
        this.grid = [];

        let boxGeo = new BoxGeo(this.CELL_SIZE, this.CELL_SIZE, this.CELL_SIZE);

        for (let z = 0; z < this.gridHeight; z++) {
            this.grid[z] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                let char = map[z][x];
                this.grid[z][x] = (char === '#') ? 1 : 0;
                
                let worldX = x * this.CELL_SIZE;
                let worldZ = z * this.CELL_SIZE;

                if (char === '#') {
                    let wallGroup = this.createWireframeBox(boxGeo, this.matWallFace, this.matWallEdge);
                    wallGroup.position.set(worldX, this.CELL_SIZE/2, worldZ);
                    this.scene.add(wallGroup);
                    this.walls.push(wallGroup);
                } else if (char === 'P') {
                    this.camera.position.set(worldX, this.CELL_SIZE/2, worldZ);
                    this.camera.rotation.set(0, 0, 0); 
                } else if (char === 'E') {
                    this.spawnEyeball(worldX, worldZ);
                } else if (char === 'R') {
                    this.spawnRobot(worldX, worldZ);
                } else if (char === 'T') {
                    let geo = new BoxGeo(this.CELL_SIZE * 0.8, 1, this.CELL_SIZE * 0.8);
                    let mesh = new THREE.Mesh(geo, this.matTrap);
                    mesh.position.set(worldX, 0.5, worldZ);
                    this.scene.add(mesh);
                    this.traps.push({ mesh, x: worldX, z: worldZ, active: true });
                } else if (char === 'X') {
                    let geo = new BoxGeo(this.CELL_SIZE * 0.6, this.CELL_SIZE * 0.8, this.CELL_SIZE * 0.6);
                    let exitGroup = this.createWireframeBox(geo, this.matExitFace, this.matExitEdge);
                    exitGroup.position.set(worldX, this.CELL_SIZE/2, worldZ);
                    this.scene.add(exitGroup);
                    this.exits.push({ mesh: exitGroup, x: worldX, z: worldZ });
                }
            }
        }

        if (!this.floorMesh) {
            const floorGeo = new PlaneGeo(1000, 1000, 50, 50);
            this.floorMesh = new THREE.Mesh(floorGeo, this.matFloor);
            this.floorMesh.rotation.x = -Math.PI / 2;
            this.floorMesh.position.set((this.gridWidth * this.CELL_SIZE)/2, 0, (this.gridHeight * this.CELL_SIZE)/2);
            this.scene.add(this.floorMesh);
        } else {
            this.floorMesh.position.set((this.gridWidth * this.CELL_SIZE)/2, 0, (this.gridHeight * this.CELL_SIZE)/2);
        }
    }

    spawnEyeball(x, z) {
        let group = new THREE.Group();
        let geo = new SphereGeo(3, 8, 8);
        
        let bodyMesh = new THREE.Mesh(geo, this.matEyeballFace);
        let edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.matEyeballEdge);
        group.add(bodyMesh); group.add(edges);

        let pupil = new THREE.Mesh(new SphereGeo(1, 4, 4), this.matPupil);
        pupil.position.z = -3.2; 
        group.add(pupil);
        
        group.position.set(x, this.CELL_SIZE/2, z);
        this.scene.add(group);
        this.enemies.push({ mesh: group, type: 'eyeball', hp: 1, speed: 8, angle: Math.random() * Math.PI * 2, radius: 3 });
    }

    spawnRobot(x, z) {
        let group = new THREE.Group();
        
        let bodyGeo = new BoxGeo(3, 6, 3);
        let bodyGroup = this.createWireframeBox(bodyGeo, this.matRobotFace, this.matRobotEdge);
        
        let headGeo = new BoxGeo(2, 2, 2);
        let headGroup = this.createWireframeBox(headGeo, this.matRobotFace, this.matRobotEdge);
        headGroup.position.y = 4;
        
        let eye = new THREE.Mesh(new PlaneGeo(1.5, 0.5), this.matPupil);
        eye.position.set(0, 4, -1.01);
        
        group.add(bodyGroup); group.add(headGroup); group.add(eye);
        group.position.set(x, this.CELL_SIZE/2, z);
        this.scene.add(group);
        
        this.enemies.push({ mesh: group, type: 'robot', hp: 3, speed: 12, state: 'patrol', target: new THREE.Vector3(), radius: 3 });
    }

    shoot() {
        if (!this.player.canShoot || this.state.status !== 'playing') return;
        this.audio.shoot();
        this.player.canShoot = false;
        setTimeout(() => this.player.canShoot = true, 250);

        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        
        // Exact Camera Center, pushed slightly forward so it doesn't clip the camera near-plane
        const start = this.camera.position.clone().add(dir.clone().multiplyScalar(1.0)); 
        const points = [];
        points.push(start);
        points.push(start.clone().add(dir.clone().multiplyScalar(4))); 
        
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, this.matLaser);
        this.scene.add(line);

        this.projectiles.push({ mesh: line, pos: start.clone(), dir: dir, speed: 80, life: 1.0 });
    }

    checkWallCollision(nextPos) {
        let cx = Math.round(nextPos.x / this.CELL_SIZE);
        let cz = Math.round(nextPos.z / this.CELL_SIZE);
        
        for (let z = cz - 1; z <= cz + 1; z++) {
            for (let x = cx - 1; x <= cx + 1; x++) {
                if (z >= 0 && z < this.gridHeight && x >= 0 && x < this.gridWidth) {
                    if (this.grid[z][x] === 1) {
                        let wallX = x * this.CELL_SIZE;
                        let wallZ = z * this.CELL_SIZE;
                        let closestX = Math.max(wallX - this.CELL_SIZE/2, Math.min(nextPos.x, wallX + this.CELL_SIZE/2));
                        let closestZ = Math.max(wallZ - this.CELL_SIZE/2, Math.min(nextPos.z, wallZ + this.CELL_SIZE/2));
                        
                        let distance = Math.hypot(nextPos.x - closestX, nextPos.z - closestZ);
                        if (distance < this.player.radius) return true; 
                    }
                }
            }
        }
        return false;
    }

    update(delta, input) {
        if (this.state.status !== 'playing') return;

        // Player Turning
        if (input.turnLeft) this.camera.rotation.y += this.player.turnSpeed * delta;
        if (input.turnRight) this.camera.rotation.y -= this.player.turnSpeed * delta;

        // Player Movement
        let moveDir = new THREE.Vector3();
        this.camera.getWorldDirection(this.player.direction);
        this.player.direction.y = 0; 
        this.player.direction.normalize();

        let right = new THREE.Vector3().crossVectors(this.camera.up, this.player.direction).normalize();

        if (input.forward) moveDir.add(this.player.direction);
        if (input.backward) moveDir.sub(this.player.direction);
        if (input.left) moveDir.add(right);
        if (input.right) moveDir.sub(right);

        if (moveDir.lengthSq() > 0) moveDir.normalize();
        
        let nextX = this.camera.position.clone();
        nextX.x += moveDir.x * this.player.speed * delta;
        if (!this.checkWallCollision(nextX)) this.camera.position.x = nextX.x;

        let nextZ = this.camera.position.clone();
        nextZ.z += moveDir.z * this.player.speed * delta;
        if (!this.checkWallCollision(nextZ)) this.camera.position.z = nextZ.z;

        // Enemy AI
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            
            if (e.type === 'eyeball') {
                e.mesh.position.x += Math.cos(e.angle) * e.speed * delta;
                e.mesh.position.z += Math.sin(e.angle) * e.speed * delta;
                e.mesh.rotation.y = -e.angle + Math.PI/2; 
                
                if (this.checkWallCollision(e.mesh.position)) {
                    e.mesh.position.x -= Math.cos(e.angle) * e.speed * delta * 2;
                    e.mesh.position.z -= Math.sin(e.angle) * e.speed * delta * 2;
                    e.angle += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2);
                }
            } else if (e.type === 'robot') {
                let distToPlayer = e.mesh.position.distanceTo(this.camera.position);
                if (distToPlayer < 40) {
                    let target = this.camera.position.clone();
                    target.y = e.mesh.position.y;
                    e.mesh.lookAt(target);
                    
                    let dir = new THREE.Vector3().subVectors(target, e.mesh.position).normalize();
                    let nextPos = e.mesh.position.clone().add(dir.multiplyScalar(e.speed * delta));
                    if (!this.checkWallCollision(nextPos)) e.mesh.position.copy(nextPos);
                }
            }

            if (e.mesh.position.distanceTo(this.camera.position) < this.player.radius + e.radius) {
                this.state.health -= 20;
                this.audio.playerHit();
                this.camera.position.add(this.player.direction.clone().multiplyScalar(-5)); 
            }
        }

        // Traps
        this.traps.forEach(t => {
            if (t.active && Math.hypot(t.x - this.camera.position.x, t.z - this.camera.position.z) < this.CELL_SIZE/2) {
                this.state.health -= 10;
                this.audio.playerHit();
                t.active = false; 
                t.mesh.material.color.setHex(0x333333);
            }
        });

        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            let step = p.dir.clone().multiplyScalar(p.speed * delta);
            p.pos.add(step);
            
            const pts = [p.pos, p.pos.clone().add(p.dir.clone().multiplyScalar(4))];
            p.mesh.geometry.setFromPoints(pts);
            
            p.life -= delta;
            let hit = false;

            if (this.checkWallCollision(p.pos)) hit = true;

            if (!hit) {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    let e = this.enemies[j];
                    if (p.pos.distanceTo(e.mesh.position) < e.radius + 2) {
                        hit = true;
                        e.hp--;
                        if (e.hp <= 0) {
                            this.scene.remove(e.mesh);
                            this.enemies.splice(j, 1);
                            this.state.score += (e.type === 'robot' ? 500 : 100);
                            this.audio.enemyHit();
                        } else {
                            this.audio.robotAlert(); 
                        }
                        break;
                    }
                }
            }

            if (hit || p.life <= 0) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }

        // Exits
        this.exits.forEach(ex => {
            ex.mesh.rotation.y += delta; 
            if (Math.hypot(ex.x - this.camera.position.x, ex.z - this.camera.position.z) < this.CELL_SIZE/2) {
                if (this.state.level < mazeLevels.length - 1) {
                    this.state.status = 'levelcomplete';
                } else {
                    this.state.status = 'victory';
                }
            }
        });

        if (this.state.health <= 0) this.state.status = 'gameover';
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

// --- REACT UI & CONTROLS BINDING ---
export default function MazeGame({ audioCtx, onMenu }) {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const [gameState, setGameState] = useState({ status: 'start', score: 0, health: 100, level: 0 });
    
    // Tracking state via ref avoids spamming React renders 60 times a second
    const prevStateRef = useRef({ status: 'start', score: 0, health: 100, level: 0 });
    
    const input = useRef({ forward: false, backward: false, left: false, right: false, turnLeft: false, turnRight: false });
    const keysRef = useRef({});
    const isLocked = useRef(false);

    useEffect(() => {
        if (!canvasRef.current) return;
        const audio = new MazeAudio(audioCtx);
        const engine = new MazeEngine(canvasRef.current, audio);
        engineRef.current = engine;

        const canvas = canvasRef.current;
        const requestPointerLock = () => canvas.requestPointerLock();
        
        const lockChange = () => {
            isLocked.current = document.pointerLockElement === canvas;
        };
        document.addEventListener('pointerlockchange', lockChange);
        
        const onMouseMove = (e) => {
            if (!isLocked.current) return;
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;
            
            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(engine.camera.quaternion);
            euler.y -= movementX * 0.003;
            euler.x -= movementY * 0.003;
            euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, euler.x));
            engine.camera.quaternion.setFromEuler(euler);
        };
        
        const onKeyDown = (e) => { keysRef.current[e.code] = true; if (e.code === 'KeyM') { document.exitPointerLock(); onMenu(); } };
        const onKeyUp = (e) => { keysRef.current[e.code] = false; };
        
        const onMouseDown = (e) => {
            if (!isLocked.current) {
                requestPointerLock();
                if (engine.state.status === 'start' || engine.state.status === 'gameover') {
                    engine.state.status = 'playing'; engine.state.health = 100; engine.state.score = 0; engine.state.level = 0; engine.buildLevel(); 
                } else if (engine.state.status === 'levelcomplete') {
                    engine.state.status = 'playing'; engine.state.level++; engine.buildLevel();
                } else if (engine.state.status === 'victory') {
                    engine.state.status = 'start';
                }
            } else {
                if (e.button === 0 || e.button === 2) engine.shoot(); // Left AND Right click shoot
            }
        };

        // Attach listeners
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        canvas.addEventListener('mousedown', onMouseDown);
        
        // Block right click menu so we can use right click to shoot safely
        const blockContext = (e) => e.preventDefault();
        canvas.addEventListener('contextmenu', blockContext);

        let lastTime = performance.now();
        let reqId;
        
        const loop = (time) => {
            if (!time) time = performance.now();
            const delta = Math.min(0.1, (time - lastTime) / 1000);
            lastTime = time;

            // Ensures Canvas rendering stays perfectly scaled to window resizes without aspect warping
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (canvas.width !== width || canvas.height !== height) {
                engine.renderer.setSize(width, height, false);
                engine.camera.aspect = width / height;
                engine.camera.updateProjectionMatrix();
            }

            // --- UNIVERSAL INPUT POLLER (Keyboard + Gamepad + Mouse) ---
            let k = keysRef.current;
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = gamepads[0];
            const deadz = 0.3;

            // Move Forward/Back: W/S OR Gamepad D-Pad Up/Down OR Left Stick Y
            input.current.forward = k['KeyW'] || gp?.buttons[12]?.pressed || (gp?.axes[1] < -deadz);
            input.current.backward = k['KeyS'] || gp?.buttons[13]?.pressed || (gp?.axes[1] > deadz);

            // Strafe: A/D OR Left Stick X
            input.current.left = k['KeyA'] || (gp?.axes[0] < -deadz);
            input.current.right = k['KeyD'] || (gp?.axes[0] > deadz);
            
            // Turn Head: Arrow Keys OR Gamepad D-Pad L/R OR Right Stick X OR Bumpers
            input.current.turnLeft = k['ArrowLeft'] || gp?.buttons[14]?.pressed || gp?.buttons[4]?.pressed || (gp?.axes[2] < -deadz);
            input.current.turnRight = k['ArrowRight'] || gp?.buttons[15]?.pressed || gp?.buttons[5]?.pressed || (gp?.axes[2] > deadz);
            
            // Gamepad Shoot
            if (gp?.buttons[0]?.pressed || gp?.buttons[1]?.pressed || gp?.buttons[2]?.pressed || gp?.buttons[3]?.pressed || gp?.buttons[7]?.pressed) {
                engine.shoot();
            }
            
            // Gamepad Start/Select Menus
            if (gp?.buttons[8]?.pressed) { document.exitPointerLock(); onMenu(); }
            if (gp?.buttons[9]?.pressed && !isLocked.current) requestPointerLock();

            engine.update(delta, input.current);
            engine.render();

            let cur = engine.state;
            let prv = prevStateRef.current;
            if (cur.status !== prv.status || cur.score !== prv.score || cur.health !== prv.health || cur.level !== prv.level) {
                prevStateRef.current = { ...cur };
                setGameState({ ...cur });
            }

            reqId = requestAnimationFrame(loop);
        };
        
        reqId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(reqId);
            document.removeEventListener('pointerlockchange', lockChange);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('contextmenu', blockContext);
        };
    }, [audioCtx, onMenu]);

    return (
        <div className="absolute inset-0 z-20 bg-black pointer-events-auto overflow-hidden">
            <canvas ref={canvasRef} className="block w-full h-full" />
            
            {/* TRUE MATHEMATICAL CROSSHAIR */}
            {gameState.status === 'playing' && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                    <div className="absolute w-5 h-[2px] bg-[#0f0]"></div>
                    <div className="absolute w-[2px] h-5 bg-[#0f0]"></div>
                </div>
            )}

            {gameState.status === 'playing' && (
                <div className="absolute top-4 left-4 right-4 flex justify-between text-[#0f0] font-['VT323'] text-3xl pointer-events-none">
                    <div>SCORE: {gameState.score}</div>
                    <div className={gameState.health <= 30 ? "text-[#f00] blink-text" : "text-[#0f0]"}>
                        HEALTH: {gameState.health}%
                    </div>
                </div>
            )}

            {gameState.status === 'start' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 pointer-events-none">
                    <h1 className="text-[#0f0] text-7xl font-['VT323'] mb-4">MAZE WAR: EVOLVED</h1>
                    <p className="text-[#aaa] text-2xl font-['VT323'] mb-2">PC: MOUSE TO LOOK | WASD TO MOVE | CLICK TO SHOOT</p>
                    <p className="text-[#aaa] text-2xl font-['VT323'] mb-8">PAD: D-PAD/STICKS TO MOVE & TURN | A/B/X/Y TO SHOOT</p>
                    <p className="text-[#fff] text-4xl font-['VT323'] blink-text">CLICK TO LOCK MOUSE AND START</p>
                </div>
            )}

            {gameState.status === 'levelcomplete' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#00f] bg-opacity-30 pointer-events-none">
                    <h1 className="text-[#0ff] text-7xl font-['VT323'] mb-4">SECTOR CLEARED</h1>
                    <p className="text-[#fff] text-4xl font-['VT323'] blink-text">CLICK TO DESCEND TO LEVEL {gameState.level + 2}</p>
                </div>
            )}

            {gameState.status === 'victory' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0] bg-opacity-30 pointer-events-none">
                    <h1 className="text-[#0f0] text-8xl font-['VT323'] mb-4">MAZE MASTER</h1>
                    <p className="text-[#fff] text-4xl font-['VT323'] mb-2">FINAL SCORE: {gameState.score}</p>
                    <p className="text-[#fff] text-3xl font-['VT323'] blink-text">CLICK TO RETURN TO MENU</p>
                </div>
            )}

            {gameState.status === 'gameover' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f00] bg-opacity-30 pointer-events-none">
                    <h1 className="text-[#f00] text-8xl font-['VT323'] mb-4">YOU DIED</h1>
                    <p className="text-[#fff] text-4xl font-['VT323'] mb-2">FINAL SCORE: {gameState.score}</p>
                    <p className="text-[#fff] text-3xl font-['VT323'] blink-text">CLICK TO RESTART</p>
                </div>
            )}
        </div>
    );
}
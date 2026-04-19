// src/Pong.jsx
import React, { useEffect, useRef, useState } from 'react';

// --- HARDWARE AUDIO SYNTHESIZER ---
class PongAudio {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.masterGain = this.ctx?.createGain();
        if (this.masterGain) {
            this.masterGain.gain.value = 0.3; // Keep it retro but not deafening
            this.masterGain.connect(this.ctx.destination);
        }
    }

    ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, duration) {
        this.ensureContext();
        if (!this.ctx || this.ctx.state !== 'running') return;
        
        const t = this.ctx.currentTime;
        let osc = this.ctx.createOscillator();
        osc.type = 'square'; // The exact waveform of 1972 Pong
        osc.frequency.setValueAtTime(freq, t);
        
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.0, t);
        gain.gain.setValueAtTime(1.0, t + duration - 0.01);
        gain.gain.linearRampToValueAtTime(0.001, t + duration);
        
        osc.connect(gain).connect(this.masterGain);
        osc.start(t);
        osc.stop(t + duration);
    }

    paddleHit() { this.playTone(459, 0.1); } // High "Bip"
    wallHit() { this.playTone(226, 0.1); }   // Low "Bop"
    score() { this.playTone(160, 0.4); }     // Long low "Booop"
}

export default function PongGame({ audioCtx, onMenu }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = false; 

        const audio = new PongAudio(audioCtx);
        let animationFrameId;

        // --- GAME ENGINE STATE ---
        const state = {
            status: 'start', 
            players: 1,      // 1 = vs Computer, 2 = vs Human
            width: 800,
            height: 600,
            score: { p1: 0, p2: 0 },
            paddleSpeed: 8,
            paddleHeight: 80,
            paddleWidth: 15,
            ballSize: 15,
            p1: { y: 300 },
            p2: { y: 300 },
            ball: { x: 400, y: 300, vx: 0, vy: 0, speed: 7 },
            flashTimer: 0
        };

        const resetBall = (serveToPlayer1) => {
            state.ball.x = state.width / 2;
            state.ball.y = state.height / 2;
            state.ball.speed = 7;
            state.ball.vx = serveToPlayer1 ? -state.ball.speed : state.ball.speed;
            state.ball.vy = (Math.random() - 0.5) * 6; 
        };

        const handleResize = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            state.width = rect.width;
            state.height = rect.height;
            
            state.p1.y = state.height / 2;
            state.p2.y = state.height / 2;
            resetBall(true);
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        setIsReady(true);

        // --- INPUT EVENT LISTENERS ---
        const keys = {};
        const handleKeyDown = e => { 
            if (e.key === ' ') e.preventDefault();
            keys[e.key.toLowerCase()] = true; 
            
            if(e.key.toLowerCase() === 'm') onMenu();
            
            if (state.status === 'start') {
                // Toggle players with Up/Down or W/S
                if (e.key === 'w' || e.key === 'ArrowUp') state.players = 1;
                if (e.key === 's' || e.key === 'ArrowDown') state.players = 2;
            }
            
            if(e.key === 'Enter' || e.key.toLowerCase() === 'enter') {
                if (state.status === 'start' || state.status === 'gameover') {
                    state.score.p1 = 0; state.score.p2 = 0;
                    state.status = 'playing';
                    resetBall(Math.random() > 0.5);
                }
            }
        };
        
        const handleKeyUp = e => { keys[e.key.toLowerCase()] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // --- THE MASTER LOOP ---
        const loop = () => {
            
            // 1. GAMEPAD POLLER
            const virtualKeys = { ...keys };
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp1 = gamepads[0]; // Player 1
            const gp2 = gamepads[1]; // Player 2

            // P1 Controller Logic (Also handles menu navigation)
            if (gp1) {
                if (gp1.buttons[8]?.pressed) { onMenu(); return; }
                
                if (state.status === 'start') {
                    if (gp1.axes[1] < -0.3 || gp1.buttons[12]?.pressed) state.players = 1;
                    if (gp1.axes[1] >  0.3 || gp1.buttons[13]?.pressed) state.players = 2;
                }

                if (gp1.buttons[9]?.pressed || gp1.buttons[7]?.pressed) {
                    if (state.status === 'start' || state.status === 'gameover') {
                        state.score.p1 = 0; state.score.p2 = 0; state.status = 'playing'; resetBall(true);
                    }
                }
                if (gp1.axes[1] < -0.3 || gp1.buttons[12]?.pressed) virtualKeys['w'] = true;
                if (gp1.axes[1] >  0.3 || gp1.buttons[13]?.pressed) virtualKeys['s'] = true;
            }

            // P2 Controller Logic
            if (gp2 && state.players === 2) {
                if (gp2.axes[1] < -0.3 || gp2.buttons[12]?.pressed) virtualKeys['arrowup'] = true;
                if (gp2.axes[1] >  0.3 || gp2.buttons[13]?.pressed) virtualKeys['arrowdown'] = true;
            }

            // 2. PHYSICS UPDATE
            if (state.status === 'playing' && state.flashTimer === 0) {
                
                // Player 1 Movement
                if (virtualKeys['w']) state.p1.y -= state.paddleSpeed;
                if (virtualKeys['s']) state.p1.y += state.paddleSpeed;

                // Player 2 / Computer Movement
                if (state.players === 2) {
                    if (virtualKeys['arrowup']) state.p2.y -= state.paddleSpeed;
                    if (virtualKeys['arrowdown']) state.p2.y += state.paddleSpeed;
                } else {
                    // --- COMPUTER AI LOGIC ---
                    if (state.ball.vx > 0) {
                        let aiCenter = state.p2.y;
                        if (state.ball.y < aiCenter - 10) state.p2.y -= (state.paddleSpeed * 0.85);
                        else if (state.ball.y > aiCenter + 10) state.p2.y += (state.paddleSpeed * 0.85);
                    } else {
                        // Slowly drift back to center when ball is moving away
                        if (state.p2.y < state.height / 2 - 10) state.p2.y += 2;
                        else if (state.p2.y > state.height / 2 + 10) state.p2.y -= 2;
                    }
                }

                // Clamp Paddles to walls
                state.p1.y = Math.max(state.paddleHeight/2, Math.min(state.height - state.paddleHeight/2, state.p1.y));
                state.p2.y = Math.max(state.paddleHeight/2, Math.min(state.height - state.paddleHeight/2, state.p2.y));

                // Move Ball
                state.ball.x += state.ball.vx;
                state.ball.y += state.ball.vy;

                // Top/Bottom Wall Collision
                if (state.ball.y <= state.ballSize/2) {
                    state.ball.y = state.ballSize/2;
                    state.ball.vy *= -1;
                    audio.wallHit();
                } else if (state.ball.y >= state.height - state.ballSize/2) {
                    state.ball.y = state.height - state.ballSize/2;
                    state.ball.vy *= -1;
                    audio.wallHit();
                }

                // Paddle Collision Logic
                let hitPaddle = false;
                let paddleY = 0;

                // Check P1 (Left)
                if (state.ball.x - state.ballSize/2 <= 40 + state.paddleWidth/2 && state.ball.x > 40) {
                    if (state.ball.y >= state.p1.y - state.paddleHeight/2 && state.ball.y <= state.p1.y + state.paddleHeight/2) {
                        state.ball.x = 40 + state.paddleWidth/2 + state.ballSize/2; 
                        hitPaddle = true;
                        paddleY = state.p1.y;
                    }
                }
                
                // Check P2 (Right)
                if (state.ball.x + state.ballSize/2 >= state.width - 40 - state.paddleWidth/2 && state.ball.x < state.width - 40) {
                    if (state.ball.y >= state.p2.y - state.paddleHeight/2 && state.ball.y <= state.p2.y + state.paddleHeight/2) {
                        state.ball.x = state.width - 40 - state.paddleWidth/2 - state.ballSize/2;
                        hitPaddle = true;
                        paddleY = state.p2.y;
                    }
                }

                if (hitPaddle) {
                    audio.paddleHit();
                    let intersectY = (state.ball.y - paddleY) / (state.paddleHeight / 2);
                    let bounceAngle = intersectY * (Math.PI / 4); 

                    state.ball.speed = Math.min(20, state.ball.speed + 0.5);

                    let direction = state.ball.x < state.width/2 ? 1 : -1;
                    state.ball.vx = direction * state.ball.speed * Math.cos(bounceAngle);
                    state.ball.vy = state.ball.speed * Math.sin(bounceAngle);
                }

                // Scoring Logic
                if (state.ball.x < 0) {
                    state.score.p2++;
                    audio.score();
                    state.flashTimer = 60; 
                    if (state.score.p2 >= 11) state.status = 'gameover';
                    else resetBall(false); 
                } else if (state.ball.x > state.width) {
                    state.score.p1++;
                    audio.score();
                    state.flashTimer = 60;
                    if (state.score.p1 >= 11) state.status = 'gameover';
                    else resetBall(true);
                }
            }

            if (state.flashTimer > 0) state.flashTimer--;

            // 3. RENDERER
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, state.width, state.height);

            // Draw Dashed Center Line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 4;
            ctx.setLineDash([15, 20]);
            ctx.beginPath();
            ctx.moveTo(state.width / 2, 0);
            ctx.lineTo(state.width / 2, state.height);
            ctx.stroke();
            ctx.setLineDash([]); 

            // Draw Scores
            ctx.fillStyle = '#ffffff';
            ctx.font = '120px "VT323"';
            ctx.textAlign = 'center';
            ctx.fillText(state.score.p1, state.width / 4, 120);
            ctx.fillText(state.score.p2, (state.width / 4) * 3, 120);

            // Draw Paddles
            ctx.fillRect(40 - state.paddleWidth/2, state.p1.y - state.paddleHeight/2, state.paddleWidth, state.paddleHeight);
            ctx.fillRect(state.width - 40 - state.paddleWidth/2, state.p2.y - state.paddleHeight/2, state.paddleWidth, state.paddleHeight);

            // Draw Ball 
            if (state.status === 'playing' && state.flashTimer === 0) {
                ctx.fillRect(state.ball.x - state.ballSize/2, state.ball.y - state.ballSize/2, state.ballSize, state.ballSize);
            }

            // Overlays
            if (state.status === 'start') {
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.fillRect(0, 0, state.width, state.height);
                ctx.fillStyle = '#fff';
                ctx.font = '80px "VT323"';
                ctx.fillText("PONG", state.width / 2, state.height / 2 - 100);
                
                // Interactive Menu
                ctx.font = '40px "VT323"';
                ctx.fillStyle = state.players === 1 ? '#0f0' : '#888';
                ctx.fillText(state.players === 1 ? "> 1 PLAYER <" : "1 PLAYER", state.width / 2, state.height / 2);
                
                ctx.fillStyle = state.players === 2 ? '#0f0' : '#888';
                ctx.fillText(state.players === 2 ? "> 2 PLAYERS <" : "2 PLAYERS", state.width / 2, state.height / 2 + 60);

                ctx.font = '30px "VT323"';
                ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? '#fff' : '#888';
                ctx.fillText("PRESS START", state.width / 2, state.height / 2 + 160);
                
                ctx.fillStyle = '#aaa';
                ctx.font = '24px "VT323"';
                ctx.fillText("UP/DOWN TO SELECT", state.width / 2, state.height - 50);
            } else if (state.status === 'gameover') {
                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                ctx.fillRect(0, 0, state.width, state.height);
                ctx.fillStyle = '#fff';
                ctx.font = '80px "VT323"';
                let winner = state.score.p1 >= 11 ? "PLAYER 1" : "PLAYER 2";
                ctx.fillText(`${winner} WINS`, state.width / 2, state.height / 2 - 40);
                ctx.font = '30px "VT323"';
                ctx.fillText("PRESS START TO PLAY AGAIN", state.width / 2, state.height / 2 + 40);
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [audioCtx, onMenu]);

    return (
        <div ref={containerRef} className="absolute inset-0 z-20 bg-black pointer-events-auto overflow-hidden">
            {!isReady && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black bg-opacity-90">
                    <h2 className="text-white text-4xl font-['VT323'] blink-text">INSERT COIN...</h2>
                </div>
            )}
            <canvas ref={canvasRef} className="block w-full h-full cursor-none" />
        </div>
    );
}
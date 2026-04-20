// src/Gilg.jsx

import React, { useEffect, useRef, useState } from 'react';
import { GilgGraphics } from './gilgassets.js';
import { GilgameshAudio } from './gilgaudio.js';
import { GilgameshEffects } from './gilgeffects.js';
import { FULL_EPIC } from './gilgtext.js'; 

/**
 * ============================================================================
 * THE EPIC OF GILGAMESH: MASTER DIRECTOR ENGINE (VALHALLA EDITION)
 * ============================================================================
 * This component acts as the cinematic orchestrator. It manages strict 24FPS
 * rendering, procedural actor animation, Parallax Z-Order Layering, 
 * Audio/VFX synchronization, and hybrid HTML/Canvas UI compositing.
 * ============================================================================
 */
export default function GilgameshStory({ audioCtx, onMenu }) {
    
    // --- 1. CORE ENGINE REFERENCES ---
    const canvasRef = useRef(null);          // Main Cinematic Viewport
    const uiCanvasRef = useRef(null);        // Secondary Canvas for the Clay Tablet UI
    const audioRef = useRef(null);           // Audio Synthesizer
    const vfxRef = useRef(null);             // VFX Compositor
    
    // --- 2. TIMING & LOOP REFERENCES ---
    const frameRef = useRef(0);              
    const lastTimeRef = useRef(0);           
    const typingIntervalRef = useRef(null);  

    // --- 3. CINEMATIC STATE MACHINE ---
    const [phase, setPhase] = useState('boot'); 
    const [titleOpacity, setTitleOpacity] = useState(0);
    const [masterOpacity, setMasterOpacity] = useState(1);

    // --- 4. SCRIPT/STORY STATE ---
    const [beatIndex, setBeatIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    // Safely retrieve the current director's beat
    const currentBeat = FULL_EPIC[beatIndex] || FULL_EPIC[0];

    // ========================================================================
    // ENGINE MOUNTING & INITIALIZATION
    // ========================================================================
    useEffect(() => {
        if (!audioRef.current && audioCtx) {
            audioRef.current = new GilgameshAudio(audioCtx);
        }
        if (!vfxRef.current) {
            vfxRef.current = new GilgameshEffects(800, 600);
        }

        return () => {
            if (audioRef.current) audioRef.current.stop();
            if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        };
    }, [audioCtx]);

    // ========================================================================
    // THE BOOT & TITLE SEQUENCE ORCHESTRATOR
    // ========================================================================
    useEffect(() => {
        if (phase === 'boot') {
            // Eerie wind ambience
            if (audioRef.current) {
                try { audioRef.current.setMood('steppe'); } catch(e) {}
            }
            const bootTimer = setTimeout(() => setPhase('title'), 2500);
            return () => clearTimeout(bootTimer);
        } 
        else if (phase === 'title') {
            // Massive Hans Zimmer Braam
            if (audioRef.current && audioCtx) {
                try { audioRef.current.playBraam(65.41, audioCtx.currentTime, 6.0); } catch(e) {}
            }
            
            // Screen shake & Title Fade
            if (vfxRef.current) vfxRef.current.trigger('screen_shake_subtle');
            setTitleOpacity(1);
            
            const titleTimer = setTimeout(() => {
                setTitleOpacity(0);
                setTimeout(() => setPhase('story'), 2000);
            }, 4500);
            
            return () => clearTimeout(titleTimer);
        }
    }, [phase, audioCtx]);

    // ========================================================================
    // UI PERFORMANCE FIX: Render Clay Tablet exactly once per scene
    // ========================================================================
    useEffect(() => {
        if (phase === 'story' && uiCanvasRef.current) {
            const ctx = uiCanvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, 720, 180);
            GilgGraphics.drawTabletFrame(ctx, 0, 0, 720, 180);
        }
    }, [phase, currentBeat?.scene]);

    // ========================================================================
    // THE SCRIPT DIRECTOR (Audio Sync & Typewriter)
    // ========================================================================
    useEffect(() => {
        if (phase !== 'story' || !currentBeat) return;

        // 1. SET ORCHESTRAL MOOD 
        if (currentBeat.mood && audioRef.current) {
            try { audioRef.current.setMood(currentBeat.mood); } catch(e){}
        }

        // 2. TRIGGER POST-PROCESSING VFX 
        if (currentBeat.vfx && vfxRef.current) {
            vfxRef.current.trigger(currentBeat.vfx);
        }

        // 3. TRIGGER ACTION SOUNDS 
        if (currentBeat.sfx === 'thunder_crack' && audioRef.current && audioCtx) {
            try { audioRef.current.playDrum(audioCtx.currentTime, true); } catch(e){}
        }

        // 4. THE CUNEIFORM TYPEWRITER 
        setIsTyping(true);
        setDisplayedText("");
        let charIndex = 0;

        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

        // 40ms per character carving speed
        typingIntervalRef.current = setInterval(() => {
            if (!currentBeat.text) {
                clearInterval(typingIntervalRef.current);
                return;
            }

            setDisplayedText(currentBeat.text.slice(0, charIndex + 1));
            
            // Sync carve sound to text, skipping blank spaces
            if (charIndex % 2 === 0 && audioRef.current && currentBeat.text[charIndex] !== ' ') {
                try { audioRef.current.playCarve(); } catch(e){}
            }

            charIndex++;
            
            if (charIndex >= currentBeat.text.length) {
                clearInterval(typingIntervalRef.current);
                setIsTyping(false);
            }
        }, 40); 

        return () => clearInterval(typingIntervalRef.current);
    }, [beatIndex, phase, audioCtx]); 

    // ========================================================================
    // THE 24FPS CINEMATIC RENDER PIPELINE
    // ========================================================================
    useEffect(() => {
        let animId;
        
        const render = (time) => {
            // STRICT FILMIC TIMING: Enforce 24FPS (41.6ms per frame)
            const delta = time - lastTimeRef.current;
            if (delta < 41.6) { 
                animId = requestAnimationFrame(render);
                return;
            }
            lastTimeRef.current = time;

            const canvas = canvasRef.current;
            if (canvas && currentBeat) {
                const ctx = canvas.getContext('2d');
                
                // BOMB-PROOF CONTEXT RESET: Prevents the sun from smearing/duplicating
                ctx.setTransform(1, 0, 0, 1, 0, 0); 
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1.0;
                ctx.clearRect(0, 0, 800, 600);

                frameRef.current++;
                const tick = frameRef.current;

                if (phase === 'title' || phase === 'story') {
                    const scene = currentBeat.scene || 'uruk';
                    const mood = currentBeat.mood || 'none';
                    
                    // A. LAYER 1: DEEP BACKGROUND (Sky, Stars)
                    // Drawn STATICALLY behind the God Rays to prevent bleeding
                    GilgGraphics.drawBackground(ctx, tick, scene);

                    // B. THE FOREGROUND & ACTOR CALLBACK (Injected into VFX Engine)
                    const renderActorsCallback = (context, currentTick, colorOverride = null) => {
                        
                        // Z-ORDER FIX: Draw solid foregrounds (Ziggurat) to occlude light
                        GilgGraphics.drawForeground(context, currentTick, scene, colorOverride);

                        if (!currentBeat.actors) return;
                        
                        // Draw Actors dynamically aligned to the ground
                        currentBeat.actors.forEach(actor => {
                            const floatY = actor.hover 
                                ? Math.cos(currentTick * 0.02) * 8  
                                : Math.sin(currentTick * 0.05) * 4; 
                            
                            const groundY = 380; 

                            GilgGraphics.drawSprite(
                                context, 
                                actor.id, 
                                actor.x, 
                                groundY + floatY, 
                                actor.scale || 6, 
                                actor.flip, 
                                currentTick,
                                colorOverride // Pipes Aberration colors into the vector engine
                            );
                        });
                    };

                    // C. APPLY HIGH-FIDELITY VFX COMPOSITOR
                    if (vfxRef.current) {
                        vfxRef.current.updateAndDraw(
                            ctx, 
                            tick, 
                            scene, 
                            mood, 
                            renderActorsCallback
                        );
                    }

                    // D. CINEMATIC LETTERBOXING (Anamorphic 2.35:1 Ratio)
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, 800, 80);   
                    ctx.fillRect(0, 520, 800, 80); 
                } 
                else {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, 800, 600);
                }
            }
            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animId); 
    }, [beatIndex, phase, currentBeat]);

    // ========================================================================
    // PLAYER INTERACTION & NAVIGATION
    // ========================================================================
    const handleNext = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        if (phase !== 'story') return; 

        if (isTyping) {
            // FAST READER: Instantly complete the paragraph
            clearInterval(typingIntervalRef.current);
            setDisplayedText(currentBeat.text);
            setIsTyping(false);
        } else {
            // ADVANCE STORY
            if (beatIndex < FULL_EPIC.length - 1) {
                setBeatIndex(prev => prev + 1);
            } else {
                setMasterOpacity(0);
                setTimeout(() => onMenu(), 1500); 
            }
        }
    };

    // ========================================================================
    // THE RENDER TREE
    // ========================================================================
    return (
        <div 
            className="absolute inset-0 z-20 bg-black flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-opacity duration-1000" 
            style={{ opacity: masterOpacity }}
            onClick={handleNext}
        >
            {/* --- LAYER 1: THE CANVAS RENDER ENGINE --- */}
            <canvas 
                ref={canvasRef} 
                width={800} 
                height={600} 
                className="w-full h-full object-contain shadow-[0_0_100px_rgba(0,0,0,1)]"
                style={{ imageRendering: 'pixelated' }}
            />

            {/* --- LAYER 2: CINEMATIC TITLE SEQUENCE --- */}
            <div 
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-1000 ease-in-out"
                style={{ opacity: titleOpacity, zIndex: 30 }}
            >
                <h1 className="text-[#d4af37] text-6xl md:text-8xl font-bold tracking-[0.3em] font-serif uppercase drop-shadow-[0_0_40px_rgba(212,175,55,1)]">
                    Gilgamesh
                </h1>
                <p className="text-white text-xl md:text-3xl tracking-[0.5em] font-['VT323'] mt-6 opacity-90 drop-shadow-[0_0_15px_rgba(0,0,0,1)]">
                    THE DIRECTOR'S CUT
                </p>
            </div>

            {/* --- LAYER 3: HYBRID HTML/CANVAS TEXT BOX --- */}
            {phase === 'story' && currentBeat?.text && (
                <div className="absolute bottom-[30px] w-[92%] max-w-[720px] pointer-events-none flex justify-center z-40">
                    <div className="relative w-full min-h-[160px] shadow-[0_20px_50px_rgba(0,0,0,0.9)] rounded-lg">
                        
                        {/* Hidden Background Canvas for Clay Tablet Texture */}
                        <canvas 
                            ref={uiCanvasRef}
                            width={720} 
                            height={180} 
                            className="absolute inset-0 w-full h-full opacity-95"
                        />
                        
                        {/* Crisp HTML Typography */}
                        <div className="relative z-10 flex flex-col items-center justify-center px-8 md:px-12 py-5 text-center min-h-[160px]">
                            <p className="text-[#d4af37] font-bold tracking-[0.2em] text-lg md:text-xl mb-2 opacity-95 uppercase border-b border-[#d4af37]/40 pb-1 inline-block drop-shadow-[1px_1px_0px_#000]">
                                {currentBeat.speaker}
                            </p>
                            <h2 className="text-[#e3dac9] text-2xl md:text-3xl leading-snug font-['VT323'] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                {displayedText}
                            </h2>
                            {!isTyping && (
                                <div className="mt-4 flex items-center justify-center space-x-3 animate-pulse opacity-80">
                                    <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full shadow-[0_0_5px_#d4af37]"></span>
                                    <p className="text-[#d4af37] text-sm md:text-base font-['VT323'] tracking-[0.3em] uppercase drop-shadow-md">
                                        click to continue
                                    </p>
                                    <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full shadow-[0_0_5px_#d4af37]"></span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- LAYER 4: HUD CONTROLS --- */}
            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setMasterOpacity(0);
                    setTimeout(() => onMenu(), 1000); 
                }}
                className="absolute top-4 right-4 text-[#8b0000] font-['VT323'] text-2xl hover:bg-[#8b0000] hover:text-white transition-all duration-300 z-50 border-2 border-[#8b0000] px-4 py-1 opacity-50 hover:opacity-100 bg-black/50 backdrop-blur-sm"
            >
                [X] ABORT
            </button>
        </div>
    );
}
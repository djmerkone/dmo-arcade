// src/Trail.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TrailCanvas } from './TrailCanvas.jsx';
import { HuntingMiniGame } from './minigame_hunt.jsx';
import { RiverMiniGame } from './minigame_river.jsx';
import { TrailMusic } from './trailmusic.js';

// Logic & Data
import { LANDMARKS, INITIAL_STATE, STORE_PRICES } from './traildata.js'; 
import { NARRATIVE_EVENTS, getValidEvent, checkDiseaseOutbreak, determineWeather } from './trailevents.js';
import { TRAIL_NPCS, getNPCsAtLocation, getRandomWanderingNPC } from './trailnpcs.js';
import { generateTrailCode, decodeTrailCode } from './trailcode.js'; // <-- The Memory Card Engine!

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PACES = ["Resting", "Steady", "Strenuous", "Grueling"];
const RATIONS = ["Bare bones", "Meager", "Filling"];

export default function OregonTrailGame({ audioCtx, onMenu }) {
    // --- CORE REFS & STATE ---
    const [gameState, setGameState] = useState('main_menu'); 
    const [uiData, setUiData] = useState({ pages: [], pageIdx: 0 });
    const [partyNames, setPartyNames] = useState(["", "", "", "", ""]);
    const [saveCodeInput, setSaveCodeInput] = useState("");

    const baseState = INITIAL_STATE || { 
        day: 1, month: 3, year: 1848, distance: 0, money: 800, 
        inventory: { oxen: 0, food: 0, bullets: 0, clothing: 0, wheels: 0, axles: 0, tongues: 0 }, 
        party: [], pace: 1, rations: 1, weather: "Fair" 
    };

    const engineRef = useRef({
        ...JSON.parse(JSON.stringify(baseState)),
        tick: 0,
        pastEvents: [],
        nextLandmarkObj: LANDMARKS ? LANDMARKS[1] : null,
        karma: 0
    });

    const keysRef = useRef({});
    const musicRef = useRef(null);

    // --- AUDIO FX ---
    const playSfx = (type) => {
        if (!audioCtx || !musicRef.current) return;
        if (type === 'shoot') musicRef.current.playShootSFX(audioCtx.currentTime); 
        if (type === 'hit') musicRef.current.playHitSFX(audioCtx.currentTime);
        if (type === 'splash') musicRef.current.playSplashSFX(audioCtx.currentTime);
    };

    // --- MOOD MAP (Ensures music never drops out!) ---
    useEffect(() => {
        if (!musicRef.current && audioCtx) musicRef.current = new TrailMusic(audioCtx);
        const music = musicRef.current;
        if (!music) return;

        const moodMap = {
            'main_menu': 'main_menu',
            'profession': 'main_menu',
            'naming': 'main_menu',
            'password_entry': 'main_menu',
            'store': 'main_menu',
            'camp_menu': 'main_menu',
            'save_display': 'main_menu',
            'travel': 'travel_fair',
            'landmark': 'travel_fair',
            'event': 'travel_harsh', 
            'hunting': 'hunting',
            'river_float': 'river',
            'gameover': 'death'
        };

        music.setMood(moodMap[gameState] || 'travel_fair');
    }, [gameState, audioCtx]);

    useEffect(() => {
        return () => {
            if (musicRef.current) musicRef.current.stop();
        };
    }, []);

    const startTravel = () => {
        if (engineRef.current.inventory.oxen < 2) {
            alert("You must buy at least one yoke (2 oxen) to pull the wagon!");
            return;
        }
        setGameState('travel');
    };

    // --- GAME ENGINE TICK ---
    const onTravelTick = useCallback(() => {
        const eng = engineRef.current;
        if (eng.tick % 60 === 0) { 
            eng.day++;
            if (eng.day > 30) { eng.day = 1; eng.month++; }
            if (eng.month > 11) { eng.month = 0; eng.year++; }

            const miles = (eng.pace * 6) + Math.floor(Math.random() * 4);
            eng.distance += miles;
            eng.weather = determineWeather ? determineWeather(eng.month) : "Fair";

            const living = eng.party?.filter(p => p.health > 0).length || 0;
            if (living === 0) { setGameState('gameover'); return; }
            
            const foodEaten = living * eng.rations * 2;
            eng.inventory.food = Math.max(0, eng.inventory.food - foodEaten);

            const hitLM = LANDMARKS?.find(l => l.distance > (eng.distance - miles) && l.distance <= eng.distance);
            if (hitLM && hitLM.distance !== 0) {
                eng.distance = hitLM.distance; 
                eng.nextLandmarkObj = LANDMARKS.find(l => l.distance > eng.distance) || hitLM;
                setUiData({ landmark: hitLM });
                setGameState('landmark');
                return;
            }

            if (Math.random() < 0.05) {
                const evt = getValidEvent ? getValidEvent(eng) : null;
                if (evt) {
                    setUiData({ event: evt, pages: evt.pages, pageIdx: 0, isResolution: false });
                    setGameState('event');
                }
            }
        }
    }, []);

    // --- INPUT HANDLING ---
    const handleNameInput = (e, index) => {
        const newNames = [...partyNames];
        newNames[index] = e.target.value.toUpperCase().slice(0, 10);
        setPartyNames(newNames);
    };

    const confirmNames = () => {
        const defaultNames = ["MERK", "MARY", "JOHN", "LUKE", "SARAH"];
        const finalNames = partyNames.map((n, i) => n.trim() === "" ? defaultNames[i] : n.trim());
        engineRef.current.party = finalNames.map(name => ({ name, health: 100, disease: null }));
        setGameState('store');
    };

    const handleChoice = (choice) => {
        const result = choice.action(engineRef.current);
        setUiData(prev => ({ ...prev, pages: result?.pages || ["You proceed."], pageIdx: 0, isResolution: true }));
    };

    useEffect(() => {
        const down = (e) => {
            keysRef.current[e.key.toLowerCase()] = true;
            if (gameState === 'travel' && e.key === 'Enter') setGameState('camp_menu');
            if ((gameState === 'event' || gameState === 'landmark') && e.key === 'Enter') {
                setUiData(prev => {
                    if (prev.pageIdx < (prev.pages?.length || 0) - 1) return { ...prev, pageIdx: prev.pageIdx + 1 };
                    else { setTimeout(() => setGameState('travel'), 0); return {}; }
                });
            }
        };
        const up = (e) => keysRef.current[e.key.toLowerCase()] = false;
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, [gameState]);

    return (
        <div className="absolute inset-0 z-20 bg-black text-white font-['VT323'] select-none">
            
            {/* --- MAIN MENU --- */}
            {gameState === 'main_menu' && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 relative z-30 pointer-events-auto">
                    <h1 className="text-8xl text-[#0ff] mb-4 text-center">OREGON TRAIL<br/><span className="text-4xl text-[#f0f]">ULTRA EPIC EDITION</span></h1>
                    <button onClick={() => setGameState('profession')} className="text-4xl hover:text-green-400 cursor-pointer">1. START JOURNEY</button>
                    <button onClick={() => setGameState('password_entry')} className="text-4xl hover:text-yellow-400 cursor-pointer">2. LOAD SAVED GAME</button>
                    <button onClick={onMenu} className="text-4xl hover:text-red-500 cursor-pointer">3. EXIT TO ARCADE</button>
                </div>
            )}

            {/* --- PASSWORD LOAD SCREEN --- */}
            {gameState === 'password_entry' && (
                <div className="flex flex-col items-center justify-center h-full relative z-30 pointer-events-auto">
                    <p className="text-4xl text-yellow-400 mb-8">ENTER TRAIL CODE:</p>
                    <input 
                        type="text" 
                        value={saveCodeInput}
                        onChange={(e) => setSaveCodeInput(e.target.value)}
                        className="bg-black border-4 border-yellow-400 text-white text-3xl p-4 w-[600px] text-center mb-8 outline-none"
                        placeholder="Paste code here..."
                    />
                    <div className="flex space-x-8">
                        <button onClick={() => {
                            if (decodeTrailCode(saveCodeInput, engineRef, LANDMARKS)) setGameState('travel');
                            else alert("Invalid Trail Code!");
                        }} className="text-4xl border-4 p-4 hover:bg-yellow-400 hover:text-black cursor-pointer">LOAD GAME</button>
                        <button onClick={() => setGameState('main_menu')} className="text-4xl border-4 p-4 hover:bg-red-500 cursor-pointer">BACK</button>
                    </div>
                </div>
            )}

            {/* --- PROFESSION & NAMING --- */}
            {gameState === 'profession' && (
                <div className="flex flex-col items-center justify-center h-full p-10 relative z-30 pointer-events-auto space-y-6">
                    <p className="text-4xl mb-8 text-[#0ff]">Choose your profession:</p>
                    <button onClick={() => { engineRef.current.money = 1600; setGameState('naming'); }} className="text-4xl hover:text-white text-gray-400 cursor-pointer">1. Banker ($1600)</button>
                    <button onClick={() => { engineRef.current.money = 800; setGameState('naming'); }} className="text-4xl hover:text-white text-gray-400 cursor-pointer">2. Carpenter ($800)</button>
                    <button onClick={() => { engineRef.current.money = 400; setGameState('naming'); }} className="text-4xl hover:text-white text-gray-400 cursor-pointer">3. Farmer ($400)</button>
                </div>
            )}

            {gameState === 'naming' && (
                <div className="flex flex-col items-center justify-center h-full relative z-30 pointer-events-auto">
                    <p className="text-4xl mb-8 text-[#0ff]">Name your party members:</p>
                    <div className="flex flex-col items-center space-y-4 mb-12">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center text-3xl">
                                <span className="mr-4 w-8 text-right text-gray-400">{i + 1}.</span>
                                <input id={`name${i}`} type="text" value={partyNames[i]} placeholder={["MERK", "MARY", "JOHN", "LUKE", "SARAH"][i]}
                                    onChange={(e) => handleNameInput(e, i)} 
                                    onKeyDown={(e) => { if(e.key === 'Enter') { let next = document.getElementById(`name${i+1}`); if(next) next.focus(); else confirmNames(); } }} 
                                    className="bg-transparent border-b-4 border-white text-white outline-none w-64 uppercase text-center focus:border-[#0ff] transition-colors" />
                            </div>
                        ))}
                    </div>
                    <button onClick={confirmNames} className="text-4xl border-4 p-4 hover:bg-white hover:text-black cursor-pointer">CONTINUE TO STORE</button>
                </div>
            )}

            {/* --- GENERAL STORE --- */}
            {gameState === 'store' && (
                <div className="absolute inset-0 bg-black p-12 relative z-30 pointer-events-auto">
                    <h2 className="text-6xl text-center text-[#0ff] mb-8 border-b-4 pb-4">MATT'S GENERAL STORE</h2>
                    <div className="grid grid-cols-2 gap-10 text-3xl">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center"><p>1. Oxen (Yoke) $40</p> <button onClick={()=>{engineRef.current.inventory.oxen+=2; engineRef.current.money-=40; setUiData({...uiData})}} className="border-2 px-4 hover:bg-white hover:text-black cursor-pointer">BUY</button></div>
                            <div className="flex justify-between items-center"><p>2. Food (20lb) $4</p> <button onClick={()=>{engineRef.current.inventory.food+=20; engineRef.current.money-=4; setUiData({...uiData})}} className="border-2 px-4 hover:bg-white hover:text-black cursor-pointer">BUY</button></div>
                            <div className="flex justify-between items-center"><p>3. Ammo (20bx) $2</p> <button onClick={()=>{engineRef.current.inventory.bullets+=20; engineRef.current.money-=2; setUiData({...uiData})}} className="border-2 px-4 hover:bg-white hover:text-black cursor-pointer">BUY</button></div>
                            <div className="flex justify-between items-center"><p>4. Clothes (Set) $10</p> <button onClick={()=>{engineRef.current.inventory.clothing+=1; engineRef.current.money-=10; setUiData({...uiData})}} className="border-2 px-4 hover:bg-white hover:text-black cursor-pointer">BUY</button></div>
                            <div className="flex justify-between items-center"><p>5. Spare Wheel $10</p> <button onClick={()=>{engineRef.current.inventory.wheels+=1; engineRef.current.money-=10; setUiData({...uiData})}} className="border-2 px-4 hover:bg-white hover:text-black cursor-pointer">BUY</button></div>
                        </div>
                        <div className="border-4 border-white p-6 bg-[#00A]">
                            <p className="text-[#ff0] text-4xl mb-6 text-center border-b-2 pb-2">YOUR SUPPLIES</p>
                            <div className="grid grid-cols-2 gap-4">
                                <p>Cash: ${engineRef.current.money}</p><p>Oxen: {engineRef.current.inventory.oxen}</p>
                                <p>Food: {Math.floor(engineRef.current.inventory.food)}</p><p>Ammo: {engineRef.current.inventory.bullets}</p>
                                <p>Clothes: {engineRef.current.inventory.clothing}</p><p>Wheels: {engineRef.current.inventory.wheels}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={startTravel} className="absolute bottom-12 right-12 text-5xl border-4 border-[#0ff] text-[#0ff] p-6 hover:bg-[#0ff] hover:text-black cursor-pointer animate-pulse">START TRAIL</button>
                </div>
            )}

            <TrailCanvas gameState={gameState} engineRef={engineRef} keysRef={keysRef} onTravelTick={onTravelTick} />

            {/* --- TRAVEL HUD --- */}
            {gameState === 'travel' && (
                <div className="absolute bottom-0 w-full bg-black border-t-4 border-white p-6 text-3xl grid grid-cols-2 gap-4 z-20">
                    <div>
                        <p className="text-[#0ff]">Date: {MONTHS[engineRef.current.month]} {engineRef.current.day}, {engineRef.current.year}</p>
                        <p>Weather: {engineRef.current.weather}</p>
                        <p>Health: {engineRef.current.party.some(p => p.health < 40) ? 'Poor' : (engineRef.current.party.some(p => p.health < 70) ? 'Fair' : 'Good')}</p>
                    </div>
                    <div>
                        <p className="text-[#ff0]">Next: {engineRef.current.nextLandmarkObj?.name} ({Math.max(0, Math.floor((engineRef.current.nextLandmarkObj?.distance || 0) - engineRef.current.distance))} mi)</p>
                        <p>Food: {Math.floor(engineRef.current.inventory.food)} lbs</p>
                        <p className="text-gray-400 mt-2 animate-pulse">Press [ENTER] to Camp / Menu</p>
                    </div>
                </div>
            )}

            {/* --- CAMP MENU --- */}
            {gameState === 'camp_menu' && (
                <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center p-10 z-30 pointer-events-auto">
                    <div className="bg-black border-4 border-white p-10 w-[600px] flex flex-col space-y-6">
                        <h2 className="text-5xl text-center text-yellow-400 mb-4 border-b-2 pb-2">CAMP MENU</h2>
                        <button onClick={() => setGameState('travel')} className="text-3xl text-left hover:text-[#0ff] cursor-pointer">1. Continue Trail</button>
                        <button onClick={() => setGameState('hunting')} className="text-3xl text-left hover:text-[#0ff] cursor-pointer">2. Go Hunting</button>
                        <button onClick={() => {
                            engineRef.current.pace = (engineRef.current.pace + 1) % 4;
                            setUiData({...uiData});
                        }} className="text-3xl text-left hover:text-[#0ff] cursor-pointer">3. Change Pace (Current: {PACES[engineRef.current.pace]})</button>
                        <button onClick={() => {
                            engineRef.current.rations = (engineRef.current.rations + 1) % 3;
                            setUiData({...uiData});
                        }} className="text-3xl text-left hover:text-[#0ff] cursor-pointer">4. Change Rations (Current: {RATIONS[engineRef.current.rations]})</button>
                        <button onClick={() => setGameState('save_display')} className="text-3xl text-left hover:text-green-400 cursor-pointer mt-8">5. GET SAVE CODE</button>
                    </div>
                </div>
            )}

            {/* --- SAVE CODE DISPLAY --- */}
            {gameState === 'save_display' && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 pointer-events-auto">
                    <h2 className="text-6xl text-green-400 mb-8">YOUR TRAIL CODE</h2>
                    <p className="text-2xl mb-8">Write this code down or copy it. You can enter it on the Main Menu to resume exactly here.</p>
                    <div className="bg-gray-900 border-4 border-green-400 p-8 text-4xl mb-12 select-all max-w-[800px] break-all text-center">
                        {generateTrailCode(engineRef.current)}
                    </div>
                    <button onClick={() => setGameState('camp_menu')} className="text-4xl border-4 p-4 hover:bg-white hover:text-black cursor-pointer">RETURN TO CAMP</button>
                </div>
            )}

            {/* --- EVENTS & LANDMARKS --- */}
            {gameState === 'event' && (
                <div className="absolute inset-0 bg-blue-900 bg-opacity-90 flex items-center justify-center p-20 z-40 pointer-events-auto">
                    <div className="border-4 border-white bg-black p-10 text-4xl max-w-4xl w-full">
                        <p className="mb-10 leading-relaxed">{uiData.pages?.[uiData.pageIdx]}</p>
                        {(!uiData.isResolution && uiData.pageIdx === (uiData.pages?.length - 1)) ? (
                            <div className="space-y-4">
                                {uiData.event?.choices?.map((c, i) => (
                                    <button key={i} onClick={() => handleChoice(c)} className="block w-full text-left p-4 border-2 border-transparent hover:border-white hover:bg-gray-800 cursor-pointer">
                                        {i+1}. {c.text}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-cyan-400 animate-pulse text-right">-- PRESS ENTER --</p>
                        )}
                    </div>
                </div>
            )}

            {gameState === 'landmark' && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-20 text-center z-40 pointer-events-auto">
                    <h1 className="text-8xl text-[#0ff] mb-6 drop-shadow-lg">{uiData.landmark?.name}</h1>
                    <p className="text-4xl mb-12 max-w-3xl leading-relaxed text-gray-300">{uiData.landmark?.description}</p>
                    <div className="flex space-x-8">
                        <button onClick={() => setGameState('travel')} className="text-4xl border-4 p-6 hover:bg-white hover:text-black cursor-pointer">CONTINUE TRAIL</button>
                        {uiData.landmark?.type === 'fort' && <button onClick={() => setGameState('store')} className="text-4xl border-4 border-[#0f0] p-6 hover:bg-[#0f0] hover:text-black cursor-pointer">ENTER FORT STORE</button>}
                        {uiData.landmark?.type === 'river' && <button onClick={() => setGameState('river_float')} className="text-4xl border-4 border-[#f0f] p-6 hover:bg-[#f0f] hover:text-white cursor-pointer">CROSS THE RIVER</button>}
                    </div>
                </div>
            )}

            {/* --- MINIGAME INJECTIONS --- */}
            {gameState === 'hunting' && (
                <HuntingMiniGame 
                    engineRef={engineRef} keysRef={keysRef}
                    onHuntingEnd={(meat) => {
                        engineRef.current.inventory.food += meat;
                        setGameState('travel');
                    }}
                    playShootSound={() => playSfx('shoot')}
                    playHitSound={() => playSfx('hit')}
                />
            )}

            {gameState === 'river_float' && (
                <RiverMiniGame 
                    engineRef={engineRef} keysRef={keysRef}
                    onRiverEnd={(success) => {
                        if (success) {
                            engineRef.current.distance += 1; 
                            setGameState('travel');
                        } else {
                            setGameState('gameover'); 
                        }
                    }}
                    playSplashSound={() => playSfx('splash')}
                />
            )}

            {/* --- GAME OVER --- */}
            {gameState === 'gameover' && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 pointer-events-auto">
                    <h1 className="text-9xl text-red-600 mb-8 animate-pulse">YOU HAVE DIED</h1>
                    <p className="text-4xl mb-12">Distance traveled: {Math.floor(engineRef.current.distance)} miles</p>
                    <button onClick={() => setGameState('main_menu')} className="text-5xl border-4 border-red-600 text-red-600 p-6 hover:bg-red-600 hover:text-black cursor-pointer">RETURN TO MENU</button>
                </div>
            )}
        </div>
    );
}
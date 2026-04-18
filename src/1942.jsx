import React, { useEffect, useRef, useState } from 'react';

export default function Game1942({ audioCtx, onMenu }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("INITIALIZING SYS...");

  useEffect(() => {
    // 1. Define the Emscripten Module BEFORE loading the script
    window.Module = {
      preRun: [],
      postRun: [],
      // Point the WASM engine directly to our React canvas
      canvas: canvasRef.current,
      
      // Tell the engine to look in the /1942/ folder for the heavy binary files
      locateFile: (path) => {
        return '/1942/' + path;
      },
      
      // Loading UI Callbacks
      setStatus: (text) => {
        if (!text) text = "SYSTEM READY";
        setStatus(text);
      },
      print: (text) => console.log("1942:", text),
      printErr: (text) => console.error("1942 ERROR:", text),
      
      // Fired when the game is fully loaded and running
      onRuntimeInitialized: () => {
         setStatus(""); // Clear loading text
      }
    };

    // 2. Dynamically inject the game.js glue code
    const script = document.createElement('script');
    script.src = '/1942/game.js';
    script.async = true;
    document.body.appendChild(script);

    // 3. Listen for the 'M' key to exit back to the main menu
    const handleKeyDown = (e) => {
       if (e.key.toLowerCase() === 'm') {
          // Pause Emscripten's main loop if possible before exiting
          if (window.Module.pauseMainLoop) window.Module.pauseMainLoop();
          onMenu();
       }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup when leaving the game
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (document.body.contains(script)) document.body.removeChild(script);
      
      // Emscripten doesn't garbage collect easily, so we wipe the module
      delete window.Module; 
    };
  }, [onMenu]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black pointer-events-auto">
      
      {/* Loading Screen Overlay */}
      {status && (
         <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black bg-opacity-90">
            <h2 className="text-[#0f0] text-3xl font-['VT323'] blink-text">{status}</h2>
         </div>
      )}

      {/* The Game Canvas */}
      <canvas 
        ref={canvasRef} 
        id="canvas" 
        onContextMenu={(e) => e.preventDefault()} 
        className="w-full h-full object-contain cursor-none"
        style={{ imageRendering: 'pixelated' }} // Keeps the 1942 pixel art sharp
      />
      
      {/* Menu Instruction Overlay */}
      {!status && (
          <div className="absolute top-4 right-4 z-30 opacity-50">
              <p className="text-white text-xl font-['VT323']">PRESS M FOR MENU</p>
          </div>
      )}
    </div>
  );
}
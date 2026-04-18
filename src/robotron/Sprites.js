// src/robotron/Sprites.js

export class RobotronSprites {
    constructor() {
        this.cache = {};
        this.scale = 4.0; // Scaled up for 1080p Fullscreen Glory
    }

    // Loads automatically during the boot sequence in index.jsx
    loadAssets() {
        this.initialize();
        return Promise.resolve();
    }

    initialize() {
        // --- 1. THE HERO (White visor, blue body) ---
        this.cache.player = [
            this.forgePixelArt([
                "....BB....",
                "....BB....",
                "...WWWW...",
                "..WW..WW..",
                "..WWWWWW..",
                "....BB....",
                "...BBBB...",
                "..BB..BB..",
                ".BB....BB."
            ], { 'B': '#0000ff', 'W': '#ffffff' }),
            this.forgePixelArt([
                "....BB....",
                "....BB....",
                "...WWWW...",
                "..WW..WW..",
                "..WWWWWW..",
                "....BB....",
                "...BBBB...",
                "....BB....",
                "...BBBB..."
            ], { 'B': '#0000ff', 'W': '#ffffff' })
        ];

        // --- 2. THE GRUNT (Red/Orange hunchback swarm) ---
        this.cache.grunt = [
            this.forgePixelArt([
                "...RRRR...",
                "..RRRRRR..",
                "..ROOOOR..",
                ".RRROORRR.",
                ".RR....RR.",
                ".RR....RR.",
                "..R....R.."
            ], { 'R': '#ff0000', 'O': '#ffaa00' }),
            this.forgePixelArt([
                "...RRRR...",
                "..RRRRRR..",
                "..ROOOOR..",
                ".RRROORRR.",
                "...RRRR...",
                "..RR..RR..",
                ".RR....RR."
            ], { 'R': '#ff0000', 'O': '#ffaa00' })
        ];

        // --- 3. THE HULK (Indestructible Green/Yellow Juggernaut) ---
        this.cache.hulk = [
            this.forgePixelArt([
                "...GGGG...",
                "..GGGGGG..",
                ".GGYYYYGG.",
                ".GGYYYYGG.",
                ".GGGGGGGG.",
                "..GG..GG..",
                ".GG....GG.",
                "GG......GG"
            ], { 'G': '#00ff00', 'Y': '#ffff00' }),
            this.forgePixelArt([
                "...GGGG...",
                "..GGGGGG..",
                ".GGYYYYGG.",
                ".GGYYYYGG.",
                ".GGGGGGGG.",
                "...GGGG...",
                "..GG..GG..",
                ".GG....GG."
            ], { 'G': '#00ff00', 'Y': '#ffff00' })
        ];

        // --- 4. THE BRAIN (Magenta cranium, hunting humans) ---
        this.cache.brain = [
            this.forgePixelArt([
                "..MMMMMM..",
                ".MMMMMMMM.",
                "MMBBBBBBMM",
                "MMMMMMMMMM",
                "MMMMMMMMMM",
                "..MM..MM..",
                ".MM....MM."
            ], { 'M': '#ff00ff', 'B': '#0000ff' }),
            this.forgePixelArt([ // Mouth moving animation
                "..MMMMMM..",
                ".MMMMMMMM.",
                "MMBBBBBBMM",
                "MMMMMMMMMM",
                "MMMMMMMMMM",
                "..MMMMMM..",
                ".MM....MM."
            ], { 'M': '#ff00ff', 'B': '#0000ff' })
        ];

        // --- 5. THE HUMAN (Frantic pink victims) ---
        this.cache.human = [
            this.forgePixelArt([
                "....PP....",
                "...PPPP...",
                "....PP....",
                "...PPPP...",
                "..PP..PP..",
                ".PP....PP.",
                "PP......PP"
            ], { 'P': '#ff66b2' }),
            this.forgePixelArt([
                "....PP....",
                "...PPPP...",
                "....PP....",
                "...PPPP...",
                "....PP....",
                "...PPPP...",
                "..PP..PP.."
            ], { 'P': '#ff66b2' })
        ];

        // --- 6. THE ENFORCER (Sleek, hovering cyan turret) ---
        this.cache.enforcer = [
            this.forgePixelArt([
                "...CCCC...",
                "..CCCCCC..",
                ".CC.CC.CC.",
                ".CCCCCCCC.",
                "..........",
                ".CC....CC.",
                "C........C"
            ], { 'C': '#00ffff' }),
            this.forgePixelArt([
                "...CCCC...",
                "..CCCCCC..",
                ".CC.CC.CC.",
                ".CCCCCCCC.",
                "...C..C...",
                "..C....C..",
                ".C......C."
            ], { 'C': '#00ffff' })
        ];

        // --- 7. THE ELECTRODE (Static, menacing obstacles) ---
        this.cache.electrode = [
            this.forgePixelArt([
                "...YYY...",
                "....Y....",
                "..YYYYY..",
                ".YY...YY.",
                "YYYYYYYYY",
                ".YY...YY.",
                "..YYYYY..",
                "....Y....",
                "...YYY..."
            ], { 'Y': '#ffff00' }),
            this.forgePixelArt([ // Pulses inward
                ".........",
                "...YYY...",
                "...YYY...",
                "..YYYYY..",
                "..YYYYY..",
                "..YYYYY..",
                "...YYY...",
                "...YYY...",
                "........."
            ], { 'Y': '#ffff00' })
        ];

        // --- 8. THE SPARK (Spinning homing crosshairs) ---
        this.cache.spark = [
            this.forgePixelArt([
                "....Y....",
                "....Y....",
                "YYYYYYYYY",
                "....Y....",
                "....Y...."
            ], { 'Y': '#ffff00' }),
            this.forgePixelArt([
                "Y.......Y",
                ".Y.....Y.",
                "..Y...Y..",
                "...Y.Y...",
                "....Y....",
                "...Y.Y...",
                "..Y...Y..",
                ".Y.....Y.",
                "Y.......Y"
            ], { 'Y': '#ffff00' })
        ];

        // --- STROBE ENTITIES (Progs and Spheroids change colors rapidly) ---
        const progMatrix = [
            "..........",
            "..XXXXXX..",
            ".XX.XX.XX.",
            ".XXXXXXXX.",
            "..XX..XX..",
            ".........."
        ];
        this.cache.prog_red = [this.forgePixelArt(progMatrix, { 'X': '#ff0000' })];
        this.cache.prog_cyan = [this.forgePixelArt(progMatrix, { 'X': '#00ffff' })];

        const spheroidMatrix = [
            "...XXXX...",
            "..XXXXXX..",
            ".XXXXXXXX.",
            ".XXXXXXXX.",
            "..XXXXXX..",
            "...XXXX..."
        ];
        this.cache.spheroid_red = [this.forgePixelArt(spheroidMatrix, { 'X': '#ff0000' })];
        this.cache.spheroid_white = [this.forgePixelArt(spheroidMatrix, { 'X': '#ffffff' })];
        this.cache.spheroid_blue = [this.forgePixelArt(spheroidMatrix, { 'X': '#0000ff' })];

        console.log("ROBOTRON VRAM: 100% CRT Phosphor Assets Forged.");
    }

    // --- THE CRT BLOOM FORGE ---
    forgePixelArt(pattern, palette) {
        const h = pattern.length; 
        const w = pattern[0].length;
        
        const canvas = document.createElement('canvas');
        // We add padding to the canvas so the glowing "shadow blur" doesn't get clipped at the edges
        const padding = 12; 
        canvas.width = (w * this.scale) + (padding * 2); 
        canvas.height = (h * this.scale) + (padding * 2);
        
        const ctx = canvas.getContext('2d');

        // Pass 1: The Core Pixels (Solid, bright center)
        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                let char = pattern[r][c];
                if (char !== '.') {
                    ctx.fillStyle = palette[char];
                    
                    // CRT PHOSPHOR GLOW EFFECT
                    // By applying a heavy shadow blur of the EXACT same color as the pixel,
                    // it simulates the high-voltage bleed of a 1982 arcade monitor!
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = palette[char];
                    
                    ctx.fillRect(
                        padding + (c * this.scale), 
                        padding + (r * this.scale), 
                        this.scale + 0.5, // The +0.5 prevents rendering gaps between pixels
                        this.scale + 0.5
                    );
                }
            }
        }
        
        // Pass 2: The Hot Core (Makes the very center of the pixel look white-hot)
        ctx.shadowBlur = 0; // Turn off glow for the hot core
        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                let char = pattern[r][c];
                if (char !== '.') {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Semi-transparent white
                    ctx.fillRect(
                        padding + (c * this.scale) + (this.scale * 0.25), 
                        padding + (r * this.scale) + (this.scale * 0.25), 
                        this.scale * 0.5, 
                        this.scale * 0.5
                    );
                }
            }
        }

        return canvas;
    }

    // --- MASTER DRAW ROUTINE ---
    draw(ctx, name, x, y, tick = 0) {
        // 1. Handle Strobe/Flashing Entities (Prog & Spheroid)
        if (name === 'prog') {
            // Swaps between red and cyan every 3 frames
            name = (Math.floor(tick / 3) % 2 === 0) ? 'prog_red' : 'prog_cyan';
        }
        if (name === 'spheroid') {
            // Rapidly cycles Red -> White -> Blue
            const colors = ['spheroid_red', 'spheroid_white', 'spheroid_blue'];
            name = colors[Math.floor(tick / 4) % 3];
        }

        // 2. Fetch the animation array
        const frames = this.cache[name] || this.cache['grunt'];
        
        // 3. Determine the current frame based on time
        // Sparks spin violently fast (every 2 ticks). Everything else walks normally (every 8 ticks).
        let animationSpeed = (name === 'spark') ? 2 : 8;
        const frameIndex = Math.floor(tick / animationSpeed) % frames.length;
        const img = frames[frameIndex];

        // 4. Draw it perfectly centered on its hitbox coordinates
        ctx.drawImage(img, x - img.width/2, y - img.height/2);
    }
}
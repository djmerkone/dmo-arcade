// src/robotron/Sprites.js

export class RobotronSprites {
    constructor() {
        this.cache = {};
        this.scale = 3; 
    }

    initialize() {
        // Player (White visor, blue body)
        this.cache.player = this.forgePixelArt([
            ".......",
            "..WWW..",
            "..W.W..",
            ".WWWWW.",
            "...B...",
            "..BBB..",
            ".B.B.B.",
            ".B...B.",
            "......."
        ], { 'B': '#0000ff', 'W': '#ffffff' });

        // Grunt (Red/Orange boxy frame)
        this.cache.grunt = this.forgePixelArt([
            ".......",
            ".RRRRR.",
            ".ROOOR.",
            "RROOORR",
            "RR...RR",
            "RR...RR",
            "......."
        ], { 'R': '#ff0000', 'O': '#ffaa00' });

        // Hulk (Indestructible Green/Yellow)
        this.cache.hulk = this.forgePixelArt([
            ".......",
            "..GGG..",
            ".GGGGG.",
            "GGYGYGG",
            "GGGGGGG",
            ".G...G.",
            ".GG.GG.",
            "......."
        ], { 'G': '#00ff00', 'Y': '#ffff00' });

        // Brain (Magenta head, blue eyes)
        this.cache.brain = this.forgePixelArt([
            ".MMMMM.",
            "MBBBBBM",
            "MBMMMBM",
            "MBBBBBM",
            ".MMMMM.",
            "..M.M..",
            ".MM.MM."
        ], { 'M': '#ff00ff', 'B': '#0000ff' });

        // Electrode (Yellow plus)
        this.cache.electrode = this.forgePixelArt([
            "...Y...",
            "..YYY..",
            ".YYYYY.",
            "YYYYYYY",
            ".YYYYY.",
            "..YYY..",
            "...Y..."
        ], { 'Y': '#ffff00' });

        // Human (Pink)
        this.cache.human = this.forgePixelArt([
            "..PPP..",
            ".PPPPP.",
            "...P...",
            "..PPP..",
            ".P.P.P.",
            ".P...P."
        ], { 'P': '#ff66b2' });
        
        console.log("Foundry Assets Generated.");
    }

    forgePixelArt(pattern, palette) {
        const h = pattern.length; const w = pattern[0].length;
        const canvas = document.createElement('canvas');
        canvas.width = w * this.scale; canvas.height = h * this.scale;
        const ctx = canvas.getContext('2d');
        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                let char = pattern[r][c];
                if (char !== '.') {
                    ctx.fillStyle = palette[char];
                    ctx.fillRect(c * this.scale, r * this.scale, this.scale, this.scale);
                }
            }
        }
        return canvas;
    }

    loadAssets() {
        this.initialize();
        return Promise.resolve();
    }

    draw(ctx, name, x, y, tick = 0) {
        const img = this.cache[name] || this.cache['grunt'];
        // Wobbly animation for movement
        let offset = (Math.floor(tick / 8) % 2 === 0) ? 2 : -2;
        if (name === 'electrode' || name === 'bullet') offset = 0;
        
        ctx.drawImage(img, x - img.width/2, y - img.height/2 + offset);
    }
}
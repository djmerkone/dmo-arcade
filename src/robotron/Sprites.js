// src/robotron/Sprites.js

export class RobotronSprites {
    constructor() {
        this.cache = {};
        this.scale = 3; 
    }

    initialize() {
        // Player (Blue/White)
        this.cache.player = this.forgePixelArt([
            ".B..B.", ".BBBB.", ".WWWW.", "BBBBBB", ".B..B.", ".B..B."
        ], { 'B': '#0000ff', 'W': '#ffffff' });

        // Grunt (Neon Red/Orange)
        this.cache.gruntA = this.forgePixelArt([
            ".RRRR.", "RRRRRR", "ROOOOR", "ROOOOR", ".R..R."
        ], { 'R': '#ff0000', 'O': '#ffaa00' });
        this.cache.gruntB = this.forgePixelArt([
            ".RRRR.", "RRRRRR", "ROOOOR", "ROOOOR", "R....R"
        ], { 'R': '#ff0000', 'O': '#ffaa00' });

        // Hulk (Indestructible Green/Yellow)
        this.cache.hulkA = this.forgePixelArt([
            ".GGGG.", "GGGGGG", "GYYYYG", "GGGGGG", ".G..G.", "GG..GG"
        ], { 'G': '#00ff00', 'Y': '#ffff00' });
        this.cache.hulkB = this.forgePixelArt([
            ".GGGG.", "GGGGGG", "GYYYYG", "GGGGGG", ".G..G.", ".G..G."
        ], { 'G': '#00ff00', 'Y': '#ffff00' });

        // Human (Pink/Blue)
        this.cache.human = this.forgePixelArt([
            "..PP..", ".PPPP.", "..PP..", ".BBBB.", "..BB..", ".P..P."
        ], { 'P': '#ff66b2', 'B': '#00ffff' });

        // Prog (Reprogrammed Human - Flashing Red)
        this.cache.prog = this.forgePixelArt([
            "..RR..", ".RRRR.", "..RR..", ".RRRR.", "..RR..", ".R..R."
        ], { 'R': '#ff0000' });

        // Brain (Hunts Humans - Magenta/Blue)
        this.cache.brain = this.forgePixelArt([
            ".MMMM.", "MBBBBM", "MBMMBM", "MBBBBM", "MMMMMM", "M.MM.M"
        ], { 'M': '#ff00ff', 'B': '#0000ff' });

        // Spheroid (Spawns Enforcers - Red circle)
        this.cache.spheroid = this.forgePixelArt([
            "..RR..", ".RRRR.", "RRRRRR", ".RRRR.", "..RR.."
        ], { 'R': '#ff0000' });

        // Enforcer (Cyan floating shooter)
        this.cache.enforcer = this.forgePixelArt([
            "..CC..", ".CCCC.", "CCCCCC", "CC..CC", "C....C"
        ], { 'C': '#00ffff' });

        // Spark (Enforcer's guided projectile - Yellow cross)
        this.cache.spark = this.forgePixelArt([
            ".Y.", "YYY", ".Y."
        ], { 'Y': '#ffff00' });

        // Electrode (Obstacle)
        this.cache.electrode = this.forgePixelArt([
            ".Y..Y.", "..YY..", "YYYYYY", "..YY..", ".Y..Y."
        ], { 'Y': '#ffff00' });

        console.log("Robotron ROM Assets: ALL CHIPS COMPILED.");
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
                    ctx.fillStyle = palette[char] || '#fff';
                    ctx.fillRect(c * this.scale, r * this.scale, this.scale + 0.5, this.scale + 0.5);
                }
            }
        }
        return canvas;
    }

    get(name, tick = 0) {
        if (name === 'grunt') return (Math.floor(tick / 10) % 2 === 0) ? this.cache.gruntA : this.cache.gruntB;
        if (name === 'hulk') return (Math.floor(tick / 15) % 2 === 0) ? this.cache.hulkA : this.cache.hulkB;
        return this.cache[name] || this.cache.gruntA;
    }
}
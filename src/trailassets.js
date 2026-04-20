// src/trailassets.js

/**
 * THE FRONTIER VISUAL ENGINE (MEGA ULTRA EPIC 2026 EDITION)
 * Features Parallax Scrolling, Weather Particle Systems, 
 * Dynamic Celestial Bodies, and Biome Morphing.
 */

const PALETTE = {
    ' ': null,           // Transparent
    'K': '#000000',      // Black
    'B': '#0000AA',      // Blue
    'G': '#00AA00',      // Green
    'C': '#00AAAA',      // Cyan
    'R': '#AA0000',      // Red
    'M': '#AA00AA',      // Magenta
    'O': '#8B4513',      // Dark Brown / Bark
    'o': '#A0522D',      // Sienna / Dirt
    'w': '#AAAAAA',      // Light Gray
    'D': '#555555',      // Dark Gray
    'b': '#5555FF',      // Bright Blue
    'g': '#55FF55',      // Bright Green
    'c': '#55FFFF',      // Bright Cyan
    'r': '#FF5555',      // Bright Red
    'm': '#FF55FF',      // Bright Magenta
    'Y': '#FFFF55',      // Yellow
    'W': '#FFFFFF'       // White
};

const SPRITES = {
    // --- DYNAMIC WAGON STATES ---
    wagon_clean: [
        "       WWWWWWWWWWWWWWWWWW         ",
        "     WWWWWWWWWWWWWWWWWWWWWW       ",
        "   WWWWWWWWWWWWWWWWWWWWWWWWWW     ",
        "  WWWWWWWWWWWWWWWWWWWWWWWWWWWW    ",
        "  WWWWWWWWWWWWWWWWWWWWWWWWWWWW    ",
        " WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW   ",
        " WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW   ",
        " WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW   ",
        "  WWWWWWWWWWWWWWWWWWWWWWWWWWWW    ",
        "     OOOOOOOOOOOOOOOOOOOOOO       ",
        "   OOOOOOOOOOOOOOOOOOOOOOOOOO     ",
        "    KKOOOOOOOOOOOOOOOOOOOOKK      ",
        "      OOOOOOOOOOOOOOOOOOOO        "
    ],
    wagon_damaged: [
        "       W W  WWWWWWWWWWWWWW        ",
        "     WWWW  W  WWWWWWWW  WWWW      ",
        "   WW WWWWWWWWWWWWWW  WWWWWW      ",
        "  WWWWWWWWWWWWWWWWWWWWWWWWWWWW    ",
        "  WW  WWWWWWWWWWWWWWWWWWWWWWWW    ",
        " WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW   ",
        " WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW   ",
        "  WWWWWWWWWWWWWWWWWWWWWWWWWWWW    ",
        "     DDDDDDDDDDDDDDDDDDDDDD       ",
        "   DDDDDDDDDDDDDDDDDDDDDDDDDD     ",
        "    KKDDDDDDDDDDDDDDDDDDDDKK      ",
        "      DDDDDDDDDDDDDDDDDDDD        "
    ],

    // --- OXEN (ANIMATED) ---
    ox_1: [
        "           W        W           ",
        "          OOW      WOO          ",
        "          OOOOOOOOOOOO          ",
        "         OOOOOOOOOOOOOO         ",
        " KK      OOOOOOOOOOOOOO         ",
        "K  K    OOOOOOOOOOOOOOOO        ",
        "K  K   OOOOOOOOOOOOOOOOOO       ",
        " KK    OOOOOOOOOOOOOOOOOO       ",
        "       OOOOOOOOOOOOOOOOOO       ",
        "        OO  OO    OO  OO        ",
        "       KK    KK  KK    KK       "
    ],
    ox_2: [
        "           W        W           ",
        "          OOW      WOO          ",
        "          OOOOOOOOOOOO          ",
        "         OOOOOOOOOOOOOO         ",
        " KK      OOOOOOOOOOOOOO         ",
        "K  K    OOOOOOOOOOOOOOOO        ",
        "K  K   OOOOOOOOOOOOOOOOOO       ",
        " KK    OOOOOOOOOOOOOOOOOO       ",
        "       OOOOOOOOOOOOOOOOOO       ",
        "         OOOO      OOOO         ",
        "         KKKK      KKKK         "
    ],

    // --- HUNTING ECOSYSTEM (MEGA EXPANSION) ---
    buffalo_1: [
        "       OOOOO                ",
        "     OOOOOOOOO              ",
        "    OOOOOOOOOOOO            ",
        "   OOOOOOOOOOOOOO           ",
        "  OOOOOOOOOOOOOOOO          ",
        " KK OOOOOOOOOOOOOOO         ",
        "    OOOOOOOOOOOOOOOOO   O   ",
        "     OOOOOOOOOOOOOOOOOOOOO  ",
        "      OO  OO      OO  OO    ",
        "     KK    KK    KK    KK   "
    ],
    buffalo_2: [
        "       OOOOO                ",
        "     OOOOOOOOO              ",
        "    OOOOOOOOOOOO            ",
        "   OOOOOOOOOOOOOO           ",
        "  OOOOOOOOOOOOOOOO          ",
        " KK OOOOOOOOOOOOOOO         ",
        "    OOOOOOOOOOOOOOOOO   O   ",
        "     OOOOOOOOOOOOOOOOOOOOO  ",
        "       OOOO        OOOO     ",
        "       KKKK        KKKK     "
    ],
    bear_1: [
        "     OOOOOOO      ",
        "   OOOOOOOOOOO    ",
        " KK OOOOOOOOOOO   ",
        "    OOOOOOOOOOOO  ",
        "    OO OO  OO OO  ",
        "    KK KK  KK KK  "
    ],
    bear_2: [
        "     OOOOOOO      ",
        "   OOOOOOOOOOO    ",
        " KK OOOOOOOOOOO   ",
        "    OOOOOOOOOOOO  ",
        "     OOOO  OOOO   ",
        "     KKKK  KKKK   "
    ],
    deer_1: [
        "  O         ",
        " OOO        ",
        "  OO OOOOO  ",
        "   OOOOOOOO ",
        "   O O  O O ",
        "   K K  K K "
    ],
    deer_2: [
        "  O         ",
        " OOO        ",
        "  OO OOOOO  ",
        "   OOOOOOOO ",
        "    OO   OO ",
        "    KK   KK "
    ],
    rabbit_1: [
        "  W   ",
        " WWW  ",
        " WWWW ",
        " WWWW "
    ],
    rabbit_2: [
        "   W  ",
        "  WWW ",
        " WWWW ",
        " WWWW "
    ],
    fox_1: [
        "  Y     ",
        " YY YYYW",
        " YYYYYY ",
        " Y Y Y  "
    ],
    fox_2: [
        "  Y     ",
        " YY YYYW",
        " YYYYYY ",
        "  YY YY "
    ],
    turkey_1: [
        "  OOOO  ",
        " ROOOO  ",
        "  OOOO  ",
        "   OO   "
    ],
    turkey_2: [
        "  OOOO  ",
        "  OOOOR ",
        "  OOOO  ",
        "   OO   "
    ],
    squirrel_1: [
        " OO ",
        " OOO",
        " OO "
    ],
    squirrel_2: [
        " OO ",
        " OOO",
        "  O "
    ],

    // --- BIOME SCATTER ---
    cactus: [
        "   G    ",
        "   G    ",
        " G G G  ",
        " GGGGG  ",
        "   G    ",
        "   G    "
    ],
    pine: [
        "    G    ",
        "   GGG   ",
        "  GGGGG  ",
        " GGGGGGG ",
        "    O    "
    ],
    skull: [
        "  WWW  ",
        " WKWKW ",
        "  WWW  ",
        "  W W  "
    ],
    flower: [
        "  Y  ",
        " YmY ",
        "  Y  ",
        "  G  "
    ],

    // --- UI ---
    hunter: [
        "    WWWW    ",
        "   W    W   ",
        "  W  KK  W  ",
        "  W  KK  W  ",
        "   W    W   ",
        "    WWWW    "
    ]
};

const TrailGraphics = {
    drawSprite: (ctx, sprite, x, y, pixelSize = 2, flip = false) => {
        if (!sprite) return;
        ctx.save();
        ctx.translate(x, y);
        if (flip) { ctx.scale(-1, 1); ctx.translate(-sprite[0].length * pixelSize, 0); }

        for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
                const color = PALETTE[sprite[row][col]];
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
                }
            }
        }
        ctx.restore();
    },

    /**
     * DRAW LANDSCAPE: The Master Environment Renderer
     */
    drawLandscape: (ctx, width, height, tick, distance, weather) => {
        // --- 1. DETERMINE BIOME FROM DISTANCE ---
        let biome = "plains";
        if (distance > 350 && distance < 640) biome = "desert";
        else if (distance >= 640 && distance < 980) biome = "mountains";
        else if (distance >= 980 && distance < 1198) biome = "desert";
        else if (distance >= 1198 && distance < 1417) biome = "valley";
        else if (distance >= 1417 && distance < 1720) biome = "desert";
        else if (distance >= 1720) biome = "mountains";

        // --- 2. DYNAMIC SKY & TIME OF DAY ---
        const timeOfDay = tick % 180; // 180 ticks = 1 full day cycle
        let skyTop, skyBottom;

        if (timeOfDay < 30) { // DAWN
            skyTop = '#2c3e50'; skyBottom = '#fd746c';
        } else if (timeOfDay < 110) { // DAY
            skyTop = weather === 'Rainy' || weather === 'Thunderstorm' ? '#445566' : '#00AAAA';
            skyBottom = weather === 'Rainy' || weather === 'Thunderstorm' ? '#778899' : '#55FFFF';
            if (weather === 'Blizzard') { skyTop = '#DDDDDD'; skyBottom = '#FFFFFF'; }
        } else if (timeOfDay < 140) { // DUSK
            skyTop = '#4B0082'; skyBottom = '#FF4500';
        } else { // NIGHT
            skyTop = '#000005'; skyBottom = '#000022';
        }

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, skyTop);
        grad.addColorStop(0.7, skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // --- 3. CELESTIAL BODIES (Sun / Moon) ---
        // Arc across the sky based on timeOfDay
        let cx = (timeOfDay / 180) * width;
        let cy = height * 0.5 - Math.sin((timeOfDay / 180) * Math.PI) * 200;
        
        if (timeOfDay > 20 && timeOfDay < 150) {
            // SUN
            ctx.fillStyle = weather.includes('Rain') || weather === 'Blizzard' ? 'rgba(255,255,200,0.1)' : '#FFD700';
            ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI*2); ctx.fill();
        } else {
            // MOON
            ctx.fillStyle = '#DDDDDD';
            ctx.beginPath(); ctx.arc((cx + width/2)%width, cy, 20, 0, Math.PI*2); ctx.fill();
            // Stars
            ctx.fillStyle = '#FFF';
            for(let i=0; i<40; i++) {
                let sx = (i * 12345) % width; let sy = (i * 67890) % (height * 0.6);
                if (Math.random() > 0.1) ctx.fillRect(sx, sy, 2, 2); // Twinkle
            }
        }

        // --- 4. PARALLAX MOUNTAINS ---
        // Mountains change color based on biome/weather
        let mtnColor = biome === 'desert' ? '#A0522D' : '#2F4F4F';
        if (weather === 'Blizzard' || weather === 'Snowing') mtnColor = '#B0C4DE';

        ctx.fillStyle = mtnColor;
        for(let i=0; i<5; i++) {
            // Slower scroll for parallax effect
            let mx = ((i * 250) - (distance * 0.5)) % (width + 300); 
            if (mx < -300) mx += width + 300;
            ctx.beginPath();
            ctx.moveTo(mx, height - 100);
            ctx.lineTo(mx + 125, height - (250 + (i%2)*100)); // Varied heights
            ctx.lineTo(mx + 250, height - 100);
            ctx.fill();
            
            // Snowcaps for high mountains
            if (biome === 'mountains' || weather === 'Blizzard') {
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.moveTo(mx + 80, height - (160 + (i%2)*100));
                ctx.lineTo(mx + 125, height - (250 + (i%2)*100));
                ctx.lineTo(mx + 170, height - (160 + (i%2)*100));
                ctx.fill();
                ctx.fillStyle = mtnColor; // reset
            }
        }

        // --- 5. THE GROUND ---
        let groundColor = '#00AA00'; // Plains
        if (biome === 'desert') groundColor = '#CD853F'; // Sandy brown
        if (biome === 'mountains') groundColor = '#556B2F'; // Dark olive
        if (weather === 'Blizzard' || weather === 'Snowing') groundColor = '#EEEEFF'; // Snow

        ctx.fillStyle = groundColor;
        ctx.fillRect(0, height - 120, width, 120);

        // --- 6. BIOME SCATTER (Dynamic Props) ---
        let accessory = null;
        if (biome === 'desert') accessory = tick % 3 === 0 ? 'skull' : 'cactus';
        else if (biome === 'mountains') accessory = 'pine';
        else if (biome === 'plains' || biome === 'valley') accessory = 'flower';

        if (accessory && weather !== 'Blizzard') {
            for(let i=0; i<6; i++) {
                // Ground objects scroll fast to match wagon speed
                let ax = ((i * 180) - (distance * 5)) % width;
                if (ax < 0) ax += width;
                let ay = height - 110 + (i%3)*10; // Depth sorting
                TrailGraphics.drawSprite(ctx, SPRITES[accessory], ax, ay, 3);
            }
        }

        // --- 7. WEATHER PARTICLE ENGINE ---
        if (weather === 'Rainy' || weather === 'Thunderstorm') {
            ctx.fillStyle = 'rgba(150, 200, 255, 0.6)';
            let rainIntensity = weather === 'Thunderstorm' ? 150 : 50;
            for(let i=0; i<rainIntensity; i++) {
                let rx = (Math.random() * width + tick * 4) % width;
                let ry = (Math.random() * height + tick * 25) % height;
                ctx.fillRect(rx, ry, 2, 15); // Long streaks
            }
            if (weather === 'Thunderstorm' && Math.random() < 0.05) {
                // Lightning Flash
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(0, 0, width, height);
            }
        } 
        else if (weather === 'Blizzard' || weather === 'Very Cold') {
            ctx.fillStyle = '#FFFFFF';
            let snowIntensity = weather === 'Blizzard' ? 200 : 50;
            for(let i=0; i<snowIntensity; i++) {
                let sx = (Math.random() * width + tick * 15) % width; // Blows hard sideways
                let sy = (Math.random() * height + tick * 5) % height;
                ctx.beginPath(); ctx.arc(sx, sy, Math.random()*3+1, 0, Math.PI*2); ctx.fill();
            }
        }
    },

    /**
     * DRAW WAGON TEAM (Now with Bobbing physics!)
     */
    drawWagonTeam: (ctx, x, y, scale, tick, health = 100, isMoving = true) => {
        const isLegsOut = isMoving && (Math.floor(tick / 10) % 2 === 0);
        const oxSprite = isLegsOut ? SPRITES.ox_1 : SPRITES.ox_2;
        
        // Wagon bobs up and down slightly when moving
        const bob = isMoving ? Math.sin(tick * 0.5) * 3 : 0;

        // Draw Oxen
        TrailGraphics.drawSprite(ctx, oxSprite, x + 180, y + 20 + (isMoving?Math.cos(tick*0.5)*2:0), scale);
        TrailGraphics.drawSprite(ctx, oxSprite, x + 160, y + 15 + (isMoving?Math.sin(tick*0.5)*2:0), scale);

        // Draw Wagon
        const wagonSprite = health > 50 ? SPRITES.wagon_clean : SPRITES.wagon_damaged;
        TrailGraphics.drawSprite(ctx, wagonSprite, x, y + bob, scale);

        // Draw Spinning Wheels
        const rotation = isMoving ? (tick * 0.2) % (Math.PI * 2) : 0;
        TrailGraphics.drawWheel(ctx, x + 40, y + 85 + bob, 25, rotation);
        TrailGraphics.drawWheel(ctx, x + 110, y + 85 + bob, 25, rotation);
    },

    drawWheel: (ctx, cx, cy, r, rot) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.strokeStyle = '#8B4513'; // Darker wood color
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
        for(let i=0; i<8; i++) {
            ctx.rotate(Math.PI/4);
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, r); ctx.stroke();
        }
        ctx.restore();
    }
};

// EXPORT TO VITE (CRITICAL FOR BOOTING)
export { SPRITES as TRAIL_SPRITES, PALETTE as TRAIL_PALETTE, TrailGraphics };
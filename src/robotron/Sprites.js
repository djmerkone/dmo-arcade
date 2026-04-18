// src/robotron/Sprites.js

export class RobotronSprites {
    constructor() {
        this.image = new Image();
        this.loaded = false;
        this.scale = 2.5; // Adjust this if your sprites look too small/big
        
        // ANIMATION DICTIONARY: [x, y, width, height] on the sprites.png
        // You will need to tweak these coordinates to perfectly box the characters on your specific sprite sheet.
        // Assuming a standard grid of roughly 16x16 or 24x24 per character frame:
        this.animations = {
            player:   [[0, 0, 16, 16], [16, 0, 16, 16]],      // Example: Top left, 2 walk frames
            grunt:    [[0, 16, 16, 16], [16, 16, 16, 16]],    // Next row down
            hulk:     [[0, 32, 16, 16], [16, 32, 16, 16]],
            human:    [[0, 48, 16, 16], [16, 48, 16, 16]],
            prog:     [[0, 64, 16, 16], [16, 64, 16, 16]],
            brain:    [[0, 80, 16, 16], [16, 80, 16, 16]],
            spheroid: [[0, 96, 16, 16]],                      // Single frame
            enforcer: [[0, 112, 16, 16], [16, 112, 16, 16]],
            electrode:[[0, 128, 16, 16]],
            spark:    [[0, 144, 8, 8]],
            bullet:   [[8, 144, 8, 8]]
        };
    }

    // Loads the image before the game starts
    async loadAssets() {
        return new Promise((resolve, reject) => {
            this.image.src = '/robotron/sprites.png'; // Make sure it's in the public folder!
            this.image.onload = () => {
                this.loaded = true;
                console.log("Williams Graphics ROMs: LOADED");
                resolve();
            };
            this.image.onerror = () => {
                console.error("Failed to load sprites.png");
                reject();
            };
        });
    }

    // The new draw function slices the image and animates based on the game tick
    draw(ctx, name, x, y, tick = 0) {
        if (!this.loaded) return;
        
        // Fallback to grunt if a sprite isn't mapped
        const frames = this.animations[name] || this.animations['grunt'];
        
        // Cycle through the available frames based on time
        const frameIndex = Math.floor(tick / 10) % frames.length; 
        const [sx, sy, sw, sh] = frames[frameIndex];

        // Draw it centered
        ctx.drawImage(
            this.image, 
            sx, sy, sw, sh,                                    // Source clipping rect
            x - (sw * this.scale) / 2, y - (sh * this.scale) / 2, // Destination X, Y
            sw * this.scale, sh * this.scale                   // Destination scaled width/height
        );
    }
}
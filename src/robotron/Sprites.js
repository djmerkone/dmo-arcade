// src/robotron/Sprites.js

export class RobotronSprites {
    constructor() {
        this.image = new Image();
        this.loaded = false;
        this.scale = 2.5; 
        
        this.animations = {
            player:   [[0, 0, 16, 16], [16, 0, 16, 16]],      
            grunt:    [[0, 16, 16, 16], [16, 16, 16, 16]],    
            hulk:     [[0, 32, 16, 16], [16, 32, 16, 16]],
            human:    [[0, 48, 16, 16], [16, 48, 16, 16]],
            prog:     [[0, 64, 16, 16], [16, 64, 16, 16]],
            brain:    [[0, 80, 16, 16], [16, 80, 16, 16]],
            spheroid: [[0, 96, 16, 16]],                      
            enforcer: [[0, 112, 16, 16], [16, 112, 16, 16]],
            electrode:[[0, 128, 16, 16]],
            spark:    [[0, 144, 8, 8]],
            bullet:   [[8, 144, 8, 8]]
        };
    }

    async loadAssets() {
        return new Promise((resolve, reject) => {
            // Because it's in the 'public' folder, we can just use the absolute path!
            this.image.src = '/robotron/sprites.png'; 
            
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

    draw(ctx, name, x, y, tick = 0) {
        if (!this.loaded) return;
        const frames = this.animations[name] || this.animations['grunt'];
        const frameIndex = Math.floor(tick / 10) % frames.length; 
        const [sx, sy, sw, sh] = frames[frameIndex];

        ctx.drawImage(
            this.image, 
            sx, sy, sw, sh,                                    
            x - (sw * this.scale) / 2, y - (sh * this.scale) / 2, 
            sw * this.scale, sh * this.scale                   
        );
    }
}
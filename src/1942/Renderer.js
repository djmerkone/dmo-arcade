// src/1942/Renderer.js

export class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency
        
        // Authentic Capcom Arcade Resolution
        this.GAME_WIDTH = 224;
        this.GAME_HEIGHT = 288;
        
        // We use an offscreen canvas to render the pure pixel art, 
        // then scale it up to the main canvas to maintain perfect aspect ratio.
        this.buffer = document.createElement('canvas');
        this.buffer.width = this.GAME_WIDTH;
        this.buffer.height = this.GAME_HEIGHT;
        this.bufferCtx = this.buffer.getContext('2d');
        
        // Disable anti-aliasing for crisp pixels
        this.ctx.imageSmoothingEnabled = false;
        this.bufferCtx.imageSmoothingEnabled = false;

        this.oceanOffset = 0;
    }

    resize(windowWidth, windowHeight) {
        // Calculate the maximum 3:4 (vertical 4:3) box that fits the screen
        const scale = Math.min(windowWidth / this.GAME_WIDTH, windowHeight / this.GAME_HEIGHT);
        
        this.canvas.width = this.GAME_WIDTH * scale;
        this.canvas.height = this.GAME_HEIGHT * scale;
        
        // Re-disable smoothing after resize
        this.ctx.imageSmoothingEnabled = false;
    }

    drawOcean(tick) {
        this.oceanOffset = (tick * 0.5) % 32; // Scroll speed
        
        // Base deep water
        this.bufferCtx.fillStyle = '#0044aa';
        this.bufferCtx.fillRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);

        // Parallax water highlights
        this.bufferCtx.fillStyle = '#0055cc';
        for(let y = -32; y < this.GAME_HEIGHT; y += 32) {
            for(let x = 0; x < this.GAME_WIDTH; x += 32) {
                let waveX = x + Math.sin((y + tick) * 0.05) * 4;
                this.bufferCtx.fillRect(waveX, y + this.oceanOffset, 8, 4);
            }
        }
    }

    render(state) {
        // 1. Clear & Draw Background to Buffer
        this.drawOcean(state.tick);

        // 2. Placeholder for where we will draw our High-Res Sprites
        this.bufferCtx.fillStyle = '#ffffff';
        this.bufferCtx.fillRect(state.player.x, state.player.y, 16, 16); // Temp player box

        // 3. Draw UI
        this.bufferCtx.fillStyle = '#ff0000';
        this.bufferCtx.font = '10px "VT323", monospace';
        this.bufferCtx.fillText("SCORE", 10, 15);
        this.bufferCtx.fillStyle = '#ffffff';
        this.bufferCtx.fillText(state.score.toString().padStart(6, '0'), 10, 25);

        // 4. Scale and Blit the buffer to the actual screen
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(
            this.buffer, 
            0, 0, this.GAME_WIDTH, this.GAME_HEIGHT, 
            0, 0, this.canvas.width, this.canvas.height
        );
    }
}
// src/mazelevels.js

/**
 * Procedural Maze Generator for MAZE WAR: EVOLVED
 * Features:
 * - Recursive Backtracker algorithm for massive labyrinths
 * - Dynamic scaling: Levels get larger as you progress
 * - Secret Rooms connected by Illusion Walls
 * - Trap Rooms (3x3 open areas with floor traps and ambushes)
 * - Loot injection (Ammo & Health)
 */
export function generateMaze(level) {
    let innerSize = 25 + (level * 6);
    if (innerSize % 2 === 0) innerSize++;
    
    // Total grid includes a 10-tile padding for secret rooms
    let size = innerSize + 10; 
    let grid = Array(size).fill().map(() => Array(size).fill('#'));

    // 1. Recursive Backtracker (Offset by 5 to stay in the center)
    let stack = [[6, 6]];
    grid[6][6] = ' ';

    const dirs = [[0,-2], [0,2], [-2,0], [2,0]];

    while(stack.length > 0) {
        let [x, y] = stack[stack.length-1];
        dirs.sort(() => Math.random() - 0.5); 
        let carved = false;
        
        for(let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (nx > 4 && nx < innerSize+4 && ny > 4 && ny < innerSize+4 && grid[ny][nx] === '#') {
                grid[y + dy/2][x + dx/2] = ' ';
                grid[ny][nx] = ' ';
                stack.push([nx, ny]);
                carved = true;
                break;
            }
        }
        if (!carved) stack.pop();
    }

    // 2. Loop Injection (Prevent too many dead ends)
    let loops = Math.floor(innerSize * innerSize * 0.05);
    for(let i=0; i<loops; i++) {
        let rx = 5 + Math.floor(Math.random()*(innerSize-2));
        let ry = 5 + Math.floor(Math.random()*(innerSize-2));
        if (grid[ry][rx] === '#') grid[ry][rx] = ' ';
    }

    // 3. Trap Room Injection (Carve 3x3 rooms)
    let numTrapRooms = 1 + Math.floor(level / 2);
    for(let i = 0; i < numTrapRooms; i++) {
        let cx = 8 + Math.floor(Math.random()*(innerSize-8));
        let cy = 8 + Math.floor(Math.random()*(innerSize-8));
        
        // Carve the 3x3 room
        for(let ty = cy-1; ty <= cy+1; ty++) {
            for(let tx = cx-1; tx <= cx+1; tx++) {
                grid[ty][tx] = ' ';
            }
        }
        grid[cy][cx] = 'T'; // Spike Trap in the center
        grid[cy-1][cx-1] = 'E'; // Ambush Enemy in corner
        grid[cy+1][cx+1] = 'R'; // Ambush Shooter in opposite corner
    }

    // 4. Set Pieces
    grid[6][6] = 'P'; // Player Spawn
    
    // Exit Elevator at the far opposite corner
    grid[innerSize+3][innerSize+3] = 'X';
    grid[innerSize+3][innerSize+2] = ' ';
    grid[innerSize+2][innerSize+3] = ' ';

    // 5. Secret Boss Room (Carved into the top-right padding boundary)
    for(let y = 1; y <= 4; y++) {
        for(let x = innerSize + 2; x <= innerSize + 6; x++) {
            grid[y][x] = ' ';
        }
    }
    // Connect it with an Illusion Wall '?'
    grid[5][innerSize+4] = '?'; 
    grid[6][innerSize+4] = ' '; 

    // Boss & Loot inside the secret room
    grid[2][innerSize+4] = 'B'; // Boss
    grid[1][innerSize+3] = 'A'; // Ammo
    grid[1][innerSize+5] = 'H'; // Health
    grid[4][innerSize+2] = 'A'; // Ammo
    grid[4][innerSize+6] = 'A'; // Ammo

    // 6. Sprinkle Hostiles and Loot in main maze
    const enemyDensity = 0.03 + (level * 0.01);
    for(let y=5; y<innerSize+4; y++) {
        for(let x=5; x<innerSize+4; x++) {
            if (grid[y][x] === ' ' && (x > 10 || y > 10) && (x !== innerSize+3 || y !== innerSize+3)) {
                let rand = Math.random();
                if (rand < enemyDensity) {
                    let isShooter = Math.random() < (level * 0.15);
                    grid[y][x] = isShooter ? 'R' : 'E';
                } else if (rand > 0.98) {
                    grid[y][x] = 'A'; // Ammo Drop
                } else if (rand > 0.96) {
                    grid[y][x] = 'H'; // Health Drop
                }
            }
        }
    }

    return grid.map(row => row.join(''));
}
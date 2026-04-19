// src/mazelevels.js

/*
  LEGEND:
  # = Wall 
  P = Player Start 
  E = Eyeball (Wandering)
  R = Robot (Hunting)
  T = Trap 
  X = Exit Elevator 
  [space] = Empty Corridor
*/

const levels = [];

// --- LEVELS 1-3: Handcrafted Introductions ---
levels.push([
    "#####################",
    "#P  #       # E     #",
    "#   #   #   #   #   #",
    "#   #   #   #   #   #",
    "#       #       #   #",
    "#####   #####   #   #",
    "# E     # T #   # R #",
    "#   #   #   #   #   #",
    "#   #       #       #",
    "#   #########   #####",
    "#           #   # E #",
    "#########   #   #   #",
    "# R     #   #   #   #",
    "#   #   #   #       #",
    "#   #   #   #####   #",
    "# T #   # E # T #   #",
    "#   #   #   #   #   #",
    "#   #   #           #",
    "#   #####   #####   #",
    "#           # X     #",
    "#####################"
]);

levels.push([
    "#########################",
    "#P          # R         #",
    "#########   #   #####   #",
    "# E         #       #   #",
    "#   #####   #####   #   #",
    "#   # T #       #   #   #",
    "#   #   #####   #   #   #",
    "#   #       #   # E #   #",
    "#   #####   #   #####   #",
    "# R         #           #",
    "#####################   #",
    "#                   #   #",
    "#   #####   #####   #   #",
    "#   # E #   # R #   #   #",
    "#   #   #   #   #   #   #",
    "#   #   #   #   #   #   #",
    "#   # T #   # T #   # E #",
    "#   #####   #####   #####",
    "#                       #",
    "#####   #########   #   #",
    "# E #   # R     #   #   #",
    "#   #   #   #   #   #   #",
    "#       #   #   # T #   #",
    "#           #       # X #",
    "#########################"
]);

levels.push([
    "###############################",
    "#P    # E           # R       #",
    "###   #   #######   #   ###   #",
    "#     #   #     #   #   #     #",
    "#   ###   #   # #   #####   ###",
    "#   #     #   # #       #   # #",
    "#   #   ###   # #####   #   # #",
    "#   #   # R   #     #   #     #",
    "### #   #   ####### #   #######",
    "#   #   #         # # E       #",
    "#   #####   ###   # #######   #",
    "#   # T     #     #       #   #",
    "#   #   #####   #######   #   #",
    "# E #   # R         #     #   #",
    "#####   #########   #   ###   #",
    "#               #   #   #     #",
    "#   #########   #   #   #   ###",
    "#   # E     #   #   #   #     #",
    "#   #   #   #   #   #####   # #",
    "#   #   #   #   # T       R # #",
    "#   #   #   #   ############# #",
    "#   #   #   #                 #",
    "### #   #####   ########### ###",
    "#   #           # E # T   #   #",
    "#   #############   #   # #   #",
    "#   # R             #   # #   #",
    "#   #   #############   # #   #",
    "#   #                   # E   #",
    "#   #####################   ###",
    "#                       # X   #",
    "###############################"
]);

// --- LEVELS 4-32: Procedural Depth-First Labyrinth Engine ---
// Generates mathematically perfect, guaranteed-solvable mazes of increasing size and terror.
function generateMaze(levelIndex) {
    // Scales the maze up as levels progress (Capped at 55x55 so it doesn't crash the browser)
    const size = Math.min(55, 15 + Math.floor(levelIndex / 2) * 2); 
    
    // 1. Create solid block of walls
    let grid = Array(size).fill().map(() => Array(size).fill('#'));

    // 2. Carve paths using DFS
    const stack = [[1, 1]];
    grid[1][1] = ' ';
    const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];

    while (stack.length > 0) {
        let [cx, cy] = stack[stack.length - 1];
        
        // Randomize directions to create winding, unpredictable corridors
        dirs.sort(() => Math.random() - 0.5);
        let carved = false;

        for (let [dx, dy] of dirs) {
            let nx = cx + dx, ny = cy + dy;
            
            // If the target cell is within bounds and is a solid wall
            if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && grid[ny][nx] === '#') {
                // Knock down the wall between current and target
                grid[cy + dy / 2][cx + dx / 2] = ' ';
                // Clear the target cell
                grid[ny][nx] = ' ';
                stack.push([nx, ny]);
                carved = true;
                break;
            }
        }
        // If we hit a dead end, backtrack
        if (!carved) stack.pop();
    }

    // 3. Braid the maze (knock down a few random walls to create loops so it's not just one path)
    let braids = Math.floor(size / 3);
    for (let i = 0; i < braids; i++) {
        let rx = 2 + Math.floor(Math.random() * (size - 4));
        let ry = 2 + Math.floor(Math.random() * (size - 4));
        if (grid[ry][rx] === '#') grid[ry][rx] = ' ';
    }

    // 4. Place Key Entities
    grid[1][1] = 'P';               // Player Top Left
    grid[size - 2][size - 2] = 'X'; // Exit Bottom Right

    // 5. Populate Enemies and Traps based on Level Difficulty
    let numE = Math.floor(levelIndex * 1.5);
    let numR = Math.floor(levelIndex * 1.2);
    let numT = Math.floor(levelIndex * 1.8);

    const placeEntity = (char, count) => {
        while (count > 0) {
            let rx = 1 + Math.floor(Math.random() * (size - 2));
            let ry = 1 + Math.floor(Math.random() * (size - 2));
            
            // Only place in empty corridors, keeping spawn and exit clear
            if (grid[ry][rx] === ' ' && !(rx === 1 && ry === 1) && !(rx === size - 2 && ry === size - 2)) {
                grid[ry][rx] = char;
                count--;
            }
        }
    };

    placeEntity('E', numE);
    placeEntity('R', numR);
    placeEntity('T', numT);

    return grid.map(row => row.join(''));
}

// Generate the main campaign loop
for (let i = 4; i <= 32; i++) {
    levels.push(generateMaze(i));
}


// --- LEVEL 33: THE KILL SCREEN (Memory Corruption Glitch) ---
// Emulates the Pac-Man Level 256 wrap-around bug. 
// The left side seems normal. The right side is a chaotic, inescapable wall of data.
levels.push([
    "#################################",
    "#P # E # R T # # # E R R R E R  #",
    "#  #   # T ### # # # # # # # #  #",
    "#  T E #   #   # T E R T E R T  #",
    "#### ### ### ### E R R R E R R  #",
    "#      R   T # R E R T E R T E  #",
    "# ######## ### T # # # # # # #  #",
    "# E  #   # # # # T T T T T T T  #",
    "#### # # # # # X X X X X X X X  #",
    "#  T # # # # # E R T E R T E R  #",
    "# ## # # # # # # # # # # # # #  #",
    "#  # # # E # # R R R R R R R R  #",
    "## # # ### # # E E E E E E E E  #",
    "#  # #   # # # T T T T T T T T  #",
    "# ## ### # # # X X X X X X X X  #",
    "#  #   # # R # E R T E R T E R  #",
    "## ### # ### # # # # # # # # #  #",
    "#  #   #   # # R R R R R R R R  #",
    "# ## ##### # # E E E E E E E E  #",
    "#  #     # # # T T T T T T T T  #",
    "## ##### # ### X X X X X X X X  #",
    "#  #   # #   # E R T E R T E R  #",
    "# ## # # ### # # # # # # # # #  #",
    "#  # # #   # E R R R R R R R R  #",
    "## # # ### # R E E E E E E E E  #",
    "#  # #   # # T T T T T T T T T  #",
    "# ## ### # ### X X X X X X X X  #",
    "#  #   # #   R E R T E R T E R  #",
    "## ### # ### T # # # # # # # #  #",
    "#      #     # R R R R R R R R  #",
    "#################################"
]);

export const mazeLevels = levels;
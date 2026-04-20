// src/traildata.js

/**
 * THE OREGON TRAIL: 2026 EPIC EDITION
 * MASTER DATA FILE
 * Contains the Initial State, the 52-Stop World Map, the Global Economy, 
 * the Hunting Ecosystem, and the Disease Pool.
 */

// --- INITIAL GAME STATE ---
export const INITIAL_STATE = {
    day: 1,
    month: 3, // April
    year: 1848,
    distance: 0,
    money: 1600, // Default Banker starting cash
    inventory: { oxen: 0, food: 0, clothing: 0, bullets: 0, wheels: 0, axles: 0, tongues: 0 },
    party: [
        { name: "Player", health: 100, disease: null },
        { name: "Abigail", health: 100, disease: null },
        { name: "Ezekiel", health: 100, disease: null },
        { name: "Sarah", health: 100, disease: null },
        { name: "Jebediah", health: 100, disease: null }
    ],
    pace: 1, // 0: Resting, 1: Steady, 2: Strenuous, 3: Grueling
    rations: 1, // 0: Bare bones, 1: Meager, 2: Filling
    morale: 100,
    weather: "Fair"
};

// --- GLOBAL BASE ECONOMY ---
// Prices in Independence. Forts multiply these numbers!
export const STORE_PRICES = {
    oxen: 40.00,
    food: 0.20,
    clothing: 10.00,
    bullets: 2.00, // Per box of 20
    wheels: 10.00,
    axles: 10.00,
    tongues: 10.00
};

// --- THE EPIC 52-STOP HISTORICAL MAP ---
export const LANDMARKS = [
    // --- THE GREAT PLAINS (MISSOURI & KANSAS) ---
    { distance: 0, name: "Independence, Missouri", type: "start", biome: "plains", priceMultiplier: 1.0, description: "The jumping-off point. The town is bursting with anxious emigrants, loud traders, and the smell of mud and manure." },
    { distance: 41, name: "Blue Mills", type: "landmark", biome: "plains", description: "A quiet, grassy resting spot. The reality of the 2,000-mile journey ahead is beginning to set in." },
    { distance: 102, name: "Kansas River Crossing", type: "river", biome: "plains", width: 620, depth: 4.5, current: "swift", ferryCost: 5.00, description: "Your first major obstacle. The Kansas River is wide, muddy, and surprisingly deep in the spring melt." },
    { distance: 153, name: "St. Mary's Mission", type: "landmark", biome: "plains", description: "A small Catholic mission. The bells ringing in the distance offer a brief moment of peace." },
    { distance: 185, name: "Big Blue River Crossing", type: "river", biome: "plains", width: 250, depth: 3.2, current: "slow", ferryCost: 0, description: "A beautiful, clear river. The banks are steep, making getting the wagon down to the water perilous." },
    { distance: 240, name: "Alcove Spring", type: "landmark", biome: "plains", description: "A beautiful waterfall and spring. Emigrants have carved their names into the rocks surrounding the water." },
    
    // --- THE NEBRASKA TERRITORY ---
    { distance: 304, name: "Fort Kearney", type: "fort", biome: "plains", priceMultiplier: 1.2, description: "A US Army outpost built to protect emigrants. The soldiers here are friendly, but the supplies are starting to get pricey." },
    { distance: 350, name: "Plum Creek", type: "landmark", biome: "plains", description: "A notoriously dangerous area for sudden storms and stampeding buffalo." },
    { distance: 410, name: "Platte River Valley", type: "landmark", biome: "desert", description: "The trail flattens out along the 'mile wide and an inch deep' Platte River. The air is getting drier." },
    { distance: 450, name: "California Hill", type: "landmark", biome: "desert", description: "A brutal, steep incline that tests the strength of your oxen and the durability of your wagon axles." },
    { distance: 504, name: "Ash Hollow", type: "landmark", biome: "desert", description: "You must lock the wagon wheels and skid down a massive, sandy bluff called Windlass Hill to reach the valley floor." },
    { distance: 554, name: "Courthouse & Jail Rocks", type: "landmark", biome: "desert", description: "Massive clay and sandstone formations that rise out of the prairie like ancient ruins." },
    { distance: 585, name: "Chimney Rock", type: "landmark", biome: "desert", description: "The most famous landmark on the trail. This towering spire of rock can be seen for days before you reach it." },
    { distance: 615, name: "Scotts Bluff", type: "landmark", biome: "desert", description: "A massive, imposing wall of stone. The trail narrows to a dangerous, rocky chasm through Mitchell Pass." },
    
    // --- THE ROCKY MOUNTAINS (WYOMING) ---
    { distance: 640, name: "Fort Laramie", type: "fort", biome: "desert", priceMultiplier: 1.5, description: "A major fur-trading post owned by the American Fur Company. It is the last bastion of civilization before the mountains." },
    { distance: 680, name: "Warm Springs", type: "landmark", biome: "mountains", description: "Natural thermal pools. A rare chance to wash off weeks of trail dust in warm water." },
    { distance: 720, name: "Register Cliff", type: "landmark", biome: "mountains", description: "A soft limestone cliff face where thousands of pioneers have carved their names and hometowns." },
    { distance: 790, name: "Ayres Natural Bridge", type: "landmark", biome: "mountains", description: "A massive rock arch spanning a rushing creek. A beautiful, but isolated, place to camp." },
    { distance: 830, name: "Independence Rock", type: "landmark", biome: "mountains", description: "A giant granite boulder. Emigrants try to reach this by July 4th to ensure they beat the winter snows." },
    { distance: 880, name: "Devil's Gate", type: "landmark", biome: "mountains", description: "A sinister, narrow gorge cut completely through a mountain ridge. The Sweetwater River violently rushes through it." },
    { distance: 900, name: "Split Rock", type: "landmark", biome: "mountains", description: "A prominent 'V' shaped notch in the mountains that acts as a compass for the trail." },
    { distance: 932, name: "South Pass", type: "landmark", biome: "mountains", description: "The Continental Divide! The incline is so gentle you barely realize you've crossed the spine of North America." },
    { distance: 980, name: "Parting of the Ways", type: "landmark", biome: "desert", description: "A fork in the road. Some go south to Fort Bridger; others risk the waterless, brutal Sublette Cutoff." },

    // --- THE HARSH BASIN & IDAHO ---
    { distance: 1057, name: "Green River Crossing", type: "river", biome: "desert", width: 400, depth: 6.5, current: "very swift", ferryCost: 10.00, description: "The water is freezing cold, fast, and incredibly deep. Crossing here is notorious for drowning livestock." },
    { distance: 1110, name: "Names Hill", type: "landmark", biome: "desert", description: "Another registry cliff. Jim Bridger himself carved his name into this stone." },
    { distance: 1198, name: "Fort Bridger", type: "fort", biome: "mountains", priceMultiplier: 2.0, description: "A rugged, sprawling compound run by the legendary mountain man Jim Bridger. Supplies are very expensive." },
    { distance: 1250, name: "Bear River Valley", type: "landmark", biome: "valley", description: "A lush, green valley that provides a desperate reprieve from the dust and heat of the basin." },
    { distance: 1360, name: "Soda Springs", type: "landmark", biome: "valley", description: "Natural, carbonated water bubbles up from the earth. Some pioneers try to flavor it with peppermint." },
    { distance: 1417, name: "Fort Hall", type: "fort", biome: "desert", priceMultiplier: 2.5, description: "An old British Hudson's Bay Company post. The commandant warns you of the brutal deserts ahead." },
    { distance: 1440, name: "American Falls", type: "landmark", biome: "desert", description: "A massive, roaring waterfall on the Snake River. The noise is deafening." },
    { distance: 1480, name: "Massacre Rocks", type: "landmark", biome: "desert", description: "A narrow, terrifying boulder field where ambush is a constant threat. Tension in the party is high." },
    
    // --- THE SNAKE RIVER DESERT ---
    { distance: 1534, name: "Snake River Crossing", type: "river", biome: "desert", width: 1000, depth: 7.2, current: "dangerous", ferryCost: 0, description: "One of the most dangerous crossings on the trail. The Snake River is wide, deep, and absolutely unforgiving." },
    { distance: 1590, name: "Shoshone Falls", type: "landmark", biome: "desert", description: "Known as the 'Niagara of the West'. The roaring water dropping 200 feet is an awe-inspiring sight." },
    { distance: 1620, name: "Three Island Crossing", type: "river", biome: "desert", width: 800, depth: 5.5, current: "swift", ferryCost: 15.00, description: "A treacherous double-river crossing. You must hop from island to island in the middle of the raging current." },
    { distance: 1648, name: "Fort Boise", type: "fort", biome: "desert", priceMultiplier: 3.5, description: "A crumbling adobe fort in the middle of a baking desert. You must pay extortionate prices to survive." },
    { distance: 1720, name: "Farewell Bend", type: "landmark", biome: "desert", description: "The trail finally leaves the punishing Snake River. You turn west toward the jagged peaks of the Blue Mountains." },

    // --- THE FINAL GAUNTLET (OREGON) ---
    { distance: 1760, name: "Burnt River Canyon", type: "landmark", biome: "mountains", description: "A horrific, winding path. You have to cross the freezing Burnt River over 30 times in a single day." },
    { distance: 1785, name: "Flagstaff Hill", type: "landmark", biome: "mountains", description: "A grueling climb up a massive hill. The oxen are exhausted, and the wagons are falling apart." },
    { distance: 1808, name: "Grande Ronde Valley", type: "landmark", biome: "valley", description: "A stunning, circular valley filled with grass and game. A brief paradise before the final mountain climb." },
    { distance: 1840, name: "Blue Mountains", type: "landmark", biome: "mountains", description: "A dark, pine-choked mountain range. Wagons must be winched up and lowered down the steep, muddy grades." },
    { distance: 1885, name: "Whitman Mission", type: "landmark", biome: "valley", description: "A small mission offering sanctuary and medicine before the final push to the Columbia River." },
    { distance: 1920, name: "Fort Walla Walla", type: "fort", biome: "valley", priceMultiplier: 4.0, description: "You have reached the Columbia River! You are exhausted, out of money, but the end is drawing near." },
    { distance: 1983, name: "The Dalles", type: "river", biome: "mountains", width: 1500, depth: 20.0, current: "rapids", ferryCost: 50.00, description: "The river narrows into a treacherous gorge of whitewater rapids. You must either pay a steep toll or risk floating the wagon." },
    { distance: 2040, name: "Barlow Road Toll Gate", type: "fort", biome: "mountains", priceMultiplier: 5.0, description: "A brutally steep, carved road around Mount Hood. It bypasses the Columbia River rapids, but the toll is $5.00 per wagon." },
    { distance: 2060, name: "Mount Hood Pass", type: "landmark", biome: "mountains", description: "Freezing snow, dense timber, and exhaustion. You are dragging your wagon over the final mountain." },
    { distance: 2115, name: "Willamette Valley, Oregon", type: "finish", biome: "valley", description: "You have arrived! The soil is rich, the climate is mild, and your 2,115-mile nightmare is finally over." }
];

// --- EPIC HUNTING ECOSYSTEM ---
// The `biomes` array ensures you only see certain animals in certain parts of the country!
export const HUNTING_ANIMALS = [
    { name: "Squirrel", weight: 2, speed: 8, points: 5, biomes: ["plains", "mountains", "valley"] },
    { name: "Rabbit", weight: 4, speed: 7, points: 10, biomes: ["plains", "desert", "valley"] },
    { name: "Raccoon", weight: 10, speed: 6, points: 15, biomes: ["plains", "valley"] },
    { name: "Fox", weight: 12, speed: 9, points: 25, biomes: ["plains", "desert", "mountains"] },
    { name: "Wild Turkey", weight: 15, speed: 6, points: 40, biomes: ["mountains", "valley"] },
    { name: "Pronghorn", weight: 35, speed: 12, points: 30, biomes: ["desert", "plains"] }, // Extremely fast
    { name: "Deer", weight: 45, speed: 9, points: 20, biomes: ["plains", "mountains", "valley"] },
    { name: "Bighorn Sheep", weight: 60, speed: 7, points: 50, biomes: ["mountains"] },
    { name: "Elk", weight: 120, speed: 8, points: 60, biomes: ["mountains", "valley"] },
    { name: "Black Bear", weight: 150, speed: 5, points: 70, biomes: ["mountains", "valley"] },
    { name: "Buffalo", weight: 600, speed: 4, points: 100, biomes: ["plains"] }, // Only on the plains!
    { name: "Grizzly Bear", weight: 800, speed: 6, points: 150, biomes: ["mountains"] } // Deadly, fast for its size
];

// --- DISEASE & INJURY POOL ---
export const DISEASES = [
    { name: "Dysentery", lethality: 15, duration: 7, cause: "bad water" },
    { name: "Cholera", lethality: 25, duration: 5, cause: "contaminated food" },
    { name: "Typhoid", lethality: 10, duration: 10, cause: "poor hygiene" },
    { name: "Measles", lethality: 5, duration: 14, cause: "contagion" },
    { name: "Mountain Fever", lethality: 8, duration: 9, cause: "ticks" },
    { name: "a Snakebite", lethality: 20, duration: 3, cause: "accident" },
    { name: "Exhaustion", lethality: 2, duration: 4, cause: "overwork" },
    { name: "Frostbite", lethality: 5, duration: 14, cause: "cold" },
    { name: "a Broken Arm", lethality: 1, duration: 20, cause: "accident" },
    { name: "a Broken Leg", lethality: 2, duration: 30, cause: "accident" }
];
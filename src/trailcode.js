// src/trailcode.js

/**
 * THE FRONTIER MEMORY CARD ENGINE
 * Handles State Compression, Base64 Encoding, and Anti-Cheat Checksums.
 */

// A simple hashing function to prevent save-scumming/cheating
const generateChecksum = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16); // Hex string signature
};

export const generateTrailCode = (eng) => {
    // 1. Compress party data (Name:Health:Disease)
    const pData = eng.party.map(m => `${m.name}:${m.health}:${m.disease || '0'}`).join('|');

    // 2. Compile core state into a tight string
    const data = [
        eng.day, eng.month, eng.year, Math.floor(eng.distance), Math.floor(eng.money),
        eng.inventory.oxen, Math.floor(eng.inventory.food), eng.inventory.clothing, 
        eng.inventory.bullets, eng.inventory.wheels, eng.inventory.axles, eng.inventory.tongues,
        eng.pace, eng.rations, pData
    ].join('~');

    // 3. Generate anti-cheat checksum
    const checksum = generateChecksum(data);

    // 4. Combine and Base64 encode
    const finalPayload = `${data}#${checksum}`;
    return btoa(finalPayload);
};

export const decodeTrailCode = (code, engRef, landmarksList) => {
    try {
        const str = atob(code);
        const [dataStr, checksum] = str.split('#');

        // ANTI-CHEAT VERIFICATION
        if (generateChecksum(dataStr) !== checksum) {
            console.error("Save code corrupted or tampered with! Nice try, hacker.");
            return false;
        }

        const data = dataStr.split('~');
        if (data.length < 15) return false;

        const eng = engRef.current;
        eng.day = parseInt(data[0]); eng.month = parseInt(data[1]); eng.year = parseInt(data[2]);
        eng.distance = parseInt(data[3]); eng.money = parseFloat(data[4]);
        
        eng.inventory = {
            oxen: parseInt(data[5]), food: parseFloat(data[6]), clothing: parseInt(data[7]),
            bullets: parseInt(data[8]), wheels: parseInt(data[9]), axles: parseInt(data[10]), tongues: parseInt(data[11])
        };
        
        eng.pace = parseInt(data[12]); eng.rations = parseInt(data[13]);
        
        eng.party = data[14].split('|').map(pStr => {
            const [name, health, disease] = pStr.split(':');
            return { name, health: parseInt(health), disease: disease === '0' ? null : disease };
        });

        // Recalculate next landmark on the map
        eng.nextLandmarkObj = landmarksList.find(l => l.distance > eng.distance) || landmarksList[landmarksList.length - 1];
        
        return true;
    } catch (e) {
        return false; // Invalid Base64 or format
    }
};
// src/trailnpcs.js

/**
 * THE FRONTIER NPC & DIALOGUE ENGINE
 * This file contains the characters that populate the trail and the forts.
 * * SCHEMA:
 * - id: Unique identifier
 * - name: Character's display name
 * - title: Brief description
 * - location: Specific landmark name (or "Wanderer" for random trail encounters)
 * - encounterChance: Probability of meeting them (if Wanderer)
 * - nodes: The dialogue tree. 'start' is the entry point.
 */

export const TRAIL_NPCS = [
    // ---------------------------------------------------------
    // 1. JIM BRIDGER (Historical Figure - Fort Bridger)
    // ---------------------------------------------------------
    {
        id: "npc_jim_bridger",
        name: "Jim Bridger",
        title: "Legendary Mountain Man",
        location: "Fort Bridger",
        nodes: {
            "start": {
                text: "A weathered man in buckskins leans against a wooden post, whittling a piece of pine. 'Well howdy there, pilgrims. Welcome to my fort. You look like you've seen the devil himself out on those plains.'",
                choices: [
                    { text: "Who are you?", next: "who_are_you" },
                    { text: "We need advice for the trail ahead.", next: "advice" },
                    { text: "We're just passing through. (Leave)", next: "exit" }
                ]
            },
            "who_are_you": {
                text: "'Name's Jim Bridger. Been trapping these mountains since before you were in short pants. Built this here post to help folks like you from turning into bleached bones out in the alkali.'",
                choices: [
                    { text: "We need advice for the trail.", next: "advice" },
                    { text: "Good to meet you, Jim. (Leave)", next: "exit" }
                ]
            },
            "advice": {
                text: "Bridger points a scarred finger westward. 'The Sublette Cutoff saves you a week, but it's fifty miles of waterless hell. If your oxen are weak, don't risk it. Take the southern route. And watch the Snake River... she's a hungry one.'",
                choices: [
                    { text: "Thanks for the warning. (Leave)", next: "exit" }
                ]
            }
        }
    },

    // ---------------------------------------------------------
    // 2. DR. MARCUS WHITMAN (Historical Figure - Whitman Mission)
    // ---------------------------------------------------------
    {
        id: "npc_dr_whitman",
        name: "Dr. Marcus Whitman",
        title: "Missionary & Physician",
        location: "Whitman Mission",
        nodes: {
            "start": {
                text: "A stern but kind-looking man in a black coat greets you. 'Welcome to our mission. The Lord has guided you safely through the Blue Mountains. Are there any sick or injured among your flock?'",
                choices: [
                    { text: "Yes, we need medical attention. ($20)", next: "heal", 
                      condition: (state) => state.money >= 20 },
                    { text: "We don't have enough money for a doctor.", next: "no_money",
                      condition: (state) => state.money < 20 },
                    { text: "We are healthy, thank you. (Leave)", next: "exit" }
                ]
            },
            "heal": {
                action: (state) => {
                    state.money -= 20;
                    state.party.forEach(p => { 
                        if (p.health > 0) {
                            p.health = 100;
                            p.disease = null;
                        }
                    });
                    state.morale += 20;
                },
                text: "Dr. Whitman opens his medical bag. He administers quinine, sets broken bones, and provides clean bandages. 'Rest now. The worst of the journey is behind you.' (Entire party healed!)",
                choices: [
                    { text: "Thank you, Doctor. (Leave)", next: "exit" }
                ]
            },
            "no_money": {
                text: "Dr. Whitman sighs gently. 'The Lord's work requires no coin, though our supplies are dwindling.' He hands you a small bottle of laudanum. 'Use this carefully.'",
                choices: [
                    { text: "Bless you, Doctor. (Leave)", next: "exit" }
                ]
            }
        }
    },

    // ---------------------------------------------------------
    // 3. "SLIPPERY" PETE (Shady Wanderer)
    // ---------------------------------------------------------
    {
        id: "npc_slippery_pete",
        name: "Slippery Pete",
        title: "Scavenger & Opportunist",
        location: "Wanderer",
        encounterChance: 0.08, // 8% chance when resting on the trail
        nodes: {
            "start": {
                text: "A greasy-looking man with a missing front tooth approaches your camp. His mule is loaded down with random wagon parts. 'Evenin', friends! Looks like you're carrying a heavy load of food. Tell ya what, I'll trade you a brand new wagon wheel for just 100 pounds of grub.'",
                choices: [
                    { text: "Deal. (Trade 100 lbs food for 1 Wheel)", next: "trade_wheel",
                      condition: (state) => state.inventory.food >= 100 },
                    { text: "That's a terrible trade. Get lost.", next: "refuse" },
                    { text: "Draw your weapon and tell him to leave.", next: "threaten" }
                ]
            },
            "trade_wheel": {
                action: (state) => {
                    state.inventory.food -= 100;
                    // 50% chance the wheel is rotten
                    if (Math.random() > 0.5) {
                        state.inventory.wheels += 1;
                        return "success";
                    } else {
                        return "scam";
                    }
                },
                dynamicText: {
                    "success": "'Pleasure doing business!' Pete cackles, taking your food and tossing you a solid oak wheel.",
                    "scam": "Pete takes the food and rides off fast. When you inspect the wheel, you realize it's completely dry-rotted and useless! You've been robbed!"
                },
                choices: [
                    { text: "Curse your luck. (Leave)", next: "exit" }
                ]
            },
            "refuse": {
                text: "Pete spits in the dirt. 'Suit yerself. Hope you don't hit no deep ruts.' He wanders off into the prairie.",
                choices: [ { text: "Good riddance. (Leave)", next: "exit" } ]
            },
            "threaten": {
                action: (state) => { state.morale += 5; },
                text: "You pull back the hammer on your rifle. Pete throws his hands up in surrender and scurries away into the brush like a frightened rat.",
                choices: [ { text: "Lower your rifle. (Leave)", next: "exit" } ]
            }
        }
    },

    // ---------------------------------------------------------
    // 4. SARAH THE STRANDED (Morale / Karma Event)
    // ---------------------------------------------------------
    {
        id: "npc_sarah_stranded",
        name: "Sarah Miller",
        title: "Desperate Mother",
        location: "Wanderer",
        encounterChance: 0.10, // 10% chance
        nodes: {
            "start": {
                text: "You find a woman sitting on a rock beside a broken-down wagon. Two small children are asleep in the shade beneath it. 'Our oxen died three days ago,' she says, her voice devoid of emotion. 'My husband went ahead to find help. I fear he is dead.'",
                choices: [
                    { text: "Give her a yoke of oxen so she can move. (-2 Oxen)", next: "give_oxen",
                      condition: (state) => state.inventory.oxen > 2 },
                    { text: "Give her 50 lbs of food to survive the wait.", next: "give_food",
                      condition: (state) => state.inventory.food >= 50 },
                    { text: "Offer your prayers, but leave her. We must survive.", next: "leave_her" }
                ]
            },
            "give_oxen": {
                action: (state) => {
                    state.inventory.oxen -= 2;
                    state.morale = 100;
                    state.karma = (state.karma || 0) + 5;
                },
                text: "You unhitch two of your strongest oxen and tie them to her wagon. Sarah falls to her knees, weeping uncontrollably. 'You have saved our lives. I will pray for your family every day until I die.' Your party feels an overwhelming sense of pride.",
                choices: [ { text: "Safe travels, Sarah. (Leave)", next: "exit" } ]
            },
            "give_food": {
                action: (state) => {
                    state.inventory.food -= 50;
                    state.morale += 15;
                    state.karma = (state.karma || 0) + 2;
                },
                text: "You leave a large sack of provisions. It isn't enough to move her wagon, but it will keep her children from starving. She thanks you quietly.",
                choices: [ { text: "I hope your husband returns. (Leave)", next: "exit" } ]
            },
            "leave_her": {
                action: (state) => {
                    state.morale -= 30;
                    state.karma = (state.karma || 0) - 5;
                },
                text: "You look away and keep the wagon moving. The faces of the sleeping children haunt your thoughts for weeks. A heavy, dark guilt settles over the camp.",
                choices: [ { text: "May God forgive us. (Leave)", next: "exit" } ]
            }
        }
    },

    // ---------------------------------------------------------
    // 5. JACQUES THE TRAPPER (River Lore)
    // ---------------------------------------------------------
    {
        id: "npc_jacques_trapper",
        name: "Jacques",
        title: "French-Canadian Fur Trapper",
        location: "Wanderer",
        encounterChance: 0.12,
        nodes: {
            "start": {
                text: "A boisterous man wearing a beaver-pelt hat paddles up to the riverbank in a birchbark canoe. 'Bonjour, mes amis! You look like you plan to cross zis river. She is a wicked one today!'",
                choices: [
                    { text: "How should we cross?", next: "river_advice" },
                    { text: "Can you ferry us? ($15)", next: "ferry",
                      condition: (state) => state.money >= 15 },
                    { text: "We can manage ourselves. (Leave)", next: "exit" }
                ]
            },
            "river_advice": {
                text: "Jacques laughs heartily. 'Do not ford! The mud on the bottom will swallow your wheels whole. You must caulk the wagon box with tar and float her across like a boat!'",
                choices: [
                    { text: "Thanks for the tip. (Leave)", next: "exit" }
                ]
            },
            "ferry": {
                action: (state) => {
                    state.money -= 15;
                    // We set a temporary flag in the state that guarantees a safe river crossing!
                    state.safeCrossingFerry = true; 
                },
                text: "Jacques pockets your coin. 'Oui! Tie ropes to my canoe. I will guide the oxen and keep your wagon from tipping in the current!' (Your next river crossing is guaranteed safe!).",
                choices: [
                    { text: "Let's cross! (Leave)", next: "exit" }
                ]
            }
        }
    }
];

// --- HELPER FUNCTIONS FOR THE ENGINE ---

// Find NPCs specifically located at a given fort or landmark
export const getNPCsAtLocation = (locationName) => {
    return TRAIL_NPCS.filter(npc => npc.location === locationName);
};

// Check for a random wandering NPC encounter on the trail
export const getRandomWanderingNPC = (currentState) => {
    const wanderers = TRAIL_NPCS.filter(npc => npc.location === "Wanderer");
    
    // Don't meet the same unique NPC twice if we implement unique flags later
    // For now, roll the dice on their encounter chance
    for (let npc of wanderers) {
        if (Math.random() < npc.encounterChance) {
            return npc;
        }
    }
    return null;
};
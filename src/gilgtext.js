// src/gilgtext.js

/**
 * THE EPIC OF GILGAMESH: THE COMPLETE DIRECTOR'S CUT
 * A fully dynamic cinematic timeline. Every beat controls the environment, 
 * the actors, the audio synthesis, and the post-processing pipeline.
 */

export const FULL_EPIC = [
    // ==========================================
    // ACT I: THE GOD-KING AND THE WILD MAN
    // ==========================================
    {
        id: "prologue",
        scene: "uruk",
        mood: "mysterious_ancient",
        vfx: "fade_in_slow",
        speaker: "NARRATOR",
        text: "He who saw the Deep, the country's foundation... who knew the proper ways, was wise in all matters.",
        actors: [] // Empty stage for the prologue
    },
    {
        id: "uruk_intro",
        scene: "uruk",
        mood: "triumphant_brass",
        vfx: "pan_up_walls",
        speaker: "NARRATOR",
        text: "Behold Uruk, the City of Walls. Look upon its ramparts, gleaming like copper! Climb its stone staircase... older than memory itself.",
        actors: []
    },
    {
        id: "gilg_appears",
        scene: "uruk",
        mood: "triumphant_brass",
        vfx: "white_flash",
        sfx: "thunder_crack",
        speaker: "NARRATOR",
        text: "Two-thirds of him is God. One-third of him is Man. The Wild Bull of Uruk. There has never been another like him.",
        actors: [
            { id: "gilgamesh", x: 400, hover: true, flip: false, scale: 8 }
        ]
    },
    {
        id: "tyrant_rule",
        scene: "uruk",
        mood: "dark_tension",
        speaker: "NARRATOR",
        text: "But his arrogance knows no bounds. He harries the sons of Uruk beyond endurance. He leaves no daughter to her mother... no girl to her promised man.",
        actors: [
            { id: "gilgamesh", x: 400, hover: true, flip: false, scale: 8 }
        ]
    },
    {
        id: "gods_decree",
        scene: "uruk",
        mood: "dark_tension",
        vfx: "god_voice_glitch",
        speaker: "ANU, LORD OF THE SKY",
        text: "YOU CREATED HIM, ARURU! NOW CREATE HIS EQUAL! LET THEM STRIVE TOGETHER, AND LEAVE URUK IN PEACE!",
        actors: [
            { id: "gilgamesh", x: 400, hover: true, flip: false, scale: 8 }
        ]
    },
    {
        id: "steppe_intro",
        scene: "steppe",
        mood: "primitive_percussion",
        vfx: "fade_to_black",
        speaker: "NARRATOR",
        text: "Deep in the wild steppe, she cast clay into the dust. Enkidu was born. His body matted with hair, he knew nothing of men.",
        actors: [
            { id: "enkidu", x: 400, hover: false, flip: false, scale: 8 }
        ]
    },
    {
        id: "taming_enkidu",
        scene: "steppe",
        mood: "ethereal_melancholy",
        speaker: "NARRATOR",
        text: "They sent Shamhat, the priestess, to civilize the beast. For seven nights, she taught him the ways of Man. When he returned to the water-hole, the wild beasts fled from him.",
        actors: [
            { id: "enkidu", x: 250, hover: false, flip: false, scale: 7 },
            { id: "lion", x: 550, hover: false, flip: true, scale: 6 } // Lion turning away
        ]
    },
    {
        id: "the_challenge",
        scene: "steppe",
        mood: "triumphant_brass",
        vfx: "screen_shake_subtle",
        speaker: "ENKIDU",
        text: "I have grown wise. I have a human heart. Take me to Strong-Walled Uruk. I will challenge this Wild Bull!",
        actors: [
            { id: "enkidu", x: 400, hover: false, flip: false, scale: 8 }
        ]
    },
    {
        id: "the_clash",
        scene: "uruk",
        mood: "primitive_percussion",
        vfx: "screen_shake_violent",
        sfx: "thunder_crack",
        speaker: "NARRATOR",
        text: "They met at the city gates. They grappled like bulls. The doorposts shattered; the walls of Uruk shook to their foundations!",
        actors: [
            { id: "gilgamesh", x: 300, hover: false, flip: false, scale: 7 },
            { id: "enkidu", x: 500, hover: false, flip: true, scale: 7 }
        ]
    },
    {
        id: "brotherhood",
        scene: "uruk",
        mood: "mysterious_ancient",
        speaker: "GILGAMESH",
        text: "There is no other like you in the world. You are my equal. My brother.",
        actors: [
            { id: "gilgamesh", x: 350, hover: true, flip: false, scale: 7 },
            { id: "enkidu", x: 450, hover: false, flip: true, scale: 7 }
        ]
    },

    // ==========================================
    // ACT II: THE CEDAR FOREST
    // ==========================================
    {
        id: "cedar_quest",
        scene: "uruk",
        mood: "triumphant_brass",
        speaker: "GILGAMESH",
        text: "I will conquer the Cedar Forest! I will slay the monster Humbaba! I will stamp my name in the bricks of history so that I may never be forgotten!",
        actors: [
            { id: "gilgamesh", x: 400, hover: true, flip: false, scale: 8 }
        ]
    },
    {
        id: "forest_arrival",
        scene: "cedar_forest", // NEW SCENE NEEDED IN ASSETS
        mood: "dark_tension",
        vfx: "fade_in_slow",
        speaker: "NARRATOR",
        text: "They walked for a month and a half, until they reached the mountain of the Gods. The Cedar Forest. Dark. Silent. Waiting.",
        actors: [
            { id: "gilgamesh", x: 250, hover: true, flip: false, scale: 6 },
            { id: "enkidu", x: 150, hover: false, flip: false, scale: 6 }
        ]
    },
    {
        id: "humbaba_wakes",
        scene: "cedar_forest",
        mood: "dark_tension",
        vfx: "screen_shake_violent",
        sfx: "thunder_crack",
        speaker: "HUMBABA, GUARDIAN OF THE TREES",
        text: "WHO TREADS UPON MY FOREST? GILGAMESH... I WILL BITE THROUGH YOUR WINDPIPE AND LEAVE YOUR BODY FOR THE EAGLES!",
        actors: [
            { id: "gilgamesh", x: 150, hover: true, flip: false, scale: 6 },
            { id: "enkidu", x: 50, hover: false, flip: false, scale: 6 },
            { id: "humbaba", x: 650, hover: true, flip: true, scale: 12 } // NEW ACTOR NEEDED IN ASSETS
        ]
    },
    {
        id: "humbaba_death",
        scene: "cedar_forest",
        mood: "primitive_percussion",
        vfx: "crimson_flash",
        sfx: "thunder_crack",
        speaker: "NARRATOR",
        text: "The earth split. The skies blackened. With the blessing of the Sun God, Gilgamesh brought his axe down. The Guardian fell. The trees wept.",
        actors: [
            { id: "gilgamesh", x: 400, hover: true, flip: false, scale: 8 }
        ]
    },

    // ==========================================
    // ACT III: WRATH OF THE GODS
    // ==========================================
    {
        id: "ishtars_rage",
        scene: "uruk",
        mood: "dark_tension",
        vfx: "god_voice_glitch",
        speaker: "ISHTAR, GODDESS OF WAR",
        text: "YOU REJECT MY LOVE, GILGAMESH?! THEN I SHALL RELEASE THE BULL OF HEAVEN TO SHATTER YOUR CITY INTO DUST!",
        actors: [] // Voice from the heavens
    },
    {
        id: "bull_descends",
        scene: "uruk",
        mood: "primitive_percussion",
        vfx: "screen_shake_violent",
        sfx: "thunder_crack",
        speaker: "NARRATOR",
        text: "The sky cracked open. The Bull of Heaven descended. With every breath, it opened pits in the earth that swallowed hundreds of men.",
        actors: [
            { id: "bull_of_heaven", x: 400, hover: false, flip: false, scale: 14 } // NEW ACTOR NEEDED IN ASSETS
        ]
    },
    {
        id: "slaying_bull",
        scene: "uruk",
        mood: "triumphant_brass",
        vfx: "white_flash",
        speaker: "NARRATOR",
        text: "Enkidu seized the beast by its massive horns. Gilgamesh drove his sword deep between the shoulders. The Gods looked down in absolute fury.",
        actors: [
            { id: "gilgamesh", x: 250, hover: true, flip: false, scale: 7 },
            { id: "bull_of_heaven", x: 500, hover: false, flip: true, scale: 10 },
            { id: "enkidu", x: 650, hover: false, flip: true, scale: 7 }
        ]
    },
    {
        id: "gods_curse",
        scene: "uruk",
        mood: "ethereal_melancholy",
        vfx: "fade_to_black",
        speaker: "ANU, LORD OF THE SKY",
        text: "THEY HAVE SLAIN HUMBABA. THEY HAVE SLAIN THE BULL OF HEAVEN. ONE OF THEM MUST DIE.",
        actors: []
    },

    // ==========================================
    // ACT IV: THE DESCENT
    // ==========================================
    {
        id: "enkidu_dies",
        scene: "steppe",
        mood: "ethereal_melancholy",
        speaker: "ENKIDU",
        text: "My brother... the Gods have cursed me. I am dying in shame. I do not fall in battle. I fall to sickness.",
        actors: [
            { id: "gilgamesh", x: 300, hover: false, flip: false, scale: 7 }, // Grounded
            { id: "enkidu", x: 500, hover: false, flip: true, scale: 7 }     // Grounded
        ]
    },
    {
        id: "gilgamesh_mourns",
        scene: "steppe",
        mood: "dark_tension",
        vfx: "screen_shake_subtle",
        speaker: "NARRATOR",
        text: "For six days and seven nights, Gilgamesh wept over his brother. Only when a maggot dropped from Enkidu's nose did he accept the truth. Death is real.",
        actors: [
            { id: "gilgamesh", x: 400, hover: false, flip: false, scale: 8 }
        ]
    },
    {
        id: "fear_of_death",
        scene: "steppe",
        mood: "primitive_percussion",
        speaker: "GILGAMESH",
        text: "Must I die too? Must I become like Enkidu? I am terrified of the grave. I will find Utnapishtim, the only man to survive the Great Flood. I will find Immortality!",
        actors: [
            { id: "gilgamesh", x: 400, hover: false, flip: false, scale: 8 }
        ]
    },
    {
        id: "the_underworld",
        scene: "underworld", // NEW SCENE NEEDED IN ASSETS
        mood: "mysterious_ancient",
        vfx: "fade_in_slow",
        speaker: "NARRATOR",
        text: "He abandoned his crown. He wore lion skins. He walked the path of the sun, through the absolute darkness beneath the mountains, until he reached the Waters of Death.",
        actors: [
            { id: "gilgamesh", x: 400, hover: false, flip: false, scale: 6 } // Very small in a vast dark cavern
        ]
    },
    {
        id: "utnapishtim_meets",
        scene: "underworld",
        mood: "ethereal_melancholy",
        speaker: "UTNAPISHTIM, THE IMMORTAL",
        text: "Why are your cheeks starved, Gilgamesh? Why is your face drawn? There is no permanence. Do we build a house to stand forever? Do we seal a contract to hold for all time?",
        actors: [
            { id: "gilgamesh", x: 200, hover: false, flip: false, scale: 6 },
            { id: "utnapishtim", x: 600, hover: true, flip: true, scale: 7 } // NEW ACTOR NEEDED IN ASSETS
        ]
    },
    {
        id: "the_flower",
        scene: "underworld",
        mood: "triumphant_brass",
        speaker: "NARRATOR",
        text: "Moved by pity, the immortal told him a secret. At the bottom of the ocean grew a flower. Its thorns would tear his hands, but eating it would restore his youth.",
        actors: [
            { id: "gilgamesh", x: 400, hover: false, flip: false, scale: 8 }
        ]
    },
    {
        id: "the_snake",
        scene: "steppe",
        mood: "dark_tension",
        vfx: "screen_shake_subtle",
        speaker: "NARRATOR",
        text: "He dove deep and seized the plant. But while he rested at a pool, a serpent smelled its sweetness. The snake ate the flower, shed its skin, and vanished into the rocks.",
        actors: [
            { id: "gilgamesh", x: 400, hover: false, flip: false, scale: 8 }
        ]
    },
    {
        id: "the_realization",
        scene: "uruk",
        mood: "mysterious_ancient",
        vfx: "fade_in_slow",
        speaker: "GILGAMESH",
        text: "For whom have my hands labored? For whom did I drain my heart's blood? I have gained no blessing for myself. I have given the blessing to the beast of the earth.",
        actors: [
            { id: "gilgamesh", x: 400, hover: false, flip: false, scale: 7 }
        ]
    },
    {
        id: "epilogue",
        scene: "uruk",
        mood: "triumphant_brass",
        vfx: "pan_up_walls",
        speaker: "NARRATOR",
        text: "He returned to Uruk. He looked upon the massive walls he had built. He realized that while flesh must die, what Man builds for others will endure forever.",
        actors: [] // Looking at the walls
    },
    {
        id: "credits",
        scene: "uruk",
        mood: "ethereal_melancholy",
        vfx: "fade_to_black",
        speaker: "THE END",
        text: "The Epic of Gilgamesh. The oldest story of humanity. Translated and rendered for the DMO ARCADE.",
        actors: []
    }
];
// src/trailevents.js

/**
 * THE NARRATIVE EVENT ENGINE: 2026 EPIC EDITION
 * * Event Object Schema:
 * - id: Unique string identifier
 * - unique: Boolean (if true, happens only once per playthrough)
 * - weight: Number (probability of occurring)
 * - condition: Function (returns true if event is allowed to fire)
 * - pages: Array of strings (Cinematic text crawl before the choice)
 * - choices: Array of objects containing text options and action functions
 */

export const NARRATIVE_EVENTS = [
    // ---------------------------------------------------------
    // 1. THE STARVING EMIGRANT (Morale/Karma)
    // ---------------------------------------------------------
    {
        id: "starving_emigrant_01",
        unique: true,
        weight: 10,
        condition: (state) => state.distance > 300 && state.inventory.food > 100,
        pages: [
            "The wind howls across the desolate plains.",
            "Up ahead, you see a lone figure sitting by the trail. Next to him is a shattered handcart, half-buried in the dust.",
            "As you pull the oxen to a halt, the man looks up. His face is gaunt, his lips cracked and bleeding.",
            "\"Please...\" he croaks, his voice barely a whisper. \"My family is two miles back. We haven't eaten in four days. Can you spare anything?\""
        ],
        choices: [
            {
                text: "Give him 50 lbs of food.",
                action: (state) => {
                    state.inventory.food -= 50;
                    state.morale = Math.min(100, state.morale + 20); 
                    state.karma = (state.karma || 0) + 10;
                    return {
                        pages: [
                            "You hand the man a heavy sack of salted pork and hardtack.",
                            "Tears stream down his dirt-caked face. \"God bless you,\" he weeps. \"I will never forget this.\"",
                            "You lose 50 lbs of food, but your party's morale soars, knowing you did the right thing."
                        ]
                    };
                }
            },
            {
                text: "Give him 10 lbs of food.",
                action: (state) => {
                    state.inventory.food -= 10;
                    state.karma = (state.karma || 0) + 2;
                    return {
                        pages: [
                            "You toss him a small bundle of hardtack.",
                            "He looks at it, disappointment flashing in his eyes, but he nods in quiet desperation. \"Thank you... it's better than nothing.\"",
                            "You lose 10 lbs of food."
                        ]
                    };
                }
            },
            {
                text: "We barely have enough for ourselves. Leave him.",
                action: (state) => {
                    state.morale -= 20;
                    state.karma = (state.karma || 0) - 10;
                    return {
                        pages: [
                            "You shake your head and snap the reins. The oxen lurch forward.",
                            "You don't look back, but you can feel his hollow eyes boring into your back.",
                            "A heavy silence falls over your wagon. Morale plummets."
                        ]
                    };
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 2. THE BUFFALO STAMPEDE (Action/Danger)
    // ---------------------------------------------------------
    {
        id: "buffalo_stampede",
        unique: false,
        weight: 8,
        condition: (state) => state.distance > 100 && state.distance < 1000, // Plains
        pages: [
            "A low, rhythmic rumbling vibrates through the wooden floorboards of the wagon.",
            "At first, you think it's thunder. But the sky is clear.",
            "Suddenly, your lead ox panics, pulling hard to the right. You look to the horizon...",
            "A massive, black tide is cresting the hill. A buffalo stampede is heading directly for the trail!"
        ],
        choices: [
            {
                text: "Whip the oxen! Try to outrun them!",
                action: (state) => {
                    if (Math.random() > 0.5) {
                        state.distance += 15;
                        state.inventory.oxen -= 1;
                        return {
                            pages: [
                                "You crack the whip mercilessly! The terrified oxen break into a dead sprint.",
                                "Dust chokes the air as the massive beasts thunder just inches behind your wagon.",
                                "You manage to pull ahead of the herd, but the effort was too much. One of your oxen collapses and dies from overexertion."
                            ]
                        };
                    } else {
                        state.inventory.wheels = Math.max(0, state.inventory.wheels - 1);
                        state.inventory.food = Math.max(0, state.inventory.food - 80);
                        return {
                            pages: [
                                "You try to outrun them, but the wagon is too heavy!",
                                "A massive bull clips the rear of the wagon, shattering a wheel and splintering the side panels.",
                                "Barrels of food tumble out into the dirt and are instantly trampled to dust.",
                                "You lose 1 spare wheel and 80 lbs of food."
                            ]
                        };
                    }
                }
            },
            {
                text: "Form a defensive circle and fire your rifles into the air!",
                action: (state) => {
                    if (state.inventory.bullets >= 10) {
                        state.inventory.bullets -= 10;
                        return {
                            pages: [
                                "You pull the wagon into a tight circle, grab your rifles, and fire wildly into the air!",
                                "The deafening cracks of gunfire startle the lead buffalo. The herd violently splits, flowing around your wagon like water around a stone.",
                                "When the dust clears, you are miraculously unharmed. You used 10 bullets."
                            ]
                        };
                    } else {
                        state.party.forEach(p => { if (p.health > 0) p.health -= 30; });
                        return {
                            pages: [
                                "You reach for your weapons, but you are low on ammunition!",
                                "The herd slams into the wagon. You are violently thrown to the ground.",
                                "The stampede lasts for ten agonizing minutes. By the time it's over, everyone is battered, bruised, and bleeding.",
                                "The entire party suffers severe injuries."
                            ]
                        };
                    }
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 3. PRAIRIE FIRE (Time/Inventory check)
    // ---------------------------------------------------------
    {
        id: "prairie_fire",
        unique: false,
        weight: 12,
        condition: (state) => state.weather === 'Hot' || state.weather === 'Very Hot' || state.weather === 'Drought',
        pages: [
            "The air is thick with the smell of woodsmoke.",
            "You crest a small ridge and your blood runs cold. A massive prairie fire is sweeping across the dry grass, driven by a fierce tailwind.",
            "A wall of flame twenty feet high is moving toward you faster than a man can run."
        ],
        choices: [
            {
                text: "Drive the wagon into a nearby creek bed to take shelter.",
                action: (state) => {
                    state.day += 2;
                    let lostFood = Math.floor(Math.random() * 40);
                    state.inventory.food = Math.max(0, state.inventory.food - lostFood);
                    return {
                        pages: [
                            "You drive the oxen down a steep embankment into a muddy creek bed.",
                            "The roar of the fire is deafening as it passes overhead, showering the wagon in sparks and ash.",
                            "You spend two days waiting for the embers to cool before you can pull the wagon out of the mud.",
                            `Water damage ruined ${lostFood} lbs of your food.`
                        ]
                    };
                }
            },
            {
                text: "Start a backfire to burn a safe zone ahead of you.",
                action: (state) => {
                    if (Math.random() > 0.4) {
                        return {
                            pages: [
                                "You quickly light the grass ahead of you, letting the wind blow the new fire away from the wagon.",
                                "You drive the oxen onto the freshly scorched, blackened earth just as the main fire hits the boundary.",
                                "The fire has no fuel left and dies out around you. It was a terrifying gamble, but it worked perfectly!"
                            ]
                        };
                    } else {
                        state.party.forEach(p => { if (p.health > 0) p.health -= 20; });
                        state.inventory.clothing = Math.max(0, state.inventory.clothing - 2);
                        return {
                            pages: [
                                "You try to start a backfire, but the wind shifts suddenly!",
                                "The flames whip back toward the wagon, catching the canvas tarp on fire.",
                                "The party suffers burns fighting the flames, and 2 sets of clothing are reduced to ash."
                            ]
                        };
                    }
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 4. THE SHOSHONE TRADING PARTY (Economy/Diplomacy)
    // ---------------------------------------------------------
    {
        id: "native_trading_party",
        unique: false,
        weight: 15,
        condition: (state) => state.distance > 800 && state.distance < 1700,
        pages: [
            "A group of Shoshone riders approaches your wagon train.",
            "They are well-armed and riding beautiful Appaloosa horses, but they hold their hands open in a gesture of peace.",
            "The leader rides forward. Through a mix of sign language and broken English, he offers to trade for goods."
        ],
        choices: [
            {
                text: "Offer to trade clothing for food.",
                action: (state) => {
                    if (state.inventory.clothing >= 2) {
                        state.inventory.clothing -= 2;
                        state.inventory.food += 80;
                        return {
                            pages: [
                                "You offer the leader two sets of heavy woolen clothing.",
                                "He inspects the fabric, nods in approval, and signals his men.",
                                "They hand over thick bundles of dried venison and pemmican.",
                                "You lose 2 sets of clothes, but gain 80 lbs of high-quality food."
                            ]
                        };
                    } else {
                        return {
                            pages: [
                                "You search your wagon, but you don't have enough spare clothing to make a fair trade.",
                                "The riders nod respectfully and ride away into the hills."
                            ]
                        };
                    }
                }
            },
            {
                text: "Offer to trade bullets for a healthy Ox.",
                action: (state) => {
                    if (state.inventory.bullets >= 50) {
                        state.inventory.bullets -= 50;
                        state.inventory.oxen += 1;
                        return {
                            pages: [
                                "You bring out a heavy box containing 50 rounds of ammunition.",
                                "The Shoshone are pleased with the trade. They leave you a strong, healthy ox to add to your team.",
                                "You lose 50 bullets, but gain an ox."
                            ]
                        };
                    } else {
                        return {
                            pages: [
                                "You offer what little ammunition you have, but they shake their heads. It is not enough.",
                                "The trading party departs peacefully."
                            ]
                        };
                    }
                }
            },
            {
                text: "Decline the trade.",
                action: (state) => {
                    return {
                        pages: [
                            "You respectfully decline to trade. You need to conserve your supplies.",
                            "The riders wave and disappear over the ridge."
                        ]
                    };
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 5. THIEVES IN THE NIGHT (Stealth/Loss)
    // ---------------------------------------------------------
    {
        id: "thieves_camp",
        unique: false,
        weight: 12,
        condition: (state) => state.pace <= 1, 
        pages: [
            "It is a moonless night. The camp is fast asleep.",
            "Suddenly, a twig snaps near the back of the wagon.",
            "You peek out from under your blanket and see the shadows of two men quietly rifling through your supply barrels."
        ],
        choices: [
            {
                text: "Grab your rifle and confront them!",
                action: (state) => {
                    if (state.inventory.bullets > 0) {
                        state.inventory.bullets -= 1;
                        return {
                            pages: [
                                "You level your rifle and fire a warning shot into the dirt!",
                                "The thieves scramble in terror, dropping the supplies they were holding.",
                                "They disappear into the darkness. You used 1 bullet, but your supplies are safe."
                            ]
                        };
                    } else {
                        state.party[0].health -= 25; 
                        state.inventory.food = Math.max(0, state.inventory.food - 60);
                        return {
                            pages: [
                                "You jump out to confront them, but you have no ammunition!",
                                "One of the thieves strikes you hard with the butt of his pistol.",
                                "You wake up hours later with a splitting headache. The thieves made off with 60 lbs of food."
                            ]
                        };
                    }
                }
            },
            {
                text: "Stay hidden and let them take what they want. It's too dangerous.",
                action: (state) => {
                    state.inventory.food = Math.max(0, state.inventory.food - 40);
                    state.inventory.clothing = Math.max(0, state.inventory.clothing - 1);
                    return {
                        pages: [
                            "You hold your breath and pretend to be asleep.",
                            "The thieves quickly gather what they can carry and slip away silently.",
                            "In the morning, you find you are missing 40 lbs of food and a set of clothes."
                        ]
                    };
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 6. THE ABANDONED WAGON (Risk/Reward)
    // ---------------------------------------------------------
    {
        id: "abandoned_wagon",
        unique: false,
        weight: 14,
        condition: (state) => true,
        pages: [
            "You spot a Conestoga wagon pulled off the trail into a thicket of cottonwood trees.",
            "There are no oxen attached. The canvas is torn, flapping in the wind.",
            "It looks like it was abandoned recently."
        ],
        choices: [
            {
                text: "Search the wagon thoroughly.",
                action: (state) => {
                    if (Math.random() > 0.3) {
                        let foundFood = Math.floor(Math.random() * 50) + 20;
                        let foundAxle = Math.random() > 0.7 ? 1 : 0;
                        state.inventory.food += foundFood;
                        state.inventory.axles += foundAxle;
                        return {
                            pages: [
                                "You carefully search the wagon bed.",
                                "Underneath some rotted blankets, you hit the jackpot!",
                                `You recovered ${foundFood} lbs of food${foundAxle ? " and a spare axle!" : "!"}`
                            ]
                        };
                    } else {
                        let healthyMembers = state.party.filter(p => p.health > 0);
                        if (healthyMembers.length > 0) {
                            let victim = healthyMembers[Math.floor(Math.random() * healthyMembers.length)];
                            victim.disease = "Cholera";
                            victim.health -= 20;
                            return {
                                pages: [
                                    "You dig through the wagon, finding nothing but soiled clothes and empty barrels.",
                                    "The smell of sickness hangs heavy in the air.",
                                    `A few hours later, ${victim.name} begins vomiting violently. They have contracted Cholera from the contaminated wagon.`
                                ]
                            };
                        }
                        return { pages: ["You find nothing of use."] };
                    }
                }
            },
            {
                text: "Leave it alone. It could be a trap or carry disease.",
                action: (state) => {
                    return {
                        pages: [
                            "You trust your instincts and keep your party away from the derelict wagon.",
                            "You continue down the trail safely."
                        ]
                    };
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 7. DESPAIR AND MUTINY (Morale Check)
    // ---------------------------------------------------------
    {
        id: "mutiny",
        unique: false,
        weight: 15,
        condition: (state) => state.morale < 40 && state.party.filter(p => p.health > 0).length > 2,
        pages: [
            "The relentless dust, the hunger, and the exhaustion have taken their toll.",
            "Tempers flare over a spilled cup of water. Suddenly, two members of your party are shouting at each other.",
            "One of them draws a knife, threatening to take half the supplies and turn back East.",
            "A mutiny is brewing. As the wagon leader, you must intervene."
        ],
        choices: [
            {
                text: "Distribute extra rations to calm everyone down.",
                action: (state) => {
                    if (state.inventory.food >= 100) {
                        state.inventory.food -= 100;
                        state.morale += 30;
                        state.rations = 2; 
                        return {
                            pages: [
                                "You step between them and declare a feast.",
                                "You cook up a massive pot of stew, using up 100 lbs of your reserve food.",
                                "Full bellies have a magical way of soothing anger. The fight is forgotten, and morale drastically improves."
                            ]
                        };
                    } else {
                        state.party[1].health -= 20; 
                        state.morale -= 10;
                        return {
                            pages: [
                                "You try to offer extra food, but the barrels are nearly empty.",
                                "\"You've led us out here to starve!\" one screams.",
                                "A fistfight breaks out in the dirt. You finally separate them, but someone gets badly bruised, and the tension remains."
                            ]
                        };
                    }
                }
            },
            {
                text: "Rule with an iron fist. Confiscate the weapons.",
                action: (state) => {
                    state.morale -= 15;
                    return {
                        pages: [
                            "You draw your pistol and demand total silence.",
                            "You force them to hand over their knives and threaten to leave anyone behind who disobeys your orders.",
                            "The argument stops immediately, but a cold, hateful resentment settles over the camp. Morale hits rock bottom."
                        ]
                    };
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 8. THE GOLD PROSPECTOR (Gambling)
    // ---------------------------------------------------------
    {
        id: "gold_prospector",
        unique: true,
        weight: 10,
        condition: (state) => state.distance > 1200, 
        pages: [
            "You meet a crazed-looking man leading a mule loaded with heavy canvas sacks.",
            "His eyes are wide and bloodshot. \"I struck it rich in California!\" he cackles, opening a sack to reveal gleaming golden nuggets.",
            "\"But I'm starving. I'll give you a fistful of pure gold for 50 pounds of food!\""
        ],
        choices: [
            {
                text: "Trade 50 lbs of food for the gold.",
                action: (state) => {
                    if (state.inventory.food >= 50) {
                        state.inventory.food -= 50;
                        let isFoolsGold = Math.random() > 0.5;
                        if (!isFoolsGold) {
                            state.money += 200;
                            return {
                                pages: [
                                    "You trade the food. The man ravenously devours a piece of pork and hands you a heavy leather pouch.",
                                    "When you reach the next fort, the assayer's eyes go wide. It's real!",
                                    "You sell the gold for $200.00!"
                                ]
                            };
                        } else {
                            return {
                                pages: [
                                    "You trade the food. The man snatches it and practically runs down the trail.",
                                    "Later that night, you look closer at the 'nuggets' in the firelight. They are flaky and brittle.",
                                    "It's Iron Pyrite. Fool's Gold. You've been scammed out of 50 lbs of food."
                                ]
                            };
                        }
                    } else {
                        return {
                            pages: [
                                "You want to trade, but you can't afford to lose 50 lbs of food.",
                                "You leave the crazed man behind."
                            ]
                        };
                    }
                }
            },
            {
                text: "Refuse. You can't eat gold.",
                action: (state) => {
                    return {
                        pages: [
                            "You tell him your food is not for sale.",
                            "He curses at you and wanders away, clutching his useless rocks."
                        ]
                    };
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 9. THE BROKEN AXLE (Mechanical)
    // ---------------------------------------------------------
    {
        id: "steep_grade_axle",
        unique: false,
        weight: 12,
        condition: (state) => state.distance > 1500, 
        pages: [
            "You are navigating a treacherous, rocky descent down the side of a mountain.",
            "The wagon bounces violently over a massive boulder.",
            "There is a deafening *CRACK* that echoes through the canyon.",
            "The front axle has snapped entirely in half. The wagon is immobile."
        ],
        choices: [
            {
                text: "Replace it with a spare axle.",
                action: (state) => {
                    if (state.inventory.axles > 0) {
                        state.inventory.axles -= 1;
                        state.day += 1;
                        return {
                            pages: [
                                "Thank God you bought spare parts.",
                                "You spend the rest of the day jacking up the heavy wagon and slotting the new oak axle into place.",
                                "You lose 1 day and 1 spare axle, but the wagon rolls on."
                            ]
                        };
                    } else {
                        state.day += 5;
                        state.morale -= 20;
                        return {
                            pages: [
                                "You don't have a spare axle!",
                                "You have to hike three miles into the woods, chop down a suitable hickory tree, haul it back, and carve a new axle by hand.",
                                "It takes 5 exhausting days of backbreaking labor. The party's morale drops significantly."
                            ]
                        };
                    }
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 10. FLASH FLOOD (Nature/Speed)
    // ---------------------------------------------------------
    {
        id: "flash_flood",
        unique: false,
        weight: 10,
        condition: (state) => state.distance > 1000 && state.weather === 'Rainy' || state.weather === 'Thunderstorm',
        pages: [
            "You are traveling through a dry, narrow slot canyon to avoid the wind.",
            "The sky above darkens. Suddenly, you hear a sound like a freight train roaring through the rock walls.",
            "A wall of muddy water, churning with tree trunks and boulders, is barreling down the canyon right at you!"
        ],
        choices: [
            {
                text: "Abandon the wagon and climb the canyon walls!",
                action: (state) => {
                    state.inventory.food = Math.floor(state.inventory.food * 0.2); // Lose 80% food
                    state.inventory.clothing = 0;
                    state.morale -= 40;
                    return {
                        pages: [
                            "You scream for everyone to run. You scramble up the slick sandstone just as the water hits.",
                            "You watch in horror as your wagon is slammed against the rocks and completely submerged.",
                            "Hours later, the water recedes. You recover the wagon, but almost all your food and clothing washed away.",
                            "You are alive, but devastated."
                        ]
                    };
                }
            },
            {
                text: "Whip the oxen! Try to reach higher ground ahead!",
                action: (state) => {
                    if (Math.random() > 0.6) {
                        return {
                            pages: [
                                "You crack the whip and the oxen surge forward in a panic.",
                                "You burst out of the narrow canyon onto a raised plateau just seconds before the floodwaters blast through the exit.",
                                "You collapse in the dirt, breathing hard. Not a single thing was lost."
                            ]
                        };
                    } else {
                        state.party[0].health -= 50;
                        state.inventory.oxen -= 1;
                        state.inventory.food = Math.floor(state.inventory.food * 0.5);
                        return {
                            pages: [
                                "The wagon is too slow. The water catches the rear wheels, violently spinning the wagon around.",
                                "One of your oxen is dragged under and drowns. You are thrown against the rocks, suffering severe injuries.",
                                "Half of your supplies are swept downriver. It is a total disaster."
                            ]
                        };
                    }
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 11. THE CHOLERA CAMP (Disease/Morale)
    // ---------------------------------------------------------
    {
        id: "cholera_camp",
        unique: true,
        weight: 12,
        condition: (state) => state.distance > 200 && state.distance < 1200,
        pages: [
            "The stench hits you before you see it. A sweet, sickly smell of death.",
            "Up ahead, there are five wagons pulled off the trail. Makeshift graves dot the hillside.",
            "It is a quarantine camp. Emigrants afflicted with Cholera have been left here by their trains.",
            "A woman stumbles toward your wagon, begging for clean water."
        ],
        choices: [
            {
                text: "Give them fresh water and medicine.",
                action: (state) => {
                    state.karma = (state.karma || 0) + 15;
                    state.morale += 10;
                    if (Math.random() > 0.5) {
                        let healthy = state.party.filter(p => p.health > 0);
                        let victim = healthy[Math.floor(Math.random() * healthy.length)];
                        victim.disease = "Cholera";
                        victim.health -= 20;
                        return {
                            pages: [
                                "You bring them fresh water and help tend to the sick for a few hours.",
                                "They bless your name as you leave. You feel a profound sense of purpose.",
                                `However, two days later, ${victim.name} develops a fever and cramps. They caught Cholera from the camp.`
                            ]
                        };
                    } else {
                        return {
                            pages: [
                                "You bring them fresh water and do what you can without getting too close.",
                                "You leave safely, knowing you brought comfort to the dying.",
                                "Your party's morale improves, and no one gets sick."
                            ]
                        };
                    }
                }
            },
            {
                text: "Refuse, cover your faces, and drive past quickly.",
                action: (state) => {
                    state.karma = (state.karma || 0) - 10;
                    state.morale -= 15;
                    return {
                        pages: [
                            "You order everyone to tie bandanas over their mouths and whip the oxen.",
                            "The woman falls to her knees, weeping as you roll past.",
                            "You escape the disease, but the guilt hangs heavily over the wagon for weeks."
                        ]
                    };
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 12. GRIZZLY BEAR ATTACK (Combat/Skill)
    // ---------------------------------------------------------
    {
        id: "grizzly_attack",
        unique: false,
        weight: 10,
        condition: (state) => state.distance > 1400, // Mountains
        pages: [
            "You are gathering firewood in a dense pine thicket off the main trail.",
            "You hear a terrifying, deep growl behind you.",
            "You turn slowly. Standing on its hind legs, towering over eight feet tall, is a massive Grizzly Bear.",
            "It drops to all fours and charges!"
        ],
        choices: [
            {
                text: "Raise your rifle and aim for the heart!",
                action: (state) => {
                    if (state.inventory.bullets >= 5) {
                        state.inventory.bullets -= 5;
                        if (Math.random() > 0.3) {
                            state.inventory.food += 150;
                            return {
                                pages: [
                                    "Your hands shake, but you hold your breath and squeeze the trigger.",
                                    "The rifle barks! The bear roars, stumbling, but keeps coming.",
                                    "You frantically reload and fire again, dropping the beast mere feet from where you stand.",
                                    "You survived, and you harvest 150 lbs of bear meat!"
                                ]
                            };
                        } else {
                            state.party[0].health -= 60;
                            return {
                                pages: [
                                    "You fire, but the bullet hits the bear's thick shoulder bone!",
                                    "The grizzly slams into you, swiping its massive claws across your chest.",
                                    "Your party hears the screams and rushes in, firing their guns to scare the bear away.",
                                    "You survive, but you are critically injured, losing 60 health."
                                ]
                            };
                        }
                    } else {
                        state.party[0].health -= 80;
                        return {
                            pages: [
                                "You reach for your rifle, but realize you are completely out of bullets!",
                                "You try to run, but the bear is infinitely faster.",
                                "It mauls you brutally before losing interest and wandering back into the woods.",
                                "You are clinging to life by a thread."
                            ]
                        };
                    }
                }
            },
            {
                text: "Play dead.",
                action: (state) => {
                    if (Math.random() > 0.5) {
                        return {
                            pages: [
                                "You throw yourself to the dirt and cover your neck with your hands.",
                                "The bear approaches, sniffing your boots and huffing hot breath on your neck.",
                                "After what feels like an eternity, it grunts and lumbers away. You are unharmed."
                            ]
                        };
                    } else {
                        state.party[0].health -= 40;
                        return {
                            pages: [
                                "You drop to the dirt, but the bear isn't fooled.",
                                "It bites into your leg, tossing you into a bush like a ragdoll.",
                                "Satisfied that you are defeated, it leaves. You suffer a terrible bite wound."
                            ]
                        };
                    }
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 13. THE RATTLESNAKE (Medical)
    // ---------------------------------------------------------
    {
        id: "rattlesnake_bite",
        unique: false,
        weight: 12,
        condition: (state) => state.distance > 400 && state.distance < 1600, // Plains & Desert
        pages: [
            "While walking beside the wagon to lighten the load, a member of your party steps over a sun-baked rock.",
            "There is a sharp, terrifying *RATTLE*.",
            "Quicker than the eye can see, a Western Diamondback strikes, sinking its fangs deep into their calf!"
        ],
        choices: [
            {
                text: "Cut the wound and try to suck out the poison.",
                action: (state) => {
                    let victim = state.party[Math.floor(Math.random() * state.party.length)];
                    if (Math.random() > 0.5) {
                        victim.health -= 15;
                        return {
                            pages: [
                                "You quickly pull a knife, slice an 'X' over the bite marks, and suck out the venom.",
                                `The leg swells and turns black, but ${victim.name} survives the fever.`,
                                "They lose 15 health, but they will live."
                            ]
                        };
                    } else {
                        victim.health -= 40;
                        victim.disease = "a Snakebite";
                        return {
                            pages: [
                                "You try to extract the venom, but it's too late. It has entered the bloodstream.",
                                `${victim.name} goes into shock, sweating profusely and hallucinating.`,
                                "They are critically ill and lose 40 health."
                            ]
                        };
                    }
                }
            },
            {
                text: "Apply a tourniquet and rest for 3 days.",
                action: (state) => {
                    let victim = state.party[Math.floor(Math.random() * state.party.length)];
                    state.day += 3;
                    victim.health -= 10;
                    return {
                        pages: [
                            "You tightly bind the leg above the knee to slow the venom and force the party to halt.",
                            `For three days, you nurse ${victim.name} through a terrible fever.`,
                            "You lose 3 days of travel, but the treatment works. They only lose 10 health."
                        ]
                    };
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 14. BLIZZARD SURVIVAL (Weather/Extreme)
    // ---------------------------------------------------------
    {
        id: "mountain_blizzard",
        unique: false,
        weight: 15,
        condition: (state) => state.weather === 'Blizzard' || state.weather === 'Very Cold',
        pages: [
            "The temperature plummets. The sky turns a bruised, violent purple.",
            "Within minutes, a whiteout blizzard engulfs the wagon. The wind screams, driving snow so hard it feels like glass.",
            "The oxen refuse to move. If you don't get warm soon, the entire party will freeze to death."
        ],
        choices: [
            {
                text: "Burn the spare wagon parts for heat.",
                action: (state) => {
                    if (state.inventory.wheels > 0 || state.inventory.axles > 0) {
                        state.inventory.wheels = 0;
                        state.inventory.axles = 0;
                        return {
                            pages: [
                                "You pull the spare wheels and axles from the undercarriage and chop them into firewood.",
                                "You huddle under the tarp around a small, smoky fire in an iron pot.",
                                "You survive the storm, but you burned all of your spare parts."
                            ]
                        };
                    } else {
                        state.party.forEach(p => { if (p.health > 0) p.health -= 40; });
                        return {
                            pages: [
                                "You look for spare parts to burn, but you have none!",
                                "You huddle together under thin blankets as the temperature drops below zero.",
                                "When the storm finally breaks two days later, everyone is suffering from severe frostbite.",
                                "The entire party loses 40 health."
                            ]
                        };
                    }
                }
            },
            {
                text: "Push through the storm! We can't stop!",
                action: (state) => {
                    state.party.forEach(p => { if (p.health > 0) p.health -= 50; });
                    state.inventory.oxen -= 1;
                    return {
                        pages: [
                            "You brutally whip the oxen, forcing them into the howling whiteout.",
                            "The wagon gets stuck in a snowdrift. You force the party out to push.",
                            "The exposure is lethal. One of your oxen freezes to death in the harness.",
                            "The party barely makes it to a treeline, losing 50 health across the board."
                        ]
                    };
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 15. SPOILED PROVISIONS (Inventory)
    // ---------------------------------------------------------
    {
        id: "spoiled_meat",
        unique: false,
        weight: 12,
        condition: (state) => state.weather === 'Hot' || state.weather === 'Very Hot',
        pages: [
            "You open a barrel of salted pork to prepare the evening meal.",
            "A foul, rancid odor hits you like a physical punch. Maggots writhe in the salt.",
            "The intense heat of the past few days has spoiled a large portion of your meat supply."
        ],
        choices: [
            {
                text: "Throw the spoiled meat away.",
                action: (state) => {
                    let lostFood = Math.floor(Math.random() * 80) + 40;
                    state.inventory.food = Math.max(0, state.inventory.food - lostFood);
                    return {
                        pages: [
                            "You make the hard decision to dump the ruined meat on the side of the trail.",
                            `It hurts to see it go, but you throw away ${lostFood} lbs of food.`,
                            "The party goes to bed hungry, but healthy."
                        ]
                    };
                }
            },
            {
                text: "Boil it heavily and eat it anyway. We can't waste food.",
                action: (state) => {
                    let sick = Math.random() > 0.3;
                    if (sick) {
                        state.party.forEach(p => { 
                            if (p.health > 0) {
                                p.health -= 25;
                                p.disease = "Dysentery";
                            }
                        });
                        return {
                            pages: [
                                "You boil the meat for hours, hoping the heat kills the rot.",
                                "It tastes foul, but it fills your bellies.",
                                "By midnight, the groans begin. The entire party contracts severe Dysentery and loses 25 health."
                            ]
                        };
                    } else {
                        return {
                            pages: [
                                "You heavily spice and boil the meat.",
                                "It's a terrifying gamble, but miraculously, everyone digests it without issue.",
                                "You didn't lose any food."
                            ]
                        };
                    }
                }
            }
        ]
    },

    // ---------------------------------------------------------
    // 16. THE GRAVE ROBBER (Karma/Reward)
    // ---------------------------------------------------------
    {
        id: "grave_robber",
        unique: true,
        weight: 8,
        condition: (state) => state.distance > 500,
        pages: [
            "You pull off the trail to rest near a solitary, shallow grave.",
            "The wooden cross has blown over. The dirt is loose, partially eroded by rain.",
            "You notice the corner of a heavy, brass-bound chest sticking out of the mud near the headstone."
        ],
        choices: [
            {
                text: "Dig up the chest.",
                action: (state) => {
                    state.karma = (state.karma || 0) - 30;
                    state.money += 150;
                    let victim = state.party[Math.floor(Math.random() * state.party.length)];
                    victim.morale -= 30;
                    return {
                        pages: [
                            "You grab a shovel and quickly unearth the chest, ignoring the uneasy feeling in your gut.",
                            "Inside, you find $150 in silver coins and some fine clothing.",
                            "You pocket the money. But the camp looks at you differently now. Your karma takes a massive hit."
                        ]
                    };
                }
            },
            {
                text: "Re-bury the chest and fix the cross.",
                action: (state) => {
                    state.karma = (state.karma || 0) + 20;
                    state.morale += 15;
                    return {
                        pages: [
                            "You grab a shovel and pack fresh dirt over the exposed chest, honoring the dead.",
                            "You hammer the wooden cross back into the ground.",
                            "You leave empty-handed, but your conscience is clear. Your party's morale rises."
                        ]
                    };
                }
            }
        ]
    }
];

// --- ENGINE HELPER FUNCTIONS ---

export const getValidEvent = (currentState) => {
    const validEvents = NARRATIVE_EVENTS.filter(event => {
        if (event.unique && currentState.pastEvents?.includes(event.id)) return false;
        if (event.condition && !event.condition(currentState)) return false;
        return true;
    });

    if (validEvents.length === 0) return null;

    const totalWeight = validEvents.reduce((sum, event) => sum + event.weight, 0);
    let randomVal = Math.random() * totalWeight;
    
    for (let event of validEvents) {
        randomVal -= event.weight;
        if (randomVal <= 0) {
            if (event.unique) {
                if (!currentState.pastEvents) currentState.pastEvents = [];
                currentState.pastEvents.push(event.id);
            }
            return event;
        }
    }
    return validEvents[0]; 
};

export const checkDiseaseOutbreak = (party) => {
    const r = Math.random();
    if (r < 0.03) { 
        const healthy = party.filter(p => p.health > 0 && !p.disease);
        if (healthy.length > 0) {
            const victim = healthy[Math.floor(Math.random() * healthy.length)];
            const diseases = ["Dysentery", "Cholera", "Typhoid", "Measles"];
            victim.disease = diseases[Math.floor(Math.random() * diseases.length)];
            return `${victim.name} has contracted ${victim.disease}.`;
        }
    }
    return null;
};

export const determineWeather = (month) => {
    const r = Math.random();
    if (month >= 10 || month <= 1) return r < 0.2 ? "Blizzard" : "Very Cold";
    if (month >= 5 && month <= 8) return r < 0.1 ? "Drought" : "Hot";
    return "Fair";
};
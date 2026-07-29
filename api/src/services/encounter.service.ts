import type Monster from "../models/monster.ts";
import { collections } from "./database.service.ts";

async function generateMonsterSet(monsters: Monster[], encounterXP: number): Promise<Monster[]> {
    let selectedMonsters: any[] = [];
    let monstersXP = 0;

    while (monstersXP < encounterXP) {
        // console.log(`Current monsters XP: ${monstersXP}, Encounter XP limit: ${encounterXP}`);
        // console.log(monsters);
        const options = monsters.filter((m) => m.xp > 0 && m.xp <= (encounterXP - monstersXP));
        if (options.length === 0) break; // No more monsters can be added without exceeding XP
        const selectedMonster = getRandomMonster(options);
        // console.log(`Selected monster: ${selectedMonster.name} (XP: ${selectedMonster.xp})`);
        const existingMonster = selectedMonsters.find((m) => m.monster.name === selectedMonster.name);
        if (existingMonster) {
            // If the selected monster is already in the encounter, increment the count instead of adding a new entry
            existingMonster.count++;
        } else {
            selectedMonsters.push({ count: 1, monster: selectedMonster });
        }
        monstersXP += selectedMonster.xp;
    }

    return selectedMonsters;
}

function getRandomMonster(arr: Monster[]): any {
    if (arr.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

export async function generateEncounter(monsters: Monster[], params?: any) {
    try {
        console.log("Generating encounter with params:", params);



        return await generateMonsterSet(monsters, params?.xp || 0);
    } catch (err) {
        console.log(err);
        throw new Error("Failed to generate encounter");
    }
}

export async function generateEncounters(params?: any) {
    const xpThresholdsCollection = collections.xpthresholds;
    if (!xpThresholdsCollection) {
        throw new Error("XP thresholds collection is not initialized");
    }
    const monstersCollection = collections.monsters;
    if (!monstersCollection) {
        throw new Error("Monster collection is not initialized");
    }
    
    const xpThresholds = await xpThresholdsCollection.findOne({ level: eval(params?.avgPlayerLevel) });
    if (!xpThresholds) {
        throw new Error("XP thresholds document not found");
    }
    console.log(xpThresholds);

    const conditions: any[] = [];
    if (params) {
        if (params.name) {
            conditions.push({ name: { $regex: params.name, $options: "i" } });
        }
        if (params.monsterCR !== undefined) {
            conditions.push({ challenge_rating: { $lte: eval(params.monsterCR) } });
        }
        const calculatedMonsterXP = params.monsterXP !== undefined
            ? params.monsterXP
            : xpThresholds['2024'].high * eval(params.partySize);
        console.log(`Calculated monsterXP: ${calculatedMonsterXP}`);
        if (calculatedMonsterXP !== undefined) {
            conditions.push({ xp: { $lte: eval(calculatedMonsterXP) } });
        }
        if (params.type) {
            conditions.push({ type: { $regex: `^${params.type}$`, $options: "i" } });
        }
    }
    
    const query = conditions.length ? { $and: conditions } : {};
    console.log("Querying monsters with:", query);
    const monsters = await monstersCollection.find(query).toArray() as Monster[];
    console.log(`Found ${monsters.length} monsters matching criteria.`);

    const partySize = eval(params?.partySize ?? "1");
    let encounters = [];
    encounters.push({ difficulty: "low", encounter: await generateMonsterSet(monsters, xpThresholds['2024'].low * partySize) });
    encounters.push({ difficulty: "moderate", encounter: await generateMonsterSet(monsters, xpThresholds['2024'].moderate * partySize) });
    encounters.push({ difficulty: "high", encounter: await generateMonsterSet(monsters, xpThresholds['2024'].high * partySize) });

    return encounters;
}
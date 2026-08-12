import type Monster from "../models/monster.ts";
import Parameters from "../models/parameters.ts";
import { collections } from "./database.service.ts";

interface MonsterEntry {
    count: number;
    monster: Monster;
}

export async function generateMonsterSet(
    monsters: Monster[],
    encounterXP: number,
    getXp: (monster: Monster) => number = (monster) => monster.xp,
): Promise<MonsterEntry[]> {
    const selectedMonsters: MonsterEntry[] = [];
    let monstersXP = 0;

    while (monstersXP < encounterXP) {
        // console.log(`Current monsters XP: ${monstersXP}, Encounter XP limit: ${encounterXP}`);
        // console.log(monsters);
        const options = monsters.filter((m) => getXp(m) > 0 && getXp(m) <= (encounterXP - monstersXP));
        if (options.length === 0) break; // No more monsters can be added without exceeding XP
        const selectedMonster = getRandomMonster(options);
        // console.log(`Selected monster: ${selectedMonster.name} (XP: ${getXp(selectedMonster)})`);
        const existingMonster = selectedMonsters.find((entry) => entry.monster.name === selectedMonster.name);
        if (existingMonster) {
            // If the selected monster is already in the encounter, increment the count instead of adding a new entry
            existingMonster.count++;
        } else {
            selectedMonsters.push({ count: 1, monster: selectedMonster });
        }
        monstersXP += getXp(selectedMonster);
    }

    return selectedMonsters;
}

export function getRandomMonster(arr: Monster[]): Monster {
    // Callers only invoke this after confirming arr is non-empty (see the options.length
    // check above), so the index is always in range.
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex]!;
}

const PARTY_SIZE_BOUNDS = { min: 1, max: 20 };
const PLAYER_LEVEL_BOUNDS = { min: 1, max: 20 };

export function parseParams(query: Record<string, unknown> | undefined): Parameters {
    const partySize = eval(String(query?.partySize ?? "1"));
    if (typeof partySize !== "number" || partySize < PARTY_SIZE_BOUNDS.min || partySize > PARTY_SIZE_BOUNDS.max) {
        throw new Error(`partySize must be a number between ${PARTY_SIZE_BOUNDS.min} and ${PARTY_SIZE_BOUNDS.max}`);
    }

    const avgPlayerLevel = eval(String(query?.avgPlayerLevel));
    if (typeof avgPlayerLevel !== "number" || avgPlayerLevel < PLAYER_LEVEL_BOUNDS.min || avgPlayerLevel > PLAYER_LEVEL_BOUNDS.max) {
        throw new Error(`avgPlayerLevel must be a number between ${PLAYER_LEVEL_BOUNDS.min} and ${PLAYER_LEVEL_BOUNDS.max}`);
    }

    let monsterCR: number | null = null;
    if (query?.monsterCR !== undefined) {
        monsterCR = eval(String(query.monsterCR));
        if (typeof monsterCR !== "number" || monsterCR < 0) {
            throw new Error("monsterCR must be a non-negative number");
        }
    }

    let monsterXP: number | null = null;
    if (query?.monsterXP !== undefined) {
        monsterXP = eval(String(query.monsterXP));
        if (typeof monsterXP !== "number" || monsterXP <= 0) {
            throw new Error("monsterXP must be a positive number");
        }
    }

    const type = typeof query?.type === "string" && query.type.length > 0 ? query.type : null;
    const name = typeof query?.name === "string" && query.name.length > 0 ? query.name : null;
    const inLair = parseBoolean(query?.inLair, "inLair");

    return new Parameters(partySize, avgPlayerLevel, monsterCR, monsterXP, type, name, inLair);
}

function parseBoolean(value: unknown, fieldName: string): boolean {
    if (value === undefined) return false;
    if (typeof value !== "string") {
        throw new Error(`${fieldName} must be true or false`);
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    throw new Error(`${fieldName} must be true or false`);
}

export async function generateEncounters(rawParams?: Record<string, unknown>) {
    const xpThresholdsCollection = collections.xpthresholds;
    if (!xpThresholdsCollection) {
        throw new Error("XP thresholds collection is not initialized");
    }
    const monstersCollection = collections.monsters;
    if (!monstersCollection) {
        throw new Error("Monster collection is not initialized");
    }

    const params = parseParams(rawParams);

    const xpThresholds = await xpThresholdsCollection.findOne({ level: params.avgPlayerLevel });
    if (!xpThresholds) {
        throw new Error("XP thresholds document not found");
    }
    console.log(xpThresholds);

    // In-lair encounters prefer each monster's separate lair XP value (per D&D encounter-
    // building rules, lair actions make a monster more dangerous, worth more effective
    // XP), falling back to its normal xp when it has no recorded lair XP — monsters
    // without one are still included, just budgeted at their normal XP.
    const getXp = params.inLair ? (m: Monster) => m.xp_in_lair ?? m.xp : (m: Monster) => m.xp;

    const conditions: Record<string, unknown>[] = [];
    if (params.name) {
        conditions.push({ name: { $regex: params.name, $options: "i" } });
    }
    if (params.monsterCR !== null) {
        conditions.push({ challenge_rating: { $lte: params.monsterCR } });
    }
    const monsterXP = params.monsterXP ?? xpThresholds['2024'].high * params.partySize;
    console.log(`Calculated monsterXP: ${monsterXP}`);
    // Always pre-filter on the base xp field, not xp_in_lair: xp_in_lair is never lower
    // than xp for any monster in this dataset, so this is guaranteed to include every
    // monster whose effective (getXp) value could fit the budget, in-lair or not — the
    // real affordability check happens per-monster in generateMonsterSet via getXp.
    conditions.push({ xp: { $lte: monsterXP } });
    if (params.type) {
        conditions.push({ type: { $regex: `^${params.type}$`, $options: "i" } });
    }

    const query = conditions.length ? { $and: conditions } : {};
    console.log("Querying monsters with:", query);
    const monsters = await monstersCollection.find(query).toArray() as Monster[];
    console.log(`Found ${monsters.length} monsters matching criteria.`);

    const lowThreshold = xpThresholds['2024'].low * params.partySize;
    const moderateThreshold = xpThresholds['2024'].moderate * params.partySize;
    const highThreshold = xpThresholds['2024'].high * params.partySize;

    const encounters = [];
    encounters.push({ difficulty: "low", xpThreshold: lowThreshold, encounter: await generateMonsterSet(monsters, lowThreshold, getXp) });
    encounters.push({ difficulty: "moderate", xpThreshold: moderateThreshold, encounter: await generateMonsterSet(monsters, moderateThreshold, getXp) });
    encounters.push({ difficulty: "high", xpThreshold: highThreshold, encounter: await generateMonsterSet(monsters, highThreshold, getXp) });

    return encounters;
}

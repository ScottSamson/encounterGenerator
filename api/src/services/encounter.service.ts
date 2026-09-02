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
    maxMonsterProfiles: number | null = null,
    maxTotalMonsters: number | null = null,
): Promise<MonsterEntry[]> {
    const selectedMonsters: MonsterEntry[] = [];
    let monstersXP = 0;
    let totalMonsterCount = 0;

    while (monstersXP < encounterXP) {
        // Unlike the distinct-profile cap below, there's no fallback pool to fall back to
        // here — once the total creature count hits the cap, the encounter simply stops
        // growing, even if that leaves the XP budget unfilled.
        if (maxTotalMonsters !== null && totalMonsterCount >= maxTotalMonsters) break;
        // console.log(`Current monsters XP: ${monstersXP}, Encounter XP limit: ${encounterXP}`);
        // console.log(monsters);
        let options = monsters.filter((m) => getXp(m) > 0 && getXp(m) <= (encounterXP - monstersXP));
        // Once the distinct-profile cap is reached, restrict further picks to monsters
        // already selected (by name/stat block) so the count keeps climbing toward the XP
        // budget without introducing another stat block for the DM to track.
        if (maxMonsterProfiles !== null && selectedMonsters.length >= maxMonsterProfiles) {
            const selectedNames = new Set(selectedMonsters.map((entry) => entry.monster.name));
            options = options.filter((m) => selectedNames.has(m.name));
        }
        if (options.length === 0) break; // No more monsters can be added without exceeding XP
        // On the last pick allowed by maxTotalMonsters, a uniform-random choice could land
        // on a monster far below the remaining budget even when a closer-fitting option is
        // available — so bias toward the highest-XP option instead, to land as close to the
        // threshold as the pool allows rather than leaving it randomly short.
        const isLastAllowedPick = maxTotalMonsters !== null && totalMonsterCount === maxTotalMonsters - 1;
        const selectedMonster = isLastAllowedPick ? getClosestToBudgetMonster(options, getXp) : getRandomMonster(options);
        // console.log(`Selected monster: ${selectedMonster.name} (XP: ${getXp(selectedMonster)})`);
        const existingMonster = selectedMonsters.find((entry) => entry.monster.name === selectedMonster.name);
        if (existingMonster) {
            // If the selected monster is already in the encounter, increment the count instead of adding a new entry
            existingMonster.count++;
        } else {
            selectedMonsters.push({ count: 1, monster: selectedMonster });
        }
        monstersXP += getXp(selectedMonster);
        totalMonsterCount++;
    }

    return selectedMonsters;
}

// Picks the highest-XP monster in `arr` (ties broken randomly) — used when a cap forces
// this to be the final pick, so the encounter lands as close to the XP budget as the
// available pool allows instead of a uniform-random pick that could be far under.
export function getClosestToBudgetMonster(arr: Monster[], getXp: (monster: Monster) => number): Monster {
    const maxXp = Math.max(...arr.map(getXp));
    const closest = arr.filter((m) => getXp(m) === maxXp);
    return getRandomMonster(closest);
}

export function getRandomMonster(arr: Monster[]): Monster {
    // Callers only invoke this after confirming arr is non-empty (see the options.length
    // check above), so the index is always in range.
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex]!;
}

// Fuzzy match: every character of `query` must appear in `target`, in order, but not
// necessarily contiguously (e.g. "olbr" matches "Owlbear") — the same technique used by
// fuzzy finders like VS Code's Quick Open. This is a superset of plain substring
// matching, so exact/partial name searches keep working exactly as before.
export function isFuzzyMatch(query: string, target: string): boolean {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    let qIndex = 0;
    for (let tIndex = 0; tIndex < t.length && qIndex < q.length; tIndex++) {
        if (t[tIndex] === q[qIndex]) {
            qIndex++;
        }
    }
    return qIndex === q.length;
}

const PARTY_SIZE_BOUNDS = { min: 1, max: 20 };
const PLAYER_LEVEL_BOUNDS = { min: 1, max: 20 };

// Safe numeric parser (no eval) for the newer numeric filters below — deliberately not
// following the eval()-based pattern used by the older fields further down, since that
// pattern is a known, tracked issue (see README TODOs), not one to extend to new code.
function parseOptionalNumber(value: unknown, fieldName: string, { allowNegative = false }: { allowNegative?: boolean } = {}): number | null {
    if (value === undefined) return null;
    if (typeof value !== "string") {
        throw new Error(`${fieldName} must be a number`);
    }
    const trimmed = value.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
        throw new Error(`${fieldName} must be a number`);
    }
    const n = Number(trimmed);
    if (!allowNegative && n < 0) {
        throw new Error(`${fieldName} must be a non-negative number`);
    }
    return n;
}

// Parses a comma-separated multi-select value (e.g. "Small,Medium") into a list of
// trimmed, non-empty options — used for filters offered as multi-select dropdowns in the
// UI, matched with OR semantics (a monster matches if it matches ANY selected option).
function parseMultiValue(value: unknown): string[] | null {
    if (typeof value !== "string" || value.length === 0) return null;
    const values = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    return values.length > 0 ? values : null;
}

// Parses a {min, max} pair of query params for a ranged numeric filter (e.g. hpMin/hpMax)
// and rejects an inverted range (min greater than max) up front, rather than silently
// producing a query that can never match anything.
function parseOptionalRange(
    query: Record<string, unknown> | undefined,
    minKey: string,
    maxKey: string,
    fieldLabel: string,
): { min: number | null; max: number | null } {
    const min = parseOptionalNumber(query?.[minKey], `${fieldLabel} minimum`);
    const max = parseOptionalNumber(query?.[maxKey], `${fieldLabel} maximum`);
    if (min !== null && max !== null && min > max) {
        throw new Error(`${fieldLabel} minimum must not be greater than ${fieldLabel} maximum`);
    }
    return { min, max };
}

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

    const type = parseMultiValue(query?.type);
    const name = typeof query?.name === "string" && query.name.length > 0 ? query.name : null;
    const inLair = parseBoolean(query?.inLair, "inLair");
    const vulnerabilities = parseMultiValue(query?.vulnerabilities);
    const resistances = parseMultiValue(query?.resistances);
    const immunities = parseMultiValue(query?.immunities);
    const senses = typeof query?.senses === "string" && query.senses.length > 0 ? query.senses : null;
    const attacks = typeof query?.attacks === "string" && query.attacks.length > 0 ? query.attacks : null;
    const traits = typeof query?.traits === "string" && query.traits.length > 0 ? query.traits : null;

    const { min: proficiencyBonusMin, max: proficiencyBonusMax } = parseOptionalRange(
        query,
        "proficiencyBonusMin",
        "proficiencyBonusMax",
        "proficiencyBonus",
    );
    const { min: hpMin, max: hpMax } = parseOptionalRange(query, "hpMin", "hpMax", "hp");
    const { min: acMin, max: acMax } = parseOptionalRange(query, "acMin", "acMax", "ac");
    const initiative = parseOptionalNumber(query?.initiative, "initiative", { allowNegative: true });
    const size = parseMultiValue(query?.size);
    const speed = typeof query?.speed === "string" && query.speed.length > 0 ? query.speed : null;

    const maxMonsterProfiles = parseOptionalNumber(query?.maxMonsterProfiles, "maxMonsterProfiles");
    if (maxMonsterProfiles !== null && maxMonsterProfiles < 1) {
        throw new Error("maxMonsterProfiles must be at least 1");
    }

    const maxTotalMonsters = parseOptionalNumber(query?.maxTotalMonsters, "maxTotalMonsters");
    if (maxTotalMonsters !== null && maxTotalMonsters < 1) {
        throw new Error("maxTotalMonsters must be at least 1");
    }

    return new Parameters({
        partySize,
        avgPlayerLevel,
        monsterCR,
        monsterXP,
        type,
        name,
        inLair,
        vulnerabilities,
        resistances,
        immunities,
        senses,
        attacks,
        traits,
        proficiencyBonusMin,
        proficiencyBonusMax,
        hpMin,
        hpMax,
        initiative,
        acMin,
        acMax,
        size,
        speed,
        maxMonsterProfiles,
        maxTotalMonsters,
    });
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

    // In-lair encounters prefer each monster's separate lair XP value (per encounter-
    // building rules, lair actions make a monster more dangerous, worth more effective
    // XP), falling back to its normal xp when it has no recorded lair XP — monsters
    // without one are still included, just budgeted at their normal XP.
    const getXp = params.inLair ? (m: Monster) => m.xp_in_lair ?? m.xp : (m: Monster) => m.xp;

    const conditions: Record<string, unknown>[] = [];
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
    if (params.proficiencyBonusMin !== null) {
        conditions.push({ proficiency_bonus: { $gte: params.proficiencyBonusMin } });
    }
    if (params.proficiencyBonusMax !== null) {
        conditions.push({ proficiency_bonus: { $lte: params.proficiencyBonusMax } });
    }
    if (params.hpMin !== null) {
        conditions.push({ hp: { $gte: params.hpMin } });
    }
    if (params.hpMax !== null) {
        conditions.push({ hp: { $lte: params.hpMax } });
    }
    if (params.initiative !== null) {
        conditions.push({ initiative: { $lte: params.initiative } });
    }
    if (params.acMin !== null) {
        conditions.push({ ac: { $gte: params.acMin } });
    }
    if (params.acMax !== null) {
        conditions.push({ ac: { $lte: params.acMax } });
    }

    const query = conditions.length ? { $and: conditions } : {};
    console.log("Querying monsters with:", query);
    let monsters = await monstersCollection.find(query).toArray() as Monster[];
    // All text search fields are fuzzy (see isFuzzyMatch), which isn't expressible as a
    // Mongo query, so they're applied in-memory after the rest of the filters have
    // narrowed the set. A monster missing the field entirely never matches (e.g.
    // searching "fire" under vulnerabilities excludes monsters with no vulnerabilities).
    if (params.name) {
        monsters = monsters.filter((m) => isFuzzyMatch(params.name as string, m.name));
    }
    if (params.type) {
        monsters = monsters.filter((m) => params.type!.some((t) => isFuzzyMatch(t, m.type)));
    }
    if (params.vulnerabilities) {
        monsters = monsters.filter(
            (m) => m.vulnerabilities !== undefined && params.vulnerabilities!.some((v) => isFuzzyMatch(v, m.vulnerabilities as string)),
        );
    }
    if (params.resistances) {
        monsters = monsters.filter(
            (m) => m.resistances !== undefined && params.resistances!.some((r) => isFuzzyMatch(r, m.resistances as string)),
        );
    }
    if (params.immunities) {
        monsters = monsters.filter(
            (m) => m.immunities !== undefined && params.immunities!.some((i) => isFuzzyMatch(i, m.immunities as string)),
        );
    }
    if (params.senses) {
        monsters = monsters.filter((m) => m.senses !== undefined && isFuzzyMatch(params.senses as string, m.senses));
    }
    if (params.attacks) {
        monsters = monsters.filter((m) => (m.actions ?? []).some((action) => isFuzzyMatch(params.attacks as string, action.name)));
    }
    if (params.traits) {
        monsters = monsters.filter((m) => (m.traits ?? []).some((trait) => isFuzzyMatch(params.traits as string, trait.name)));
    }
    if (params.size) {
        monsters = monsters.filter((m) => m.size !== undefined && params.size!.some((s) => isFuzzyMatch(s, m.size as string)));
    }
    if (params.speed) {
        monsters = monsters.filter((m) => m.speed_raw !== undefined && isFuzzyMatch(params.speed as string, m.speed_raw));
    }
    console.log(`Found ${monsters.length} monsters matching criteria.`);

    const lowThreshold = xpThresholds['2024'].low * params.partySize;
    const moderateThreshold = xpThresholds['2024'].moderate * params.partySize;
    const highThreshold = xpThresholds['2024'].high * params.partySize;

    const encounters = [];
    encounters.push({ difficulty: "low", xpThreshold: lowThreshold, encounter: await generateMonsterSet(monsters, lowThreshold, getXp, params.maxMonsterProfiles, params.maxTotalMonsters) });
    encounters.push({ difficulty: "moderate", xpThreshold: moderateThreshold, encounter: await generateMonsterSet(monsters, moderateThreshold, getXp, params.maxMonsterProfiles, params.maxTotalMonsters) });
    encounters.push({ difficulty: "high", xpThreshold: highThreshold, encounter: await generateMonsterSet(monsters, highThreshold, getXp, params.maxMonsterProfiles, params.maxTotalMonsters) });

    return encounters;
}

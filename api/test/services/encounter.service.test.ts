import Monster from "../../src/models/monster.ts";
import { collections } from "../../src/services/database.service.ts";
import {
  generateEncounters,
  generateMonsterSet,
  getRandomMonster,
  isFuzzyMatch,
  parseParams,
} from "../../src/services/encounter.service.ts";

jest.mock("../../src/services/database.service.ts", () => ({
  collections: {},
}));

// Readable construction for the many-optional-field Monster class — start from sane
// defaults (xp=50 fits the low/moderate/high test budgets used below) and override only
// what a given test cares about, instead of a long run of positional `undefined`s.
function makeMonster(overrides: Partial<Monster> = {}): Monster {
  return Object.assign(new Monster("Test Monster", 50, 0.25, "Beast"), overrides);
}

describe("parseParams", () => {
  it("parses a fully specified, valid query", () => {
    const params = parseParams({
      partySize: "4",
      avgPlayerLevel: "5",
      monsterCR: "1/2",
      monsterXP: "400",
      type: "Humanoid",
      name: "Goblin",
    });

    expect(params.partySize).toBe(4);
    expect(params.avgPlayerLevel).toBe(5);
    expect(params.monsterCR).toBe(0.5);
    expect(params.monsterXP).toBe(400);
    expect(params.type).toEqual(["Humanoid"]);
    expect(params.name).toBe("Goblin");
  });

  it("parses a comma-separated type/size into a list (multi-select filters)", () => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1", type: "Humanoid, Beast", size: "Small,Medium" });
    expect(params.type).toEqual(["Humanoid", "Beast"]);
    expect(params.size).toEqual(["Small", "Medium"]);
  });

  it("parses a comma-separated vulnerabilities/resistances/immunities into a list (multi-select filters)", () => {
    const params = parseParams({
      partySize: "4",
      avgPlayerLevel: "1",
      vulnerabilities: "Fire, Cold",
      resistances: "Acid,Poison",
      immunities: "Charmed, Frightened",
    });
    expect(params.vulnerabilities).toEqual(["Fire", "Cold"]);
    expect(params.resistances).toEqual(["Acid", "Poison"]);
    expect(params.immunities).toEqual(["Charmed", "Frightened"]);
  });

  it("defaults partySize to 1 when omitted", () => {
    const params = parseParams({ avgPlayerLevel: "1" });
    expect(params.partySize).toBe(1);
  });

  it.each([0, 21])("rejects partySize out of bounds (%s)", (value) => {
    expect(() => parseParams({ partySize: String(value), avgPlayerLevel: "1" })).toThrow(
      "partySize must be a number",
    );
  });

  it("rejects a missing avgPlayerLevel", () => {
    expect(() => parseParams({ partySize: "4" })).toThrow("avgPlayerLevel must be a number");
  });

  it.each([0, 21])("rejects avgPlayerLevel out of bounds (%s)", (value) => {
    expect(() => parseParams({ partySize: "4", avgPlayerLevel: String(value) })).toThrow(
      "avgPlayerLevel must be a number",
    );
  });

  it("treats monsterCR as absent (null) when not provided", () => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1" });
    expect(params.monsterCR).toBeNull();
  });

  it("rejects a negative monsterCR", () => {
    expect(() => parseParams({ partySize: "4", avgPlayerLevel: "1", monsterCR: "-1" })).toThrow(
      "monsterCR must be a non-negative number",
    );
  });

  it("treats monsterXP as absent (null) when not provided", () => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1" });
    expect(params.monsterXP).toBeNull();
  });

  it.each(["0", "-5"])("rejects a non-positive monsterXP (%s)", (value) => {
    expect(() => parseParams({ partySize: "4", avgPlayerLevel: "1", monsterXP: value })).toThrow(
      "monsterXP must be a positive number",
    );
  });

  it("treats an empty type/name as absent (null)", () => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1", type: "", name: "" });
    expect(params.type).toBeNull();
    expect(params.name).toBeNull();
  });

  it("treats a missing type/name as absent (null)", () => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1" });
    expect(params.type).toBeNull();
    expect(params.name).toBeNull();
  });

  it("parses vulnerabilities, resistances, immunities, senses, attacks, and traits when provided", () => {
    const params = parseParams({
      partySize: "4",
      avgPlayerLevel: "1",
      vulnerabilities: "Fire",
      resistances: "Cold",
      immunities: "Poison",
      senses: "Darkvision",
      attacks: "Bite",
      traits: "Amphibious",
    });

    expect(params.vulnerabilities).toEqual(["Fire"]);
    expect(params.resistances).toEqual(["Cold"]);
    expect(params.immunities).toEqual(["Poison"]);
    expect(params.senses).toBe("Darkvision");
    expect(params.attacks).toBe("Bite");
    expect(params.traits).toBe("Amphibious");
  });

  it("treats missing or empty vulnerabilities/resistances/immunities/senses/attacks/traits as absent (null)", () => {
    const params = parseParams({
      partySize: "4",
      avgPlayerLevel: "1",
      vulnerabilities: "",
      resistances: "",
      immunities: "",
      senses: "",
      attacks: "",
      traits: "",
    });

    expect(params.vulnerabilities).toBeNull();
    expect(params.resistances).toBeNull();
    expect(params.immunities).toBeNull();
    expect(params.senses).toBeNull();
    expect(params.attacks).toBeNull();
    expect(params.traits).toBeNull();
  });

  it("defaults inLair to false when omitted", () => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1" });
    expect(params.inLair).toBe(false);
  });

  it.each(["true", "TRUE", " True "])("parses %j as inLair true", (value) => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1", inLair: value });
    expect(params.inLair).toBe(true);
  });

  it("parses 'false' as inLair false", () => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1", inLair: "false" });
    expect(params.inLair).toBe(false);
  });

  it("rejects an invalid inLair value", () => {
    expect(() => parseParams({ partySize: "4", avgPlayerLevel: "1", inLair: "yes" })).toThrow(
      "inLair must be true or false",
    );
  });

  it("parses proficiencyBonus/hp/ac min+max, initiative, size, and speed when provided", () => {
    const params = parseParams({
      partySize: "4",
      avgPlayerLevel: "1",
      proficiencyBonusMin: "1",
      proficiencyBonusMax: "2",
      hpMin: "5",
      hpMax: "10",
      initiative: "-1",
      acMin: "12",
      acMax: "15",
      size: "Small",
      speed: "30 ft.",
    });

    expect(params.proficiencyBonusMin).toBe(1);
    expect(params.proficiencyBonusMax).toBe(2);
    expect(params.hpMin).toBe(5);
    expect(params.hpMax).toBe(10);
    expect(params.initiative).toBe(-1);
    expect(params.acMin).toBe(12);
    expect(params.acMax).toBe(15);
    expect(params.size).toEqual(["Small"]);
    expect(params.speed).toBe("30 ft.");
  });

  it("treats missing proficiencyBonus/hp/ac min+max, initiative, size, and speed as absent (null)", () => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1" });

    expect(params.proficiencyBonusMin).toBeNull();
    expect(params.proficiencyBonusMax).toBeNull();
    expect(params.hpMin).toBeNull();
    expect(params.hpMax).toBeNull();
    expect(params.initiative).toBeNull();
    expect(params.acMin).toBeNull();
    expect(params.acMax).toBeNull();
    expect(params.size).toBeNull();
    expect(params.speed).toBeNull();
  });

  it.each(["proficiencyBonusMin", "proficiencyBonusMax", "hpMin", "hpMax", "acMin", "acMax"])(
    "rejects a negative %s",
    (field) => {
      expect(() => parseParams({ partySize: "4", avgPlayerLevel: "1", [field]: "-1" })).toThrow(/must be a non-negative number/);
    },
  );

  it("allows a negative initiative", () => {
    const params = parseParams({ partySize: "4", avgPlayerLevel: "1", initiative: "-5" });
    expect(params.initiative).toBe(-5);
  });

  it.each(["proficiencyBonusMin", "hpMin", "initiative", "acMin"])("rejects a non-numeric %s", (field) => {
    expect(() => parseParams({ partySize: "4", avgPlayerLevel: "1", [field]: "abc" })).toThrow(/must be a number/);
  });

  it.each([
    ["proficiencyBonusMin", "proficiencyBonusMax"],
    ["hpMin", "hpMax"],
    ["acMin", "acMax"],
  ])("rejects an inverted range where %s is greater than %s", (minField, maxField) => {
    expect(() =>
      parseParams({ partySize: "4", avgPlayerLevel: "1", [minField]: "10", [maxField]: "5" }),
    ).toThrow("minimum must not be greater than");
  });
});

describe("getRandomMonster", () => {
  const originalRandom = Math.random;

  afterEach(() => {
    Math.random = originalRandom;
  });

  it("returns the only monster in a single-element array", () => {
    const goblin = new Monster("Goblin", 50, 0.25, "Humanoid");
    expect(getRandomMonster([goblin])).toBe(goblin);
  });

  it("picks the monster at the index Math.random maps to", () => {
    const goblin = new Monster("Goblin", 50, 0.25, "Humanoid");
    const owlbear = new Monster("Owlbear", 700, 3, "Monstrosity");

    Math.random = () => 0.99; // maps to the last index
    expect(getRandomMonster([goblin, owlbear])).toBe(owlbear);

    Math.random = () => 0; // maps to the first index
    expect(getRandomMonster([goblin, owlbear])).toBe(goblin);
  });
});

describe("isFuzzyMatch", () => {
  it("matches an exact substring", () => {
    expect(isFuzzyMatch("owl", "Owlbear")).toBe(true);
  });

  it("matches non-contiguous characters in order (true fuzzy matching)", () => {
    expect(isFuzzyMatch("olbr", "Owlbear")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isFuzzyMatch("OWLBEAR", "owlbear")).toBe(true);
  });

  it("rejects out-of-order characters", () => {
    expect(isFuzzyMatch("raebwlo", "Owlbear")).toBe(false);
  });

  it("rejects characters not present in the target at all", () => {
    expect(isFuzzyMatch("owlz", "Owlbear")).toBe(false);
  });

  it("matches an empty query against anything", () => {
    expect(isFuzzyMatch("", "Owlbear")).toBe(true);
  });
});

describe("generateMonsterSet", () => {
  it("returns an empty set when given no monsters", async () => {
    const result = await generateMonsterSet([], 100);
    expect(result).toEqual([]);
  });

  it("returns an empty set when the encounter budget is zero", async () => {
    const goblin = new Monster("Goblin", 50, 0.25, "Humanoid");
    const result = await generateMonsterSet([goblin], 0);
    expect(result).toEqual([]);
  });

  it("excludes zero-xp monsters entirely (regression: they used to cause an infinite loop)", async () => {
    const freebie = new Monster("Shrieker Fungus", 0, 0, "Plant");
    const result = await generateMonsterSet([freebie], 100);
    expect(result).toEqual([]);
  });

  it("fills the budget and increments count for repeated picks instead of duplicating entries", async () => {
    const goblin = new Monster("Goblin", 50, 0.25, "Humanoid");
    // Only one monster type available, so the "random" pick is deterministic.
    const result = await generateMonsterSet([goblin], 150);

    expect(result).toEqual([{ count: 3, monster: goblin }]);
  });

  it("stops adding monsters once no remaining option fits the leftover budget", async () => {
    const bigMonster = new Monster("Owlbear", 700, 3, "Monstrosity");
    const result = await generateMonsterSet([bigMonster], 100);

    expect(result).toEqual([]);
  });

  it("uses a custom getXp selector for both filtering and budget math (in-lair mode)", async () => {
    const lairGoblin = new Monster("Goblin", 999, 0.25, "Humanoid", undefined, 200);
    const result = await generateMonsterSet([lairGoblin], 200, (m) => m.xp_in_lair ?? 0);

    expect(result).toEqual([{ count: 1, monster: lairGoblin }]);
  });

  it("excludes monsters missing the selected xp field via the getXp selector", async () => {
    const noLairData = new Monster("Goblin", 50, 0.25, "Humanoid"); // no xp_in_lair
    const result = await generateMonsterSet([noLairData], 200, (m) => m.xp_in_lair ?? 0);

    expect(result).toEqual([]);
  });
});

describe("generateEncounters", () => {
  beforeEach(() => {
    delete (collections as any).monsters;
    delete (collections as any).xpthresholds;
  });

  it("throws when the xp thresholds collection is not initialized", async () => {
    await expect(generateEncounters({ partySize: "4", avgPlayerLevel: "1" })).rejects.toThrow(
      "XP thresholds collection is not initialized",
    );
  });

  it("throws when the monsters collection is not initialized", async () => {
    (collections as any).xpthresholds = { findOne: jest.fn() };

    await expect(generateEncounters({ partySize: "4", avgPlayerLevel: "1" })).rejects.toThrow(
      "Monster collection is not initialized",
    );
  });

  it("throws when no xp thresholds document is found for the given level", async () => {
    (collections as any).xpthresholds = { findOne: jest.fn().mockResolvedValue(null) };
    (collections as any).monsters = { find: jest.fn() };

    await expect(generateEncounters({ partySize: "4", avgPlayerLevel: "1" })).rejects.toThrow(
      "XP thresholds document not found",
    );
  });

  function setUpCollections(monsters: Monster[]) {
    const findOne = jest.fn().mockResolvedValue({
      level: 1,
      "2024": { low: 50, moderate: 100, high: 150 },
    });
    const toArray = jest.fn().mockResolvedValue(monsters);
    const find = jest.fn().mockReturnValue({ toArray });
    (collections as any).xpthresholds = { findOne };
    (collections as any).monsters = { find };
    return { findOne, find, toArray };
  }

  it("returns low/moderate/high encounters built from the matched monsters", async () => {
    const goblin = new Monster("Goblin", 50, 0.25, "Humanoid");
    setUpCollections([goblin]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1" });

    expect(encounters).toEqual([
      { difficulty: "low", xpThreshold: 50, encounter: [{ count: 1, monster: goblin }] },
      { difficulty: "moderate", xpThreshold: 100, encounter: [{ count: 2, monster: goblin }] },
      { difficulty: "high", xpThreshold: 150, encounter: [{ count: 3, monster: goblin }] },
    ]);
  });

  it("does not include name in the Mongo query — fuzzy matching happens in-memory instead", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({ partySize: "1", avgPlayerLevel: "1", name: "Gob" });

    const query = find.mock.calls[0][0];
    expect(query.$and.some((condition: object) => "name" in condition)).toBe(false);
  });

  it("fuzzy-filters fetched monsters by name, excluding non-matches", async () => {
    const goblin = new Monster("Goblin", 50, 0.25, "Humanoid");
    const owlbear = new Monster("Owlbear", 50, 0.25, "Monstrosity");
    setUpCollections([goblin, owlbear]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", name: "gbln" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: goblin }]);
  });

  it("includes a challenge_rating filter when monsterCR is provided", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({ partySize: "1", avgPlayerLevel: "1", monsterCR: "1/2" });

    const query = find.mock.calls[0][0];
    expect(query.$and).toContainEqual({ challenge_rating: { $lte: 0.5 } });
  });

  it("does not include type in the Mongo query — fuzzy matching happens in-memory instead", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({ partySize: "1", avgPlayerLevel: "1", type: "Humanoid" });

    const query = find.mock.calls[0][0];
    expect(query.$and.some((condition: object) => "type" in condition)).toBe(false);
  });

  it("fuzzy-filters fetched monsters by type, excluding non-matches", async () => {
    const goblin = new Monster("Goblin", 50, 0.25, "Humanoid");
    const owlbear = new Monster("Owlbear", 50, 0.25, "Monstrosity");
    setUpCollections([goblin, owlbear]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", type: "humanid" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: goblin }]);
  });

  it("matches a monster against ANY selected type when multiple are given (OR semantics)", async () => {
    // xp=25 each with a 50-xp low-difficulty budget forces exactly two picks, so a
    // deterministic Math.random (alternating index 0, then index 1) reliably yields one
    // of each remaining (non-Ooze) monster instead of leaving it up to chance.
    const goblin = new Monster("Goblin", 25, 0.25, "Humanoid");
    const owlbear = new Monster("Owlbear", 25, 0.25, "Monstrosity");
    const ooze = new Monster("Gray Ooze", 25, 0.25, "Ooze");
    setUpCollections([goblin, owlbear, ooze]);

    const originalRandom = Math.random;
    let call = 0;
    Math.random = () => (call++ % 2 === 0 ? 0 : 0.99);

    try {
      const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", type: "Humanoid,Monstrosity" });
      const lowEncounter = encounters[0]!.encounter;

      expect(lowEncounter).toEqual(
        expect.arrayContaining([
          { count: 1, monster: goblin },
          { count: 1, monster: owlbear },
        ]),
      );
      expect(lowEncounter).not.toContainEqual(expect.objectContaining({ monster: ooze }));
    } finally {
      Math.random = originalRandom;
    }
  });

  it("fuzzy-filters fetched monsters by vulnerabilities, excluding monsters with no vulnerabilities field", async () => {
    const flammable = new Monster("Scarecrow", 50, 0.25, "Plant", undefined, undefined, "Fire");
    const notFlammable = new Monster("Golem", 50, 0.25, "Construct"); // no vulnerabilities
    setUpCollections([flammable, notFlammable]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", vulnerabilities: "fre" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: flammable }]);
  });

  it("matches a monster against ANY selected vulnerability when multiple are given (OR semantics)", async () => {
    const flammable = makeMonster({ name: "Scarecrow", vulnerabilities: "Fire" });
    const coldVulnerable = makeMonster({ name: "Fire Elemental", vulnerabilities: "Cold" });
    const neither = makeMonster({ name: "Golem" }); // no vulnerabilities
    setUpCollections([flammable, coldVulnerable, neither]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", vulnerabilities: "Fire,Cold" });
    const anyEncountered = encounters.flatMap((g) => g.encounter.map((e) => e.monster.name));

    expect(anyEncountered).not.toContain("Golem");
    expect(anyEncountered.every((name) => name === "Scarecrow" || name === "Fire Elemental")).toBe(true);
  });

  it("fuzzy-filters fetched monsters by resistances, excluding monsters with no resistances field", async () => {
    const coldResistant = makeMonster({ name: "Yeti", resistances: "Cold" });
    const notResistant = makeMonster({ name: "Goblin" }); // no resistances
    setUpCollections([coldResistant, notResistant]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", resistances: "cld" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: coldResistant }]);
  });

  it("fuzzy-filters fetched monsters by immunities, excluding monsters with no immunities field", async () => {
    const immune = new Monster("Golem", 50, 0.25, "Construct", undefined, undefined, undefined, "Poison");
    const notImmune = new Monster("Goblin", 50, 0.25, "Humanoid"); // no immunities
    setUpCollections([immune, notImmune]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", immunities: "posn" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: immune }]);
  });

  it("fuzzy-filters fetched monsters by senses, excluding monsters with no senses field", async () => {
    const seer = new Monster(
      "Bat",
      50,
      0.25,
      "Beast",
      undefined,
      undefined,
      undefined,
      undefined,
      "Darkvision 60 ft.",
    );
    const blind = new Monster("Goblin", 50, 0.25, "Humanoid"); // no senses
    setUpCollections([seer, blind]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", senses: "drkvsn" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: seer }]);
  });

  it("fuzzy-filters fetched monsters by attack (action) name, excluding monsters with no matching action", async () => {
    const biter = new Monster(
      "Wolf",
      50,
      0.25,
      "Beast",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      [{ name: "Bite", description: "The wolf bites." }],
    );
    const nonBiter = new Monster(
      "Owlbear",
      50,
      0.25,
      "Monstrosity",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      [{ name: "Claw", description: "The owlbear claws." }],
    );
    setUpCollections([biter, nonBiter]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", attacks: "bte" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: biter }]);
  });

  it("fuzzy-filters fetched monsters by trait name, excluding monsters with no matching trait", async () => {
    const amphibious = makeMonster({
      name: "Crocodile",
      traits: [{ name: "Amphibious", description: "The crocodile can breathe air and water." }],
    });
    const landOnly = makeMonster({
      name: "Goblin",
      traits: [{ name: "Nimble Escape", description: "The goblin can Disengage or Hide as a bonus action." }],
    });
    setUpCollections([amphibious, landOnly]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", traits: "amphb" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: amphibious }]);
  });

  it("includes proficiencyBonus/hp/ac min+max and initiative ceiling in the Mongo query when provided", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({
      partySize: "1",
      avgPlayerLevel: "1",
      proficiencyBonusMin: "1",
      proficiencyBonusMax: "2",
      hpMin: "5",
      hpMax: "20",
      initiative: "3",
      acMin: "10",
      acMax: "15",
    });

    const query = find.mock.calls[0][0];
    expect(query.$and).toContainEqual({ proficiency_bonus: { $gte: 1 } });
    expect(query.$and).toContainEqual({ proficiency_bonus: { $lte: 2 } });
    expect(query.$and).toContainEqual({ hp: { $gte: 5 } });
    expect(query.$and).toContainEqual({ hp: { $lte: 20 } });
    expect(query.$and).toContainEqual({ initiative: { $lte: 3 } });
    expect(query.$and).toContainEqual({ ac: { $gte: 10 } });
    expect(query.$and).toContainEqual({ ac: { $lte: 15 } });
  });

  it("fuzzy-filters fetched monsters by size, excluding monsters with no size field", async () => {
    const small = makeMonster({ name: "Goblin", size: "Small" });
    const sizeless = makeMonster({ name: "Ooze" }); // no size
    setUpCollections([small, sizeless]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", size: "smll" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: small }]);
  });

  it("fuzzy-filters fetched monsters by speed, excluding monsters with no speed_raw field", async () => {
    const flyer = makeMonster({ name: "Giant Bat", speed_raw: "10 ft., Fly 60 ft." });
    const grounded = makeMonster({ name: "Goblin" }); // no speed_raw
    setUpCollections([flyer, grounded]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", speed: "fly" });

    expect(encounters[0]!.encounter).toEqual([{ count: 1, monster: flyer }]);
  });

  it("uses the monsterXP override instead of the computed threshold when provided", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({ partySize: "4", avgPlayerLevel: "1", monsterXP: "999" });

    const query = find.mock.calls[0][0];
    expect(query.$and).toContainEqual({ xp: { $lte: 999 } });
  });

  it("falls back to no filters when nothing but the required params are given", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({ partySize: "1", avgPlayerLevel: "1" });

    const query = find.mock.calls[0][0];
    // xp is always present since it's derived from the threshold when monsterXP isn't given
    expect(query.$and).toEqual([{ xp: { $lte: 150 } }]);
  });

  it("always pre-filters the query on the base xp field, even when inLair is true", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({ partySize: "1", avgPlayerLevel: "1", inLair: "true" });

    const query = find.mock.calls[0][0];
    expect(query.$and).toEqual([{ xp: { $lte: 150 } }]);
  });

  it("includes monsters with no xp_in_lair when inLair is true, budgeted at their normal xp", async () => {
    const noLairData = new Monster("Goblin", 50, 0.25, "Humanoid"); // no xp_in_lair
    setUpCollections([noLairData]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", inLair: "true" });

    expect(encounters).toEqual([
      { difficulty: "low", xpThreshold: 50, encounter: [{ count: 1, monster: noLairData }] },
      { difficulty: "moderate", xpThreshold: 100, encounter: [{ count: 2, monster: noLairData }] },
      { difficulty: "high", xpThreshold: 150, encounter: [{ count: 3, monster: noLairData }] },
    ]);
  });

  it("uses xp_in_lair (not xp) for budget math when inLair is true", async () => {
    // xp is deliberately too large to fit any budget, so this only passes if xp_in_lair
    // (not xp) is actually what's used for the budget math.
    const lairGoblin = new Monster("Goblin", 999, 0.25, "Humanoid", undefined, 50);
    setUpCollections([lairGoblin]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", inLair: "true" });

    expect(encounters).toEqual([
      { difficulty: "low", xpThreshold: 50, encounter: [{ count: 1, monster: lairGoblin }] },
      { difficulty: "moderate", xpThreshold: 100, encounter: [{ count: 2, monster: lairGoblin }] },
      { difficulty: "high", xpThreshold: 150, encounter: [{ count: 3, monster: lairGoblin }] },
    ]);
  });
});

import Monster from "../../src/models/monster.ts";
import { collections } from "../../src/services/database.service.ts";
import {
  generateEncounters,
  generateMonsterSet,
  getRandomMonster,
  parseParams,
} from "../../src/services/encounter.service.ts";

jest.mock("../../src/services/database.service.ts", () => ({
  collections: {},
}));

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
    expect(params.type).toBe("Humanoid");
    expect(params.name).toBe("Goblin");
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
      { difficulty: "low", encounter: [{ count: 1, monster: goblin }] },
      { difficulty: "moderate", encounter: [{ count: 2, monster: goblin }] },
      { difficulty: "high", encounter: [{ count: 3, monster: goblin }] },
    ]);
  });

  it("includes a name filter in the monster query when provided", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({ partySize: "1", avgPlayerLevel: "1", name: "Gob" });

    const query = find.mock.calls[0][0];
    expect(query.$and).toContainEqual({ name: { $regex: "Gob", $options: "i" } });
  });

  it("includes a challenge_rating filter when monsterCR is provided", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({ partySize: "1", avgPlayerLevel: "1", monsterCR: "1/2" });

    const query = find.mock.calls[0][0];
    expect(query.$and).toContainEqual({ challenge_rating: { $lte: 0.5 } });
  });

  it("includes a type filter when type is provided", async () => {
    const { find } = setUpCollections([]);

    await generateEncounters({ partySize: "1", avgPlayerLevel: "1", type: "Humanoid" });

    const query = find.mock.calls[0][0];
    expect(query.$and).toContainEqual({ type: { $regex: "^Humanoid$", $options: "i" } });
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
      { difficulty: "low", encounter: [{ count: 1, monster: noLairData }] },
      { difficulty: "moderate", encounter: [{ count: 2, monster: noLairData }] },
      { difficulty: "high", encounter: [{ count: 3, monster: noLairData }] },
    ]);
  });

  it("uses xp_in_lair (not xp) for budget math when inLair is true", async () => {
    // xp is deliberately too large to fit any budget, so this only passes if xp_in_lair
    // (not xp) is actually what's used for the budget math.
    const lairGoblin = new Monster("Goblin", 999, 0.25, "Humanoid", undefined, 50);
    setUpCollections([lairGoblin]);

    const encounters = await generateEncounters({ partySize: "1", avgPlayerLevel: "1", inLair: "true" });

    expect(encounters).toEqual([
      { difficulty: "low", encounter: [{ count: 1, monster: lairGoblin }] },
      { difficulty: "moderate", encounter: [{ count: 2, monster: lairGoblin }] },
      { difficulty: "high", encounter: [{ count: 3, monster: lairGoblin }] },
    ]);
  });
});

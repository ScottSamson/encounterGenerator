import Monster from "../../src/models/monster.ts";
import Encounter from "../../src/models/encounter.ts";

describe("Encounter", () => {
  it("assigns all constructor fields", () => {
    const monsters = [new Monster("Goblin", 50, 0.25, "Humanoid")];
    const encounter = new Encounter(monsters, 200, "1/4", "moderate");

    expect(encounter.monsters).toBe(monsters);
    expect(encounter.xp).toBe(200);
    expect(encounter.challengeRating).toBe("1/4");
    expect(encounter.difficulty).toBe("moderate");
  });
});

import Parameters from "../../src/models/parameters.ts";

describe("Parameters", () => {
  it("assigns all constructor fields", () => {
    const params = new Parameters(4, 5, 0.5, 400, "Humanoid", "Goblin", true);

    expect(params.partySize).toBe(4);
    expect(params.avgPlayerLevel).toBe(5);
    expect(params.monsterCR).toBe(0.5);
    expect(params.monsterXP).toBe(400);
    expect(params.type).toBe("Humanoid");
    expect(params.name).toBe("Goblin");
    expect(params.inLair).toBe(true);
  });

  it("allows the optional-in-practice fields to be null", () => {
    const params = new Parameters(4, 5, null, null, null, null, false);

    expect(params.monsterCR).toBeNull();
    expect(params.monsterXP).toBeNull();
    expect(params.type).toBeNull();
    expect(params.name).toBeNull();
    expect(params.inLair).toBe(false);
  });
});

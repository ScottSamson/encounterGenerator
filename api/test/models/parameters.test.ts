import Parameters from "../../src/models/parameters.ts";

const FULL_INPUT = {
  partySize: 4,
  avgPlayerLevel: 5,
  monsterCR: 0.5,
  monsterXP: 400,
  type: "Humanoid",
  name: "Goblin",
  inLair: true,
  vulnerabilities: "Fire",
  resistances: "Cold",
  immunities: "Poison",
  senses: "Darkvision 60 ft.",
  attacks: "Bite",
  traits: "Amphibious",
  proficiencyBonusMin: 1,
  proficiencyBonusMax: 2,
  hpMin: 5,
  hpMax: 10,
  initiative: 3,
  acMin: 12,
  acMax: 15,
  size: "Small",
  speed: "30 ft.",
};

const NULL_INPUT = {
  partySize: 4,
  avgPlayerLevel: 5,
  monsterCR: null,
  monsterXP: null,
  type: null,
  name: null,
  inLair: false,
  vulnerabilities: null,
  resistances: null,
  immunities: null,
  senses: null,
  attacks: null,
  traits: null,
  proficiencyBonusMin: null,
  proficiencyBonusMax: null,
  hpMin: null,
  hpMax: null,
  initiative: null,
  acMin: null,
  acMax: null,
  size: null,
  speed: null,
};

describe("Parameters", () => {
  it("assigns all constructor fields", () => {
    const params = new Parameters(FULL_INPUT);

    expect(params.partySize).toBe(4);
    expect(params.avgPlayerLevel).toBe(5);
    expect(params.monsterCR).toBe(0.5);
    expect(params.monsterXP).toBe(400);
    expect(params.type).toBe("Humanoid");
    expect(params.name).toBe("Goblin");
    expect(params.inLair).toBe(true);
    expect(params.vulnerabilities).toBe("Fire");
    expect(params.resistances).toBe("Cold");
    expect(params.immunities).toBe("Poison");
    expect(params.senses).toBe("Darkvision 60 ft.");
    expect(params.attacks).toBe("Bite");
    expect(params.traits).toBe("Amphibious");
    expect(params.proficiencyBonusMin).toBe(1);
    expect(params.proficiencyBonusMax).toBe(2);
    expect(params.hpMin).toBe(5);
    expect(params.hpMax).toBe(10);
    expect(params.initiative).toBe(3);
    expect(params.acMin).toBe(12);
    expect(params.acMax).toBe(15);
    expect(params.size).toBe("Small");
    expect(params.speed).toBe("30 ft.");
  });

  it("allows the optional-in-practice fields to be null", () => {
    const params = new Parameters(NULL_INPUT);

    expect(params.monsterCR).toBeNull();
    expect(params.monsterXP).toBeNull();
    expect(params.type).toBeNull();
    expect(params.name).toBeNull();
    expect(params.inLair).toBe(false);
    expect(params.vulnerabilities).toBeNull();
    expect(params.resistances).toBeNull();
    expect(params.immunities).toBeNull();
    expect(params.senses).toBeNull();
    expect(params.attacks).toBeNull();
    expect(params.traits).toBeNull();
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
});

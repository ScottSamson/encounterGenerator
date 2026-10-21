import { ObjectId } from "mongodb";
import Monster from "../../src/models/monster.ts";

describe("Monster", () => {
  it("assigns all constructor fields, including the optional _id", () => {
    const id = new ObjectId();
    const monster = new Monster("Goblin", 50, 0.25, "Humanoid", id);

    expect(monster.name).toBe("Goblin");
    expect(monster.xp).toBe(50);
    expect(monster.challenge_rating).toBe(0.25);
    expect(monster.type).toBe("Humanoid");
    expect(monster._id).toBe(id);
  });

  it("allows _id to be omitted", () => {
    const monster = new Monster("Owlbear", 700, 3, "Monstrosity");

    expect(monster._id).toBeUndefined();
  });
});

jest.mock("../src/services/database.service.ts", () => ({
  collections: {},
  ensureDatabaseConnection: jest.fn(),
}));

jest.mock("../src/services/encounter.service.ts", () => ({
  generateEncounters: jest.fn(),
}));

import request from "supertest";
import { collections, ensureDatabaseConnection } from "../src/services/database.service.ts";
import { generateEncounters } from "../src/services/encounter.service.ts";

// Loaded via require (not a static import) so this line actually runs before app.ts is
// evaluated — static imports get hoisted above plain statements at compile time, so
// setting this beforehand as a regular `import` would run too late to affect app.ts's
// `AWS_LAMBDA_FUNCTION_NAME` guard, which decides whether to call `app.listen()`.
process.env.AWS_LAMBDA_FUNCTION_NAME = "test-fn";
const app = require("../src/app.ts").default;

describe("app", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureDatabaseConnection as jest.Mock).mockResolvedValue(undefined);
    delete (collections as any).monsters;
  });

  it("GET / returns the healthcheck message", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "TypeScript API is running smoothly!" });
  });

  it("returns 503 when the DB connection middleware fails", async () => {
    (ensureDatabaseConnection as jest.Mock).mockRejectedValue(new Error("down"));

    const res = await request(app).get("/api/monsters");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ message: "Database connection unavailable" });
  });

  it("GET /api/monsters returns the monster list", async () => {
    const toArray = jest.fn().mockResolvedValue([{ name: "Goblin" }]);
    (collections as any).monsters = { find: jest.fn().mockReturnValue({ toArray }) };

    const res = await request(app).get("/api/monsters");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ name: "Goblin" }]);
  });

  it("GET /api/monsters returns 500 when the collection isn't initialized", async () => {
    const res = await request(app).get("/api/monsters");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to fetch monsters");
  });

  it("GET /api/encounters/generate returns the generated encounters", async () => {
    (generateEncounters as jest.Mock).mockResolvedValue([{ difficulty: "low", encounter: [] }]);

    const res = await request(app).get("/api/encounters/generate?partySize=4&avgPlayerLevel=1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ difficulty: "low", encounter: [] }]);
  });

  it("GET /api/encounters/generate returns 500 when the service throws", async () => {
    (generateEncounters as jest.Mock).mockRejectedValue(new Error("bad params"));

    const res = await request(app).get("/api/encounters/generate");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to generate encounter");
  });
});

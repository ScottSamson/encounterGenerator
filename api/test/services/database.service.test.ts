// Prevent dotenv from reading the real api/.env on disk, which would otherwise silently
// repopulate env vars this suite deletes to test the "missing config" path.
jest.mock("dotenv", () => ({ config: jest.fn() }));

const ORIGINAL_ENV = process.env;

interface MockClientOptions {
  connect?: jest.Mock;
}

function mockMongoClient({ connect = jest.fn().mockResolvedValue(undefined) }: MockClientOptions = {}) {
  const collectionStub = { name: "stub-collection" };
  const dbStub = { databaseName: "test-db", collection: jest.fn().mockReturnValue(collectionStub) };
  const MongoClientMock = jest.fn().mockImplementation(() => ({
    connect,
    db: jest.fn().mockReturnValue(dbStub),
  }));

  jest.doMock("mongodb", () => ({ MongoClient: MongoClientMock }));

  return { MongoClientMock, connect, dbStub, collectionStub };
}

describe("database.service", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      DB_CONN_STRING: "mongodb://test",
      DB_NAME: "test-db",
      MONSTERS_COLLECTION_NAME: "monsters",
      XPTHRESHOLDS_COLLECTION_NAME: "xpThresholds",
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  it("throws when required env vars are missing", async () => {
    delete process.env.DB_CONN_STRING;
    mockMongoClient();
    const { connectToDatabase } = require("../../src/services/database.service.ts");

    await expect(connectToDatabase()).rejects.toThrow("Missing required environment variables");
  });

  it("connects and populates the collections on success", async () => {
    const { collectionStub } = mockMongoClient();
    const dbService = require("../../src/services/database.service.ts");

    await dbService.connectToDatabase();

    expect(dbService.collections.monsters).toBe(collectionStub);
    expect(dbService.collections.xpthresholds).toBe(collectionStub);
  });

  it("ensureDatabaseConnection connects once and reuses the cached connection", async () => {
    const { connect } = mockMongoClient();
    const dbService = require("../../src/services/database.service.ts");

    await dbService.ensureDatabaseConnection();
    await dbService.ensureDatabaseConnection();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("ensureDatabaseConnection retries after a failed attempt instead of staying stuck", async () => {
    const connect = jest
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce(undefined);
    mockMongoClient({ connect });
    const dbService = require("../../src/services/database.service.ts");

    await expect(dbService.ensureDatabaseConnection()).rejects.toThrow("network blip");
    await expect(dbService.ensureDatabaseConnection()).resolves.toBeUndefined();

    expect(connect).toHaveBeenCalledTimes(2);
  });
});

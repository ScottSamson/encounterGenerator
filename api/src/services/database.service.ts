// External Dependencies
import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";
// Global Variables
export const collections: { monsters?: mongoDB.Collection, xpthresholds?: mongoDB.Collection } = {}

let connectPromise: Promise<void> | null = null;

// Lazy singleton: safe to call on every request. After the first successful call it's a
// no-op that resolves immediately (reuses the cached connection across warm Lambda
// invocations). If connecting fails, the failed promise is not cached, so the next call
// gets a fresh attempt instead of being stuck until a new cold start.
export function ensureDatabaseConnection(): Promise<void> {
   if (!connectPromise) {
      connectPromise = connectToDatabase().catch((err) => {
         connectPromise = null;
         throw err;
      });
   }
   return connectPromise;
}

// Initialize Connection
export async function connectToDatabase () {
   dotenv.config();

   const connectionString = process.env.DB_CONN_STRING;
   const dbName = process.env.DB_NAME;
   const monstersCollectionName = process.env.MONSTERS_COLLECTION_NAME;
   const xpthresholdsCollectionName = process.env.XPTHRESHOLDS_COLLECTION_NAME;

   if (!connectionString || !dbName || !monstersCollectionName || !xpthresholdsCollectionName) {
      throw new Error("Missing required environment variables for database connection.");
   }

   const client: mongoDB.MongoClient = new mongoDB.MongoClient(connectionString, {
      // Small pool: a Lambda execution environment handles one request at a time by
      // default, so a large pool just holds idle sockets Atlas has to track.
      maxPoolSize: 5,
      // Fail fast instead of hanging near the Lambda timeout if Atlas is unreachable.
      serverSelectionTimeoutMS: 5000,
   });
           
   await client.connect();
       
   const db: mongoDB.Db = client.db(dbName);
  
   const monstersCollection: mongoDB.Collection = db.collection(monstersCollectionName);
   const xpthresholdsCollection: mongoDB.Collection = db.collection(xpthresholdsCollectionName);

   collections.monsters = monstersCollection;
   collections.xpthresholds = xpthresholdsCollection;

    console.log(`Successfully connected to database: ${db.databaseName} and collection: ${monstersCollection.collectionName}`);
}
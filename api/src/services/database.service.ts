// External Dependencies
import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";
// Global Variables
export const collections: { monsters?: mongoDB.Collection, xpthresholds?: mongoDB.Collection } = {}
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

   const client: mongoDB.MongoClient = new mongoDB.MongoClient(connectionString);
           
   await client.connect();
       
   const db: mongoDB.Db = client.db(dbName);
  
   const monstersCollection: mongoDB.Collection = db.collection(monstersCollectionName);
   const xpthresholdsCollection: mongoDB.Collection = db.collection(xpthresholdsCollectionName);

   collections.monsters = monstersCollection;
   collections.xpthresholds = xpthresholdsCollection;

    console.log(`Successfully connected to database: ${db.databaseName} and collection: ${monstersCollection.collectionName}`);
}
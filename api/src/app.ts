import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { ObjectId } from "mongodb";
import { collections, ensureDatabaseConnection } from "./services/database.service.ts";
import Monster from "./models/monster.ts";
import { generateEncounters } from "./services/encounter.service.ts";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // harmless fallback for direct/local testing; not needed once behind CloudFront (same-origin)
// Middleware to parse incoming JSON payloads
app.use(express.json());

// Ensure the DB connection exists before handling any route. On a warm Lambda invocation
// this resolves immediately (cached), on a cold start it awaits the real connection once.
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureDatabaseConnection();
    next();
  } catch (err) {
    console.log(err);
    res.status(503).json({ message: "Database connection unavailable" });
  }
});

// Root API Healthcheck Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'TypeScript API is running smoothly!' });
});


app.get('/api/monsters', async (req: Request, res: Response) => {
  try {
    if (!collections?.monsters) {
      throw new Error('Database collection not initialized');
    }
    const monsters: Monster[] = (await collections.monsters.find({}).toArray()) as Monster[];
    res.json(monsters);
  } catch (err) {
    console.log (err);
    res.status(500).json({ message: "Failed to fetch monsters", error: err });
  }
});

app.get('/api/encounters/generate', async (req: Request, res: Response) => { 
  try { 
    res.json(await generateEncounters(req.query));
  }catch (err) {
    console.log (err);
    res.status(500).json({ message: "Failed to generate encounter", error: err });
  }
});


// Only start a real listening server outside Lambda (local dev / `npm start`). Inside
// Lambda, serverless-express (see lambda.ts) drives `app` directly per-invocation.
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`Server is listening natively on http://localhost:${PORT}`);
  });
}

export default app;

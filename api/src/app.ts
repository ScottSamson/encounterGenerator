import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { ObjectId } from "mongodb";
import { collections, connectToDatabase } from "./services/database.service.ts";
import Monster from "./models/monster.ts";
import { generateEncounters } from "./services/encounter.service.ts";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Middleware to parse incoming JSON payloads
app.use(express.json());

await connectToDatabase(); // Ensure the database connection is established before handling requests

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


app.listen(PORT, () => {
  console.log(`Server is listening natively on http://localhost:${PORT}`);
});

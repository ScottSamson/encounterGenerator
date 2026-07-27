import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Root API Healthcheck Endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'TypeScript API is running smoothly!' });
});

// Sample Resource Endpoint using TypeScript Interfaces
interface Monster {
  id: number;
  name: string;
}

app.get('/api/monsters', (req: Request, res: Response) => {
  const monsters: Monster[] = [
    { id: 1, name: 'Goblin' },
    { id: 2, name: 'Orc' }
  ];
  res.json(monsters);
});

app.listen(PORT, () => {
  console.log(`Server is listening natively on http://localhost:${PORT}`);
});

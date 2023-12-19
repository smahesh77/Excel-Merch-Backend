import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import express, { Request, Response } from 'express';
import userRoutes from './routes/UserRoute'
import itemRoutes from './routes/ItemRoutes'
import orderRoutes from './routes/OrderRoutes'

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());


app.get('/ping', (req: express.Request, res: express.Response) => {
  res.status(200).json({ message: 'pong', status: 'OK' });
});

app.use('/user', userRoutes);
app.use('/item', itemRoutes);
app.use('/order', orderRoutes);

app.use('/test', async (req: Request, res: Response) => {
  try {

    
    const all = await prisma.order.findMany()
    res.json(all);
  } catch (error) {
    console.error('Error redirecting to link target:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


app.use((err: Error, req: express.Request, res: express.Response, next: () => void) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.listen(4000, () => {
  console.log(`Listening on port ${4000}`);
});

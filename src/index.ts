import cors from 'cors';
import express from 'express';
import userRoutes from './routes/UserRoute'
import itemRoutes from './routes/ItemRoutes'
import orderRoutes from './routes/OrderRoutes'
import { PORT } from './utils/env';

const app = express();
app.use(express.json());
app.use(cors());

app.get('/ping', (req: express.Request, res: express.Response) => {
  res.status(200).json({ message: 'pong', status: 'OK' });
});

app.use('/user', userRoutes);
app.use('/item', itemRoutes);
app.use('/order', orderRoutes);



app.use((err: Error, req: express.Request, res: express.Response, next: () => void) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next(); 
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
   
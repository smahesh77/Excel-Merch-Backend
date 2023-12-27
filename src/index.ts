import cors from 'cors';
import express from 'express';
import { userRouter } from './routes/User/UserRoute';
import { itemRouter } from './routes/ItemRoutes';
import { PORT } from './utils/env';
import { NotFoundError } from './utils/error';
import { errorHandler } from './middleware/error';
import { adminRouter } from './routes/Admin/AdminRoutes';

const app = express();
app.use(express.json());
app.use(cors());

app.get('/ping', (req: express.Request, res: express.Response) => {
	res.status(200).json({ message: 'pong', status: 'OK' });
});

app.use('/user', userRouter);
app.use('/item', itemRouter);
app.use('/admin', adminRouter);

app.use('*', () => {
	throw new NotFoundError('Route not found');
});

app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});

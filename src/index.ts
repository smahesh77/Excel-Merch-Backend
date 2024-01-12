import cors from 'cors';
import express from 'express';
import { userRouter } from './routes/User/UserRoute';
import { itemRouter } from './routes/ItemRoutes';
import { PORT, WITH_LOCAL_TUNNEL } from './utils/env';
import { NotFoundError } from './utils/error';
import { errorHandler } from './middleware/error';
import { adminRouter } from './routes/Admin/AdminRoutes';
import localtunnel from 'localtunnel';
import { webhookRouter } from './routes/Webhook/webhook';

const app = express();
app.use(express.json());
app.use(cors());

app.get('/ping', (req: express.Request, res: express.Response) => {
	res.status(200).json({ message: 'pong', status: 'OK' });
});

app.use('/user', userRouter);
app.use('/item', itemRouter);
app.use('/admin', adminRouter);
app.use('/webhook', webhookRouter);

app.use('*', () => {
	throw new NotFoundError('Route not found');
});

app.use(errorHandler);

app.listen(PORT, async () => {
	console.log(`Listening on port ${PORT}`);

	if (WITH_LOCAL_TUNNEL) {
		openLocalTunnel();
	}
});

const ThreeSeconds = 1000 * 3;
const reconnectionTimeout = ThreeSeconds;
async function openLocalTunnel() {
	try {
		const tunnel = await localtunnel(PORT, {
			subdomain: 'excel-merch-dev-local',
		});
		console.log(`Local tunnel running at ${tunnel.url}`);

		tunnel.on('error', function () {
			console.log('Local tunnel error, reconnecting...');
			setTimeout(openLocalTunnel, reconnectionTimeout);
		});

		tunnel.on('close', function () {
			console.log('Local tunnel close, reconnecting...');
			setTimeout(openLocalTunnel, reconnectionTimeout);
		});
	} catch (error) {
		console.log('Local tunnel error, reconnecting...');
		setTimeout(openLocalTunnel, reconnectionTimeout);
	}
}

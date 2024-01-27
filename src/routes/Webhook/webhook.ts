import { Router } from 'express';
import { razorPayWebhook } from '../../controllers/PaymentController';

export const webhookRouter = Router();

webhookRouter.post('/', razorPayWebhook);

import { Router } from 'express';
import { isAuthenticated } from '../../middleware/authMiddleware';
import {
	getProfileController,
	updateProfileController,
} from '../../controllers/UserControllers';
import { cartRouter } from './CartRoutes';
import {
	cancelOrder,
	getOrder,
	getOrders,
} from '../../controllers/OrderControllers';
import { updateProfileValidator } from '../../middleware/User/updateProfileValidator';
import { cancelOrderValidator } from '../../middleware/User/Order/cancelOrderValidator';

export const userRouter = Router();

userRouter.get('/profile', isAuthenticated, getProfileController);
userRouter.post(
	'/profile',
	isAuthenticated,
	updateProfileValidator,
	updateProfileController
);

userRouter.use('/cart', cartRouter);

userRouter.get('/orders', isAuthenticated, getOrders);
userRouter.get('/orders/:orderId', isAuthenticated, getOrder);
userRouter.post(
	'/orders/:orderId/cancel',
	isAuthenticated,
	cancelOrderValidator,
	cancelOrder
);

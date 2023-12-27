import { Router } from 'express';
import { isAuthenticated } from '../../middleware/authMiddleware';
import {
	getProfileController,
	updateProfileController,
} from '../../controllers/UserControllers';
import { cartRouter } from './CartRoutes';
import { getOrders } from '../../controllers/OrderControllers';

export const userRouter = Router();

userRouter.get('/profile', isAuthenticated, getProfileController);
userRouter.post('/profile', isAuthenticated, updateProfileController);


userRouter.use('/cart', cartRouter);

userRouter.get('/orders', isAuthenticated, getOrders);

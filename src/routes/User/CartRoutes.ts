import { Router } from 'express';
import { isAuthenticated } from '../../middleware/authMiddleware';
import {
	addItemToCart,
	checkoutController,
	emptyCart,
	getUserCartItems,
	removeItemFromCart,
} from '../../controllers/CartControllers';

export const cartRouter = Router();

cartRouter.get('/', isAuthenticated, getUserCartItems);

cartRouter.post('/', isAuthenticated, addItemToCart);

cartRouter.delete('/', isAuthenticated, emptyCart);

cartRouter.delete('/item/:itemId', isAuthenticated, removeItemFromCart);

cartRouter.post('/checkout', isAuthenticated, checkoutController);
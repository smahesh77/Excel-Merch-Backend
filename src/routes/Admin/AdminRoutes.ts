import { Router } from 'express';
import {
	isAuthenticated,
	isMerchAdmin,
	isMerchOrderManager,
} from '../../middleware/authMiddleware';
import multer from 'multer';
import {
	createNewItemController,
	deleteItemController,
	updateItemController,
} from '../../controllers/ItemControllers';
import { createItemValidator } from '../../middleware/Item/createItemValidator';
import { updateItemValidator } from '../../middleware/Item/updateItemValidator';
import {
	getAllOrders,
	getOrderAdmin,
	updateOrderStatus,
} from '../../controllers/AdminControllers';
import { updateOrderStatusValidator } from '../../middleware/Admin/updateOrderStatusValidator';

export const adminRouter = Router();

adminRouter.put(
	'/orderStatus/:orderId',
	isAuthenticated,
	isMerchOrderManager,
	updateOrderStatusValidator,
	updateOrderStatus
);

const storage = multer.memoryStorage();
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 1024 * 1024 * 50,
		fieldSize: 1024 * 1024 * 30,
	},
});

const fieldConfig = [
	{
		name: 'media',
		maxCount: 50,
	},
];

adminRouter.post(
	'/item',
	isAuthenticated,
	isMerchAdmin,
	upload.fields(fieldConfig),
	createItemValidator,
	createNewItemController
);

adminRouter.put(
	'/item/:itemId',
	isAuthenticated,
	isMerchAdmin,
	upload.fields(fieldConfig),
	updateItemValidator,
	updateItemController
);

adminRouter.delete(
	'/item/:itemId',
	isAuthenticated,
	isMerchAdmin,
	deleteItemController
);

adminRouter.get('/orders', isAuthenticated, isMerchOrderManager, getAllOrders);
adminRouter.get(
	'/orders/:orderId',
	isAuthenticated,
	isMerchOrderManager,
	getOrderAdmin
);

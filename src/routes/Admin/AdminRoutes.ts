import { Router } from 'express';
import { isAuthenticated, isMerchAdmin } from '../../middleware/authMiddleware';
import { updateOrderStatus } from '../../controllers/OrderControllers';
import multer from 'multer';
import {
	createNewItemController,
	deleteItemController,
	updateItemController,
} from '../../controllers/ItemControllers';
import { createItemValidator } from '../../middleware/Item/createItemValidator';
import { updateItemValidator } from '../../middleware/Item/updateItemValidator';

export const adminRouter = Router();

adminRouter.put(
	'/orderStatus/:orderId',
	isAuthenticated,
	isMerchAdmin,
	updateOrderStatus
);

// TODO: Support image and video
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
adminRouter.post(
	'/item',
	isAuthenticated,
	isMerchAdmin,
	upload.fields([{ name: 'media', maxCount: 25 }]),
	createItemValidator,
	createNewItemController
);

// TODO: handle mediaChanges
adminRouter.put(
	'/item/:itemId',
	isAuthenticated,
	isMerchAdmin,
	upload.fields([{ name: 'media', maxCount: 25 }]),
	updateItemValidator,
	updateItemController
);

adminRouter.delete(
	'/item/:itemId',
	isAuthenticated,
	isMerchAdmin,
	deleteItemController
);

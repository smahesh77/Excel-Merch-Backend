import { Router } from 'express';
import {
	getItemByIdController,
	getItemsController,
} from '../controllers/ItemControllers';

export const itemRouter = Router();

itemRouter.get('/', getItemsController);

itemRouter.get('/:itemId', getItemByIdController);

import { param } from 'express-validator';
import { createItemValidator } from './createItemValidator';

export const updateItemValidator = [
	param('itemId').isInt().withMessage('itemId must be an integer'),
	...createItemValidator,
];

import { body } from 'express-validator';
import { getValidator } from '../Validator';
import { ShippingStatus } from '@prisma/client';

const shippingStatuses: ShippingStatus[] = [
	'not_shipped',
	'processing',
	'shipping',
	'delivered',
];

const updateOrderStatusValidators = [
	body('shippingStatus')
		.exists()
		.withMessage('shippingStatus is required')
		.isString()
		.withMessage('shippingStatus must be a string')
		.isIn(shippingStatuses)
		.withMessage('Invalid Shipping Status'),
];

export const updateOrderStatusValidator = getValidator(updateOrderStatusValidators);

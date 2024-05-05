import { body } from 'express-validator';
import { getValidator } from '../../Validator';
import { sizes } from '../../Item/createItemValidator';

const addItemValidators = [
	body('itemId')
		.exists()
		.withMessage('itemId is required')
		.isInt()
		.withMessage('itemId must be an integer')
        .bail()
        .toInt(),

	body('quantity')
		.exists()
		.withMessage('quantity is required')
		.isInt({
			gt: 0,
		})
		.withMessage('Quantity must be an integer greater than 0')
        .bail()
        .toInt(),

	body('colorOption')
		.exists()
		.withMessage('colorOption is required')
		.isString()
		.withMessage('colorOption must be a string'),

	body('sizeOption')
		.exists()
		.withMessage('sizeOption is required')
		.isIn(sizes)
		.withMessage(
			(value) => `${value} is not a valid size`
		),
];

export const addItemValidator = getValidator(addItemValidators);

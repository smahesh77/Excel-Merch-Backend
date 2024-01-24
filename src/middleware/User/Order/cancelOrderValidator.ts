import { param } from 'express-validator';
import { getValidator } from '../../Validator';

const cancelOrderValidators = [
    param('orderId')
    .exists()
    .withMessage('orderId is required')
    .isString()
    .withMessage('orderId must be a string')
];

export const cancelOrderValidator = getValidator(cancelOrderValidators);

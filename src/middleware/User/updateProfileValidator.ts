import { body } from 'express-validator';
import { getValidator } from '../Validator';

const updateProfileValidators = [
    body('phoneNumber')
    .exists()
    .withMessage('Phone number is required')
    .isString()
    .withMessage('Phone number must be a string'),

    body('address')
    .exists()
    .withMessage('Address is required')
    .isObject()
    .withMessage('Address must be an object'),

    body('address.city')
    .exists()
    .withMessage('City is required')
    .isString()
    .withMessage('City must be a string'),

    body('address.house')
    .exists()
    .withMessage('House is required')
    .isString()
    .withMessage('House must be a string'),

    body('address.area')
    .exists()
    .withMessage('Area is required')
    .isString()
    .withMessage('Area must be a string'),

    body('address.state')
    .exists()
    .withMessage('State is required')
    .isString()
    .withMessage('State must be a string'),

    body('address.zipcode')
    .exists()
    .withMessage('Zipcode is required')
    .isString()
    .withMessage('Zipcode must be a string'),
];

export const updateProfileValidator = getValidator(updateProfileValidators);

import { Size } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { getValidator } from '../Validator';
import { NextFunction, Request, Response } from 'express';
import {
	ItemRequest,
	MediaObjectRequest,
} from '../../controllers/ItemControllers';

const sizes: Size[] = ['S', 'M', 'L', 'XL', 'XXL'];
function noDuplicates(arr: string[]) {
	if (arr.length === new Set(arr).size) {
		return true;
	} else {
		throw new Error('Duplicate values found in array');
	}
}

const createItemValidators = [
	body('data').exists().withMessage('data is required'),
	body('data').custom((value) => {
		try {
			const parsedData = JSON.parse(value);
			if (typeof parsedData !== 'object') {
				throw new Error('data must be an object');
			}
		} catch (err) {
			throw new Error(
				'Invalid value: data must be an stringified JSON object'
			);
		}
		return true;
	}),

	/**
	 * Don't run the rest of the validators if the data is invalid JSON
	 */
	(
		req: Request<any, any, ItemRequest>,
		res: Response,
		next: NextFunction
	) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		next();
	},

	body('data').customSanitizer((value) => {
		return JSON.parse(value);
	}),

	body('data.name').isString().notEmpty().withMessage('Name is required'),

	body('data.description')
		.exists()
		.isString()
		.notEmpty()
		.withMessage('Description is required'),
	body('data.price').exists().isNumeric().withMessage('Price is required'),

	body('data.sizeOptions')
		.isArray({
			min: 1,
		})
		.withMessage('At least one size option is required')
		.custom(noDuplicates),

	body('data.sizeOptions.*')
		.isString()
		.isIn(sizes)
		.withMessage(
			(value) => `${value} is not a valid size specified in sizeOptions`
		),

	body('data.colorOptions')
		.isArray({
			min: 1,
		})
		.withMessage('At least one color option is required')
		.custom(noDuplicates),

	body('data.colorOptions.*').isString(),

	body('data.stockCount')
		.isArray()
		.withMessage('stockCount must be an array')
		.custom((arr, { req }) => {
			const reqBody = req.body as ItemRequest;

			const sizeOptions: Size[] = reqBody.data.sizeOptions;
			const colorOptions: string[] = reqBody.data.colorOptions;

			if (!sizeOptions || !colorOptions) {
				throw new Error('sizeOptions and colorOptions must be defined');
			}

			if (arr.length !== sizeOptions.length * colorOptions.length) {
				throw new Error(
					'stockCount array must be the same length as the sizeOptions * colorOptions'
				);
			}

			return true;
		}),

	body('data.stockCount.*.count')
		.exists()
		.isInt({
			min: 0,
			allow_leading_zeroes: false,
		})
		.withMessage('count is required and must be a positive integer'),

	body('data.stockCount.*.sizeOption')
		.exists()
		.isString()
		.notEmpty()
		.withMessage('sizeOption is required')
		.custom((value, { req }) => {
			const reqBody = req.body as ItemRequest;

			const sizeOptions = reqBody.data.sizeOptions;
			if (!sizeOptions.includes(value as Size)) {
				throw new Error(
					'sizeOption must be one of the size options provided in the sizeOptions array'
				);
			}

			return true;
		}),

	body('data.stockCount.*.colorOption')
		.exists()
		.isString()
		.custom((value, { req }) => {
			const reqBody = req.body as ItemRequest;

			const colorOptions: string[] = reqBody.data.colorOptions;
			if (!colorOptions.includes(value)) {
				throw new Error(
					'Color option must be one of the color options provided in the colorOptions array'
				);
			}

			return true;
		}),

	body('data.mediaObjects')
		.isArray()
		.withMessage('mediaObjects must be an array'),

	body('data.mediaObjects.*.type')
		.isString()
		.withMessage('type is required')
		.notEmpty()
		.withMessage('type is required')
		.isIn(['image'])
		.withMessage('Only image media objects are supported'),

	body('data.mediaObjects.*.colorOption')
		.isString()
		.notEmpty()
		.withMessage('Color option is required')
		.custom((value, { req }) => {
			const reqBody = req.body as ItemRequest;

			const colorOptions: string[] = reqBody.data.colorOptions;
			if (!colorOptions.includes(value)) {
				throw new Error(
					'Color option must be one of the color options provided in the colorOptions array'
				);
			}
			return true;
		}),

	body('data.mediaObjects.*.viewOrdering')
		.isInt({
			min: 0,
			allow_leading_zeroes: false,
		})
		.withMessage('viewOrdering is required and must be a positive integer'),

	body('data.mediaObjects.*.fileName')
		.isString()
		.notEmpty()
		.withMessage('fileName is required'),

	function (
		req: Request<any, any, ItemRequest>,
		res: Response,
		next: NextFunction
	) {
		const errors: string[] = [];

		const media = (req.files as { media: Express.Multer.File[] })?.media;

		const mediaObjects: MediaObjectRequest[] = req.body.data.mediaObjects;

		if (
			mediaObjects &&
			Array.isArray(mediaObjects) &&
			mediaObjects.length > 0
		) {
			if (!media || !Array.isArray(media) || media.length === 0) {
				errors.push(
					'Media files are required. with the key "media" if mediaObjects are provided'
				);
			} else if (media.length !== mediaObjects.length) {
				errors.push(
					'Number of media files must match the number of mediaObjects provided'
				);
			} else {
				mediaObjects.forEach((mediaObject) => {
					if (
						!media.find(
							(file) => file.originalname === mediaObject.fileName
						)
					) {
						errors.push(
							`Media file with name ${mediaObject.fileName} not found`
						);
					}
				});
			}
		}

		if (media && Array.isArray(media) && media.length > 0) {
			if (
				!mediaObjects ||
				!Array.isArray(mediaObjects) ||
				mediaObjects.length === 0
			) {
				errors.push(
					'Media files provided but no mediaObjects provided'
				);
			} else if (media.length !== mediaObjects.length) {
				errors.push(
					'Number of media files must match the number of mediaObjects provided'
				);
			} else {
				media.forEach((file) => {
					if (
						!mediaObjects.find(
							(mediaObject) =>
								mediaObject.fileName === file.originalname
						)
					) {
						errors.push(
							`Media file with name ${file.originalname} does not have a corresponding mediaObject`
						);
					}
				});
			}
		}

		if (errors.length > 0) {
			const expressValidatorErrors = validationResult(req);
			if (!expressValidatorErrors.isEmpty()) {
				errors.push(
					...expressValidatorErrors.array().map((e) => e.msg)
				);
			}
			return res.status(400).json({ errors });
		}

		next();
	},
];

export const createItemValidator = getValidator(createItemValidators);

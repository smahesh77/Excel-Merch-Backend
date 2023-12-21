import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

import { MediaTypes, Size } from '@prisma/client';
import { storageBucket } from '../utils/storage';

interface mediaObject {
	type: string;
	url: string;
	colorValue: string;
	viewOrdering: number;
	itemId: number;
}

interface ItemRequest {
	name: string;
	description: string;
	price: number;
	stockCount: number;
	sizeOptions: Size[];
	colorOptions: string[];
	mediaObject: mediaObject;
	data: string;
}


// TODO: Update with FormData Multer
export async function createNewItemController(
	req: Request<{}, {}, ItemRequest & { image: Express.Multer.File }>,
	res: Response,
	next: NextFunction
) {
	const {
		name,
		description,
		price,
		stockCount,
		sizeOptions,
		colorOptions,
		mediaObject,
	} = JSON.parse(req.body.data);

	const images = req.files as Express.Multer.File[];

	try {
		if (!images) {
			return res.status(400).json({ error: 'Image file is required' });
		}

		const mediaObjects = images.map((image, index) => ({
			type: MediaTypes.image,
			url: `https://storage.googleapis.com/${encodeURIComponent(
				storageBucket.name
			)}/${encodeURIComponent(image.originalname)}`,
			colorValue: 'default', // You may need to adjust this based on your requirements
			viewOrdering: index + 1, // You may need to adjust this based on your requirements
		}));

		// Create the new item with the GCS URL
		const newItem = await prisma.item.create({
			data: {
				name,
				description,
				price,
				mediaObjects: {
					create: mediaObjects,
				},
				stockCount,
				sizeOptions: { set: sizeOptions },
				colorOptions: { set: colorOptions },
			},
		});

		res.json(newItem);
	} catch (err) {
		next(err);
	}
}

export async function updateItemController(
	req: Request<{ itemId: string }, {}, ItemRequest>,
	res: Response,
	next: NextFunction
) {
	const itemId = parseInt(req.params.itemId, 10);
	const { name, description, price, stockCount, sizeOptions, colorOptions } =
		req.body;

	try {
		const updatedItem = await prisma.item.update({
			where: { id: itemId },
			data: {
				name,
				description,
				price,
				stockCount,
				sizeOptions: { set: sizeOptions || [] },
				colorOptions: { set: colorOptions || [] },
			},
		});

		res.json(updatedItem);
	} catch (err) {
		next(err);
	}
}

export async function deleteItemController(
	req: Request<{ itemId: string }>,
	res: Response,
	next: NextFunction
) {
	const itemId = parseInt(req.params.itemId, 10);

	try {
		await prisma.item.delete({
			where: { id: itemId },
		});

		res.json({ message: 'Item deleted successfully' });
	} catch (err) {
		next(err);
	}
}


export async function getItemsController(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const items = await prisma.item.findMany({
			include: {
				mediaObjects: true,
			},
		});

		res.json(items);
	} catch (err) {
		next(err);
	}
}

export async function getItemByIdController (req: Request, res: Response, next: NextFunction) {
    const itemId = parseInt(req.params.itemId, 10);

    try {
        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
                mediaObjects: true,
            },
        });

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json(item);
    } catch (err) {
        next(err);
    }
}

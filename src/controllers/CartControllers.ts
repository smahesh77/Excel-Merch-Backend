import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { OrderStatus, Size } from '@prisma/client';
import { BadRequestError, InternalServerError } from '../utils/error';
import { PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';

export async function getUserCartItems(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;
		const cartItems = await prisma.cartItem.findMany({
			where: {
				userId: decodedUser.user_id,
			},
			include: {
				item: {
					include: {
						mediaObjects: true,
					},
				},
			},
		});

		return res.status(200).json({ cartItems });
	} catch (err) {
		next(err);
	}
}

interface AddToCartRequest {
	itemId: number;
	quantity: number;
	colorOption: string;
	sizeOption: Size;
}

export async function addItemToCart(
	req: Request<{}, {}, AddToCartRequest>,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;
		const { itemId, quantity, colorOption, sizeOption } = req.body;

		if (!itemId || !quantity || !colorOption || !sizeOption) {
			throw new BadRequestError(
				'itemId, quantity, colorOption and sizeOption are required'
			);
		}

		if (quantity < 1) {
			throw new BadRequestError('Quantity should be greater than 0');
		}

		const item = await prisma.item.findUnique({
			where: {
				id: itemId,
			},
			select: {
				stockCount: {
					where: {
						colorOption,
						sizeOption,
					},
				},
				colorOptions: true,
				sizeOptions: true,
			},
		});

		if (!item) {
			throw new BadRequestError('Item not found');
		}

		if (
			item.colorOptions.indexOf(colorOption) === -1 ||
			item.sizeOptions.indexOf(sizeOption) === -1
		) {
			throw new BadRequestError(
				`Item doesn't have this color and size. Chosen color: ${colorOption}, Chosen size: ${sizeOption}. Available colors: [${item.colorOptions.join(
					', '
				)}], available sizes: [${item.sizeOptions.join(', ')}]`
			);
		}

		/**
		 * StockCount array should always have one element
		 * as itemId, colorOption and sizeOption are unique.
		 * This shoudl also be present as it is present
		 * in sizeOptions and colorOptions, even if stock is zero with count 0
		 */
		if (item.stockCount.length === 0) {
			throw new InternalServerError(
				'Item Stock for this color and size not found'
			);
		}

		if (item.stockCount[0].count < quantity) {
			throw new BadRequestError(
				`Not enough stock. Requested: ${quantity}, Available: ${item.stockCount[0].count}`
			);
		}

		const cartItem = await prisma.cartItem.upsert({
			where: {
				itemId_userId: {
					itemId,
					userId: decodedUser.user_id,
				},
			},
			update: {
				quantity: quantity,
				sizeOption: sizeOption,
				colorOption: colorOption,
			},
			create: {
				userId: decodedUser.user_id,
				itemId,
				quantity,
				sizeOption: sizeOption,
				colorOption: colorOption,
			},

			include: {
				item: {
					include: {
						mediaObjects: true,
					},
				},
			},
		});

		return res.status(200).json({
			message: 'Item updated to cart',
			cartItem: cartItem,
		});
	} catch (err) {
		next(err);
	}
}

export async function removeItemFromCart(
	req: Request<{ itemId: string }>,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;
		const itemId = parseInt(req.params.itemId);

		if (!itemId) {
			throw new BadRequestError('itemId is required');
		}

		const cartItem = await prisma.cartItem.findUnique({
			where: {
				itemId_userId: {
					itemId,
					userId: decodedUser.user_id,
				},
			},
		});

		if (!cartItem) {
			throw new BadRequestError('Item not found in cart');
		}

		await prisma.cartItem.delete({
			where: {
				itemId_userId: {
					itemId,
					userId: decodedUser.user_id,
				},
			},
		});

		return res.status(200).json({ message: 'Item removed from cart' });
	} catch (err) {
		next(err);
	}
}

export async function emptyCart(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;

		await prisma.cartItem.deleteMany({
			where: {
				userId: decodedUser.user_id,
			},
		});

		return res.status(200).json({ message: 'Cart Emptied' });
	} catch (err) {
		next(err);
	}
}

// TODO: test if this works
// TODO: Handle Payments
// TODO: Handle if any stockCount is not enough
export async function checkoutController(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;
		const userProfile = await prisma.user.findUnique({
			where: { id: decodedUser.user_id },
			include: {
				address: true,
				cartItems: {
					include: {
						item: true,
					},
				},
			},
		});

		if (!userProfile) {
			throw new BadRequestError('Complete your profile to continue');
		}

		if (userProfile.cartItems?.length === 0) {
			throw new BadRequestError('Cart is empty');
		}

		// TODO: Make better address format
		const orderAddress = `
${userProfile.address?.house},
${userProfile.address?.area},
${userProfile.address?.city},
${userProfile.address?.state}
${userProfile.address?.zipcode}
`;

		const stockCounts = await prisma.stockCount.findMany({
			where: {
				itemId: {
					in: userProfile.cartItems.map(
						(cartItem) => cartItem.itemId
					),
				},
			},
		});

		/**
		 * This will check if any item is out of stock
		 */
		for (const cartItem of userProfile.cartItems) {
			const stockCount = stockCounts.find(
				(stockCount) =>
					stockCount.itemId === cartItem.itemId &&
					stockCount.colorOption === cartItem.colorOption &&
					stockCount.sizeOption === cartItem.sizeOption
			);

			if (!stockCount) {
				throw new InternalServerError(
					'Item Stock for this color and size not found'
				);
			}

			if (stockCount.count < cartItem.quantity) {
				throw new BadRequestError(
					`Not enough stock for itemId: ${cartItem.itemId}. Requested: ${cartItem.quantity}, Available: ${stockCount.count}`
				);
			}
		}

		/**
		 * Even if above check passes, there is a chance
		 * that stockCount is updated after the check.
		 * So, we will update the stockCount in a transaction
		 * The stockCount table has a check constraint
		 * that count should not be less than zero.
		 * So, if the count is less than zero, it will
		 * revert the transaction.
		 */
		const stockUpdationCalls = userProfile.cartItems.map((cartItem) => {
			return prisma.stockCount.update({
				where: {
					itemId_colorOption_sizeOption: {
						itemId: cartItem.itemId,
						colorOption: cartItem.colorOption,
						sizeOption: cartItem.sizeOption,
					},
				},
				data: {
					count: {
						decrement: cartItem.quantity,
					},
				},
			});
		});

		try {
			const [order, cartItemsDelete, ...stockUpdationResponses] =
				await prisma.$transaction([
					prisma.order.create({
						data: {
							userId: decodedUser.user_id,
							status: OrderStatus.processing,
							address: orderAddress,
							orderItems: {
								create: userProfile.cartItems.map(
									(cartItem) => ({
										itemId: cartItem.itemId,
										quantity: cartItem.quantity,
										colorOption: cartItem.colorOption,
										sizeOption: cartItem.sizeOption,
										price: cartItem.item.price,
									})
								),
							},
						},

						include: {
							orderItems: true,
						},
					}),
					prisma.cartItem.deleteMany({
						where: {
							userId: decodedUser.user_id,
						},
					}),

					...stockUpdationCalls,
				]);

			return res.status(200).json({ order });
		} catch (err: any) {
			if (
				err instanceof PrismaClientUnknownRequestError &&
				err.message.includes('violates check constraint')
			) {
				throw new BadRequestError(
					'Stock not enough. Stock decresed after you added to cart. Please try again'
				);
			}
			throw new InternalServerError('Error While Checking Out');
		}
	} catch (err) {
		next(err);
	}
}

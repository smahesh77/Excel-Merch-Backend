import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { OrderStatus, Size } from '@prisma/client';
import { BadRequestError } from '../utils/error';

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


// TODO: don't allow adding more than stockCount
export async function addItemToCart(
	req: Request<{}, {}, AddToCartRequest>,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;
		const { itemId, quantity, colorOption, sizeOption } = req.body;

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
			}
		});

		return res.status(200).json({ 
			message: 'Item added to cart',
			cartItem: cartItem
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

		if(userProfile.cartItems?.length === 0) {
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

		const stockUpdationCalls = userProfile.cartItems.map((cartItem) => {
			return prisma.item.update({
				where: {
					id: cartItem.itemId,
				},
				data: {
					stockCount: {
						decrement: cartItem.quantity,
					},
				},
			});
		});

		const [order] = await prisma.$transaction([
			prisma.order.create({
				data: {
					userId: decodedUser.user_id,
					status: OrderStatus.processing,
					address: orderAddress,
					orderItems: {
						create: userProfile.cartItems.map((cartItem) => ({
							itemId: cartItem.itemId,
							quantity: cartItem.quantity,
							colorOption: cartItem.colorOption,
							sizeOption: cartItem.sizeOption,
							price: cartItem.item.price,
						})),
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

		res.status(200).json({ order });
	} catch (err) {
		next(err);
	}
}

import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import {
	AdditionalOrderCharges,
	OrderStatus,
	PaymentStatus,
	ShippingStatus,
	Size,
} from '@prisma/client';
import { BadRequestError, InternalServerError } from '../utils/error';
import { PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';
import { getTransferAmountInRs, razorpay } from '../utils/razorpay';
import {
	DeliveryChargeInRs,
	OrderAmtAboveWhichFreeDeliveryInRs,
} from '../utils/constants';
import { v4 as uuidv4 } from 'uuid';
import { RAZORPAY_TRANSFER_ACC_ID } from '../utils/env';
import { Transfers } from 'razorpay/dist/types/transfers';
import { Orders } from 'razorpay/dist/types/orders';

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

		const pendingOrders = await prisma.order.findMany({
			where: {
				userId: decodedUser.user_id,
				paymentStatus: PaymentStatus.payment_pending,
				orderStatus: OrderStatus.order_unconfirmed,
			},
		});
		let message = 'Cart Items Fetched';

		if (pendingOrders.length > 0) {
			message = 'You have pending orders. Please complete that first.';
		}

		return res.status(200).json({
			cartItems,
			pendingOrders,
			message,
		});
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
				deleted: false,
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

		const userCreatedCartItem = await prisma.user.findUnique({
			where: {
				id: decodedUser.user_id,
			},
		});

		if (!userCreatedCartItem) {
			await prisma.user.create({
				data: {
					id: decodedUser.user_id,
					email: decodedUser.email,
					name: decodedUser.name,
				},
			});
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
				orders: true,
			},
		});

		if (!userProfile) {
			throw new BadRequestError('Create profile first');
		}

		if (!userProfile.address) {
			throw new BadRequestError('Add address first');
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

		/**
		 * Check if any items were deleted by admin after user added them to cart
		 */

		for (const cartItem of userProfile.cartItems) {
			if (cartItem.item.deleted) {
				throw new BadRequestError(
					`Item ${cartItem.item.name} was deleted after you added to cart. Please remove it from cart and try again`
				);
			}
		}

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
		 * Can be max 40 characters as per Razorpay "receipt" field
		 * uuidv4() will generate a 36 character string
		 */
		const orderId = `exc_${uuidv4()}`;
		let razOrder: Orders.RazorpayOrder | undefined = undefined;

		let additionalCharges: Pick<
			AdditionalOrderCharges,
			'chargeType' | 'chargeAmountInRs'
		>[] = [];
		const orderAmountInRs = userProfile.cartItems.reduce(
			(acc, cartItem) => {
				return acc + cartItem.item.price * cartItem.quantity;
			},
			0
		);

		if (orderAmountInRs === 0) {
			throw new BadRequestError('Order amount cannot be zero');
		}

		let totalAmountInRs = orderAmountInRs;
		if (orderAmountInRs <= OrderAmtAboveWhichFreeDeliveryInRs) {
			totalAmountInRs += DeliveryChargeInRs;
			additionalCharges.push({
				chargeType: 'Delivery Charge',
				chargeAmountInRs: DeliveryChargeInRs,
			});
		}

		try {
			const transfers: Transfers.RazorpayTransferCreateRequestBody[] = [];
			if (RAZORPAY_TRANSFER_ACC_ID) {
				const transferAmt = getTransferAmountInRs(totalAmountInRs);
				transfers.push({
					account: RAZORPAY_TRANSFER_ACC_ID,
					amount: transferAmt * 100,
					currency: 'INR',
				});
			}

			razOrder = await razorpay.orders.create({
				amount: totalAmountInRs * 100,
				currency: 'INR',
				receipt: orderId,
				transfers: transfers,
				notes: {
					orderId: orderId,
					user_id: decodedUser.user_id,
					user_email: decodedUser.email,
				},
			});
		} catch (err) {
			throw new InternalServerError(
				'Error While creating Razorpay Order',
				{ err }
			);
		}

		const [order, cartItemsDelete] = await prisma.$transaction([
			prisma.order.create({
				data: {
					userId: decodedUser.user_id,
					address: orderAddress,
					orderId: orderId,
					razOrderId: razOrder.id,
					orderItems: {
						create: userProfile.cartItems.map((cartItem) => ({
							itemId: cartItem.itemId,
							quantity: cartItem.quantity,
							colorOption: cartItem.colorOption,
							sizeOption: cartItem.sizeOption,
							price: cartItem.item.price,
						})),
					},

					additionalCharges: {
						create: additionalCharges,
					},
					totalAmountInRs: totalAmountInRs,

					orderStatus: OrderStatus.order_unconfirmed,
					paymentStatus: PaymentStatus.payment_pending,
					shippingStatus: ShippingStatus.not_shipped,
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
		]);

		return res.status(200).json({ order });
	} catch (err) {
		next(err);
	}
}

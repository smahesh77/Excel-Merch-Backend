import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { BadRequestError, NotFoundError } from '../utils/error';
import { razorpay } from '../utils/razorpay';
import { OrderStatus, PaymentStatus, ShippingStatus } from '@prisma/client';

export async function getOrders(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;

		const orders = await prisma.order.findMany({
			where: {
				userId: decodedUser.user_id,
			},
			include: {
				orderItems: {
					include: {
						item: {
							include: {
								mediaObjects: true,
							},
						},
					},
				},
				additionalCharges: true,
			},
		});

		return res.status(200).json({ orders });
	} catch (err) {
		next(err);
	}
}

export async function getOrder(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;
		const orderId = req.params.orderId;

		if (!orderId) {
			throw new BadRequestError('Order ID not provided');
		}

		const order = await prisma.order.findUnique({
			where: {
				orderId: orderId,
				userId: decodedUser.user_id,
			},
			include: {
				orderItems: {
					include: {
						item: {
							include: {
								mediaObjects: true,
							},
						},
					},
				},
				additionalCharges: true,
			},
		});

		if (!order) {
			throw new NotFoundError('Order not found');
		}

		const razorpayOrderId = order.razOrderId;

		const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);

		/**
		 * If the webhook failed to update the order status,
		 * we update it here when user navigates to the order page
		 */
		// TODO: Update Stock when updating order status
		// if (
		// 	razorpayOrder.status === 'paid' &&
		// 	order.paymentStatus === PaymentStatus.payment_pending &&
		// 	order.orderStatus === OrderStatus.order_unconfirmed &&
		// 	order.shippingStatus === ShippingStatus.not_shipped
		// ) {
		// 	await prisma.order.update({
		// 		where: {
		// 			orderId: orderId,
		// 		},
		// 		data: {
		// 			paymentStatus: PaymentStatus.payment_received,
		// 			orderStatus: OrderStatus.order_confirmed,
		// 		},
		// 	});
		// }

		const razorpayPayments = (
			await razorpay.orders.fetchPayments(razorpayOrderId)
		)?.items;

		return res.status(200).json({
			order,
			razorpayOrder,
			razorpayPayments,
		});
	} catch (err) {
		next(err);
	}
}

export async function cancelOrder(
	req: Request<{ orderId: string }>,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;
		const orderId = req.params.orderId;

		if (!orderId) {
			throw new BadRequestError('Order ID not provided');
		}

		const order = await prisma.order.findFirst({
			where: {
				orderId: orderId,
				userId: decodedUser.user_id,
			},
		});

		if (!order) {
			throw new NotFoundError('Order not found');
		}

		if (
			order.paymentStatus === PaymentStatus.payment_pending &&
			order.shippingStatus === ShippingStatus.not_shipped &&
			order.orderStatus === OrderStatus.order_unconfirmed
		) {
			await prisma.order.update({
				where: {
					orderId: orderId,
				},
				data: {
					orderStatus: OrderStatus.order_cancelled_by_user,
				},
			});

			return res.status(200).json({ message: 'Order cancelled' });
		}

		return res.status(400).json({
			message:
				'Order cannot be cancelled for current order, payment and shipping status',
			orderStatus: order.orderStatus,
			paymentStatus: order.paymentStatus,
			shippingStatus: order.shippingStatus,
		});
	} catch (err) {
		next(err);
	}
}

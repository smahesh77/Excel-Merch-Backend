import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/error';
import { ShippingStatus } from '@prisma/client';
import { sendShippingStartedMail } from '../utils/mailer';

interface UpdateShippingStatusRequest {
	shippingStatus: ShippingStatus;
	trackingId?: string;
}

export async function updateOrderStatus(
	req: Request<
		{
			orderId: string;
		},
		{},
		UpdateShippingStatusRequest
	>,
	res: Response,
	next: NextFunction
) {
	const orderId = req.params.orderId;
	const { shippingStatus, trackingId } = req.body;

	try {
		const order = await prisma.order.findUnique({
			where: { orderId: orderId },
			include: {
				user: true,
			},
		});

		if (!order) {
			throw new NotFoundError('Order not found');
		}

		if (
			order.shippingStatus !== ShippingStatus.shipping &&
			shippingStatus === ShippingStatus.shipping
		) {
			/**
			 * When admin sets shipping status to shipping, send mail to user
			 * with tracking id if present
			 */
			sendShippingStartedMail(
				order.user.name,
				order.orderId,
				order.user.email,
				trackingId
			);
		}

		const updatedOrder = await prisma.order.update({
			where: { orderId: orderId },
			data: {
				shippingStatus,
				trackingId,
			},
		});

		return res.status(200).json({
			order: updatedOrder,
			message: 'Order status updated successfully',
		});
	} catch (err) {
		next(err);
	}
}

export async function getAllOrders(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const orders = await prisma.order.findMany({
			where: {
				orderStatus: 'order_confirmed',
			},
			include: {
				orderItems: true,
				user: true,
				additionalCharges: true,
			},
		});

		return res.status(200).json({
			orders,
			message: 'Orders fetched successfully',
		});
	} catch (err) {
		next(err);
	}
}

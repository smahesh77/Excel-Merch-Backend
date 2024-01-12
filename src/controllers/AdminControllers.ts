import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/error';
import { ShippingStatus } from '@prisma/client';

interface UpdateShippingStatusRequest {
	shippingStatus: ShippingStatus;
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
	const { shippingStatus } = req.body;

	try {
		const order = await prisma.order.findUnique({
			where: { orderId: orderId },
		});

		if (!order) {
			throw new NotFoundError('Order not found');
		}

		const updatedOrder = await prisma.order.update({
			where: { orderId: orderId },
			data: { shippingStatus: shippingStatus },
		});

		return res.status(200).json({
			order: updatedOrder,
			message: 'Order status updated successfully',
		});
	} catch (err) {
		next(err);
	}
}

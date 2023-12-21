import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/error';

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
			},
		});

		return res.status(200).json({ orders });
	} catch (err) {
		next(err);
	}
}

export async function updateOrderStatus(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const orderId = parseInt(req.params.orderId, 10);
	const { status } = req.body;

	try {
		const order = await prisma.order.findUnique({
			where: { orderId: orderId },
		});

		if (!order) {
			throw new NotFoundError('Order not found');
		}

		const updatedOrder = await prisma.order.update({
			where: { orderId: orderId },
			data: { status: status },
		});

		return res.status(200).json({
			order: updatedOrder,
			message: 'Order status updated successfully',
		});
	} catch (err) {
		next(err);
	}
}

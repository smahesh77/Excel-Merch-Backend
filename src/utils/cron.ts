import { PaymentStatus, ShippingStatus } from '@prisma/client';
import { prisma } from './prisma';
import { maxOrderPendingTimeInMs } from './constants';

/**
 * Checks for all pending orders in DB and cancels them
 * if they have been pending for more than maximum allowed time.
 * Also shifts the items back to inventory and adds them back to stock.
 * Also shifts item back to users' cart.
 */

export async function checkPendingOrders() {
	try {
        console.log('Checking pending orders');
		const paymentPendingOrders = await prisma.order.findMany({
			where: {
				paymentStatus: PaymentStatus.payment_pending,
				shippingStatus: ShippingStatus.not_shipped,
			},
		});
        console.log(`Found ${paymentPendingOrders.length} pending orders`);

		for (const order of paymentPendingOrders) {
			try {
				const currentTime = new Date();
				const orderTime = new Date(order.orderDate);
				const timeDiffInMs =
					currentTime.getTime() - orderTime.getTime();

				if (timeDiffInMs > maxOrderPendingTimeInMs) {
					console.log(
						`Cancelling order ${order.orderId} as it has been pending for more than ${maxOrderPendingTimeInMs} ms of user ${order.userId}`
					);

					const orderItems = await prisma.orderItem.findMany({
						where: {
							orderId: order.orderId,
						},
					});

					// Set order status to cancelled
					const orderCancelCall = prisma.order.update({
						where: {
							orderId: order.orderId,
						},
						data: {
							paymentStatus: PaymentStatus.payment_timeout,
							shippingStatus: ShippingStatus.cancelled,
						},
					});

					// Add items back to inventory
					const stockUpdationCalls = orderItems.map((orderItem) => {
						return prisma.stockCount.update({
							where: {
								itemId_colorOption_sizeOption: {
									itemId: orderItem.itemId,
									colorOption: orderItem.colorOption,
									sizeOption: orderItem.sizeOption,
								},
							},
							data: {
								count: {
									increment: orderItem.quantity,
								},
							},
						});
					});

					// Add items back to user's cart
					const cartInsertCall = prisma.cartItem.createMany({
						data: orderItems.map((orderItem) => {
							return {
								userId: order.userId,
								itemId: orderItem.itemId,
								colorOption: orderItem.colorOption,
								sizeOption: orderItem.sizeOption,
								quantity: orderItem.quantity,
							};
						}),
					});

					await prisma.$transaction([
						orderCancelCall,
						...stockUpdationCalls,
						cartInsertCall,
					]);

					console.log(
						`Cancelled order ${order.orderId} as it has been pending for more than ${maxOrderPendingTimeInMs} ms of user ${order.userId}`
					);
				}
			} catch (err) {
				console.error(err);
			}
		}
	} catch (err) {
		console.error(err);
	}

    console.log('Finished checking pending orders');
}

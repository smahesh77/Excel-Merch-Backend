import { NextFunction, Request, Response } from 'express';
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
} from '../utils/error';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { RAZORPAY_WEBHOOK_SECRET } from '../utils/env';
import { prisma } from '../utils/prisma';
import { OrderStatus, PaymentStatus, ShippingStatus } from '@prisma/client';
import { PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';
import { razorpay } from '../utils/razorpay';
import { Payments } from 'razorpay/dist/types/payments';
import { Refunds } from 'razorpay/dist/types/refunds';

enum CapturedEvents {
	OrderPaid = 'order.paid',
	RefundProcessed = 'refund.processed',
	RefundFailed = 'refund.failed',
}

interface IPaymentSuccess extends Payments.RazorpayPayment {
	status: 'captured';
}

interface IOrderPaidWebhookPayload {
	entity: 'event';
	account_id: string;
	event: CapturedEvents.OrderPaid;
	contains: string[];
	created_at: number;
	payload: {
		payment: {
			entity: IPaymentSuccess;
		};
		order: {
			entity: {
				id: string;
				entity: 'order';
				amount: number;
				amount_paid: number;
				amount_due: number;
				currency: string;
				receipt: string | null;
				offer_id: null;
				status: 'paid';
				attempts: number;
				notes: {
					[key: string]: string;
				}[];
				created_at: number;
			};
		};
	};
}

interface IPaymentRefunded extends Payments.RazorpayPayment {
	status: 'refunded';
}
interface IRefundProcessed extends Refunds.RazorpayRefund {
	status: 'processed';
}
interface IRefundProcessedWebhookPayload {
	entity: 'event';
	account_id: string;
	event: CapturedEvents.RefundProcessed;
	contains: string[];
	created_at: number;
	payload: {
		refund: {
			entity: IRefundProcessed;
		};
		payment: {
			entity: IPaymentRefunded;
		};
	};
}

interface IRefundFailed extends Refunds.RazorpayRefund {
	status: 'failed';
}

interface IRefundFailedWebhookPayload {
	entity: 'event';
	account_id: string;
	event: CapturedEvents.RefundFailed;
	contains: string[];
	created_at: number;
	payload: {
		refund: {
			entity: IRefundFailed;
		};
		payment: {
			entity: IPaymentSuccess;
		};
	};
}

type IWebhookPayload =
	| IOrderPaidWebhookPayload
	| IRefundProcessedWebhookPayload
	| IRefundFailedWebhookPayload;

export async function razorPayWebhook(
	req: Request,
	res: Response,
	next: NextFunction
) {
	console.log('Webhook called', {
		headers: req.headers,
		body: req.body,
	});
	try {
		const xRazorpaySignature = req.headers['x-razorpay-signature'];
		if (!xRazorpaySignature) {
			throw new BadRequestError(
				'Invalid signature, x-razorpay-signature header missing'
			);
		}

		if (Array.isArray(xRazorpaySignature)) {
			throw new BadRequestError(
				'Invalid signature, Multiple x-razorpay-signature header'
			);
		}

		const body = req.body;

		if (
			!validateWebhookSignature(
				JSON.stringify(body),
				xRazorpaySignature,
				RAZORPAY_WEBHOOK_SECRET
			)
		) {
			throw new BadRequestError('Invalid signature');
		}

		const reqPayload = body as IWebhookPayload;

		switch (reqPayload.event) {
			case CapturedEvents.OrderPaid:
				const orderPaidResponse = await orderPaid(reqPayload);
				return res.status(200).json({
					message: 'Order confirmed',
					...orderPaidResponse,
				});
			case CapturedEvents.RefundProcessed:
				const refundProcessedRes = await refundProcessed(reqPayload);
				return res.status(200).json({
					message: 'Refund processed',
					...refundProcessedRes,
				});
			case CapturedEvents.RefundFailed:
				const refundFailedRes = await refundFailed(reqPayload);
				return res.status(200).json({
					message: 'Refund failed',
					...refundFailedRes,
				});
			default:
				throw new InternalServerError('Unknown event');
		}
	} catch (err) {
		next(err);
	}
}

async function orderPaid(reqPayload: IOrderPaidWebhookPayload): Promise<{
	[key: string]: string;
}> {
	if (
		reqPayload.payload.order.entity.status === 'paid' &&
		reqPayload.payload.order.entity.amount_due === 0
	) {
		const merchOrderId = reqPayload.payload.order.entity.receipt;
		const razorpayOrderId = reqPayload.payload.order.entity.id;

		if (!merchOrderId || !razorpayOrderId) {
			throw new InternalServerError('Invalid order', {
				merchOrderId,
				razorpayOrderId,
				reqPayload,
			});
		}

		const order = await prisma.order.findUnique({
			where: {
				razOrderId: razorpayOrderId,
				orderId: merchOrderId,
			},
			include: {
				orderItems: {
					include: {
						item: true,
					},
				},
			},
		});

		if (!order) {
			throw new InternalServerError('Order not found', {
				merchOrderId,
				razorpayOrderId,
				reqPayload,
			});
		}

		if (
			order.orderStatus === OrderStatus.order_unconfirmed &&
			order.paymentStatus === PaymentStatus.payment_pending
		) {
			/**
			 * The stockCount table has a check constraint
			 * that count should not be less than zero.
			 * So, if the count is less than zero, it will
			 * revert the transaction.
			 */
			const stockUpdationCalls = order.orderItems.map((orderItem) => {
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
							decrement: orderItem.quantity,
						},
					},
				});
			});

			try {
				await prisma.$transaction([
					...stockUpdationCalls,
					prisma.order.update({
						where: {
							orderId: merchOrderId,
						},
						data: {
							paymentStatus: PaymentStatus.payment_received,
							orderStatus: OrderStatus.order_confirmed,
							razOrderId: razorpayOrderId,
						},
					}),
				]);

				return {
					message: 'Order confirmed',
				};
			} catch (err) {
				if (
					err instanceof PrismaClientUnknownRequestError &&
					err.message.includes('violates check constraint')
				) {
					console.error(
						`Stock ran out after payment for order ${merchOrderId}`
					);
					await prisma.order.update({
						where: {
							orderId: merchOrderId,
						},
						data: {
							paymentStatus:
								PaymentStatus.payment_refund_initiated,
							orderStatus:
								OrderStatus.order_cancelled_insufficient_stock,
							razOrderId: razorpayOrderId,
						},
					});

					try {
						await razorpay.payments.refund(
							reqPayload.payload.payment.entity.id,
							{
								amount: reqPayload.payload.payment.entity
									.amount,
								speed: 'optimum',
								receipt: merchOrderId,
								notes: {
									reason: 'stock ran out',
								},
							}
						);
					} catch (err) {
						console.error('Refund failed', {
							merchOrderId,
							razorpayOrderId,
							reqPayload,
						});
						await prisma.order.update({
							where: {
								orderId: merchOrderId,
							},
							data: {
								paymentStatus:
									PaymentStatus.payment_refund_failed,
							},
						});

						// TODO: send email to admin
					}
					return {
						message: 'Order cancelled due to insufficient stock',
					};
				} else {
					throw err;
				}
			}
		} else if (
			order.orderStatus === OrderStatus.order_cancelled_by_user &&
			order.paymentStatus === PaymentStatus.payment_pending
		) {
			console.error(
				`Recieved payment for cancelled order ${merchOrderId} for user ${order.userId}`,
				{
					merchOrderId,
					razorpayOrderId,
					reqPayload,
				}
			);

			await prisma.order.update({
				where: {
					orderId: merchOrderId,
				},
				data: {
					paymentStatus: PaymentStatus.payment_received,
				},
			});

			return {
				message: 'Order was already cancelled by user',
			};
		} else if (
			order.orderStatus === OrderStatus.order_confirmed &&
			order.paymentStatus === PaymentStatus.payment_received
		) {
			console.warn('Order already processed', {
				merchOrderId,
				razorpayOrderId,
				reqPayload,
			});
			return {
				message: 'Order already processed',
			};
		} else {
			console.error('Unexpected order status', {
				merchOrderId,
				razorpayOrderId,
				reqPayload,
			});
			return {
				message: 'Unexpected order status',
			};
		}
	} else {
		throw new InternalServerError('Unexpected order status', {
			reqPayload,
		});
	}
}

async function refundProcessed(
	reqPayload: IRefundProcessedWebhookPayload
): Promise<{
	[key: string]: string;
}> {
	const razOrderId = reqPayload.payload.payment.entity.order_id;
	if (!razOrderId) {
		throw new BadRequestError('Order ID not provided');
	}

	const order = await prisma.order.findFirst({
		where: {
			razOrderId: razOrderId,
		},
	});

	if (!order) {
		throw new NotFoundError('Order not found');
	}

	if (
		order.paymentStatus === PaymentStatus.payment_refund_initiated &&
		order.orderStatus === OrderStatus.order_cancelled_insufficient_stock
	) {
		await prisma.order.update({
			where: {
				orderId: order.orderId,
			},
			data: {
				paymentStatus: PaymentStatus.payment_refunded,
			},
		});
		// TODO: send email to user
		return {
			message: 'Order Refund success',
		};
	} else {
		// TODO: send email to admin
		console.error('Unexpected refund', {
			reqPayload,
		});
		throw new InternalServerError('Unexpected refund', {
			reqPayload,
		});
	}
}

async function refundFailed(reqPayload: IRefundFailedWebhookPayload): Promise<{
	[key: string]: string;
}> {
	const razOrderId = reqPayload.payload.payment.entity.order_id;
	if (!razOrderId) {
		throw new BadRequestError('Order ID not provided');
	}

	const order = await prisma.order.findFirst({
		where: {
			razOrderId: razOrderId,
		},
	});

	if (!order) {
		throw new NotFoundError('Order not found');
	}

	if (
		order.paymentStatus === PaymentStatus.payment_refund_initiated &&
		order.orderStatus === OrderStatus.order_cancelled_insufficient_stock
	) {
		// TODO: send email to admin
		await prisma.order.update({
			where: {
				orderId: order.orderId,
			},
			data: {
				paymentStatus: PaymentStatus.payment_refund_failed,
			},
		});

		return {
			message: 'Order Refund failed action required',
		};
	} else {
		console.error('Unexpected refund', {
			reqPayload,
		});

		return {
			message: 'Unexpected refund',
		};
	}
}

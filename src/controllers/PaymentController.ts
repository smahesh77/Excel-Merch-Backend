import { NextFunction, Request, Response } from 'express';
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
} from '../utils/error';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { RAZORPAY_WEBHOOK_SECRET } from '../utils/env';
import { prisma } from '../utils/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';
import { razorpay } from '../utils/razorpay';
import { Payments } from 'razorpay/dist/types/payments';
import { Refunds } from 'razorpay/dist/types/refunds';
import { logger } from '../utils/logger';
import {
	sendOrderConfirmationMail,
	sendRefundConfirmationMail,
} from '../utils/mailer';

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
	logger.info('Webhook called', {
		headers: JSON.stringify(req.headers),
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
	} catch (err: any) {
		/**
		 * If webhook does not respond with 200, razorpay will retry
		 */
		if (err instanceof InternalServerError) {
			logger.error(err.message, {
				message: err.message,
				stack: err.stack,
				err: JSON.stringify(err),
				debug: JSON.stringify(err.debug),
			});
			return res.status(200).json({ error: err.message });
		} else {
			logger.error(err.message, {
				message: err.message,
				stack: err.stack,
				err: JSON.stringify(err),
			});
			return res.status(200).json({ error: 'Internal Server Error' });
		}
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
			/**
			 * Orders that happen in razorpay, such as payment pages etc will also
			 * trigger this webhook. So, we need to ignore those.
			 */
			logger.info('Ignoring order', {
				merchOrderId,
				razorpayOrderId,
				reqPayload: JSON.stringify(reqPayload),
			});
			return {
				message: 'Ignoring order',
			};
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
				user: true,
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

				logger.notice(`Order confirmed ${merchOrderId}`, {
					merchOrderId,
					razorpayOrderId,
				});

				sendOrderConfirmationMail(
					order.user.name,
					order.totalAmountInRs,
					merchOrderId,
					order.user.email
				);

				return {
					message: 'Order confirmed',
				};
			} catch (err) {
				if (
					err instanceof PrismaClientUnknownRequestError &&
					err.message.includes('violates check constraint')
				) {
					logger.notice(
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
						logger.error('Refund failed', {
							merchOrderId,
							razorpayOrderId,
							reqPayload: JSON.stringify(reqPayload),
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
			logger.alert(
				`Recieved payment for cancelled order ${merchOrderId} for user ${order.userId}`,
				{
					merchOrderId,
					razorpayOrderId,
					reqPayload: JSON.stringify(reqPayload),
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
			logger.info('Order already processed', {
				merchOrderId,
				razorpayOrderId,
			});
			return {
				message: 'Order already processed',
			};
		} else {
			logger.error('Unexpected order status', {
				merchOrderId,
				razorpayOrderId,
				reqPayload: JSON.stringify(reqPayload),
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
		include: {
			user: true,
		},
	});

	if (!order) {
		logger.warn('Refund for unknown order', {
			razOrderId,
		});
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

		sendRefundConfirmationMail(
			order.user.name,
			order.totalAmountInRs,
			order.orderId,
			order.user.email
		);

		return {
			message: 'Order Refund success',
		};
	} else if (order.paymentStatus === PaymentStatus.payment_refund_failed) {
		/**
		 * This happens if refund failed initially and then was manually
		 * refunded from razorpay dashboard.
		 */
		logger.notice('Refund success for previously failed refund', {
			razOrderId,
			orderId: order.orderId,
		});

		sendRefundConfirmationMail(
			order.user.name,
			order.totalAmountInRs,
			order.orderId,
			order.user.email
		);

		return {
			message: 'Order Refund success',
		};
	} else {
		logger.error('Unexpected refund', {
			reqPayload: JSON.stringify(reqPayload),
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
		logger.warn('Refund for unknown order', {
			razOrderId,
		});
		throw new NotFoundError('Order not found');
	}

	if (
		order.paymentStatus === PaymentStatus.payment_refund_initiated &&
		order.orderStatus === OrderStatus.order_cancelled_insufficient_stock
	) {
		logger.error('Refund failed', {
			razOrderId,
			orderId: order.orderId,
			reqPayload: JSON.stringify(reqPayload),
		});

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
		logger.error('Unexpected refund', {
			reqPayload: JSON.stringify(reqPayload),
		});

		return {
			message: 'Unexpected refund',
		};
	}
}

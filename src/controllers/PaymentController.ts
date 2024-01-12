import { NextFunction, Request, Response } from 'express';
import { BadRequestError, InternalServerError } from '../utils/error';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { RAZORPAY_WEBHOOK_SECRET } from '../utils/env';
import { prisma } from '../utils/prisma';
import { PaymentStatus, ShippingStatus } from '@prisma/client';

enum CapturedEvents {
	OrderPaid = 'order.paid',
}

interface IWebhookPayload {
	entity: 'event';
	account_id: string;
	event: CapturedEvents;
	contains: string[];
	payload: {
		payment: {
			entity: {
				id: string;
				entity: 'payment';
				amount: number;
				currency: string;
				status: string;
				order_id: string;
				// invoice_id: null;
				// international: false;
				method: 'netbanking' | 'card' | 'upi' | 'wallet';
				// amount_refunded: 0;
				// refund_status: null;
				captured: boolean;
				// description: null;
				card_id: string | null;
				bank: string | null;
				// wallet: null;
				vpa: string | null;
				email: string;
				contact: string;
				notes: {
					[key: string]: string;
				}[];
				fee: number;
				tax: number;
				error_code: null | string;
				error_description: null | string;
				created_at: number;
			};
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
	created_at: number;
}

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
				if (
					reqPayload.payload.order.entity.status === 'paid' &&
					reqPayload.payload.order.entity.amount_due === 0
				) {
					const merchOrderId =
						reqPayload.payload.order.entity.receipt;
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
					});

					if (!order) {
						throw new InternalServerError('Order not found', {
							merchOrderId,
							razorpayOrderId,
							reqPayload,
						});
					}

					if (order.shippingStatus === ShippingStatus.cancelled) {
						console.error('Recieved payment for cancelled order', {
							merchOrderId,
							razorpayOrderId,
							reqPayload,
						});
						await prisma.order.update({
							where: {
								orderId: merchOrderId,
							},
							data: {
								paymentStatus: PaymentStatus.payment_received,
							},
						});
					} else if (
						order.paymentStatus === PaymentStatus.payment_pending
					) {
						await prisma.order.update({
							where: {
								orderId: merchOrderId,
							},
							data: {
								paymentStatus: PaymentStatus.payment_received,
							},
						});
					} else {
						console.warn('Order already processed', {
							merchOrderId,
							razorpayOrderId,
							reqPayload,
						});
					}
				} else {
					throw new InternalServerError('Unexpected order status', {
						reqPayload,
					});
				}
				break;
			default:
				throw new InternalServerError('Unknown event');
		}
	} catch (err) {
		next(err);
	}
}

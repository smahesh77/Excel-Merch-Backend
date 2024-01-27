import { readFile } from 'fs/promises';

export async function getOrderConfirmationHTML(
	userName: string,
	totalAmt: number,
	orderId: string
) {
	const bodyTextRow1 = `<p style="font-size: 14px; line-height: 170%;">Your order with order id ${orderId} has been confirmed.</p>`;
	const bodyTextRow2 = `<p style="font-size: 14px; line-height: 170%;">Total amount: ₹${totalAmt}</p>`;

	const mainHeader = `Order Confirmation`;
	const dateText = new Date().toLocaleString('en-IN', {
		timeZone: 'Asia/Kolkata',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
	const bodyHeader = `Hi ${userName}!`;
	const bodyText = `${bodyTextRow1}\n${bodyTextRow2}`;

	const rawHtml = await readFile(`${__dirname}/index.html`, 'utf8');

	const html = rawHtml
		.replace('{{MAIN_HEADER}}', mainHeader)
		.replace('{{DATE}}', dateText)
		.replace('{{BODY_HEADER}}', bodyHeader)
		.replace('{{BODY_TEXT}}', bodyText);

	return html;
}

export async function getRefundConfirmationHTML(
	userName: string,
	totalAmt: number,
	orderId: string
) {
	const bodyTextRow1 = `<p style="font-size: 14px; line-height: 170%;">Refund for your order with id ${orderId} has been processed successfully.</p>`;
	const bodyTextRow2 = `<p style="font-size: 14px; line-height: 170%;">Total amount: ₹${totalAmt}</p>`;

	const mainHeader = `Your Refund has been processed successfully`;
	const dateText = new Date().toLocaleString('en-IN', {
		timeZone: 'Asia/Kolkata',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
	const bodyHeader = `Hi ${userName}!`;
	const bodyText = `${bodyTextRow1}\n${bodyTextRow2}`;

	const rawHtml = await readFile(`${__dirname}/index.html`, 'utf8');

	const html = rawHtml
		.replace('{{MAIN_HEADER}}', mainHeader)
		.replace('{{DATE}}', dateText)
		.replace('{{BODY_HEADER}}', bodyHeader)
		.replace('{{BODY_TEXT}}', bodyText);

	return html;
}

export async function getShippingStartedHTML(
	userName: string,
	orderId: string,
	trackingId?: string
) {
	const bodyTextRow1 = `<p style="font-size: 14px; line-height: 170%;">Your order with id ${orderId} has started shipping.</p>`;
	const bodyTextRow2 = `<p style="font-size: 14px; line-height: 170%;">You can track the status on the website.</p>`;
	const bodyTextRow3 = trackingId
		? `<p style="font-size: 14px; line-height: 170%;">Tracking ID: ${trackingId}</p>`
		: '';

	const mainHeader = `Woohoo! Your order has started shipping`;
	const dateText = new Date().toLocaleString('en-IN', {
		timeZone: 'Asia/Kolkata',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
	const bodyHeader = `Hi ${userName}!`;
	const bodyText = `${bodyTextRow1}\n${bodyTextRow2}\n${bodyTextRow3}`;

	const rawHtml = await readFile(`${__dirname}/index.html`, 'utf8');

	const html = rawHtml
		.replace('{{MAIN_HEADER}}', mainHeader)
		.replace('{{DATE}}', dateText)
		.replace('{{BODY_HEADER}}', bodyHeader)
		.replace('{{BODY_TEXT}}', bodyText);

	return html;
}

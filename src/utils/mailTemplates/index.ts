const bodyTextRow = `<p style="font-size: 14px; line-height: 170%;">Total amount: {{TOTAL_AMT_IN_RS}}</p>`;
const bodyHeader = `Hi {{NAME}}!`;
const mainHeader = `Order Confirmation`;
const dateText = `{{DATE}}`;

import { readFile } from "fs/promises";

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

    const rawHtml = await readFile(
        './index.html',
        'utf8'
    );

    const html = rawHtml
        .replace('{{MAIN_HEADER}}', mainHeader)
        .replace('{{DATE}}', dateText)
        .replace('{{BODY_HEADER}}', bodyHeader)
        .replace('{{BODY_TEXT}}', bodyText);
    
    return html;
}

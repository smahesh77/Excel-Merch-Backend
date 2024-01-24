import { Address } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

interface ProfileRequest {
	phoneNumber?: string;
	address: Omit<Address, 'id' | 'userId'>;
}

export async function updateProfileController(
	req: Request<{}, {}, ProfileRequest>,
	res: Response,
	next: NextFunction
) {
	const { phoneNumber, address } = req.body;
	const decodedUser = req.decodedToken!;

	try {
		const newUser = await prisma.user.upsert({
			where: { id: decodedUser.user_id },
			update: {
				phoneNumber,
			},
			create: {
				id: decodedUser.user_id,
				name: decodedUser.name,
				email: decodedUser.email,
				phoneNumber,
			},

			include: {
				address: true,
			},
		});

		const newAddress = await prisma.address.upsert({
			where: { userId: newUser.id },
			update: {
				...address,
			},
			create: {
				...address,
				userId: newUser.id,
			},
		});

		return res.json({
			user: {
				...newUser,
				address: newAddress,
			},
		});
	} catch (err) {
		next(err);
	}
}

export async function getProfileController(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const decodedUser = req.decodedToken!;
		const user = await prisma.user.findUnique({
			where: { id: decodedUser.user_id },
			include: {
				address: true,
				cartItems: true,
				orders: true,
			},
		});

		if (!user) {
			return res.status(404).json({ error: 'User Profile Not Created' });
		}

		return res.status(200).json({
			picture: decodedUser.picture,
			...user
		});
	} catch (err) {
		next(err);
	}
}

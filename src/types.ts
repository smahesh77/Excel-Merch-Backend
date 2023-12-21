// types.ts
// import { MediaObject, Size, User } from '@prisma/client';

type Roles = 'User' | 'Admin';
export type DecodedToken = {
	user_id: number;
	name: string;
	email: string;
	picture: string;
	role: 'User' | Roles[];
};

// TODO: Add these to controllers
// export interface ItemResponse {
// 	id: number;
// 	name: string;
// 	description: string;
// 	mediaObjects: MediaObject[];
// 	price: number;
// 	stockCount: number;
// 	sizeOptions: Size[];
// 	colorOptions: string[];
// }

// export interface ItemInCart {
// 	id: number;
// 	item: ItemResponse;
// 	quantity: number;
// }

// export interface CartResponse {
// 	id: number;
// 	items: ItemInCart[];
// 	user: User;
// 	userId: number;
// }

// export interface ItemRequest {
// 	name: string;
// 	description: string;
// 	price: number;
// 	stockCount: number;
// 	sizeOptions: Size[];
// 	colorOptions: string[];
// 	mediaObject: MediaObject;
// }

// export interface ItemInCartResponse {
// 	id: number;
// 	item: ItemResponse;
// 	quantity: number;
// }


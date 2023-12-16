// types.ts
import { Item, MediaObject, Order, Size, User, Cart } from '@prisma/client';
export interface UserData {
    id: number;
    name: string;
    email: string;
    phoneNumber?: string;
    password: string;
    address?: AddressData;
  }
  
  export interface AddressData {
    id: number;
    city: string;
    zipcode: string;
    state: string;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface SignupRequest extends UserData {
    city?: string;
    zipcode?: string;
    state?: string;
    area?: string;
  }
  
  export interface UpdateUserRequest {
    name?: string;
    email?: string;
    phoneNumber?: string;
    city?: string;
    zipcode?: string;
    state?: string;
  }
  // types.ts



// Define additional types and interfaces here


export interface ItemResponse {
  id: number;
  name: string;
  description: string;
  mediaObjects: MediaObject[];
  price: number;
  stockCount: number;
  sizeOptions: Size[];
  colorOptions: string[];
}

export interface ItemInCart {
  id: number;
  item: ItemResponse;
  quantity: number;
}

export interface CartResponse {
  id: number;
  items: ItemInCart[];
  user: User;
  userId: number;
}

export interface ItemRequest {
  name: string;
  description: string;
  price: number;
  stockCount: number;
  sizeOptions: Size[];
  colorOptions: string[];
  mediaObject: MediaObject;
}

export interface ItemInCartResponse {
  id: number;
  item: ItemResponse;
  quantity: number;
}

// Add more types and interfaces as needed

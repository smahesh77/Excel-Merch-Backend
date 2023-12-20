// types.d.ts

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      decodedToken?: {   
        user_id: string;
        name: string;
        email: string;
        isPaid: 'True' | 'False';
        picture: string;
        role: string;
        nbf: number;
        exp: number;
        iat: number;
        iss: string;}; // Add your custom properties here
    }
  }
}

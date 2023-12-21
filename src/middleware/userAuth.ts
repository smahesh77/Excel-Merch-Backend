import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { DecodedToken } from '../types';
import { JWT_SECRET_KEY } from '../utils/env';

dotenv.config();

  

const userValidateToken = (req: Request, res: Response, next: NextFunction): void => {

    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
        res.status(401).json({ error: 'Unauthorized: Missing authorization header' });
        return;
    }

    const tokenParts = authorizationHeader.split(' ');

    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        res.status(401).json({ error: 'Unauthorized: Invalid authorization header format' });
        return;
    }

    const token = tokenParts[1];

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET_KEY) as DecodedToken;

        if (!decodedToken.role.includes('User')) {
            res.status(403).json({ error: 'Unauthorized: Only Admins can change logostatus' });
            return;
        }

        req.decodedToken = decodedToken;


        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' , err: err});
    }
}

export { userValidateToken };

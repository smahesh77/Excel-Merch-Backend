import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { DecodedToken } from '../types';

dotenv.config();

  

const adminValidateToken = (req: Request, res: Response, next: NextFunction): void => {
    const jwtSecret = process.env.SECRET_KEY || "";

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
        const decodedToken = jwt.verify(token, jwtSecret) as DecodedToken;

        if (!decodedToken.role.includes('Admin')) {
            res.status(403).json({ error: 'Unauthorized: Only Admins can access this' });
            return;
        }

        req.decodedToken = decodedToken;


        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' , err: err});
    }
}

export { adminValidateToken };

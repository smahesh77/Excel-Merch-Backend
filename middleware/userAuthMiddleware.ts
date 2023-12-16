import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

const userValidateToken = (req: Request, res: Response, next: NextFunction): void => {
  const accessToken = req.header('accessToken');

  if (!accessToken) {
    res.json({ error: 'User is not logged in' });
    return
  }

  try {
    const validToken = verify(accessToken, `${process.env.SECRET_KEY_USER}`) as { [key: string]: any };

    if (validToken) {
      return next();
    }
  } catch (err) {
    res.json({ error: err });
    return ;
  }
};

export { userValidateToken };

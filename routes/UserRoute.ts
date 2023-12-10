// routes/userRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { UserData, AddressData, SignupRequest, LoginRequest, UpdateUserRequest } from '../types';
import dotenv from 'dotenv';
import { userValidateToken } from '../middleware/userAuthMiddleware';

dotenv.config();

const router = Router();
const prisma = new PrismaClient();


router.post('/signup', async (req: Request<{}, {}, SignupRequest>, res: Response, next: NextFunction) => {
  const { name, email, phoneNumber, password, city, zipcode, state, area } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        address: {
          create: {
            city: city || 'Default City',
            area: area || 'Default Area',
            zipcode: zipcode || '00000',
            state: state || 'Default State',
          },
        },
        // Create an empty cart for the new user
        cart: {
          create: {
            items: {}
          },
        },
      },
    });

    const accessToken = sign(
      { email: newUser.email, id: newUser.id, name: newUser.name },
      `${process.env.SECRET_KEY_USER}`
    );

    res.json({
      token: accessToken,
      name: newUser.name,
      id: newUser.id,
      email: newUser.email,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request<{}, {}, LoginRequest>, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = sign(
      { email: user.email, id: user.id, name: user.name },
      `${process.env.SECRET_KEY_USER}`
    );

    res.json({
      token: accessToken,
      name: user.name,
      id: user.id,
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/profile/:userId',userValidateToken, async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
  const userId = parseInt(req.params.userId, 10);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { address: true, cart: {include:{CartItem:true}}, orders:true},
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // const cart = await prisma.cart.findUnique({
    //   where: {userId: userId},
    //   include: {CartItem: true}
    // })

    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
       include: { address: true , cart: true },
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
});

// router.delete('/deleteAllUsers', async (req, res, next) => {
//     try {
//       // Ensure you have proper authentication and authorization checks before allowing this operation
  
//       // Delete all users and related data
//       await prisma.user.deleteMany({});
//       await prisma.address.deleteMany({});

  
//       res.json({ message: 'All users and related data deleted successfully' });
//     } catch (err) {
//       next(err);
//     }
//   });

router.put('/:userId', async (req: Request<{ userId: string }, {}, UpdateUserRequest>, res: Response, next: NextFunction) => {
  const userId = parseInt(req.params.userId, 10);
  const { name, email, phoneNumber, city, zipcode, state } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phoneNumber,
        address: {
          update: {
            city,
            zipcode,
            state,
          },
        },
      },
      include: { address: true },
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// get cart items
router.get('/getcartitems/:userId', async (req: Request, res: Response, next: NextFunction) => {
  const userId = parseInt(req.params.userId, 10);
  try {
    // Retrieve user and associated cart with items
    const userWithCart = await prisma.user.findUnique({
      where: { id: userId },
      include:{cart: true}
      
    });

    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: userWithCart?.cart?.id}
   });





    res.json(cartItems);
  } catch (err) {
    next(err);
  }
});

// Error handling middleware
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default router;

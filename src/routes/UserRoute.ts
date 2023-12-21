// routes/userRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { UserData, AddressData, SignupRequest, LoginRequest, UpdateUserRequest, DecodedToken } from '../types';
import dotenv from 'dotenv';
import { adminValidateToken } from '../middleware/authMiddleware';
import { log } from 'console';
import { userValidateToken } from '../middleware/userAuth';

dotenv.config();

const router = Router();
const prisma = new PrismaClient();


router.post('/signup', async (req: Request<{}, {}, SignupRequest>, res: Response, next: NextFunction) => {
  const { name, email, phoneNumber, password, city, zipcode, state, area } = req.body;

  try {


    res.json({

    });
  } catch (err) {
    next(err);
  }
});

router.post('/login',userValidateToken, async (req: Request<{}, {}, LoginRequest>, res: Response, next: NextFunction) => {
  const { phoneNumber, city, zipcode, state, area } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: req.decodedToken?.email },
    });

    if (existingUser) {
      return res.status(409).json(existingUser);
    }

    
    
    const newUser = await prisma.user.create({
      data: {
        name: req.decodedToken?.name || 'null',
        email:req.decodedToken?.email || 'null',
        phoneNumber,
        address: {
          create: {
            city: city || 'Default City',
            area: area || 'Default Area',
            zipcode: zipcode || '00000',
            state: state || 'Default State',
          },
        },
        cart: {
          create: {
            items: {},
          },
        },
      },
    });
    

    res.json({
     newUser
    });
  } catch (err) {
    next(err);
  }
});

router.get('/profile',userValidateToken, async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
  

  try {
    const user = await prisma.user.findUnique({
      where: { email: req.decodedToken?.email },
      include: { address: true, cart: {include:{CartItem:true}}, orders:true},
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // const cart = await prisma.cart.findUnique({
    //   where: {userId: userId},
    //   include: {CartItem: true}
    // })

    res.json(user.cart);
  } catch (err) {
    next(err);
  }
});

router.get('/',userValidateToken, async (req: Request, res: Response, next: NextFunction) => {
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

router.put('/', async (req: Request<{ userId: string }, {}, UpdateUserRequest>, res: Response, next: NextFunction) => {
  const { phoneNumber, city, zipcode, state } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { email:req.decodedToken?.email },
      data: {
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
router.get('/cart',userValidateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Retrieve user and associated cart with items 
    const userWithCart = await prisma.user.findUnique({
      where: { email:req.decodedToken?.email },
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

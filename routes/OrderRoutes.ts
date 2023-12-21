// Import necessary modules and types
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { userValidateToken } from '../middleware/userAuth';

const router = Router();
const prisma = new PrismaClient();

// order route
router.post('/placeorder/',userValidateToken, async (req: Request, res: Response, next: NextFunction) => {
  

  try {
    // Find the user with the cart and cart items
    const userWithCart = await prisma.user.findUnique({
      where: { email:req.decodedToken?.email },
      include: { cart: { include: { CartItem: true } ,},address:true },
    });

    if (!userWithCart || !userWithCart.cart) {
      return res.status(404).json({ error: 'User or cart not found' });
    }

    // Calculate the total amount and prepare order data
    const totalAmount = userWithCart.cart.CartItem.reduce(
      (total, cartItem) => total + cartItem.price * cartItem.quantity,
      0
    );


    const createdOrder = await prisma.order.create({
      data: {
        userId: userWithCart.id,
        address: `${userWithCart.address?.area} ${userWithCart.address?.city} ${userWithCart.address?.zipcode} ${userWithCart.address?.state}`,
        amount: totalAmount,
        status: 'processing',
        orderItems: {
          create: userWithCart.cart.CartItem.map((cartItem) => ({
            itemId: cartItem.itemId,
            quantity: cartItem.quantity,
            price: cartItem.price
          })),
        },
      },
    });


    await prisma.cartItem.deleteMany({
      where: { cartId: userWithCart.cart.id },
    });

    // Return the created order
    res.json(createdOrder);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction)=>{
  try {

    
    const all = await prisma.order.findMany()
    res.json(all);
  } catch (error) {
    console.error('Error redirecting to link target:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
})

router.put('/status/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  const orderId = parseInt(req.params.orderId, 10);
  const { status } = req.body;

  try {
    // Find the order
    const order = await prisma.order.findUnique({
      where: { orderId: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { orderId: orderId },
      data: { status: status },
    });

    res.json(updatedOrder);
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

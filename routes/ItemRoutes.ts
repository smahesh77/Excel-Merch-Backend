// routes/itemRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {  ItemResponse, CartResponse, ItemInCartResponse } from '../types';

const router = Router();
const prisma = new PrismaClient();

enum Size {
    S = 'S',
    M = 'M',
    L = 'L',
    XL = 'XL',
    XXL = 'XXL',
  }

  interface mediaObject{
    type: string;
    url: string;
    colorValue: string;
    viewOrdering: number;
    itemId: number;
  }

interface ItemRequest {
  name: string;
  description: string;
  price: number;
  stockCount: number;
  sizeOptions: Size[];
  colorOptions: string[];
  mediaObject: mediaObject;
}

router.post('/add', async (req: Request<{}, {}, ItemRequest>, res: Response, next: NextFunction) => {
  const { name, description, price, stockCount, sizeOptions, colorOptions, mediaObject } = req.body;

  try {
    const newItem = await prisma.item.create({
      data: {
        name,
        description,
        price,
        mediaObjects: {
          create: {
            type: mediaObject.type,
            url: mediaObject.url,
            colorValue: mediaObject.colorValue,
            viewOrdering: mediaObject.viewOrdering
          },
        },
        stockCount,
        sizeOptions: { set: sizeOptions },
        colorOptions: { set: colorOptions },
      },
    });

    res.json(newItem);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.item.findMany({
      include: {
        mediaObjects: true,
        orders: true,
        Cart: true,
      },
    });

    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  const itemId = parseInt(req.params.itemId, 10);

  try {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        mediaObjects: true,
        orders: true,
        Cart: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.patch('/:itemId', async (req: Request<{ itemId: string }, {}, ItemRequest>, res: Response, next: NextFunction) => {
  const itemId = parseInt(req.params.itemId, 10);
  const { name, description, price, stockCount, sizeOptions, colorOptions } = req.body;

  try {
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        name,
        description,
        price,
        stockCount,
        sizeOptions: { set: sizeOptions || [] },
        colorOptions: { set: colorOptions || [] },
      },
    });

    res.json(updatedItem);
  } catch (err) {
    next(err);
  }
});

router.put('/:itemId', async (req: Request<{ itemId: string }, {}, ItemRequest>, res: Response, next: NextFunction) => {
  const itemId = parseInt(req.params.itemId, 10);
  const { name, description, price, stockCount, sizeOptions, colorOptions } = req.body;

  try {
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        name,
        description,
        price,
        stockCount,
        sizeOptions: { set: sizeOptions },
        colorOptions: { set: colorOptions },
      },
    });

    res.json(updatedItem);
  } catch (err) {
    next(err);
  }
});

router.delete('/:itemId', async (req: Request<{ itemId: string }>, res: Response, next: NextFunction) => {
  const itemId = parseInt(req.params.itemId, 10);

  try {
    await prisma.item.delete({
      where: { id: itemId },
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// add item to cart

interface AddToCartRequest {
  userId: number;
  itemId: number;
  quantity: number;
  color: string;
  size: string;
}

router.post('/addtocart', async (req: Request, res: Response, next: NextFunction) => {
  const { itemId, userId, quantity } = req.body;

  try {
    // Find the user with the cart
    const userWithCart = await prisma.user.findUnique({
      where: { id: userId },
      include: { cart: { include: { items: true } } },
    });

    if (!userWithCart) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the item
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const cart = await prisma.cart.findUnique({
      where: {userId: userId},
      include: {CartItem: true}
    })

   

    const existingCartItem = cart?.CartItem.find((cartItem) => cartItem.itemId === itemId);

    if (existingCartItem) {
      await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + 1 },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cart: { connect: { id: cart?.id } },
          item: { connect: { id: itemId } },
          price: item.price,
          quantity: quantity, 
        },
      });
    }
    const updatedCart = await prisma.user.findUnique({
      where: { id: userId },
      include: { cart: { include: { CartItem: true } } },
    });

    res.json(updatedCart);
  } catch (err) {
    next(err);
  }
});

router.post('/removefromcart', async (req: Request, res: Response, next: NextFunction) => {
  const { itemId, userId } = req.body;

  try {
    // Find the user with the cart
    const userWithCart = await prisma.user.findUnique({
      where: { id: userId },
      include: { cart: { include: { items: true } } },
    });

    if (!userWithCart) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cart = await prisma.cart.findUnique({
      where: {userId: userId},
      include: {CartItem: true}
    })

   

    const existingCartItem = cart?.CartItem.find((cartItem) => cartItem.itemId === itemId);
    if (!existingCartItem) {
      return res.status(404).json({ error: 'Item not in the cart' });
    }

    // Remove the item from the cart
    await prisma.cartItem.delete({
      where: { id: existingCartItem.id },
    });

    // Return the updated cart
    const updatedCart = await prisma.user.findUnique({
      where: { id: userId },
      include: { cart: { include: { CartItem: true } } },
    });

    res.json(updatedCart);
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

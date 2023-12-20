// routes/itemRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {  ItemResponse, CartResponse, ItemInCartResponse } from '../types';
import { adminValidateToken } from '../middleware/authMiddleware';
import { userValidateToken } from '../middleware/userAuth';
import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import formidable from 'express-formidable';

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
  data: string;
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const gcsKeyBase64 = process.env.GOOGLE_CLOUD_KEY_BASE64;

if (!gcsKeyBase64) {
  throw new Error('GOOGLE_CLOUD_KEY_BASE64 environment variable is not set');
}

// Decode the base64-encoded key
const gcsKeyBuffer = Buffer.from(gcsKeyBase64, 'base64');
const gcsKey = gcsKeyBuffer.toString('utf-8');

const gcs = new Storage({
  credentials: JSON.parse(gcsKey),
  projectId: 'excel-mec-392306', // Replace with your Google Cloud project ID
});

const bucket = gcs.bucket('excelmec-merch-staging-1353d5xs42d');

router.post('/',upload.single('image'),formidable(), async (req: Request<{}, {}, ItemRequest& { image: Express.Multer.File }>, res: Response, next: NextFunction) => {
  const { name, description, price, stockCount, sizeOptions, colorOptions, mediaObject } = JSON.parse(req.body.data);
  const image = req.file;
  try {
    if (!image) {
      return res.status(400).json({ error: 'Image file is required' }); 
    }

    // Upload the image to Google Cloud Storage 
    const fileName = `${Date.now()}-${image.originalname}`;
    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: image.mimetype,
      },
    });

    stream.on('error', (err) => {
      next(err);
    });

    stream.on('finish', async () => {
      // Generate the GCS URL
      const gcsUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Create the new item with the GCS URL
      const newItem = await prisma.item.create({
        data: {
          name,
          description,
          price,
          mediaObjects: {
            create: {
              type: 'image',
              url: gcsUrl,
              colorValue: 'default', // You may need to adjust this based on your requirements
              viewOrdering: 1, // You may need to adjust this based on your requirements
            },
          },
          stockCount,
          sizeOptions: { set: sizeOptions },
          colorOptions: { set: colorOptions },
        },
      });

      res.json(newItem);
    });

    // Write the image buffer to the Google Cloud Storage stream
    stream.end(image.buffer);
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

router.patch('/:itemId',adminValidateToken, async (req: Request<{ itemId: string }, {}, ItemRequest>, res: Response, next: NextFunction) => {
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

router.put('/:itemId',adminValidateToken, async (req: Request<{ itemId: string }, {}, ItemRequest>, res: Response, next: NextFunction) => {
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

router.delete('/:itemId',adminValidateToken, async (req: Request<{ itemId: string }>, res: Response, next: NextFunction) => {
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

router.post('/addtocart',userValidateToken, async (req: Request, res: Response, next: NextFunction) => {
  const { itemId,  quantity } = req.body;

  try {
    // Find the user with the cart
    const userWithCart = await prisma.user.findUnique({
      where: { email:req.decodedToken?.email },
      include: { cart: { include: { items: true } } },
    });

    if (!userWithCart) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the item
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    await prisma.item.update({
      where: { id: itemId },
      data: { stockCount: (item?.stockCount ?? 0) - quantity },
    });

    

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const cart = await prisma.cart.findUnique({
      where: {userId: userWithCart.id},
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
      where: { id:userWithCart.id },
      include: { cart: { include: { CartItem: true } } },
    });

    res.json(updatedCart);
  } catch (err) {
    next(err);
  }
});

router.post('/removefromcart',userValidateToken, async (req: Request, res: Response, next: NextFunction) => {
  const { itemId} = req.body;

  try {
    // Find the user with the cart
    const userWithCart = await prisma.user.findUnique({
      where: { email:req.decodedToken?.email },
      include: { cart: { include: { items: true } } },
    });

    if (!userWithCart) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cart = await prisma.cart.findUnique({
      where: {userId: userWithCart.id},
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
      where: { id: userWithCart.id },
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

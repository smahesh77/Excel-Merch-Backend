# Excel-Merch-Backend

### Data

1. UserProfile
```
    id
    name
    email
    phoneNumber
    address (If needed decompose to city, zipcode, state etc)
    
```

2. Item

```
    id
    name
    description
    mediaObjects: {
        type: 'image' | 'video',
        url: 'string'
        colorValue: 'string'
        viewOrdering: number
    }[]
    price
    stockCount
    sizeOptions: (S | M | L | XL | XXL )[]
    colorOptions: string[]

```

3. Orders

```
    orderId
    userId
    orderDate
    status: 'processing' | 'shipping' | 'delivered'
    itemId
    color
    size
    address
    amount
    quantity

    trackingId:  (if status after or equal to shipping)

```

### Routes

- (Unauthenticated)
    - Get all items

- (User auth)
    - Get User Profile
    - Get User Order history
    - Get each order details
    - Place Order
    - Update Profile

- (Admin Auth)
    - Create Product
    - Update Product
    - Update order status
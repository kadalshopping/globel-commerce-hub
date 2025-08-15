import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  maxStock: number;
}

interface DeliveryAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  id?: string;
}

interface CreateOrderRequest {
  amount: number;
  currency: string;
  cart_items: CartItem[];
  delivery_address: DeliveryAddress;
}

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

// Validation Functions
const validateCartItems = (items: CartItem[]): void => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart items are required');
  }

  for (const item of items) {
    if (!item.productId || !item.title || !item.price || !item.quantity) {
      throw new Error('Invalid cart item structure');
    }
    
    if (item.quantity <= 0) {
      throw new Error('Item quantity must be greater than 0');
    }
    
    if (item.price <= 0) {
      throw new Error('Item price must be greater than 0');
    }
  }
};

const validateDeliveryAddress = (address: DeliveryAddress): void => {
  const required = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
  for (const field of required) {
    if (!address[field as keyof DeliveryAddress]) {
      throw new Error(`Delivery address ${field} is required`);
    }
  }
};

const validateAmount = (amount: number, cartItems: CartItem[]): void => {
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const calculatedTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const expectedAmount = Math.round(calculatedTotal * 100);

  if (Math.abs(amount - expectedAmount) > 1) {
    throw new Error(`Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}`);
  }
};

// Authentication
const authenticateUser = async (supabase: any, authHeader: string | null) => {
  if (!authHeader) {
    throw new Error('Authorization header missing');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid authentication token');
  }

  return user;
};

// Enrich cart items with product data
const enrichCartItems = async (supabase: any, cartItems: CartItem[]) => {
  const productIds = cartItems.map(item => item.productId);
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, selling_price, stock_quantity, shop_owner_id, status')
    .in('id', productIds)
    .eq('status', 'approved');

  if (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch product information');
  }

  const enrichedItems = [];
  
  for (const cartItem of cartItems) {
    const product = products.find((p: any) => p.id === cartItem.productId);
    
    if (!product) {
      throw new Error(`Product ${cartItem.productId} not found or not approved`);
    }
    
    if (product.stock_quantity < cartItem.quantity) {
      throw new Error(`Insufficient stock for ${product.title}. Available: ${product.stock_quantity}, Requested: ${cartItem.quantity}`);
    }
    
    enrichedItems.push({
      ...cartItem,
      actualPrice: product.selling_price,
      stockQuantity: product.stock_quantity,
      shopOwnerId: product.shop_owner_id,
      productTitle: product.title
    });
  }

  return enrichedItems;
};

// Create order in database
const createDatabaseOrder = async (
  supabase: any,
  userId: string,
  razorpayOrderId: string,
  orderNumber: string,
  amount: number,
  enrichedItems: any[],
  deliveryAddress: DeliveryAddress
) => {
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      total_amount: amount / 100, // Convert from paise to rupees
      delivery_address: deliveryAddress,
      items: enrichedItems,
      order_number: orderNumber,
      razorpay_order_id: razorpayOrderId,
      status: 'pending',
      payment_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.error('Database order creation error:', error);
    throw new Error('Failed to create order in database');
  }

  return order;
};

// Create Razorpay order
const createRazorpayOrder = async (
  razorpayKeyId: string,
  razorpayKeySecret: string,
  amount: number,
  currency: string,
  receipt: string
): Promise<RazorpayOrderResponse> => {
  const orderData = {
    amount,
    currency,
    receipt
  };

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`
    },
    body: JSON.stringify(orderData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Razorpay API error:', errorText);
    throw new Error(`Razorpay API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const requestId = crypto.randomUUID();
  console.log(`=== CREATE RAZORPAY ORDER START [${requestId}] ===`);

  try {
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    console.log(`Auth header present: ${!!authHeader}`);
    const user = await authenticateUser(supabase, authHeader);
    console.log(`User authenticated [${requestId}]:`, { userId: user.id, email: user.email });

    // Parse request body
    let requestBody: CreateOrderRequest;
    try {
      requestBody = await req.json();
    } catch (e) {
      throw new Error('Invalid JSON in request body');
    }

    const { amount, currency, cart_items, delivery_address } = requestBody;

    console.log(`Request details [${requestId}]:`, {
      amount,
      currency,
      itemCount: cart_items?.length,
      hasDeliveryAddress: !!delivery_address
    });

    // Validate request
    if (!currency || currency.toUpperCase() !== 'INR') {
      throw new Error('Currency must be INR');
    }

    validateCartItems(cart_items);
    validateDeliveryAddress(delivery_address);
    validateAmount(amount, cart_items);

    // Get Razorpay credentials
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials missing');
      throw new Error('Payment service not configured - credentials missing');
    }

    console.log(`Razorpay credentials verified [${requestId}] - Key ID: ${razorpayKeyId.substring(0, 8)}...`);

    // Enrich cart items
    const enrichedCartItems = await enrichCartItems(supabase, cart_items);
    console.log(`Cart items enriched and validated [${requestId}]`);

    // Create Razorpay order
    const timestamp = Date.now();
    const receipt = `receipt_${timestamp}_${user.id.substring(0, 8)}`;

    console.log(`Creating Razorpay order [${requestId}]:`, {
      amount,
      currency,
      receipt
    });

    const razorpayOrder = await createRazorpayOrder(
      razorpayKeyId,
      razorpayKeySecret,
      amount,
      currency,
      receipt
    );

    console.log(`Razorpay order created [${requestId}]:`, {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      status: razorpayOrder.status
    });

    // Create order in database
    const orderNumber = `ORD-${timestamp}`;
    const dbOrder = await createDatabaseOrder(
      supabase,
      user.id,
      razorpayOrder.id,
      orderNumber,
      amount,
      enrichedCartItems,
      delivery_address
    );

    console.log(`Order created in database [${requestId}]:`, {
      orderId: dbOrder.id,
      orderNumber: dbOrder.order_number
    });

    console.log(`=== CREATE RAZORPAY ORDER SUCCESS [${requestId}] ===`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: razorpayOrder.id,
          razorpay_order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          razorpay_key_id: razorpayKeyId,
          order_id: dbOrder.id,
          order_number: dbOrder.order_number
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`=== CREATE RAZORPAY ORDER ERROR [${requestId}] ===`);
    console.error('Error details:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        requestId
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
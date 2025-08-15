import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
}

interface CreateOrderRequest {
  amount: number;
  currency: string;
  cart_items: CartItem[];
  delivery_address: DeliveryAddress;
}

interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

// Validation functions
const validateCartItems = (items: CartItem[]): void => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart items must be a non-empty array')
  }
  
  for (const item of items) {
    if (!item.productId || typeof item.productId !== 'string') {
      throw new Error('Each cart item must have a valid productId')
    }
    if (!item.quantity || item.quantity <= 0) {
      throw new Error('Each cart item must have a positive quantity')
    }
    if (!item.price || item.price <= 0) {
      throw new Error('Each cart item must have a positive price')
    }
  }
}

const validateDeliveryAddress = (address: DeliveryAddress): void => {
  const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode']
  
  for (const field of requiredFields) {
    if (!address[field as keyof DeliveryAddress] || typeof address[field as keyof DeliveryAddress] !== 'string') {
      throw new Error(`Delivery address must have a valid ${field}`)
    }
  }
  
  // Validate phone number (basic validation)
  if (!/^\d{10}$/.test(address.phone.replace(/\D/g, ''))) {
    throw new Error('Phone number must be 10 digits')
  }
  
  // Validate pincode
  if (!/^\d{6}$/.test(address.pincode)) {
    throw new Error('Pincode must be 6 digits')
  }
}

const validateAmount = (amount: number, cartItems: CartItem[]): void => {
  if (!amount || amount <= 0) {
    throw new Error('Amount must be positive')
  }
  
  // Calculate expected amount from cart items
  const calculatedAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  const expectedAmountInPaise = Math.round(calculatedAmount * 100)
  
  if (Math.abs(amount - expectedAmountInPaise) > 1) { // Allow 1 paisa difference for rounding
    throw new Error(`Amount mismatch: expected ${expectedAmountInPaise}, got ${amount}`)
  }
}

const authenticateUser = async (supabase: any, authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Valid authorization header required')
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError) {
    console.error('Authentication error:', authError)
    throw new Error('Authentication failed')
  }
  
  if (!user) {
    throw new Error('User not found')
  }
  
  return user
}

const enrichCartItems = async (supabase: any, cartItems: CartItem[]) => {
  const enrichedItems = []
  
  for (const item of cartItems) {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('shop_owner_id, title, selling_price, stock_quantity, status')
      .eq('id', item.productId)
      .single()

    if (productError || !product) {
      throw new Error(`Product not found: ${item.productId}`)
    }
    
    if (product.status !== 'approved') {
      throw new Error(`Product not available: ${item.title}`)
    }
    
    if (product.stock_quantity < item.quantity) {
      throw new Error(`Insufficient stock for product: ${item.title}`)
    }

    enrichedItems.push({
      ...item,
      shop_owner_id: product.shop_owner_id,
      price: product.selling_price,
      title: product.title
    })
  }
  
  return enrichedItems
}

const createRazorpayOrder = async (orderData: any, keyId: string, keySecret: string): Promise<RazorpayOrderResponse> => {
  const authString = `${keyId}:${keySecret}`
  const authHeaderValue = `Basic ${btoa(authString)}`

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': authHeaderValue,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Razorpay API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    })
    
    let errorMessage = 'Failed to create payment order'
    try {
      const errorData = JSON.parse(errorText)
      errorMessage = errorData.error?.description || errorMessage
    } catch (e) {
      // Keep default error message
    }
    
    throw new Error(errorMessage)
  }

  return await response.json()
}

const createDatabaseOrder = async (supabase: any, orderData: any) => {
  const { data: dbOrder, error: dbError } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (dbError) {
    console.error('Database error:', dbError)
    throw new Error('Failed to create order record in database')
  }

  return dbOrder
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const requestId = crypto.randomUUID()
  
  try {
    console.log(`=== CREATE RAZORPAY ORDER START [${requestId}] ===`)

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate user
    const authHeader = req.headers.get('authorization')
    const user = await authenticateUser(supabase, authHeader)
    
    console.log(`User authenticated [${requestId}]:`, { userId: user.id, email: user.email })

    // Parse and validate request
    let requestBody: CreateOrderRequest
    try {
      requestBody = await req.json()
    } catch (e) {
      throw new Error('Invalid JSON in request body')
    }

    const { amount, currency, cart_items, delivery_address } = requestBody

    console.log(`Request details [${requestId}]:`, {
      amount,
      currency,
      itemCount: cart_items?.length || 0,
      hasDeliveryAddress: !!delivery_address
    })

    // Validate inputs
    if (!currency || currency.toUpperCase() !== 'INR') {
      throw new Error('Currency must be INR')
    }
    
    validateCartItems(cart_items)
    validateDeliveryAddress(delivery_address)
    validateAmount(amount, cart_items)

    // Get Razorpay credentials
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials missing')
      throw new Error('Payment service not configured')
    }

    console.log(`Razorpay credentials verified [${requestId}]`)
    console.log(`Using Razorpay Key ID: ${razorpayKeyId?.substring(0, 8)}...`)

    // Enrich cart items with product data and validate
    const enrichedCartItems = await enrichCartItems(supabase, cart_items)
    console.log(`Cart items enriched and validated [${requestId}]`)

    // Generate unique receipt
    const timestamp = Date.now()
    const receipt = `receipt_${timestamp}_${user.id.substring(0, 8)}`
    const orderNumber = `ORD-${timestamp}`

    // Create Razorpay order
    const razorpayOrderData = {
      amount: Math.round(amount), // Amount in paise
      currency: currency.toUpperCase(),
      receipt: receipt,
      notes: {
        user_id: user.id,
        user_email: user.email || '',
        item_count: cart_items.length.toString(),
        order_number: orderNumber
      }
    }

    console.log(`Creating Razorpay order [${requestId}]:`, {
      amount: razorpayOrderData.amount,
      currency: razorpayOrderData.currency,
      receipt: razorpayOrderData.receipt
    })

    const razorpayOrder = await createRazorpayOrder(razorpayOrderData, razorpayKeyId, razorpayKeySecret)
    
    console.log(`Razorpay order created [${requestId}]:`, {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      status: razorpayOrder.status
    })

    // Create order in database
    const dbOrderData = {
      user_id: user.id,
      order_number: orderNumber,
      total_amount: amount / 100, // Convert paise back to rupees for database
      items: enrichedCartItems,
      delivery_address: delivery_address,
      razorpay_order_id: razorpayOrder.id,
      payment_status: 'pending',
      status: 'pending'
    }

    const dbOrder = await createDatabaseOrder(supabase, dbOrderData)

    console.log(`Order created in database [${requestId}]:`, {
      orderId: dbOrder.id,
      orderNumber: orderNumber
    })

    const responseData = {
      success: true,
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status,
        razorpay_key_id: razorpayKeyId,
        order_id: dbOrder.id,
        order_number: orderNumber
      }
    }

    console.log(`=== CREATE RAZORPAY ORDER SUCCESS [${requestId}] ===`)

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`=== CREATE RAZORPAY ORDER ERROR [${requestId}] ===`)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        requestId: requestId
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  shop_owner_id?: string;
}

// Validation functions
const validatePaymentData = (data: PaymentVerificationRequest): void => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data
  
  if (!razorpay_order_id || typeof razorpay_order_id !== 'string') {
    throw new Error('Valid razorpay_order_id is required')
  }
  
  if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string') {
    throw new Error('Valid razorpay_payment_id is required')
  }
  
  if (!razorpay_signature || typeof razorpay_signature !== 'string') {
    throw new Error('Valid razorpay_signature is required')
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

const verifyRazorpaySignature = async (
  orderId: string, 
  paymentId: string, 
  signature: string, 
  secret: string
): Promise<boolean> => {
  const payloadString = `${orderId}|${paymentId}`
  const key = new TextEncoder().encode(secret)
  const data = new TextEncoder().encode(payloadString)
  
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const computedSignature = await crypto.subtle.sign('HMAC', cryptoKey, data)
    const expectedSignature = Array.from(new Uint8Array(computedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return expectedSignature === signature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

const findOrder = async (supabase: any, razorpayOrderId: string, userId: string) => {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('user_id', userId)
    .single()

  if (fetchError) {
    console.error('Order fetch error:', fetchError)
    throw new Error('Order not found')
  }
  
  if (!order) {
    throw new Error('Order not found')
  }
  
  if (order.payment_status === 'completed') {
    throw new Error('Order already processed')
  }

  return order
}

const updateOrderPayment = async (
  supabase: any, 
  orderId: string, 
  paymentId: string
) => {
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      razorpay_payment_id: paymentId,
      payment_status: 'completed',
      status: 'confirmed',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('Order update error:', updateError)
    throw new Error('Failed to update order status')
  }
}

const createOrderItems = async (supabase: any, order: any) => {
  if (!order.items || !Array.isArray(order.items)) {
    console.log('No items to create order items for')
    return
  }

  const orderItems = order.items
    .filter((item: OrderItem) => item.shop_owner_id)
    .map((item: OrderItem) => ({
      order_id: order.id,
      product_id: item.productId,
      shop_owner_id: item.shop_owner_id,
      quantity: item.quantity,
      price: item.price,
      status: 'pending'
    }))

  if (orderItems.length === 0) {
    console.log('No items with shop owners to create')
    return
  }

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) {
    console.error('Failed to create order items:', itemsError)
    // Don't throw error as payment is already verified
  } else {
    console.log(`Created ${orderItems.length} order items for shop tracking`)
  }
}

const updateProductStock = async (supabase: any, order: any) => {
  if (!order.items || !Array.isArray(order.items)) {
    console.log('No items to update stock for')
    return
  }

  for (const item of order.items) {
    try {
      // Decrease stock quantity
      const { error: stockError } = await supabase.rpc('decrease_product_stock', {
        product_id: item.productId,
        quantity_to_decrease: item.quantity
      })

      if (stockError) {
        console.error(`Failed to update stock for product ${item.productId}:`, stockError)
        // Continue with other items even if one fails
      }
    } catch (error) {
      console.error(`Error updating stock for product ${item.productId}:`, error)
      // Continue with other items
    }
  }
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
    console.log(`=== VERIFY RAZORPAY PAYMENT START [${requestId}] ===`)

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

    console.log(`User authenticated [${requestId}]:`, { userId: user.id })

    // Parse and validate request
    let requestBody: PaymentVerificationRequest
    try {
      requestBody = await req.json()
    } catch (e) {
      throw new Error('Invalid JSON in request body')
    }

    validatePaymentData(requestBody)

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = requestBody

    console.log(`Payment verification request [${requestId}]:`, {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      hasSignature: !!razorpay_signature
    })

    // Get Razorpay secret
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!razorpayKeySecret) {
      throw new Error('Payment verification service not configured')
    }

    console.log(`Verifying payment signature [${requestId}]...`)

    // Verify signature
    const isSignatureValid = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    )

    if (!isSignatureValid) {
      console.error(`Signature verification failed [${requestId}]`)
      throw new Error('Payment signature verification failed')
    }

    console.log(`Payment signature verified successfully [${requestId}]`)

    // Find and validate order
    const existingOrder = await findOrder(supabase, razorpay_order_id, user.id)

    console.log(`Order found [${requestId}]:`, {
      orderId: existingOrder.id,
      orderNumber: existingOrder.order_number,
      currentStatus: existingOrder.payment_status
    })

    // Update order with payment details
    await updateOrderPayment(supabase, existingOrder.id, razorpay_payment_id)
    console.log(`Order payment updated [${requestId}]`)

    // Create order items for shop owners
    await createOrderItems(supabase, existingOrder)
    console.log(`Order items created [${requestId}]`)

    // Update product stock
    await updateProductStock(supabase, existingOrder)
    console.log(`Product stock updated [${requestId}]`)

    console.log(`=== VERIFY RAZORPAY PAYMENT SUCCESS [${requestId}] ===`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Payment verified and order confirmed',
        data: {
          order_id: existingOrder.id,
          order_number: existingOrder.order_number,
          payment_id: razorpay_payment_id,
          status: 'confirmed'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(`=== VERIFY RAZORPAY PAYMENT ERROR [${requestId}] ===`)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed',
        timestamp: new Date().toISOString(),
        requestId: requestId
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
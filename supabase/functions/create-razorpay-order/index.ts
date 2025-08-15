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
  shop_owner_id?: string;
}

interface OrderRequest {
  amount: number;
  currency: string;
  cart_items: CartItem[];
  delivery_address?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('=== CREATE RAZORPAY ORDER START ===')

    // Get user authentication first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Authorization required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse request body
    const requestBody: OrderRequest = await req.json()
    const { amount, currency, cart_items, delivery_address } = requestBody

    console.log('Request validated:', {
      userId: user.id,
      amount,
      currency,
      itemCount: cart_items?.length || 0
    })

    // Validate request
    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required')
    }
    if (!currency) {
      throw new Error('Currency is required')
    }
    if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
      throw new Error('Cart items are required')
    }

    // Get Razorpay credentials
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Payment service not configured')
    }

    // Generate unique receipt
    const receipt = `receipt_${Date.now()}_${user.id.substring(0, 8)}`

    // Create Razorpay order (amount is already in paise from frontend)
    const orderData = {
      amount: Math.round(amount), // Amount is already in paise
      currency: currency.toUpperCase(),
      receipt: receipt,
      notes: {
        user_id: user.id,
        item_count: cart_items.length.toString()
      }
    }

    console.log('Creating Razorpay order:', orderData)

    const authString = `${razorpayKeyId}:${razorpayKeySecret}`
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
      console.error('Razorpay API error:', errorText)
      throw new Error('Failed to create payment order')
    }

    const razorpayOrder = await response.json()
    console.log('Razorpay order created:', {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      status: razorpayOrder.status
    })

    // Prepare cart items with shop owner info
    const enrichedCartItems = await Promise.all(
      cart_items.map(async (item) => {
        // Get product details including shop owner
        const { data: product } = await supabase
          .from('products')
          .select('shop_owner_id, title, selling_price')
          .eq('id', item.productId)
          .single()

        return {
          ...item,
          shop_owner_id: product?.shop_owner_id,
          price: product?.selling_price || item.price
        }
      })
    )

    // Create order in database
    const orderNumber = `ORD-${Date.now()}`
    const { data: dbOrder, error: dbError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount: amount / 100, // Convert paise back to rupees for database
        items: enrichedCartItems,
        delivery_address: delivery_address || {},
        razorpay_order_id: razorpayOrder.id,
        payment_status: 'pending',
        status: 'pending'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to create order record')
    }

    console.log('Order created in database:', dbOrder.id)

    const responseData = {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      status: razorpayOrder.status,
      razorpay_key_id: razorpayKeyId,
      order_id: dbOrder.id
    }

    console.log('=== CREATE RAZORPAY ORDER SUCCESS ===')

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== CREATE RAZORPAY ORDER ERROR ===', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log('=== VERIFY RAZORPAY PAYMENT START ===')
    console.log('Request method:', req.method)
    console.log('Request headers available:', !!req.headers.get('authorization'))

    // Parse and validate request body
    let requestBody: PaymentVerificationRequest
    try {
      const rawBody = await req.text()
      console.log('Raw request body length:', rawBody.length)
      requestBody = JSON.parse(rawBody)
      console.log('Payment verification request:', {
        order_id: requestBody.razorpay_order_id,
        payment_id: requestBody.razorpay_payment_id,
        hasSignature: !!requestBody.razorpay_signature
      })
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      throw new Error('Invalid request body format')
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = requestBody

    // Validate required fields
    if (!razorpay_order_id) {
      throw new Error('Order ID is required')
    }
    if (!razorpay_payment_id) {
      throw new Error('Payment ID is required')
    }
    if (!razorpay_signature) {
      throw new Error('Payment signature is required')
    }

    // Get Razorpay secret from environment
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!razorpayKeySecret) {
      console.error('Razorpay secret not found in environment')
      throw new Error('Payment verification service not configured')
    }

    console.log('Environment check passed')

    // Verify the payment signature using HMAC-SHA256
    const payloadString = `${razorpay_order_id}|${razorpay_payment_id}`
    console.log('Signature verification payload:', payloadString)

    // Create HMAC signature
    const key = new TextEncoder().encode(razorpayKeySecret)
    const data = new TextEncoder().encode(payloadString)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    console.log('Signature verification:', {
      expected: expectedSignature.substring(0, 10) + '...',
      received: razorpay_signature.substring(0, 10) + '...',
      match: expectedSignature === razorpay_signature
    })

    if (expectedSignature !== razorpay_signature) {
      console.error('Payment signature verification failed')
      throw new Error('Invalid payment signature - payment verification failed')
    }

    console.log('Payment signature verified successfully')

    // Initialize Supabase client for user authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing')
      throw new Error('Database service not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get and verify user from authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Authorization header missing')
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Verifying user authentication...')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('User authentication failed:', authError)
      throw new Error('User authentication failed')
    }

    console.log('User authenticated successfully:', { userId: user.id })

    // Update the order with payment details
    // Find the order by razorpay_order_id and user_id for security
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingOrder) {
      console.error('Order not found:', fetchError)
      throw new Error('Order not found')
    }

    // Update order with payment information
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        razorpay_payment_id: razorpay_payment_id,
        payment_status: 'completed',
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingOrder.id)

    if (updateError) {
      console.error('Failed to update order:', updateError)
      throw new Error('Failed to update order status')
    }

    // Create order items for shop owners
    if (existingOrder.items && Array.isArray(existingOrder.items)) {
      console.log('Creating order items for shop tracking...')
      
      const orderItems = existingOrder.items
        .filter((item: any) => item.shop_owner_id) // Only items with shop owner
        .map((item: any) => ({
          order_id: existingOrder.id,
          product_id: item.productId,
          shop_owner_id: item.shop_owner_id,
          quantity: item.quantity,
          price: item.price,
          status: 'pending'
        }))

      if (orderItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)

        if (itemsError) {
          console.error('Failed to create order items:', itemsError)
          // Don't throw error as payment is already verified
        } else {
          console.log(`Created ${orderItems.length} order items`)
        }
      }
    }

    console.log('Payment verification completed successfully:', {
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      user_id: user.id
    })

    console.log('=== VERIFY RAZORPAY PAYMENT SUCCESS ===')
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Payment verified successfully',
        data: {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          verified_at: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )

  } catch (error) {
    console.error('=== VERIFY RAZORPAY PAYMENT ERROR ===')
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })

    const errorMessage = error instanceof Error ? error.message : 'Payment verification failed'
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )
  }
})
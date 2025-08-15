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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('=== VERIFY RAZORPAY PAYMENT START ===')

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Authorization required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      throw new Error('Invalid authentication')
    }

    console.log('User authenticated:', { userId: user.id })

    // Parse and validate request
    const requestBody: PaymentVerificationRequest = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = requestBody

    console.log('Payment verification request:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      hasSignature: !!razorpay_signature
    })

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing payment verification data')
    }

    // Get Razorpay secret
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!razorpayKeySecret) {
      throw new Error('Payment verification service not configured')
    }

    console.log('Verifying payment signature...')

    // Verify signature using Web Crypto API
    const payloadString = `${razorpay_order_id}|${razorpay_payment_id}`
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

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed:', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: razorpay_signature.substring(0, 10) + '...'
      })
      throw new Error('Payment signature verification failed')
    }

    console.log('Payment signature verified successfully')

    // Find and update the order
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

    console.log('Order found:', {
      orderId: existingOrder.id,
      orderNumber: existingOrder.order_number
    })

    // Update order with payment details
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

    console.log('Order updated successfully')

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
          console.log(`Created ${orderItems.length} order items for shop tracking`)
        }
      }
    }

    console.log('=== VERIFY RAZORPAY PAYMENT SUCCESS ===')

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
    console.error('=== VERIFY RAZORPAY PAYMENT ERROR ===')
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed',
        timestamp: new Date().toISOString()
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
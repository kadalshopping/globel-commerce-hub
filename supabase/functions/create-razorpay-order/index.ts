import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for guest checkout
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // For guest checkout, we don't need to get the user
    // user_id will be null for guest orders

    const { orderData } = await req.json()

    // Get Razorpay credentials from secrets
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: 'Razorpay credentials not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Razorpay order
    const razorpayOrder = {
      amount: orderData.total_amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        customer_name: orderData.customer_name,
        breed: orderData.breed,
        quantity: orderData.quantity.toString(),
      }
    }

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(razorpayOrder),
    })

    const razorpayData = await response.json()

    if (!response.ok) {
      throw new Error(razorpayData.error?.description || 'Failed to create Razorpay order')
    }

    // Store order in database (works for both authenticated and guest users)
    const { data: dbOrder, error: dbError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: null, // Always null for guest checkout
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_email: orderData.customer_email || '',
        delivery_address: orderData.delivery_address,
        breed: orderData.breed,
        age_category: orderData.age_category,
        quantity: orderData.quantity,
        price_per_piece: orderData.price_per_piece,
        total_amount: orderData.total_amount,
        payment_method: 'razorpay',
        payment_status: 'pending',
        status: 'pending',
        razorpay_order_id: razorpayData.id,
      })
      .select()
      .single()

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        razorpay_order_id: razorpayData.id,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        key_id: razorpayKeyId,
        order_id: dbOrder.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Received request body')
    const { amount, currency, receipt, cart_items } = await req.json()
    console.log('Parsed request:', { amount, currency, receipt, itemCount: cart_items?.length })

    // Get Razorpay credentials from secrets
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    console.log('Checking credentials:', { 
      hasKeyId: !!razorpayKeyId, 
      hasSecret: !!razorpayKeySecret,
      keyIdLength: razorpayKeyId?.length || 0
    })

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Missing Razorpay credentials')
      throw new Error('Razorpay credentials not configured')
    }

    // Create Razorpay order
    const orderData = {
      amount: amount, // amount in paise
      currency: currency,
      receipt: receipt,
      notes: {
        items: JSON.stringify(cart_items)
      }
    }

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
    
    console.log('Calling Razorpay API with order data:', orderData)
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    })

    console.log('Razorpay API response status:', response.status)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Razorpay API error response:', errorData)
      throw new Error(`Razorpay API error (${response.status}): ${errorData}`)
    }

    const order = await response.json()
    console.log('Created Razorpay order:', order)

    // Return order details with key_id for frontend
    return new Response(
      JSON.stringify({
        ...order,
        razorpay_key_id: razorpayKeyId
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
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
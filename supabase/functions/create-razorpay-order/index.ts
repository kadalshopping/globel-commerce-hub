import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Allow CORS for frontend calls
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderRequest {
  amount: number;
  currency: string;
  receipt: string;
  cart_items: any[];
  delivery_address: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const body: OrderRequest = await req.json()
    const { amount, currency, receipt, cart_items, delivery_address } = body

    // Validate inputs
    if (!amount || amount <= 0) throw new Error('Valid amount required')
    if (!currency) throw new Error('Currency required')
    if (!receipt) throw new Error('Receipt required')
    if (!cart_items?.length) throw new Error('Cart items required')
    if (!delivery_address?.address || !delivery_address?.pincode) {
      throw new Error('Delivery address required')
    }

    // Load Razorpay credentials from environment
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Payment service configuration error')
    }

    // Create Razorpay order payload
    const orderData = {
      amount: Math.round(amount), // paise
      currency: currency.toUpperCase(),
      receipt,
      notes: {
        items: JSON.stringify(cart_items),
        delivery: JSON.stringify(delivery_address)
      }
    }

    // API Call to Razorpay
    const authHeader = `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Razorpay error: ${errText}`)
    }

    const order = await response.json()

    // Send order info back to frontend
    return new Response(
      JSON.stringify({
        ...order,
        razorpay_key_id: razorpayKeyId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

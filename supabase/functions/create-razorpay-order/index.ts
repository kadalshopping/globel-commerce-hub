import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderRequest {
  amount: number;
  currency: string;
  receipt: string;
  cart_items: any[];
}

interface RazorpayOrderData {
  amount: number;
  currency: string;
  receipt: string;
  notes: {
    items: string;
  };
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
    console.log('=== CREATE RAZORPAY ORDER START ===')
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    // Parse and validate request body
    let requestBody: OrderRequest
    try {
      requestBody = await req.json()
      console.log('Request body parsed successfully:', {
        amount: requestBody.amount,
        currency: requestBody.currency,
        receipt: requestBody.receipt,
        itemCount: requestBody.cart_items?.length || 0
      })
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      throw new Error('Invalid request body format')
    }

    const { amount, currency, receipt, cart_items } = requestBody

    // Validate required fields
    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required')
    }
    if (!currency) {
      throw new Error('Currency is required')
    }
    if (!receipt) {
      throw new Error('Receipt is required')
    }
    if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
      throw new Error('Cart items are required')
    }

    // Get Razorpay credentials from environment variables
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    console.log('Environment check:', {
      hasKeyId: !!razorpayKeyId,
      hasSecret: !!razorpayKeySecret,
      keyIdPreview: razorpayKeyId ? `${razorpayKeyId.substring(0, 8)}...` : 'NOT_SET'
    })

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials missing from environment')
      throw new Error('Payment service configuration error')
    }

    // Prepare order data for Razorpay
    const orderData: RazorpayOrderData = {
      amount: Math.round(amount), // Ensure amount is integer (paise)
      currency: currency.toUpperCase(),
      receipt: receipt,
      notes: {
        items: JSON.stringify(cart_items)
      }
    }

    console.log('Creating Razorpay order with data:', {
      ...orderData,
      notes: { items: `[${cart_items.length} items]` } // Don't log full items for security
    })

    // Create Basic Auth header
    const authString = `${razorpayKeyId}:${razorpayKeySecret}`
    const authHeader = `Basic ${btoa(authString)}`

    // Call Razorpay API
    console.log('Calling Razorpay API...')
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Lovable-App/1.0'
      },
      body: JSON.stringify(orderData),
    })

    console.log('Razorpay API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    // Handle API response
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Razorpay API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      
      // Parse error details if possible
      let errorMessage = 'Payment service error'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error?.description || errorData.message || errorMessage
      } catch {
        errorMessage = `Payment service returned ${response.status}: ${response.statusText}`
      }
      
      throw new Error(errorMessage)
    }

    const order = await response.json()
    console.log('Razorpay order created successfully:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    })

    // Prepare response
    const responseData = {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      created_at: order.created_at,
      razorpay_key_id: razorpayKeyId
    }

    console.log('=== CREATE RAZORPAY ORDER SUCCESS ===')
    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )

  } catch (error) {
    console.error('=== CREATE RAZORPAY ORDER ERROR ===')
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(
      JSON.stringify({ 
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
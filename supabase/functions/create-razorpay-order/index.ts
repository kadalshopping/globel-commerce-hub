import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOrderRequest {
  amount: number;
  currency: string;
  receipt: string;
  cart_items: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('=== CREATE RAZORPAY ORDER START ===');
    
    // Parse request body
    const body: CreateOrderRequest = await req.json();
    console.log('Request received:', {
      amount: body.amount,
      currency: body.currency,
      receipt: body.receipt,
      itemCount: body.cart_items?.length || 0
    });

    // Validate input
    if (!body.amount || body.amount <= 0) {
      throw new Error('Invalid amount');
    }
    if (!body.currency) {
      throw new Error('Currency is required');
    }
    if (!body.receipt) {
      throw new Error('Receipt is required');
    }
    if (!body.cart_items || !Array.isArray(body.cart_items) || body.cart_items.length === 0) {
      throw new Error('Cart items are required');
    }

    // Get Razorpay credentials
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    console.log('Credentials check:', {
      hasKeyId: !!keyId,
      hasKeySecret: !!keySecret,
      keyIdPreview: keyId ? `${keyId.substring(0, 8)}...` : 'MISSING'
    });

    if (!keyId || !keySecret) {
      console.error('Missing Razorpay credentials');
      throw new Error('Payment service not configured');
    }

    // Prepare order data
    const orderData = {
      amount: Math.round(body.amount * 100), // Convert to paise
      currency: body.currency.toUpperCase(),
      receipt: body.receipt,
      notes: {
        cart_items: JSON.stringify(body.cart_items.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity
        })))
      }
    };

    console.log('Creating order with amount:', orderData.amount, 'paise');

    // Call Razorpay API
    const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    console.log('Razorpay API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Razorpay API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      let errorMessage = 'Failed to create payment order';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.description || errorData.message || errorMessage;
      } catch {
        errorMessage = `Payment service error (${response.status})`;
      }
      
      throw new Error(errorMessage);
    }

    const order = await response.json();
    console.log('Order created successfully:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });

    // Return response
    const responseData = {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      created_at: order.created_at,
      razorpay_key_id: keyId
    };

    console.log('=== CREATE RAZORPAY ORDER SUCCESS ===');
    
    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('=== CREATE RAZORPAY ORDER ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
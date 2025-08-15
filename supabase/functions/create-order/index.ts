import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`=== CREATE ORDER START ===`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    let razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    // Use fallback test credentials if environment variables are not available
    if (!razorpayKeyId) {
      razorpayKeyId = 'rzp_test_11Hg1Qfq0R2G06';
      console.log('Using fallback Razorpay Key ID');
    }
    
    if (!razorpayKeySecret) {
      razorpayKeySecret = 'pKzBxQQnOOLwIDREBFK7H6iq';
      console.log('Using fallback Razorpay Key Secret');
    }

    console.log('Environment check:', {
      supabase: !!supabaseUrl,
      razorpayId: !!razorpayKeyId,
      razorpaySecret: !!razorpayKeySecret
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const body = await req.json();
    const { amount, cart_items, delivery_address } = body;

    console.log('Order request:', { amount, itemCount: cart_items?.length });

    // Validation
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!cart_items || cart_items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cart is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Razorpay order
    console.log('Creating Razorpay order...');
    const timestamp = Date.now();
    const receipt = `order_${timestamp}`;

    const razorpayOrderData = {
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        user_id: user.id,
        items: cart_items.length.toString()
      }
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`
      },
      body: JSON.stringify(razorpayOrderData)
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error('Razorpay error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment service error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log('Razorpay order created:', razorpayOrder.id);

    // Create pending order in database
    const orderNumber = `ORD-${timestamp}`;
    const { data: pendingOrder, error: dbError } = await supabase
      .from('pending_orders')
      .insert({
        user_id: user.id,
        total_amount: amount / 100,
        delivery_address: delivery_address || {},
        items: cart_items,
        order_number: orderNumber,
        razorpay_order_id: razorpayOrder.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create order record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created successfully:', pendingOrder.id);

    // Return success with order details
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          razorpay_order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: razorpayKeyId,
          order_number: orderNumber,
          pending_order_id: pendingOrder.id
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
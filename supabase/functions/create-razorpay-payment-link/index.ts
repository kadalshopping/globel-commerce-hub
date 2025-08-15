import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`=== CREATE PAYMENT LINK START ===`);
  console.log(`Method: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('Getting environment variables...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Use hardcoded test credentials for now
    const razorpayKeyId = 'rzp_test_11Hg1Qfq0R2G06';
    const razorpayKeySecret = 'pKzBxQQnOOLwIDREBFK7H6iq';
    
    console.log('Using test Razorpay credentials');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ success: false, error: 'Database configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request parsed successfully');
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, cart_items, delivery_address } = requestBody;

    // Basic validation
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

    console.log('Creating Razorpay order...');
    
    // Create Razorpay order
    const timestamp = Date.now();
    const receipt = `receipt_${timestamp}`;
    
    const orderData = {
      amount,
      currency: 'INR',
      receipt
    };

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`
      },
      body: JSON.stringify(orderData)
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error('Razorpay API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment service error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log('Razorpay order created:', razorpayOrder.id);

    // Store pending order
    const orderNumber = `ORD-${timestamp}`;
    console.log('Creating pending order...');
    
    const { data: pendingOrder, error: dbError } = await supabase
      .from('pending_orders')
      .insert({
        user_id: user.id,
        total_amount: amount / 100,
        delivery_address,
        items: cart_items,
        order_number: orderNumber,
        razorpay_order_id: razorpayOrder.id
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pending order created:', pendingOrder.id);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: razorpayOrder.id,
          razorpay_order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          razorpay_key_id: razorpayKeyId,
          pending_order_id: pendingOrder.id,
          order_number: pendingOrder.order_number
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
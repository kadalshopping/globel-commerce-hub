import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log("🚀 Create order function called, method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log("📋 Starting order creation...");
    
    // Create Supabase client with service role for authenticated users
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header - authentication required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid user token");
    }

    console.log(`👤 Authenticated user: ${user.id}`);

    // Parse request body
    const { amount, cartItems, deliveryAddress } = await req.json();
    
    console.log("📊 Request data:", {
      amount,
      itemCount: cartItems?.length,
      hasAddress: !!deliveryAddress
    });

    if (!amount || !cartItems || cartItems.length === 0) {
      throw new Error('Invalid order data - missing amount or cart items');
    }

    // Get Razorpay credentials from secrets
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    console.log("💰 Creating Razorpay order...");

    // Create Razorpay order
    const razorpayOrder = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${Date.now()}_${user.id.substring(0, 8)}`,
      notes: {
        user_id: user.id,
        user_email: user.email || '',
        item_count: cartItems.length.toString(),
        customer_name: deliveryAddress?.fullName || 'Customer'
      }
    };

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(razorpayOrder)
    });

    const razorpayData = await response.json();
    
    if (!response.ok) {
      console.error("❌ Razorpay API error:", razorpayData);
      throw new Error(razorpayData.error?.description || 'Failed to create Razorpay order');
    }

    console.log("✅ Razorpay order created:", razorpayData.id);

    // Create pending order in database
    const orderNumber = `ORD-${Date.now()}`;
    const { data: pendingOrder, error: dbError } = await supabaseClient
      .from('pending_orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount: amount,
        delivery_address: deliveryAddress,
        items: cartItems,
        razorpay_order_id: razorpayData.id
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ Database error:", dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`✅ Pending order created: ${pendingOrder.id}`);

    return new Response(JSON.stringify({
      success: true,
      razorpay_order_id: razorpayData.id,
      razorpay_key_id: razorpayKeyId,
      amount: razorpayData.amount,
      currency: razorpayData.currency,
      pending_order_id: pendingOrder.id,
      order_number: orderNumber
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
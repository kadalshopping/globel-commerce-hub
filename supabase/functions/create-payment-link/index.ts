import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log("🚀 Create payment link function called, method:", req.method);
  
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
    console.log("📋 Starting payment link creation...");
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    console.log("🔧 Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey,
      hasRazorpayId: !!razorpayKeyId,
      hasRazorpaySecret: !!razorpayKeySecret,
      razorpayIdLength: razorpayKeyId?.length || 0,
      razorpaySecretLength: razorpayKeySecret?.length || 0
    });

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("❌ Missing Razorpay credentials. Available env vars:", Object.keys(Deno.env.toObject()));
      throw new Error('Razorpay credentials not configured. Please check Supabase secrets.');
    }

    // Create Supabase clients
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

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
    const { amount, cartItems, deliveryAddress, priceBreakdown } = await req.json();
    
    console.log("📊 Request data:", {
      amount,
      itemCount: cartItems?.length,
      hasAddress: !!deliveryAddress,
      hasPriceBreakdown: !!priceBreakdown
    });

    if (!amount || !cartItems || cartItems.length === 0) {
      throw new Error('Invalid order data - missing amount or cart items');
    }

    console.log("💰 Creating Razorpay payment link...");

    // Create pending_order first to track the payment
    const orderNumber = `ORD-${Date.now()}`;
    const { data: pendingOrder, error: orderError } = await supabaseClient
      .from('pending_orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount: amount,
        delivery_address: deliveryAddress,
        items: cartItems,
        razorpay_order_id: `temp_${Date.now()}`, // Temporary, will be updated
        price_breakdown: priceBreakdown // Store price breakdown for later use
      })
      .select()
      .single();

    if (orderError) {
      console.error("❌ Failed to create pending order:", orderError);
      throw new Error('Failed to create pending order');
    }

    console.log("✅ Pending order created:", pendingOrder.id);

    // Create Razorpay payment link
    const paymentLinkData = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      accept_partial: false,
      description: `Payment for Order ${orderNumber}`,
      customer: {
        name: deliveryAddress?.fullName || user.user_metadata?.full_name || 'Customer',
        email: user.email || 'customer@example.com',
        contact: deliveryAddress?.phone || ''
      },
      notify: {
        sms: true,
        email: true,
        whatsapp: false
      },
      reminder_enable: true,
      notes: {
        order_id: pendingOrder.id,
        order_number: orderNumber,
        user_id: user.id,
        item_count: cartItems.length.toString()
      },
      callback_url: `${req.headers.get('origin') || 'https://yoursite.com'}/payment-success`,
      callback_method: 'get'
    };

    console.log("🔗 Creating payment link with Razorpay API...");

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentLinkData)
    });

    const razorpayLinkData = await response.json();
    
    if (!response.ok) {
      console.error("❌ Razorpay API error:", razorpayLinkData);
      throw new Error(razorpayLinkData.error?.description || 'Failed to create Razorpay payment link');
    }

    console.log("✅ Razorpay payment link created:", razorpayLinkData.id);

    // Update pending order with Razorpay payment link ID
    const { error: updateError } = await supabaseClient
      .from('pending_orders')
      .update({
        razorpay_order_id: razorpayLinkData.id
      })
      .eq('id', pendingOrder.id);

    if (updateError) {
      console.error("⚠️ Failed to update pending order with payment link ID:", updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      payment_link_id: razorpayLinkData.id,
      payment_link_url: razorpayLinkData.short_url,
      order_id: pendingOrder.id,
      order_number: orderNumber,
      amount: razorpayLinkData.amount,
      currency: razorpayLinkData.currency,
      status: razorpayLinkData.status
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Error creating payment link:', error);
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
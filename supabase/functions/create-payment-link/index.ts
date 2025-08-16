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
      console.error("🔍 Credential check:", {
        hasRazorpayId: !!razorpayKeyId,
        hasRazorpaySecret: !!razorpayKeySecret,
        razorpayIdLength: razorpayKeyId?.length || 0,
        razorpaySecretLength: razorpayKeySecret?.length || 0
      });
      throw new Error('Razorpay credentials not configured. Please check Supabase secrets.');
    }

    console.log("✅ All credentials verified successfully");

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
        sms: false, // Disable SMS to avoid issues
        email: true,
        whatsapp: false
      },
      reminder_enable: false, // Disable reminders initially
      notes: {
        order_id: pendingOrder.id,
        order_number: orderNumber,
        user_id: user.id,
        item_count: cartItems.length.toString()
      },
      callback_url: `${req.headers.get('origin') || 'https://yoursite.com'}/payment-success`,
      callback_method: 'get'
    };

    console.log("💰 Payment link data prepared:", {
      amount: paymentLinkData.amount,
      currency: paymentLinkData.currency,
      customerEmail: paymentLinkData.customer.email,
      callbackUrl: paymentLinkData.callback_url
    });

    console.log("🔗 Creating payment link with Razorpay API...");
    console.log("📊 Payment link payload:", JSON.stringify(paymentLinkData, null, 2));

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    console.log("🔐 Auth header created, making API call to Razorpay...");
    
    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentLinkData)
    });

    console.log(`📡 Razorpay API response status: ${response.status}`);
    
    const razorpayLinkData = await response.json();
    console.log("📦 Razorpay API response:", JSON.stringify(razorpayLinkData, null, 2));
    
    if (!response.ok) {
      console.error("❌ Razorpay API error:", razorpayLinkData);
      console.error(`❌ Response status: ${response.status}, Status text: ${response.statusText}`);
      throw new Error(`Razorpay API Error (${response.status}): ${razorpayLinkData.error?.description || razorpayLinkData.error?.code || 'Unknown error'}`);
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
    
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    };
    
    console.error('📋 Detailed error information:', JSON.stringify(errorDetails, null, 2));
    
    // Check if it's a Razorpay API error
    if (error.message.includes('Razorpay')) {
      console.error('🔑 Razorpay API issue detected - check credentials and API call');
    }
    
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
      debug: {
        timestamp: new Date().toISOString(),
        function: 'create-payment-link',
        errorType: error.name
      }
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
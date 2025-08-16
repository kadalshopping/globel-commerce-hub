import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("🚀 Create pending order function called, method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("✅ Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("❌ Invalid method:", req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("📋 Starting pending order creation...");
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    console.log("🔧 Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey,
      hasRazorpayId: !!razorpayKeyId,
      hasRazorpaySecret: !!razorpayKeySecret
    });

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.log("❌ Missing Supabase configuration");
      throw new Error("Missing Supabase configuration");
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.log("❌ Missing Razorpay credentials");
      throw new Error("Missing Razorpay credentials");
    }

    // Create Supabase clients
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    console.log("✅ Supabase clients created");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    console.log("🔐 Auth header present:", !!authHeader);
    
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log("👤 User auth result:", { hasUser: !!user, authError: !!authError });

    if (authError || !user) {
      console.log("❌ Auth error:", authError);
      throw new Error("Invalid user token");
    }

    // Parse request body
    console.log("📨 Parsing request body...");
    const requestBody = await req.json();
    const { amount, cartItems, deliveryAddress } = requestBody;
    
    console.log("📊 Request data:", {
      amount,
      itemCount: cartItems?.length,
      hasAddress: !!deliveryAddress
    });

    if (!amount || !cartItems || cartItems.length === 0) {
      throw new Error("Invalid request data");
    }

    console.log(`💰 Creating order for user ${user.id}, amount: ${amount}`);

    // Convert amount to paise (multiply by 100)
    const amountInPaise = Math.round(amount * 100);
    console.log("💸 Amount in paise:", amountInPaise);

    // Create Razorpay order first
    const razorpayOrderData = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${Date.now()}`,
      notes: {
        user_id: user.id,
        user_email: user.email || "",
        item_count: cartItems.length,
      },
    };

    console.log("🏦 Calling Razorpay API...");
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(razorpayOrderData),
    });

    console.log("📡 Razorpay response status:", razorpayResponse.status);

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("❌ Razorpay API error:", errorText);
      throw new Error(`Razorpay API error: ${razorpayResponse.status}`);
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log("✅ Razorpay order created:", razorpayOrder.id);

    // Create pending order in database
    const orderNumber = `ORD-${Date.now()}`;
    console.log("💾 Creating pending order in database:", orderNumber);
    
    const { data: pendingOrder, error: orderError } = await supabaseService
      .from("pending_orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount: amount,
        razorpay_order_id: razorpayOrder.id,
        delivery_address: deliveryAddress,
        items: cartItems,
      })
      .select()
      .single();

    if (orderError) {
      console.error("❌ Failed to create pending order:", orderError);
      throw new Error("Failed to create pending order");
    }

    console.log("✅ Pending order created:", pendingOrder.id);

    // Return success response with both Razorpay and database order info
    const responseData = {
      razorpay_order_id: razorpayOrder.id,
      razorpay_key_id: razorpayKeyId,
      amount: amountInPaise,
      currency: "INR",
      pending_order_id: pendingOrder.id,
      order_number: orderNumber,
      success: true,
    };
    
    console.log("🎉 Returning success response");
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Edge function error:", error);
    console.error("📜 Error stack:", error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create order",
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_11111111111111";
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "test_secret_key";

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid user token");
    }

    // Parse request body
    const { amount, cartItems, deliveryAddress } = await req.json();

    if (!amount || !cartItems || cartItems.length === 0) {
      throw new Error("Invalid request data");
    }

    console.log(`Creating Razorpay order for user ${user.id}, amount: ${amount}`);

    // Convert amount to paise (multiply by 100)
    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order
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

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(razorpayOrderData),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay API error:", errorText);
      throw new Error(`Razorpay API error: ${razorpayResponse.status}`);
    }

    const razorpayOrder = await razorpayResponse.json();
    console.log("Razorpay order created:", razorpayOrder.id);

    // Return success response
    return new Response(JSON.stringify({
      razorpay_order_id: razorpayOrder.id,
      razorpay_key_id: razorpayKeyId,
      amount: amountInPaise,
      currency: "INR",
      success: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create Razorpay order",
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
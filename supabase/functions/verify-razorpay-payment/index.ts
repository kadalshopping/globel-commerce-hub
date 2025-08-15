import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify Razorpay payment signature
async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const body = orderId + "|" + paymentId;
  const expectedSignature = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(key => 
    crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  ).then(signature => 
    Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  );
  
  return expectedSignature === signature;
}

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!razorpayKeySecret) {
      throw new Error("Missing Razorpay secret key");
    }

    // Create Supabase clients
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing payment verification data");
    }

    console.log(`Verifying payment for user ${user.id}, order: ${razorpay_order_id}`);

    // Verify payment signature
    const isValidSignature = await verifySignature(
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      razorpayKeySecret
    );

    if (!isValidSignature) {
      throw new Error("Invalid payment signature");
    }

    console.log("Payment signature verified successfully");

    // Find the pending order
    const { data: pendingOrder, error: fetchError } = await supabaseService
      .from("pending_orders")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !pendingOrder) {
      throw new Error("Pending order not found");
    }

    console.log(`Found pending order: ${pendingOrder.order_number}`);

    // Create confirmed order with Razorpay payment ID as order number
    const orderNumber = razorpay_payment_id; // Use payment ID as order number
    const { data: confirmedOrder, error: orderError } = await supabaseService
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount: pendingOrder.total_amount,
        status: "confirmed",
        payment_status: "completed",
        payment_id: null,
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        delivery_address: pendingOrder.delivery_address,
        items: pendingOrder.items,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw new Error("Failed to create confirmed order");
    }

    console.log(`Created confirmed order: ${confirmedOrder.id}`);

    // Create order items for shop owners
    const items = pendingOrder.items as any[];
    for (const item of items) {
      // Get product details to find shop_owner_id
      const { data: product } = await supabaseService
        .from("products")
        .select("shop_owner_id")
        .eq("id", item.productId)
        .single();

      if (product) {
        // Create order item
        const { error: itemError } = await supabaseService
          .from("order_items")
          .insert({
            order_id: confirmedOrder.id,
            product_id: item.productId,
            shop_owner_id: product.shop_owner_id,
            quantity: item.quantity,
            price: item.price,
            status: "pending",
          });

        if (itemError) {
          console.error("Order item creation error:", itemError);
        } else {
          console.log(`Created order item for product ${item.productId}`);
        }

        // Update product stock
        const { error: stockError } = await supabaseService.rpc("decrease_product_stock", {
          product_id_param: item.productId,
          quantity_param: item.quantity,
        });

        if (stockError) {
          console.error("Stock update error:", stockError);
        } else {
          console.log(`Updated stock for product ${item.productId}`);
        }
      }
    }

    // Delete pending order
    const { error: deleteError } = await supabaseService
      .from("pending_orders")
      .delete()
      .eq("id", pendingOrder.id);

    if (deleteError) {
      console.error("Pending order deletion error:", deleteError);
    } else {
      console.log(`Deleted pending order: ${pendingOrder.id}`);
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: confirmedOrder.id,
      order_number: confirmedOrder.order_number,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Payment verification failed",
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Verify Razorpay payment signature
async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const body = orderId + "|" + paymentId;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {
    name: "HMAC",
    hash: "SHA-256"
  }, false, ["sign"]);
  
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature;
}

serve(async (req) => {
  console.log("🚀 Payment verification function called, method:", req.method);
  
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
    console.log("📋 Starting payment verification...");

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing payment verification data');
    }

    console.log(`🔍 Verifying payment for order: ${razorpay_order_id}`);

    // Verify payment signature
    const isValidSignature = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    );

    if (!isValidSignature) {
      console.error("❌ Invalid payment signature");
      throw new Error('Invalid payment signature');
    }

    console.log("✅ Payment signature verified successfully");

    // Find the pending order
    const { data: pendingOrder, error: fetchError } = await supabaseClient
      .from('pending_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !pendingOrder) {
      console.error("❌ Pending order not found:", fetchError);
      throw new Error('Pending order not found');
    }

    console.log(`📦 Found pending order: ${pendingOrder.order_number}`);

    // Check if order already exists to prevent duplicate processing
    const { data: existingOrder } = await supabaseClient
      .from('orders')
      .select('id, order_number')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .single();

    if (existingOrder) {
      console.log(`⚠️ Order already processed: ${existingOrder.order_number}`);
      return new Response(JSON.stringify({
        success: true,
        order_id: existingOrder.id,
        order_number: existingOrder.order_number,
        message: 'Payment already verified'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create confirmed order with Razorpay payment ID as order number
    const orderNumber = razorpay_payment_id;
    const { data: confirmedOrder, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount: pendingOrder.total_amount,
        status: 'confirmed',
        payment_status: 'completed',
        payment_id: null,
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        delivery_address: pendingOrder.delivery_address,
        items: pendingOrder.items
      })
      .select()
      .single();

    if (orderError) {
      console.error("❌ Order creation error:", orderError);
      throw new Error('Failed to create confirmed order');
    }

    console.log(`✅ Created confirmed order: ${confirmedOrder.id}`);

    // Create order items for shop owners and update stock
    const items = pendingOrder.items as any[];
    const itemResults = [];

    for (const item of items) {
      try {
        // Get product details to find shop_owner_id
        const { data: product } = await supabaseClient
          .from('products')
          .select('shop_owner_id')
          .eq('id', item.productId)
          .single();

        if (product) {
          // Create order item
          const { data: orderItem, error: itemError } = await supabaseClient
            .from('order_items')
            .insert({
              order_id: confirmedOrder.id,
              product_id: item.productId,
              shop_owner_id: product.shop_owner_id,
              quantity: item.quantity,
              price: item.price,
              status: 'pending'
            })
            .select()
            .single();

          if (itemError) {
            console.error(`❌ Order item creation error for ${item.productId}:`, itemError);
            itemResults.push({ productId: item.productId, success: false, error: itemError.message });
          } else {
            console.log(`✅ Created order item for product ${item.productId}`);
            itemResults.push({ productId: item.productId, success: true, orderItemId: orderItem.id });

            // Update product stock
            const { error: stockError } = await supabaseClient.rpc('decrease_product_stock', {
              product_id_param: item.productId,
              quantity_param: item.quantity
            });

            if (stockError) {
              console.error(`❌ Stock update error for ${item.productId}:`, stockError);
            } else {
              console.log(`✅ Updated stock for product ${item.productId}`);
            }
          }
        } else {
          console.error(`❌ Product not found: ${item.productId}`);
          itemResults.push({ productId: item.productId, success: false, error: 'Product not found' });
        }
      } catch (itemProcessingError) {
        console.error(`❌ Error processing item ${item.productId}:`, itemProcessingError);
        const err = itemProcessingError as Error;
        itemResults.push({ productId: item.productId, success: false, error: err.message || 'Unknown error' });
      }
    }

    // Delete pending order
    const { error: deleteError } = await supabaseClient
      .from('pending_orders')
      .delete()
      .eq('id', pendingOrder.id);

    if (deleteError) {
      console.error("❌ Pending order deletion error:", deleteError);
    } else {
      console.log(`✅ Deleted pending order: ${pendingOrder.id}`);
    }

    console.log("🎉 Payment verification completed successfully");

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment verified successfully',
      order_id: confirmedOrder.id,
      order_number: confirmedOrder.order_number,
      item_results: itemResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    const err = error as Error;
    return new Response(JSON.stringify({
      error: err.message || 'Unknown error occurred',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
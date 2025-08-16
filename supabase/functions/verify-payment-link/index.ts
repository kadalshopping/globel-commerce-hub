import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Verify Razorpay webhook signature
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
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
  } catch (error) {
    console.error("❌ Signature verification error:", error);
    return false;
  }
}

serve(async (req) => {
  console.log("🚀 Payment link verification function called, method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("📋 Starting payment link verification...");

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different types of requests
    if (req.method === 'POST') {
      // This is either a webhook from Razorpay or a manual verification request
      const requestBody = await req.text();
      const webhookSignature = req.headers.get('X-Razorpay-Signature');
      
      let paymentData;
      
      if (webhookSignature) {
        // This is a Razorpay webhook
        console.log("🔔 Processing Razorpay webhook...");
        
        // Verify webhook signature
        const isValidSignature = await verifyWebhookSignature(requestBody, webhookSignature, razorpayKeySecret);
        
        if (!isValidSignature) {
          console.error("❌ Invalid webhook signature");
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        paymentData = JSON.parse(requestBody);
        console.log("✅ Webhook signature verified, event:", paymentData.event);
        
        // Handle payment link paid event
        if (paymentData.event === 'payment_link.paid') {
          const paymentLink = paymentData.payload.payment_link.entity;
          const payment = paymentData.payload.payment.entity;
          
          console.log(`💳 Payment link paid: ${paymentLink.id}`);
          
          await processPaymentCompletion(supabaseClient, paymentLink.id, payment.id, payment);
          
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        // This is a manual verification request (GET params or JSON body)
        console.log("🔍 Processing manual payment verification...");
        
        try {
          paymentData = JSON.parse(requestBody);
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const { payment_link_id, payment_id } = paymentData;
        
        if (!payment_link_id && !payment_id) {
          return new Response(JSON.stringify({ error: 'Missing payment_link_id or payment_id' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        console.log(`🔍 Manual verification for payment link: ${payment_link_id}`);
        
        await processPaymentCompletion(supabaseClient, payment_link_id, payment_id, paymentData);
        
        return new Response(JSON.stringify({ success: true, message: 'Payment verified successfully' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else if (req.method === 'GET') {
      // Handle callback from payment link success
      const url = new URL(req.url);
      const paymentLinkId = url.searchParams.get('razorpay_payment_link_id');
      const paymentId = url.searchParams.get('razorpay_payment_id');
      const paymentLinkReferenceId = url.searchParams.get('razorpay_payment_link_reference_id');
      const paymentLinkStatus = url.searchParams.get('razorpay_payment_link_status');
      const signature = url.searchParams.get('razorpay_signature');
      
      console.log("🔗 Payment link callback received:", {
        paymentLinkId,
        paymentId,
        paymentLinkStatus
      });
      
      if (paymentLinkStatus === 'paid' && paymentLinkId && paymentId) {
        await processPaymentCompletion(supabaseClient, paymentLinkId, paymentId, {
          payment_link_reference_id: paymentLinkReferenceId,
          payment_link_status: paymentLinkStatus,
          razorpay_signature: signature
        });
        
        // Redirect to success page
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': '/orders?payment=success'
          }
        });
      } else {
        // Redirect to failure page
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': '/orders?payment=failed'
          }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error verifying payment link:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Process payment completion and create confirmed order
async function processPaymentCompletion(supabaseClient: any, paymentLinkId: string, paymentId: string, paymentData: any) {
  console.log(`🔄 Processing payment completion for link: ${paymentLinkId}`);
  
  try {
    // Find the pending order using the payment link ID
    const { data: pendingOrder, error: fetchError } = await supabaseClient
      .from('pending_orders')
      .select('*')
      .eq('razorpay_order_id', paymentLinkId)
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
      .eq('razorpay_payment_id', paymentId)
      .single();

    if (existingOrder) {
      console.log(`⚠️ Order already processed: ${existingOrder.order_number}`);
      return existingOrder;
    }

    // Create confirmed order
    const confirmedOrderNumber = paymentId;
    const { data: confirmedOrder, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: pendingOrder.user_id,
        order_number: confirmedOrderNumber,
        total_amount: pendingOrder.total_amount,
        status: 'confirmed',
        payment_status: 'completed',
        payment_id: null,
        razorpay_order_id: paymentLinkId,
        razorpay_payment_id: paymentId,
        delivery_address: pendingOrder.delivery_address,
        items: pendingOrder.items,
        price_breakdown: pendingOrder.price_breakdown // Transfer price breakdown from pending order
      })
      .select()
      .single();

    if (orderError) {
      console.error("❌ Order creation error:", orderError);
      throw new Error('Failed to create confirmed order');
    }

    console.log(`✅ Confirmed order created: ${confirmedOrder.id}`);

    // Create order items and update stock
    const items = pendingOrder.items as any[];
    for (const item of items) {
      try {
        // Get product details
        const { data: product } = await supabaseClient
          .from('products')
          .select('shop_owner_id')
          .eq('id', item.productId)
          .single();

        if (product) {
          // Create order item
          await supabaseClient
            .from('order_items')
            .insert({
              order_id: confirmedOrder.id,
              product_id: item.productId,
              shop_owner_id: product.shop_owner_id,
              quantity: item.quantity,
              price: item.price,
              status: 'pending'
            });

          // Update stock
          await supabaseClient.rpc('decrease_product_stock', {
            product_id_param: item.productId,
            quantity_param: item.quantity
          });

          console.log(`✅ Processed item: ${item.productId}`);
        }
      } catch (itemError) {
        console.error(`❌ Error processing item ${item.productId}:`, itemError);
      }
    }

    // Delete pending order
    await supabaseClient
      .from('pending_orders')
      .delete()
      .eq('id', pendingOrder.id);

    console.log(`✅ Payment processing completed successfully for order: ${confirmedOrderNumber}`);
    
    return confirmedOrder;

  } catch (error) {
    console.error('❌ Error processing payment completion:', error);
    throw error;
  }
}
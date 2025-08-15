import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify Razorpay signature
const verifySignature = async (orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> => {
  try {
    const payload = `${orderId}|${paymentId}`;
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(payload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

serve(async (req) => {
  console.log(`=== VERIFY PAYMENT START ===`);
  
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
    let razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    // Use fallback test secret if not available
    if (!razorpayKeySecret) {
      razorpayKeySecret = 'pKzBxQQnOOLwIDREBFK7H6iq';
      console.log('Using fallback Razorpay secret');
    }

    if (!supabaseUrl || !supabaseServiceKey || !razorpayKeySecret) {
      console.error('Missing configuration:', {
        supabase: !!supabaseUrl,
        serviceKey: !!supabaseServiceKey,
        razorpay: !!razorpayKeySecret
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
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

    // Parse request body
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    console.log('Payment verification request:', { 
      orderId: razorpay_order_id, 
      paymentId: razorpay_payment_id 
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing payment verification data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment signature
    const isValidSignature = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    );

    if (!isValidSignature) {
      console.error('Invalid payment signature');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment signature verified');

    // Find pending order
    const { data: pendingOrder, error: pendingError } = await supabase
      .from('pending_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single();

    if (pendingError || !pendingOrder) {
      console.error('Pending order not found:', pendingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create confirmed order
    const { data: confirmedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: pendingOrder.total_amount,
        delivery_address: pendingOrder.delivery_address,
        items: pendingOrder.items,
        order_number: pendingOrder.order_number,
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        status: 'confirmed',
        payment_status: 'completed'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create confirmed order:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order items for shop owners
    const items = pendingOrder.items;
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('shop_owner_id')
        .eq('id', item.productId)
        .single();

      if (product) {
        await supabase
          .from('order_items')
          .insert({
            order_id: confirmedOrder.id,
            product_id: item.productId,
            shop_owner_id: product.shop_owner_id,
            quantity: item.quantity,
            price: item.price,
            status: 'pending'
          });

        // Update product stock
        await supabase.rpc('decrease_product_stock', {
          product_id_param: item.productId,
          quantity_param: item.quantity
        });
      }
    }

    // Delete pending order
    await supabase
      .from('pending_orders')
      .delete()
      .eq('id', pendingOrder.id);

    console.log('Order completed successfully:', confirmedOrder.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and order created',
        data: {
          order_id: confirmedOrder.id,
          order_number: confirmedOrder.order_number,
          payment_id: razorpay_payment_id,
          status: 'confirmed'
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
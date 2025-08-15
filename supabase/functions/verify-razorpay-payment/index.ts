import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface OrderItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  maxStock: number;
}

// Utility functions
const validatePaymentData = (data: any): PaymentVerificationRequest => {
  if (!data.razorpay_order_id || !data.razorpay_payment_id || !data.razorpay_signature) {
    throw new Error('Missing required payment verification data');
  }
  
  if (typeof data.razorpay_order_id !== 'string' || 
      typeof data.razorpay_payment_id !== 'string' || 
      typeof data.razorpay_signature !== 'string') {
    throw new Error('Invalid payment verification data format');
  }
  
  return data as PaymentVerificationRequest;
};

const authenticateUser = async (supabase: any, authHeader: string | null) => {
  if (!authHeader) {
    throw new Error('Authorization header missing');
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error) {
    console.error('Authentication error:', error);
    throw new Error('Invalid authentication token');
  }
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
};

const verifyRazorpaySignature = async (
  orderId: string, 
  paymentId: string, 
  signature: string, 
  secret: string
): Promise<boolean> => {
  try {
    const payload = `${orderId}|${paymentId}`;
    
    console.log('Signature verification:', {
      payload,
      receivedSignature: signature,
      secretLength: secret.length
    });
    
    // Create HMAC SHA256 hash
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
    
    // Convert to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Signature comparison:', {
      expected: expectedSignature,
      received: signature,
      match: expectedSignature === signature
    });

    // Constant time comparison to prevent timing attacks
    if (expectedSignature.length !== signature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    const isValid = result === 0;
    console.log('Final signature validation result:', isValid);
    return isValid;
    
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

const findOrder = async (supabase: any, razorpayOrderId: string, userId: string) => {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Order lookup error:', error);
    throw new Error('Order not found or access denied');
  }

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.payment_status === 'completed') {
    console.log('Order already completed, skipping verification');
    return order;
  }

  return order;
};

const updateOrderPayment = async (supabase: any, orderId: string, paymentId: string) => {
  const { error } = await supabase
    .from('orders')
    .update({
      razorpay_payment_id: paymentId,
      payment_status: 'completed',
      status: 'confirmed',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  if (error) {
    console.error('Order update error:', error);
    throw new Error('Failed to update order payment status');
  }
};

const createOrderItems = async (supabase: any, order: any) => {
  try {
    const items = order.items as OrderItem[];
    
    for (const item of items) {
      // Get product details including shop owner
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('shop_owner_id')
        .eq('id', item.productId)
        .single();

      if (productError) {
        console.error(`Failed to get product ${item.productId}:`, productError);
        continue;
      }

      // Create order item
      const { error: orderItemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.productId,
          shop_owner_id: product.shop_owner_id,
          quantity: item.quantity,
          price: item.price,
          status: 'pending'
        });

      if (orderItemError) {
        console.error(`Failed to create order item for product ${item.productId}:`, orderItemError);
      }
    }
  } catch (error) {
    console.error('Error creating order items:', error);
    throw new Error('Failed to create order items');
  }
};

const updateProductStock = async (supabase: any, order: any) => {
  try {
    const items = order.items as OrderItem[];
    
    for (const item of items) {
      const { data, error } = await supabase.rpc('decrease_product_stock', {
        product_id_param: item.productId,
        quantity_param: item.quantity
      });

      if (error) {
        console.error(`Failed to update stock for product ${item.productId}:`, error);
      } else if (!data) {
        console.warn(`Insufficient stock or product not found: ${item.productId}`);
      }
    }
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw new Error('Failed to update product stock');
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const requestId = crypto.randomUUID();

  try {
    console.log(`=== VERIFY RAZORPAY PAYMENT START [${requestId}] ===`);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    console.log(`Auth header present [${requestId}]: ${!!authHeader}`);
    const user = await authenticateUser(supabase, authHeader);

    console.log(`User authenticated [${requestId}]:`, { userId: user.id });

    // Parse and validate request
    let requestBody: PaymentVerificationRequest;
    try {
      requestBody = await req.json();
    } catch (e) {
      throw new Error('Invalid JSON in request body');
    }

    validatePaymentData(requestBody);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = requestBody;

    console.log(`Payment verification request [${requestId}]:`, {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      hasSignature: !!razorpay_signature
    });

    // Get Razorpay secret
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      throw new Error('Payment verification service not configured');
    }

    console.log(`Verifying payment signature [${requestId}]...`);

    // Verify signature
    const isSignatureValid = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    );

    if (!isSignatureValid) {
      console.error(`Signature verification failed [${requestId}]`);
      throw new Error('Payment signature verification failed - payment may be fraudulent');
    }

    console.log(`Payment signature verified successfully [${requestId}]`);

    // Find and validate order
    const existingOrder = await findOrder(supabase, razorpay_order_id, user.id);

    console.log(`Order found [${requestId}]:`, {
      orderId: existingOrder.id,
      orderNumber: existingOrder.order_number,
      currentStatus: existingOrder.payment_status
    });

    // Skip if already processed
    if (existingOrder.payment_status === 'completed') {
      console.log(`Order already completed [${requestId}], returning success`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Payment already verified and order confirmed',
          data: {
            order_id: existingOrder.id,
            order_number: existingOrder.order_number,
            payment_id: razorpay_payment_id,
            status: 'confirmed'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order with payment details
    await updateOrderPayment(supabase, existingOrder.id, razorpay_payment_id);
    console.log(`Order payment updated [${requestId}]`);

    // Create order items for shop owners
    await createOrderItems(supabase, existingOrder);
    console.log(`Order items created [${requestId}]`);

    // Update product stock
    await updateProductStock(supabase, existingOrder);
    console.log(`Product stock updated [${requestId}]`);

    console.log(`=== VERIFY RAZORPAY PAYMENT SUCCESS [${requestId}] ===`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Payment verified and order confirmed',
        data: {
          order_id: existingOrder.id,
          order_number: existingOrder.order_number,
          payment_id: razorpay_payment_id,
          status: 'confirmed'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`=== VERIFY RAZORPAY PAYMENT ERROR [${requestId}] ===`);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed',
        timestamp: new Date().toISOString(),
        requestId: requestId
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
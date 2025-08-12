import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('=== VERIFY RAZORPAY PAYMENT START ===');
    
    // Parse request body
    const body: VerifyPaymentRequest = await req.json();
    console.log('Verification request:', {
      order_id: body.razorpay_order_id,
      payment_id: body.razorpay_payment_id,
      hasSignature: !!body.razorpay_signature
    });

    // Validate input
    if (!body.razorpay_order_id) {
      throw new Error('Order ID is required');
    }
    if (!body.razorpay_payment_id) {
      throw new Error('Payment ID is required');
    }
    if (!body.razorpay_signature) {
      throw new Error('Payment signature is required');
    }

    // Get Razorpay secret
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      console.error('Razorpay secret not configured');
      throw new Error('Payment verification service not configured');
    }

    console.log('Credentials check: Secret available');

    // Verify signature using HMAC-SHA256
    const payload = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
    console.log('Verifying signature for payload:', payload);

    const encoder = new TextEncoder();
    const keyData = encoder.encode(keySecret);
    const payloadData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const isValid = expectedSignature === body.razorpay_signature;
    console.log('Signature verification:', {
      expectedPrefix: expectedSignature.substring(0, 10) + '...',
      receivedPrefix: body.razorpay_signature.substring(0, 10) + '...',
      isValid
    });

    if (!isValid) {
      console.error('Invalid payment signature');
      throw new Error('Payment signature verification failed');
    }

    console.log('Payment signature verified successfully');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      throw new Error('Database service not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('User authentication failed:', authError?.message);
      throw new Error('User authentication failed');
    }

    console.log('User authenticated:', { userId: user.id });

    // TODO: Store payment record in database
    // const { error: dbError } = await supabase
    //   .from('payments')
    //   .insert({
    //     user_id: user.id,
    //     razorpay_order_id: body.razorpay_order_id,
    //     razorpay_payment_id: body.razorpay_payment_id,
    //     status: 'completed',
    //     verified_at: new Date().toISOString()
    //   });

    console.log('=== VERIFY RAZORPAY PAYMENT SUCCESS ===');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified successfully',
        data: {
          order_id: body.razorpay_order_id,
          payment_id: body.razorpay_payment_id,
          user_id: user.id,
          verified_at: new Date().toISOString()
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('=== VERIFY RAZORPAY PAYMENT ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment verification failed',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
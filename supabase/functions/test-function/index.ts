import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`=== TEST FUNCTION START [${requestId}] ===`);

  try {
    // Test environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    console.log(`Environment check [${requestId}]:`, {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
      razorpayKeyId: !!razorpayKeyId,
      razorpayKeySecret: !!razorpayKeySecret,
      method: req.method
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test function working',
        requestId,
        environment: {
          supabaseUrl: !!supabaseUrl,
          supabaseServiceKey: !!supabaseServiceKey,
          razorpayKeyId: !!razorpayKeyId,
          razorpayKeySecret: !!razorpayKeySecret,
          razorpayKeyIdPreview: razorpayKeyId?.substring(0, 8)
        },
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error(`=== TEST FUNCTION ERROR [${requestId}] ===`);
    console.error('Error details:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Test function error',
        requestId,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
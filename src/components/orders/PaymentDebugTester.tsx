import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, PlayCircle, CheckCircle, XCircle } from 'lucide-react';

export const PaymentDebugTester = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testPaymentLink = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please login to test payment link creation',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      console.log('🧪 Testing payment link creation...');
      
      const testData = {
        amount: 15, // Small test amount
        cartItems: [{
          id: 'test_item_1',
          productId: 'test_product',
          title: 'Test Product',
          price: 15,
          image: '',
          maxStock: 1,
          quantity: 1
        }],
        deliveryAddress: {
          fullName: user.user_metadata?.full_name || 'Test Customer',
          email: user.email
        },
        priceBreakdown: {
          subtotal: 15,
          discount: 0,
          couponDiscount: 0,
          deliveryCharge: 0,
          platformCharge: 0,
          gst: 0,
          total: 15
        }
      };

      console.log('📤 Sending test request:', testData);

      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: testData
      });

      console.log('📨 Response received:', { data, error });

      if (error) {
        setResult({
          success: false,
          error: error.message,
          details: error
        });
        
        toast({
          title: 'Test Failed',
          description: `Error: ${error.message}`,
          variant: 'destructive',
        });
      } else {
        setResult({
          success: true,
          data: data
        });
        
        toast({
          title: 'Test Successful!',
          description: 'Payment link created successfully',
        });
      }

    } catch (error) {
      console.error('🔥 Test error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      });
      
      toast({
        title: 'Test Failed',
        description: 'Unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  if (!user) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4 text-center">
          <AlertCircle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
          <p className="text-orange-700">Please login to test payment functionality</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <AlertCircle className="w-5 h-5" />
          Payment Link Debug Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-blue-700">
          <p>This tool tests the payment link creation with debugging enabled.</p>
          <p>Check the browser console and Supabase function logs for detailed information.</p>
        </div>

        <Button 
          onClick={testPaymentLink}
          disabled={testing}
          className="w-full"
          variant="default"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {testing ? 'Testing Payment Link...' : 'Test Payment Link Creation'}
        </Button>

        {result && (
          <div className="mt-4">
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <h4 className={`font-medium ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.success ? 'Test Successful' : 'Test Failed'}
                </h4>
              </div>
              
              <div className="text-sm">
                {result.success ? (
                  <div>
                    <p className="text-green-700 mb-2">Payment link created successfully!</p>
                    {result.data && (
                      <div className="bg-white p-2 rounded border">
                        <p><strong>Payment Link ID:</strong> {result.data.payment_link_id}</p>
                        <p><strong>Order Number:</strong> {result.data.order_number}</p>
                        <p><strong>Amount:</strong> ₹{(result.data.amount / 100).toFixed(2)}</p>
                        <p><strong>Status:</strong> {result.data.status}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-red-700 mb-2">Error: {result.error}</p>
                    <details className="text-xs">
                      <summary className="cursor-pointer">Error Details</summary>
                      <pre className="mt-2 bg-white p-2 rounded border overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
          <strong>Debug Tips:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check browser console for detailed logs</li>
            <li>Check Supabase Function logs for server-side debugging</li>
            <li>Verify Razorpay credentials in Supabase secrets</li>
            <li>Ensure you're logged in with a valid user account</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
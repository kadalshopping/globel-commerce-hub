import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get parameters from URL
        const paymentLinkId = searchParams.get('razorpay_payment_link_id');
        const paymentId = searchParams.get('razorpay_payment_id');
        const paymentStatus = searchParams.get('razorpay_payment_link_status');
        const signature = searchParams.get('razorpay_signature');

        console.log('🔗 Payment success callback received:', {
          paymentLinkId,
          paymentId,
          paymentStatus,
          hasSignature: !!signature
        });

        if (paymentStatus === 'paid' && paymentLinkId && paymentId) {
          // Verify payment via edge function
          const { data: verificationResult, error } = await supabase.functions.invoke('verify-payment-link', {
            body: {
              payment_link_id: paymentLinkId,
              payment_id: paymentId,
              payment_link_status: paymentStatus,
              razorpay_signature: signature
            }
          });

          console.log('📦 Verification result:', { verificationResult, error });

          if (error || !verificationResult?.success) {
            console.error('❌ Payment verification failed:', error);
            setVerificationStatus('failed');
            toast({
              title: 'Payment Verification Failed',
              description: 'Payment completed but verification failed. Please contact support.',
              variant: 'destructive',
            });
            return;
          }

          console.log('✅ Payment verified successfully');
          setVerificationStatus('success');
          setOrderDetails(verificationResult);
          
          toast({
            title: '🎉 Payment Successful!',
            description: 'Your order has been confirmed and is being processed.',
          });

        } else {
          console.error('❌ Invalid payment parameters');
          setVerificationStatus('failed');
          toast({
            title: 'Payment Failed',
            description: 'Payment was not completed successfully.',
            variant: 'destructive',
          });
        }

      } catch (error) {
        console.error('❌ Payment verification error:', error);
        setVerificationStatus('failed');
        toast({
          title: 'Verification Error',
          description: 'Failed to verify payment. Please contact support.',
          variant: 'destructive',
        });
      }
    };

    // Only verify if we have the required parameters
    const paymentLinkId = searchParams.get('razorpay_payment_link_id');
    const paymentId = searchParams.get('razorpay_payment_id');
    
    if (paymentLinkId && paymentId) {
      verifyPayment();
    } else {
      // No payment parameters, probably came here directly
      navigate('/orders');
    }
  }, [searchParams, navigate, toast]);

  const handleViewOrders = () => {
    navigate('/orders');
  };

  const handleContinueShopping = () => {
    navigate('/');
  };

  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
            <CardTitle>Verifying Payment...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Please wait while we verify your payment and confirm your order.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your payment has been processed successfully and your order has been confirmed.
            </p>
            
            {orderDetails && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  Order Number: {orderDetails.order_number || 'Processing...'}
                </p>
                <p className="text-xs text-green-600">
                  You will receive a confirmation email shortly.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={handleViewOrders} className="w-full">
                <ShoppingBag className="w-4 h-4 mr-2" />
                View My Orders
              </Button>
              <Button onClick={handleContinueShopping} variant="outline" className="w-full">
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed verification
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-red-800">Payment Verification Failed</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            We couldn't verify your payment. If you completed the payment, please check your orders or contact support.
          </p>

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleViewOrders} className="w-full">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Check My Orders
            </Button>
            <Button onClick={handleContinueShopping} variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
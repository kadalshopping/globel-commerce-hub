import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, CheckCircle, Clock, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PaymentStatus {
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  order_id?: string;
  payment_id?: string;
}

const InlinePaymentFlow = () => {
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentLinkId, setPaymentLinkId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'pending' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const checkPaymentStatus = async (linkId: string) => {
    try {
      console.log('🔍 Checking payment status for link:', linkId);
      
      const { data: verificationResult, error } = await supabase.functions.invoke('verify-payment-link', {
        body: {
          payment_link_id: linkId,
          manual_verification: true
        }
      });

      if (error) {
        console.error('❌ Payment verification error:', error);
        return;
      }

      console.log('📊 Payment status result:', verificationResult);

      if (verificationResult?.success) {
        setPaymentStatus({ 
          status: 'paid', 
          order_id: verificationResult.order_id,
          payment_id: verificationResult.payment_id 
        });
        
        // Clear the polling interval
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }

        toast({
          title: '✅ Payment Successful!',
          description: 'Your order has been confirmed and is being processed.',
        });

        // Clear cart and navigate after a short delay
        setTimeout(() => {
          clearCart();
          setShowPaymentModal(false);
          navigate('/orders');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
    }
  };

  const startStatusPolling = (linkId: string) => {
    // Check immediately
    checkPaymentStatus(linkId);
    
    // Then poll every 5 seconds
    const interval = setInterval(() => {
      checkPaymentStatus(linkId);
    }, 5000);
    
    setStatusCheckInterval(interval);

    // Stop polling after 10 minutes
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setStatusCheckInterval(null);
      }
    }, 600000); // 10 minutes
  };

  const handleCreatePayment = async () => {
    if (!user) {
      toast({
        title: 'Please login',
        description: 'You need to login to make a payment',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (cart.items.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to cart first',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Creating payment link for same-tab flow...');
      
      const { data: paymentLinkData, error } = await supabase.functions.invoke('create-payment-link', {
        body: {
          amount: cart.total,
          cartItems: cart.items.map(item => ({
            id: item.id,
            productId: item.id.replace('cart_', ''),
            title: item.title,
            price: item.price,
            image: item.image,
            maxStock: item.maxStock,
            quantity: item.quantity
          })),
          deliveryAddress: {
            fullName: user.user_metadata?.full_name || 'Customer',
            email: user.email || 'customer@example.com'
          }
        }
      });

      if (error) {
        throw new Error(`Failed to create payment link: ${error.message || 'Unknown error'}`);
      }

      if (!paymentLinkData || !paymentLinkData.success) {
        throw new Error('Failed to create payment link - invalid response');
      }

      console.log('✅ Payment link created:', paymentLinkData);

      setPaymentUrl(paymentLinkData.payment_link_url);
      setPaymentLinkId(paymentLinkData.payment_link_id);
      setShowPaymentModal(true);
      setPaymentStatus({ status: 'pending' });

      // Start polling for payment status
      startStatusPolling(paymentLinkData.payment_link_id);

      toast({
        title: '💳 Payment Ready',
        description: 'Complete your payment in the embedded form below.',
      });

    } catch (error) {
      console.error('❌ Payment creation error:', error);
      toast({
        title: 'Payment Error', 
        description: error instanceof Error ? error.message : 'Failed to create payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
    setShowPaymentModal(false);
    setPaymentUrl(null);
    setPaymentLinkId(null);
    setPaymentStatus({ status: 'pending' });
  };

  const handleRefreshStatus = () => {
    if (paymentLinkId) {
      checkPaymentStatus(paymentLinkId);
    }
  };

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleCreatePayment}
        disabled={loading}
        className="w-full"
        size="lg"
        variant="default"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Creating Payment...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Pay ₹{cart.total.toFixed(2)} (Same Tab)
          </div>
        )}
      </Button>

      <Dialog open={showPaymentModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Complete Your Payment</span>
              <div className="flex items-center gap-2">
                <Badge variant={paymentStatus.status === 'paid' ? 'default' : 'secondary'}>
                  {paymentStatus.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                  {paymentStatus.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {paymentStatus.status.charAt(0).toUpperCase() + paymentStatus.status.slice(1)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshStatus}
                  disabled={!paymentLinkId}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {paymentStatus.status === 'paid' ? (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Payment Successful!
                </CardTitle>
                <CardDescription className="text-green-700">
                  Your order has been confirmed. Redirecting to orders page...
                </CardDescription>
              </CardHeader>
              <CardContent className="text-green-700">
                <p>Order ID: {paymentStatus.order_id}</p>
                {paymentStatus.payment_id && <p>Payment ID: {paymentStatus.payment_id}</p>}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                  <CardDescription>
                    Total: ₹{cart.total.toFixed(2)} for {cart.items.length} item(s)
                  </CardDescription>
                </CardHeader>
              </Card>

              {paymentUrl && (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={paymentUrl}
                    className="w-full h-96 border-0"
                    title="Payment Gateway"
                    onLoad={() => {
                      console.log('📱 Payment iframe loaded');
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Payment status will update automatically</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshStatus}
                  disabled={!paymentLinkId}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Check Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InlinePaymentFlow;
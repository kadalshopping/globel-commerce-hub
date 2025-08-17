import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag } from 'lucide-react';
import { PriceBreakdown as PriceBreakdownType } from '@/utils/priceCalculations';

interface SimpleOrderButtonProps {
  priceBreakdown: PriceBreakdownType | null;
}

const SimpleOrderButton: React.FC<SimpleOrderButtonProps> = ({ priceBreakdown }) => {
  const [loading, setLoading] = useState(false);
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const finalTotal = priceBreakdown?.total || cart.total;

  const createOrder = async () => {
    const timestamp = Date.now();
    const orderNumber = `ORD-${timestamp}`;
    
    // Create order directly in database with completed status
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id || '',
        total_amount: finalTotal,
        price_breakdown: priceBreakdown as any,
        delivery_address: {
          fullName: user?.user_metadata?.full_name || 'Customer',
          email: user?.email || 'customer@example.com'
        } as any,
        items: cart.items as any,
        order_number: orderNumber,
        payment_status: 'pending',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Order creation error:', error);
      throw new Error('Failed to create order');
    }

    return order;
  };

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'creating' | 'waiting' | 'verifying' | 'success' | 'failed'>('idle');
  const [paymentLinkId, setPaymentLinkId] = useState<string | null>(null);

  // Poll for payment completion
  const pollPaymentStatus = async (linkId: string) => {
    setPaymentStatus('waiting');
    
    const checkPayment = async () => {
      try {
        const { data: verificationResult, error } = await supabase.functions.invoke('verify-payment-link', {
          body: {
            payment_link_id: linkId,
            payment_id: 'check_status'
          }
        });

        if (!error && verificationResult?.success) {
          setPaymentStatus('success');
          clearCart();
          
          toast({
            title: '🎉 Payment Successful!',
            description: 'Your order has been confirmed and is waiting for dispatch.',
          });
          
          setTimeout(() => {
            navigate('/orders');
          }, 2000);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Payment status check error:', error);
        return false;
      }
    };

    // Check every 3 seconds for up to 5 minutes
    const maxAttempts = 100;
    let attempts = 0;
    
    const interval = setInterval(async () => {
      attempts++;
      const isComplete = await checkPayment();
      
      if (isComplete || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!isComplete) {
          setPaymentStatus('failed');
          toast({
            title: 'Payment Timeout',
            description: 'Payment verification timed out. Please check your orders page.',
            variant: 'destructive',
          });
        }
      }
    }, 3000);
  };

  const handleCreateOrder = async () => {
    if (!user) {
      toast({
        title: 'Please login',
        description: 'You need to login to create an order',
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

    setPaymentStatus('creating');
    setLoading(true);

    try {
      console.log('🚀 Creating Razorpay payment link...');
      
      // Create payment link via edge function
      const { data: paymentLinkData, error } = await supabase.functions.invoke('create-payment-link', {
        body: {
          amount: finalTotal,
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
          },
          priceBreakdown: priceBreakdown
        }
      });

      console.log('📦 Payment link response:', { paymentLinkData, error });

      if (error) {
        console.error('❌ Payment link creation failed:', error);
        throw new Error(`Failed to create payment link: ${error.message || 'Unknown error'}`);
      }

      if (!paymentLinkData || !paymentLinkData.success) {
        console.error('❌ Invalid payment link response:', paymentLinkData);
        throw new Error('Failed to create payment link - invalid response');
      }

      console.log('✅ Payment link created successfully:', paymentLinkData);
      setPaymentLinkId(paymentLinkData.payment_link_id);

      // Open payment link in new tab
      window.open(paymentLinkData.payment_link_url, '_blank');

      // Start polling for payment completion
      pollPaymentStatus(paymentLinkData.payment_link_id);

      toast({
        title: '🔗 Payment Link Opened!',
        description: 'Complete payment in the new tab. We\'ll automatically detect when it\'s done.',
      });

    } catch (error) {
      console.error('❌ Payment link error:', error);
      setPaymentStatus('failed');
      toast({
        title: 'Payment Link Error', 
        description: error instanceof Error ? error.message : 'Failed to create payment link',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return null;
  }

  // Success state
  if (paymentStatus === 'success') {
    return (
      <div className="w-full space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <ShoppingBag className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-green-800">Payment Successful!</h3>
          <p className="text-sm text-green-600">Your order is confirmed and waiting for dispatch.</p>
        </div>
        <Button onClick={() => navigate('/orders')} className="w-full" variant="outline">
          View My Orders
        </Button>
      </div>
    );
  }

  // Waiting for payment state
  if (paymentStatus === 'waiting') {
    return (
      <div className="w-full space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
          <h3 className="font-semibold text-blue-800">Waiting for Payment</h3>
          <p className="text-sm text-blue-600">Complete payment in the opened tab. We'll detect it automatically.</p>
        </div>
        <Button 
          onClick={() => {
            if (paymentLinkId) {
              pollPaymentStatus(paymentLinkId);
            }
          }} 
          className="w-full" 
          variant="outline"
        >
          Check Payment Status
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleCreateOrder}
      disabled={loading || paymentStatus === 'creating'}
      className="w-full"
      size="lg"
    >
      {paymentStatus === 'creating' || loading ? (
        'Creating Payment Link...'
      ) : (
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          Checkout - Pay ₹{finalTotal.toFixed(2)}
        </div>
      )}
    </Button>
  );
};

export default SimpleOrderButton;
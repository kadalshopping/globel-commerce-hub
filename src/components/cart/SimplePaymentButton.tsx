import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SimplePaymentButton = () => {
  const [loading, setLoading] = useState(false);
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
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
      console.log('🚀 Starting payment with real Razorpay credentials...');
      
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Failed to load payment gateway. Please refresh and try again.');
      }

      // Create order via edge function (uses real keys)
      const { data: orderData, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: cart.total,
          cartItems: cart.items.map(item => ({
            productId: item.id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            maxStock: item.maxStock
          })),
          deliveryAddress: {
            fullName: user.user_metadata?.full_name || 'Customer',
            email: user.email || 'customer@example.com'
          }
        }
      });

      if (error || !orderData) {
        console.error('❌ Order creation failed:', error);
        throw new Error('Failed to create payment order');
      }

      console.log('✅ Order created with real keys:', orderData);

      const options = {
        key: orderData.razorpay_key_id, // Real key from backend
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Shopping Kadal',
        description: `Payment for ${cart.itemCount} items`,
        order_id: orderData.razorpay_order_id,
        handler: function (response: any) {
          console.log('✅ Payment successful, verifying...', response);
          
          // Verify payment via edge function
          supabase.functions.invoke('verify-razorpay-payment', {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            }
          }).then(({ data: verificationResult, error: verifyError }) => {
            if (verifyError || !verificationResult?.success) {
              console.error('❌ Payment verification failed:', verifyError, verificationResult);
              toast({
                title: 'Payment Verification Failed',
                description: 'Payment completed but verification failed. Please contact support.',
                variant: 'destructive',
              });
              return;
            }

            console.log('✅ Payment verified successfully:', verificationResult);
            toast({
              title: '🎉 Payment Successful!',
              description: `Payment completed and verified successfully!`,
            });

            clearCart();
            
            setTimeout(() => {
              navigate('/orders');
            }, 1500);
          });
        },
        prefill: {
          name: user.user_metadata?.full_name || 'Customer',
          email: user.email || 'customer@example.com',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: function () {
            console.log('❌ Payment cancelled by user');
            setLoading(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Error',
        description: error instanceof Error ? error.message : 'Payment failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={loading}
      className="w-full"
      size="lg"
    >
      {loading ? 'Processing...' : `Pay ₹${cart.total.toFixed(2)}`}
    </Button>
  );
};

export default SimplePaymentButton;
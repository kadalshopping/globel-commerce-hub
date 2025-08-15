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

const SecurePaymentButton = () => {
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
      console.log('🚀 Starting secure payment process...');
      
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order using your Razorpay keys
      console.log('📦 Creating secure order...');
      const { data: session } = await supabase.auth.getSession();
      
      const orderResponse = await supabase.functions.invoke('create-order', {
        body: {
          amount: Math.round(cart.total * 100), // Convert to paise
          cart_items: cart.items,
          delivery_address: {
            fullName: user.user_metadata?.full_name || 'Customer',
            email: user.email,
          }
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (orderResponse.error || !orderResponse.data?.success) {
        throw new Error(orderResponse.data?.error || 'Failed to create order');
      }

      const orderData = orderResponse.data.data;
      console.log('✅ Order created:', orderData);

      // Initialize Razorpay payment
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Shopping Kadal',
        description: `Order #${orderData.order_number}`,
        order_id: orderData.razorpay_order_id,
        handler: async function (response: any) {
          console.log('💳 Payment successful, verifying...');
          setLoading(true);
          
          try {
            // Verify payment
            const verifyResponse = await supabase.functions.invoke('verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              headers: {
                Authorization: `Bearer ${session.session?.access_token}`,
              },
            });

            if (verifyResponse.error || !verifyResponse.data?.success) {
              throw new Error('Payment verification failed');
            }

            console.log('✅ Payment verified and order created');
            
            toast({
              title: '🎉 Order Completed!',
              description: `Order #${verifyResponse.data.data.order_number} placed successfully`,
            });

            clearCart();
            setTimeout(() => navigate('/orders'), 1500);
            
          } catch (error) {
            console.error('❌ Verification error:', error);
            toast({
              title: 'Payment Verification Failed',
              description: 'Payment received but order creation failed. Contact support.',
              variant: 'destructive',
            });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user.user_metadata?.full_name || 'Customer',
          email: user.email || '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: function () {
            console.log('❌ Payment cancelled');
            setLoading(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      
    } catch (error) {
      console.error('❌ Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
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
      {loading ? 'Processing...' : `Secure Pay ₹${cart.total.toFixed(2)}`}
    </Button>
  );
};

export default SecurePaymentButton;
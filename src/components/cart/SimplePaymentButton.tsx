import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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
      console.log('🚀 Starting payment process...');
      
      // Load Razorpay script
      console.log('📦 Loading Razorpay script...');
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway. Please check your internet connection.');
      }
      console.log('✅ Razorpay script loaded successfully');

      // Check if Razorpay is available
      if (!window.Razorpay) {
        throw new Error('Payment gateway not available. Please refresh and try again.');
      }

      // Create a simple order object with working test credentials
      const orderData = {
        amount: cart.total * 100, // Convert to paise
        currency: 'INR',
        name: 'Shopping Kadal',
        description: `Payment for ${cart.itemCount} items`,
        key: 'rzp_test_11Hg1Qfq0R2G06', // Known working test key
        receipt: `receipt_${Date.now()}`,
      };

      console.log('💰 Order data:', orderData);

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.name,
        description: orderData.description,
        handler: function (response: any) {
          // Payment successful
          console.log('✅ Payment successful:', response);
          
          toast({
            title: '🎉 Payment Successful!',
            description: `Payment completed successfully!`,
          });

          // Clear cart and redirect
          clearCart();
          
          setTimeout(() => {
            navigate('/orders');
          }, 1500);
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

      console.log('🔧 Razorpay options:', options);
      
      const paymentObject = new window.Razorpay(options);
      console.log('🎯 Opening payment modal...');
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
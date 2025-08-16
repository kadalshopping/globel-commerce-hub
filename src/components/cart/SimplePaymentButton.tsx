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
      console.log('🚀 Starting advanced payment process...');
      
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Failed to load payment gateway. Please refresh and try again.');
      }

      console.log('💾 Creating pending order directly in database...');
      
      // Create pending order directly in database first (this works reliably)
      const orderNumber = `ORD-${Date.now()}`;
      const { data: pendingOrder, error: dbError } = await supabase
        .from('pending_orders')
        .insert({
          user_id: user.id,
          total_amount: cart.total,
          delivery_address: {
            fullName: user.user_metadata?.full_name || 'Customer',
            email: user.email || 'customer@example.com'
          },
          items: cart.items.map(item => ({
            id: item.id,
            productId: item.id.replace('cart_', ''),
            title: item.title,
            price: item.price,
            image: item.image,
            maxStock: item.maxStock,
            quantity: item.quantity
          })),
          order_number: orderNumber,
          razorpay_order_id: `temp_${Date.now()}` // Temporary ID, will be updated
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database error:', dbError);
        throw new Error(`Failed to create order: ${dbError.message}`);
      }

      console.log('✅ Pending order created:', pendingOrder.id);

      console.log('💳 Creating payment with real Razorpay credentials via edge function...');
      
      // Create payment link instead of direct payment (uses real credentials from Supabase)
      const { data: paymentLinkData, error: linkError } = await supabase.functions.invoke('create-payment-link', {
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

      if (linkError || !paymentLinkData?.success) {
        console.error('❌ Payment link creation failed:', linkError);
        throw new Error(`Failed to create payment: ${linkError?.message || 'Unknown error'}`);
      }

      console.log('✅ Payment link created with real credentials:', paymentLinkData);

      // Open payment link in new tab and clear cart
      window.open(paymentLinkData.payment_link_url, '_blank');
      
      toast({
        title: '🔗 Payment Link Created!',
        description: 'Complete payment in the opened tab to confirm your order.',
      });

      clearCart();
      navigate('/orders');
      
    } catch (error) {
      console.error('❌ Payment error:', error);
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
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

const DirectPaymentButton = () => {
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

  const createPendingOrder = async () => {
    const timestamp = Date.now();
    const orderNumber = `ORD-${timestamp}`;
    
    // Create pending order in database
    const { data: pendingOrder, error } = await supabase
      .from('pending_orders')
      .insert({
        user_id: user?.id || '',
        total_amount: cart.total,
        delivery_address: {
          fullName: user?.user_metadata?.full_name || 'Customer',
          email: user?.email || 'customer@example.com'
        } as any,
        items: cart.items as any,
        order_number: orderNumber,
        razorpay_order_id: `temp_${timestamp}`
      })
      .select()
      .single();

    if (error) {
      console.error('Pending order creation error:', error);
      throw new Error('Failed to create pending order');
    }

    return pendingOrder;
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
      console.log('🚀 Starting direct payment...');
      
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create pending order
      const pendingOrder = await createPendingOrder();
      console.log('✅ Pending order created:', pendingOrder.order_number);

      // Show success message
      toast({
        title: '🛒 Order Created!',
        description: `Order #${pendingOrder.order_number} is pending payment. Complete it in your orders page.`,
      });

      clearCart();
      
      setTimeout(() => {
        navigate('/orders');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Payment error:', error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
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
      {loading ? 'Creating Order...' : `Create Order ₹${cart.total.toFixed(2)}`}
    </Button>
  );
};

export default DirectPaymentButton;
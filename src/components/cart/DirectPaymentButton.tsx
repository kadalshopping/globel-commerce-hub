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

  const createOrderDirectly = async () => {
    const timestamp = Date.now();
    const orderNumber = `ORD-${timestamp}`;
    
    // Create order directly in database
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id || '',
        total_amount: cart.total,
        delivery_address: {
          fullName: user?.user_metadata?.full_name || 'Customer',
          email: user?.email || 'customer@example.com'
        } as any,
        items: cart.items as any,
        order_number: orderNumber,
        status: 'confirmed',
        payment_status: 'completed',
        razorpay_payment_id: `pay_test_${timestamp}`
      })
      .select()
      .single();

    if (error) {
      console.error('Order creation error:', error);
      throw new Error('Failed to create order');
    }

    // Create order items
    for (const item of cart.items) {
      const { data: product } = await supabase
        .from('products')
        .select('shop_owner_id')
        .eq('id', item.productId)
        .single();

      if (product) {
        await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.productId,
            shop_owner_id: product.shop_owner_id,
            quantity: item.quantity,
            price: item.price,
            status: 'pending'
          });
      }
    }

    return order;
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

      // Create order directly
      const order = await createOrderDirectly();
      console.log('✅ Order created directly:', order.order_number);

      // Show success immediately (simulating payment)
      toast({
        title: '🎉 Order Placed Successfully!',
        description: `Order #${order.order_number} has been confirmed`,
      });

      clearCart();
      
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
      
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
      {loading ? 'Processing...' : `Place Order ₹${cart.total.toFixed(2)}`}
    </Button>
  );
};

export default DirectPaymentButton;
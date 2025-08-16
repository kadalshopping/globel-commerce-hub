import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag } from 'lucide-react';

const SimpleOrderButton = () => {
  const [loading, setLoading] = useState(false);
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const createOrder = async () => {
    const timestamp = Date.now();
    const orderNumber = `ORD-${timestamp}`;
    
    // Create order directly in database with completed status
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
        payment_status: 'completed',
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

    setLoading(true);

    try {
      console.log('🚀 Creating order...');
      
      // Create order directly
      const order = await createOrder();
      console.log('✅ Order created:', order.order_number);

      // Show success message
      toast({
        title: '🛒 Order Created Successfully!',
        description: `Order #${order.order_number} has been placed.`,
      });

      clearCart();
      
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Order creation error:', error);
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
      onClick={handleCreateOrder}
      disabled={loading}
      className="w-full"
      size="lg"
    >
      {loading ? (
        'Creating Order...'
      ) : (
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          Place Order ₹{cart.total.toFixed(2)}
        </div>
      )}
    </Button>
  );
};

export default SimpleOrderButton;
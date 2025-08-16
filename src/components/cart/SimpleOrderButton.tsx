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

      // Show success message and open payment link
      toast({
        title: '🔗 Payment Link Created!',
        description: 'Opening payment page in new tab...',
      });

      // Open payment link in new tab
      window.open(paymentLinkData.payment_link_url, '_blank');

      // Clear cart and navigate to payment success tracking
      clearCart();
      
      setTimeout(() => {
        navigate('/orders');
        toast({
          title: '📱 Complete Payment',
          description: 'Please complete payment in the opened tab, then refresh this page to see your order.',
        });
      }, 1000);

    } catch (error) {
      console.error('❌ Payment link error:', error);
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

  return (
    <Button
      onClick={handleCreateOrder}
      disabled={loading}
      className="w-full"
      size="lg"
    >
      {loading ? (
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
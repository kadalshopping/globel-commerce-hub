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

      // Use test Razorpay credentials for now (will be replaced with real credentials)
      const testRazorpayKeyId = 'rzp_test_11Hg7Vgf6ifHBE';
      
      const razorpayOptions = {
        key: testRazorpayKeyId,
        amount: Math.round(cart.total * 100), // Convert to paise
        currency: 'INR',
        name: 'Shopping Kadal',
        description: `Payment for ${cart.itemCount} items`,
        order_id: undefined, // Will create order directly with Razorpay
        handler: async function (response: any) {
          console.log('✅ Payment successful, processing...', response);
          
          try {
            // Create confirmed order with payment details
            const confirmedOrderNumber = response.razorpay_payment_id || `pay_completed_${Date.now()}`;
            
            const { data: confirmedOrder, error: orderError } = await supabase
              .from('orders')
              .insert({
                user_id: user.id,
                order_number: confirmedOrderNumber,
                total_amount: cart.total,
                status: 'confirmed',
                payment_status: 'completed',
                payment_id: null,
                razorpay_order_id: response.razorpay_order_id || null,
                razorpay_payment_id: response.razorpay_payment_id || confirmedOrderNumber,
                delivery_address: pendingOrder.delivery_address,
                items: pendingOrder.items
              })
              .select()
              .single();

            if (orderError) {
              console.error('❌ Order creation error:', orderError);
              throw new Error('Failed to create confirmed order');
            }

            console.log('✅ Confirmed order created:', confirmedOrder.id);

            // Create order items and update stock
            const items = pendingOrder.items as any[];
            for (const item of items) {
              try {
                // Get product details
                const { data: product } = await supabase
                  .from('products')
                  .select('shop_owner_id')
                  .eq('id', item.productId)
                  .single();

                if (product) {
                  // Create order item
                  await supabase
                    .from('order_items')
                    .insert({
                      order_id: confirmedOrder.id,
                      product_id: item.productId,
                      shop_owner_id: product.shop_owner_id,
                      quantity: item.quantity,
                      price: item.price,
                      status: 'pending'
                    });

                  // Update stock
                  await supabase.rpc('decrease_product_stock', {
                    product_id_param: item.productId,
                    quantity_param: item.quantity
                  });

                  console.log(`✅ Processed item: ${item.productId}`);
                }
              } catch (itemError) {
                console.error(`❌ Error processing item ${item.productId}:`, itemError);
              }
            }

            // Delete pending order
            await supabase
              .from('pending_orders')
              .delete()
              .eq('id', pendingOrder.id);

            console.log('✅ Payment processing completed successfully');

            toast({
              title: '🎉 Payment Successful!',
              description: `Order confirmed! Order number: ${confirmedOrderNumber}`,
            });

            clearCart();
            
            setTimeout(() => {
              navigate('/orders');
            }, 1500);

          } catch (processingError) {
            console.error('❌ Payment processing error:', processingError);
            toast({
              title: 'Payment Processing Error',
              description: 'Payment completed but order processing failed. Please contact support.',
              variant: 'destructive',
            });
          }
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

      const paymentObject = new window.Razorpay(razorpayOptions);
      paymentObject.open();
      
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
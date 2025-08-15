import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddressForm, Address } from '@/components/forms/AddressForm';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentButton = () => {
  const [loading, setLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<Address | null>(null);
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const existingScript = document.getElementById('razorpay-script');
      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handleAddressSubmit = (address: Address) => {
    setDeliveryAddress(address);
    setShowAddressForm(false);
    handlePayment(address);
  };

  const handlePayment = async (address?: Address) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to proceed with payment.',
        variant: 'destructive',
      });
      return;
    }

    if (cart.items.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to your cart before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    if (!address && !deliveryAddress) {
      setShowAddressForm(true);
      return;
    }

    const finalAddress = address || deliveryAddress;

    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

      // Create order on backend
      console.log('Creating Razorpay order with cart total:', cart.total);
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: Math.round(cart.total * 100), // Convert to paise
          currency: 'INR',
          receipt: `order_${Date.now()}`,
          cart_items: cart.items,
          delivery_address: finalAddress,
        },
      });

      console.log('Razorpay order response:', { orderData, orderError });

      if (orderError) {
        console.error('Razorpay order error details:', orderError);
        console.error('Full error object:', JSON.stringify(orderError, null, 2));
        
        // Check if it's a function invocation error
        if (orderError.message?.includes('FunctionsHttpError') || orderError.message?.includes('FunctionsRelayError')) {
          throw new Error(`Payment service unavailable. Please try again later. Error: ${orderError.message}`);
        }
        
        throw new Error(`Order creation failed: ${orderError.message || 'Unknown error'}`);
      }

      if (!orderData) {
        throw new Error('No order data received from server');
      }

      // Razorpay payment options
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Your Store',
        description: 'Product Purchase',
        order_id: orderData.id,
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            console.log('=== PAYMENT SUCCESS HANDLER START ===');
            console.log('Razorpay response:', response);
            console.log('Order data:', orderData);
            
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            console.log('Payment verification response:', { verifyData, verifyError });

            if (verifyError) {
              console.error('Payment verification error details:', verifyError);
              toast({
                title: 'Payment Verification Failed',
                description: `${verifyError.message || 'Please contact support if amount was debited.'}`,
                variant: 'destructive',
              });
              return;
            }

            if (!verifyData?.success) {
              console.error('Payment verification failed:', verifyData);
              toast({
                title: 'Payment Verification Failed',
                description: verifyData?.error || 'Please contact support if amount was debited.',
                variant: 'destructive',
              });
              return;
            }

            // Clear cart and show success message
            clearCart();
            toast({
              title: 'Payment Successful',
              description: 'Your order has been placed successfully!',
            });
            
            // Optionally redirect to orders page
            setTimeout(() => {
              window.location.href = '/orders';
            }, 2000);
            
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: 'Payment Verification Failed',
              description: 'Please contact support if amount was debited.',
              variant: 'destructive',
            });
          }
        },
        prefill: {
          name: user.user_metadata?.full_name || '',
          email: user.email || '',
        },
        theme: {
          color: 'hsl(var(--primary))',
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed by user');
            toast({
              title: 'Payment Cancelled',
              description: 'You can retry the payment anytime.',
            });
          },
        },
        error: {
          handler: (error: any) => {
            console.error('Razorpay payment error:', error);
            toast({
              title: 'Payment Failed',
              description: error.description || 'Payment failed. Please try again.',
              variant: 'destructive',
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'An error occurred during payment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => handlePayment()} 
        disabled={loading || cart.items.length === 0}
        className="w-full"
        size="lg"
      >
        {loading ? 'Processing...' : `Pay ₹${cart.total.toFixed(2)}`}
      </Button>

      <Dialog open={showAddressForm} onOpenChange={setShowAddressForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enter Delivery Address</DialogTitle>
          </DialogHeader>
          <AddressForm
            onSubmit={handleAddressSubmit}
            onCancel={() => setShowAddressForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
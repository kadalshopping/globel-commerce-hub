import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [savedAddresses, setSavedAddresses] = useState<(Address & { id?: string })[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<(Address & { id?: string }) | null>(null);
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  // Load saved addresses on component mount
  useEffect(() => {
    if (user) {
      loadSavedAddresses();
    }
  }, [user]);

  const loadSavedAddresses = async () => {
    try {
      const { data: addresses, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (addresses && addresses.length > 0) {
        const formattedAddresses = addresses.map(addr => ({
          fullName: addr.name,
          phone: addr.phone,
          address: addr.address,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          id: addr.id
        }));
        setSavedAddresses(formattedAddresses);
        
        // Auto-select default address or first address
        const defaultAddress = formattedAddresses.find(addr => 
          addresses.find(a => a.id === addr.id)?.is_default
        ) || formattedAddresses[0];
        
        setSelectedAddress(defaultAddress);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  const saveAddress = async (address: Address) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('delivery_addresses')
        .insert({
          user_id: user.id,
          name: address.fullName,
          phone: address.phone,
          address: address.address,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          is_default: savedAddresses.length === 0, // First address is default
        });

      if (error) throw error;
      
      // Reload addresses
      await loadSavedAddresses();
      
      toast({
        title: 'Address Saved',
        description: 'Your delivery address has been saved for future orders.',
      });
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: 'Error',
        description: 'Failed to save address. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const existingScript = document.getElementById('razorpay-script');
      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleAddressSubmit = async (address: Address) => {
    // Save the address to database
    await saveAddress(address);
    
    // Set as selected address
    setSelectedAddress(address);
    setShowAddressForm(false);
    
    // Continue with payment
    await processPayment(address);
  };

  const processPayment = async (deliveryAddress?: Address) => {
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

    const finalAddress = deliveryAddress || selectedAddress;
    if (!finalAddress) {
      setShowAddressForm(true);
      return;
    }

    setLoading(true);

    try {
      console.log('=== STARTING PAYMENT PROCESS ===');
      console.log('Cart total:', cart.total);
      console.log('Delivery address:', finalAddress);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment gateway');
      }

      // Create order on backend
      console.log('Creating Razorpay order...');
      const orderResponse = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: Math.round(cart.total * 100), // Convert to paise
          currency: 'INR',
          cart_items: cart.items,
          delivery_address: finalAddress,
        },
      });

      console.log('Order creation response:', orderResponse);

      if (orderResponse.error) {
        throw new Error(orderResponse.error.message || 'Failed to create payment order');
      }

      if (!orderResponse.data?.success || !orderResponse.data?.data) {
        throw new Error('No order data received from server');
      }

      const orderData = orderResponse.data.data; // Extract the nested data

      console.log('Opening Razorpay checkout with data:', {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
      });

      // Configure Razorpay options
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Your Store',
        description: `Order for ${cart.items.length} item(s)`,
        order_id: orderData.id,
        handler: async (response: any) => {
          console.log('=== PAYMENT SUCCESSFUL ===');
          console.log('Razorpay response:', response);
          
          await handlePaymentSuccess(response, orderData);
        },
        prefill: {
          name: finalAddress.fullName,
          email: user.email || '',
          contact: finalAddress.phone,
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            console.log('Payment cancelled by user');
            toast({
              title: 'Payment Cancelled',
              description: 'You can retry the payment anytime.',
            });
            setLoading(false);
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
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment initialization error:', error);
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Failed to initialize payment.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (razorpayResponse: any, orderData: any) => {
    try {
      console.log('=== VERIFYING PAYMENT ===');
      
      // Show verification progress
      toast({
        title: 'Payment Received',
        description: 'Verifying payment and creating order...',
      });

      // Verify payment with backend
      const verificationResponse = await supabase.functions.invoke('verify-razorpay-payment', {
        body: {
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
        },
      });

      console.log('Verification response:', verificationResponse);

      if (verificationResponse.error) {
        throw new Error(verificationResponse.error.message || 'Payment verification failed');
      }

      if (!verificationResponse.data?.success) {
        throw new Error(verificationResponse.data?.error || 'Payment verification failed');
      }

      console.log('=== PAYMENT VERIFIED SUCCESSFULLY ===');

      // Clear cart
      clearCart();

      // Show success message
      toast({
        title: 'Order Placed Successfully! 🎉',
        description: 'Your payment has been processed and order has been created.',
      });

      // Redirect to orders page
      setTimeout(() => {
        window.location.href = '/orders';
      }, 2000);

    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: 'Payment Verification Failed',
        description: `${error instanceof Error ? error.message : 'Unknown error'}. Please contact support if amount was debited.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (selectedAddress) {
      processPayment(selectedAddress);
    } else {
      setShowAddressForm(true);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Address Selection */}
        {selectedAddress && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{selectedAddress.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAddress.address}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                </p>
                <p className="text-sm text-muted-foreground">{selectedAddress.phone}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddressForm(true)}
              >
                Change
              </Button>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={loading || cart.items.length === 0}
          className="w-full"
          size="lg"
        >
          {loading ? 'Processing Payment...' : `Pay ₹${cart.total.toFixed(2)}`}
        </Button>
      </div>

      {/* Address Form Dialog */}
      <Dialog open={showAddressForm} onOpenChange={setShowAddressForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {savedAddresses.length > 0 ? 'Select or Add Delivery Address' : 'Enter Delivery Address'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Saved Addresses */}
            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Saved Addresses</h4>
                {savedAddresses.map((address, index) => (
                  <div
                    key={address.id || index}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => {
                      setSelectedAddress(address);
                      setShowAddressForm(false);
                      processPayment(address);
                    }}
                  >
                    <p className="font-medium">{address.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {address.address}, {address.city}, {address.state} - {address.pincode}
                    </p>
                    <p className="text-sm text-muted-foreground">{address.phone}</p>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Or Add New Address</h4>
                </div>
              </div>
            )}

            {/* Address Form */}
            <AddressForm
              onSubmit={handleAddressSubmit}
              onCancel={() => setShowAddressForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
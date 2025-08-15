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

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface OrderData {
  id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  order_id: string;
  order_number: string;
}

export const PaymentButton = () => {
  const [loading, setLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<(Address & { id?: string })[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<(Address & { id?: string }) | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'verifying' | 'success' | 'failed'>('idle');
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
          is_default: savedAddresses.length === 0,
        });

      if (error) throw error;
      
      await loadSavedAddresses();
      
      toast({
        title: 'Address Saved',
        description: 'Your delivery address has been saved.',
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

  const createRazorpayOrder = async (deliveryAddress: Address): Promise<OrderData> => {
    console.log('🚀 Creating Razorpay order...');
    
    const orderResponse = await supabase.functions.invoke('create-razorpay-order', {
      body: {
        amount: Math.round(cart.total * 100),
        currency: 'INR',
        cart_items: cart.items,
        delivery_address: deliveryAddress,
      },
    });

    console.log('📦 Order response:', orderResponse);

    if (orderResponse.error) {
      throw new Error(orderResponse.error.message || 'Failed to create payment order');
    }

    if (!orderResponse.data?.success || !orderResponse.data?.data) {
      throw new Error('Invalid order response from server');
    }

    return orderResponse.data.data;
  };

  const verifyPayment = async (razorpayResponse: RazorpayResponse): Promise<boolean> => {
    console.log('🔍 Verifying payment...');
    
    const verificationResponse = await supabase.functions.invoke('verify-razorpay-payment', {
      body: {
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
      },
    });

    console.log('✅ Verification response:', verificationResponse);

    if (verificationResponse.error) {
      throw new Error(verificationResponse.error.message || 'Payment verification failed');
    }

    if (!verificationResponse.data?.success) {
      throw new Error(verificationResponse.data?.error || 'Payment verification failed');
    }

    return true;
  };

  const handlePaymentSuccess = async (razorpayResponse: RazorpayResponse) => {
    try {
      setPaymentStatus('verifying');
      
      toast({
        title: '💳 Payment Received!',
        description: 'Verifying payment and confirming order...',
      });

      await verifyPayment(razorpayResponse);
      
      setPaymentStatus('success');
      
      toast({
        title: '🎉 Order Confirmed!',
        description: 'Your payment has been processed successfully.',
      });

      clearCart();
      
      setTimeout(() => {
        window.location.href = '/orders';
      }, 2000);

    } catch (error) {
      setPaymentStatus('failed');
      console.error('❌ Payment verification failed:', error);
      
      toast({
        title: 'Payment Verification Failed',
        description: `${error instanceof Error ? error.message : 'Unknown error'}. Please contact support if amount was debited.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (error: any) => {
    setPaymentStatus('failed');
    setLoading(false);
    
    console.error('❌ Razorpay payment error:', error);
    
    toast({
      title: 'Payment Failed',
      description: error.description || 'Payment failed. Please try again.',
      variant: 'destructive',
    });
  };

  const handlePaymentDismiss = () => {
    setPaymentStatus('idle');
    setLoading(false);
    
    toast({
      title: 'Payment Cancelled',
      description: 'You can retry the payment anytime.',
    });
  };

  const initiatePayment = async (deliveryAddress: Address) => {
    if (!user || cart.items.length === 0) {
      toast({
        title: 'Error',
        description: 'Please ensure you are logged in and have items in cart.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setPaymentStatus('processing');

    try {
      console.log('🔄 Starting payment process...');

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create order
      const orderData = await createRazorpayOrder(deliveryAddress);
      
      console.log('🎯 Opening Razorpay checkout...');

      // Configure Razorpay
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Your Store',
        description: `Order ${orderData.order_number}`,
        order_id: orderData.id,
        handler: handlePaymentSuccess,
        prefill: {
          name: deliveryAddress.fullName,
          email: user.email || '',
          contact: deliveryAddress.phone,
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          confirm_close: true,
          ondismiss: handlePaymentDismiss,
        },
        error: {
          handler: handlePaymentError,
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        timeout: 300, // 5 minutes
        remember_customer: true,
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      setPaymentStatus('failed');
      setLoading(false);
      
      console.error('❌ Payment initialization error:', error);
      
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Failed to initialize payment.',
        variant: 'destructive',
      });
    }
  };

  const handleAddressSubmit = async (address: Address) => {
    await saveAddress(address);
    setSelectedAddress(address);
    setShowAddressForm(false);
    await initiatePayment(address);
  };

  const handlePayment = () => {
    if (selectedAddress) {
      initiatePayment(selectedAddress);
    } else {
      setShowAddressForm(true);
    }
  };

  const getButtonText = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'Processing Payment...';
      case 'verifying':
        return 'Verifying Payment...';
      case 'success':
        return 'Payment Successful!';
      case 'failed':
        return 'Payment Failed - Retry?';
      default:
        return `Pay ₹${cart.total.toFixed(2)}`;
    }
  };

  const getButtonVariant = () => {
    switch (paymentStatus) {
      case 'success':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
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
                disabled={loading}
              >
                Change
              </Button>
            </div>
          </div>
        )}

        {/* Payment Status */}
        {paymentStatus !== 'idle' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Status: {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
            </p>
          </div>
        )}

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={loading || cart.items.length === 0}
          className="w-full"
          size="lg"
          variant={getButtonVariant()}
        >
          {getButtonText()}
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
                      initiatePayment(address);
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
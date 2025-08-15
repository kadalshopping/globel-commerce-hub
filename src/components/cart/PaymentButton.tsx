import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddressForm } from '@/components/forms/AddressForm';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useDeliveryAddresses } from '@/hooks/useDeliveryAddresses';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface OrderData {
  id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  order_id: string;
  order_number: string;
}

interface Address {
  id?: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

type PaymentStatus = 'idle' | 'processing' | 'verifying' | 'success' | 'failed';

export const PaymentButton = () => {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { data: addresses = [] } = useDeliveryAddresses();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load saved addresses
  useEffect(() => {
    const mappedAddresses: Address[] = addresses.map(addr => ({
      id: addr.id,
      fullName: addr.name,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    }));
    
    setSavedAddresses(mappedAddresses);
    if (mappedAddresses.length > 0 && !selectedAddress) {
      const defaultAddress = mappedAddresses.find(addr => addresses.find(a => a.id === addr.id)?.is_default) || mappedAddresses[0];
      setSelectedAddress(defaultAddress);
    }
  }, [addresses, selectedAddress]);

  // Load Razorpay script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Create payment link
  const createPaymentLink = async (deliveryAddress: Address): Promise<OrderData> => {
    console.log('🚀 Creating payment link...');
    
    const orderData = {
      amount: cart.total * 100, // Convert to paise
      currency: 'INR',
      cart_items: cart.items,
      delivery_address: deliveryAddress,
    };

    console.log('📦 Payment link request data:', orderData);

    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      throw new Error('Please log in to continue');
    }

    const response = await supabase.functions.invoke('create-razorpay-payment-link', {
      body: orderData,
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    console.log('📦 Payment link response:', response);

    if (response.error) {
      console.error('❌ Payment link creation error:', response.error);
      throw new Error(response.error.message || 'Failed to create payment link');
    }

    if (!response.data?.success) {
      console.error('❌ Payment link creation failed:', response.data);
      throw new Error(response.data?.error || 'Failed to create payment link');
    }

    console.log('✅ Payment link created successfully:', response.data.data);
    return response.data.data;
  };

  // Verify payment and create order
  const verifyAndCreateOrder = async (razorpayResponse: RazorpayResponse): Promise<any> => {
    console.log('🔍 Verifying payment and creating order...');
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      throw new Error('Authentication session expired');
    }

    const response = await supabase.functions.invoke('verify-and-create-order', {
      body: {
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
      },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    console.log('✅ Verification and order creation response:', response);

    if (response.error) {
      console.error('❌ Verification and order creation error:', response.error);
      throw new Error('Payment verification and order creation failed. Please contact support.');
    }

    if (!response.data?.success) {
      console.error('❌ Verification and order creation failed:', response.data);
      throw new Error(response.data?.error || 'Payment verification and order creation failed');
    }

    return response.data;
  };

  // Handle payment success
  const handlePaymentSuccess = async (razorpayResponse: RazorpayResponse) => {
    try {
      console.log('✅ Payment success callback triggered with response:', razorpayResponse);
      setPaymentStatus('verifying');
      
      toast({
        title: '💳 Payment Received!',
        description: 'Verifying payment and confirming order...',
      });

      console.log('🔍 Starting payment verification and order creation...');
      const verificationResult = await verifyAndCreateOrder(razorpayResponse);
      console.log('✅ Payment verified and order created:', verificationResult);
      
      setPaymentStatus('success');
      clearCart();
      
      toast({
        title: '🎉 Order Confirmed!',
        description: 'Your order has been placed successfully.',
      });

      setTimeout(() => navigate('/orders'), 1500);
    } catch (error) {
      console.error('❌ Payment verification failed:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      setPaymentStatus('failed');
      
      // Show more specific error messages
      let errorMessage = 'Payment verification failed. Please contact support if money was deducted.';
      if (error instanceof Error) {
        if (error.message.includes('signature verification failed')) {
          errorMessage = 'Payment could not be verified. If money was deducted, it will be refunded within 7 days.';
        } else if (error.message.includes('not configured')) {
          errorMessage = 'Payment service configuration error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: '❌ Payment Processing Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Handle payment error
  const handlePaymentError = (error: any) => {
    console.error('💥 Payment error:', error);
    setPaymentStatus('failed');
    setLoading(false);
    
    toast({
      title: '❌ Payment Failed',
      description: error.description || 'Payment was not completed. Please try again.',
      variant: 'destructive',
    });
  };

  // Initiate payment
  const initiatePayment = async (deliveryAddress: Address) => {
    try {
      setLoading(true);
      setPaymentStatus('processing');
      
      console.log('🔄 Starting payment process...');

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway. Please refresh and try again.');
      }

      // Create payment link
      const orderData = await createPaymentLink(deliveryAddress);

      // Configure Razorpay options
      const options = {
        key: orderData.razorpay_key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Your Store',
        description: `Order ${orderData.order_number}`,
        order_id: orderData.razorpay_order_id,
        handler: (response: RazorpayResponse) => {
          console.log('🔥 Razorpay handler called:', response);
          handlePaymentSuccess(response);
        },
        prefill: {
          name: deliveryAddress.fullName,
          email: user?.email || '',
          contact: deliveryAddress.phone,
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            console.log('👋 Payment modal dismissed');
            setPaymentStatus('idle');
            setLoading(false);
          },
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        timeout: 300,
        remember_customer: true,
      };

      console.log('🚀 Opening Razorpay checkout...');
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', (response: any) => {
        console.log('💥 Payment failed event:', response);
        handlePaymentError(response.error);
      });
      
      razorpay.open();

    } catch (error) {
      console.error('❌ Payment initialization error:', error);
      setPaymentStatus('failed');
      setLoading(false);
      
      toast({
        title: '❌ Payment Failed',
        description: error instanceof Error ? error.message : 'Failed to initialize payment',
        variant: 'destructive',
      });
    }
  };

  // Save address
  const saveAddress = async (address: Address) => {
    try {
      const { error } = await supabase
        .from('delivery_addresses')
        .insert({
          user_id: user?.id,
          name: address.fullName,
          phone: address.phone,
          address: address.address,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          is_default: savedAddresses.length === 0,
        });

      if (error) throw error;

      toast({
        title: '✅ Address Saved',
        description: 'Your delivery address has been saved.',
      });
    } catch (error) {
      console.error('❌ Error saving address:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to save address. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle address form submission
  const handleAddressSubmit = async (address: Address) => {
    await saveAddress(address);
    setSelectedAddress(address);
    setShowAddressDialog(false);
    await initiatePayment(address);
  };

  // Handle payment button click
  const handlePayment = () => {
    if (!user) {
      toast({
        title: '❌ Authentication Required',
        description: 'Please log in to place an order.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (cart.items.length === 0) {
      toast({
        title: '❌ Empty Cart',
        description: 'Please add items to your cart before checkout.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedAddress) {
      initiatePayment(selectedAddress);
    } else {
      setShowAddressDialog(true);
    }
  };

  // Get button text based on status
  const getButtonText = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'Creating Order...';
      case 'verifying':
        return 'Verifying Payment...';
      case 'success':
        return 'Order Confirmed!';
      case 'failed':
        return 'Try Again';
      default:
        return `Pay ₹${cart.total.toFixed(2)}`;
    }
  };

  // Get button variant based on status
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
    <div className="space-y-4">
      {/* Selected Address Display */}
      {selectedAddress && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{selectedAddress.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAddress.address}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedAddress.phone}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddressDialog(true)}
                disabled={loading}
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={loading || paymentStatus === 'verifying' || paymentStatus === 'success'}
        className="w-full"
        variant={getButtonVariant()}
        size="lg"
      >
        {loading || paymentStatus === 'processing' || paymentStatus === 'verifying' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {getButtonText()}
      </Button>

      {/* Address Selection Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Delivery Address</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Saved Addresses */}
            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Saved Addresses</h3>
                {savedAddresses.map((address) => (
                  <Card
                    key={address.id}
                    className={`cursor-pointer transition-colors ${
                      selectedAddress?.id === address.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedAddress(address);
                      setShowAddressDialog(false);
                      initiatePayment(address);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <p className="font-medium">{address.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            {address.address}, {address.city}, {address.state} - {address.pincode}
                          </p>
                          <p className="text-sm text-muted-foreground">{address.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add New Address Form */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">Add New Address</h3>
              <AddressForm
                onSubmit={handleAddressSubmit}
                onCancel={() => setShowAddressDialog(false)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
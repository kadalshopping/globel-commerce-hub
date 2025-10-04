import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddressForm } from "@/components/forms/AddressForm";
import { useDeliveryAddresses } from "@/hooks/useDeliveryAddresses";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingBag, 
  CreditCard, 
  Banknote, 
  MapPin, 
  Plus, 
  ArrowLeft,
  Truck,
  Shield,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";
import { calculatePriceBreakdown } from "@/utils/priceCalculations";
import { SEOHead } from "@/components/seo/SEOHead";

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutProduct {
  id: string;
  title: string;
  selling_price: number;
  stock_quantity?: number;
  image?: string;
  shop_owner_id?: string;
  selectedSize?: string;
}

interface Address {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { data: addresses = [] } = useDeliveryAddresses();
  
  const [product, setProduct] = useState<CheckoutProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCodPrompt, setShowCodPrompt] = useState(false);

  // Get product data from URL params
  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent('/checkout' + window.location.search));
      return;
    }

    const productId = searchParams.get('product');
    const productTitle = searchParams.get('title');
    const productPrice = searchParams.get('price');
    const productImage = searchParams.get('image');
    const productQuantity = searchParams.get('quantity');
    const stockQuantity = searchParams.get('stock');
    const shopOwnerId = searchParams.get('shop_owner');
    const selectedSize = searchParams.get('size');

    if (!productId || !productTitle || !productPrice) {
      toast({
        title: "Invalid Checkout",
        description: "Product information is missing. Please try again.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    setProduct({
      id: productId,
      title: productTitle,
      selling_price: parseFloat(productPrice),
      stock_quantity: stockQuantity ? parseInt(stockQuantity) : undefined,
      image: productImage || undefined,
      shop_owner_id: shopOwnerId || undefined,
      selectedSize: selectedSize || undefined,
    });

    setQuantity(productQuantity ? parseInt(productQuantity) : 1);
  }, [user, searchParams, navigate, toast]);

  // Auto-select first address if available
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      setSelectedAddress(addresses[0]);
    }
  }, [addresses, selectedAddress]);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const priceBreakdown = calculatePriceBreakdown(product.selling_price * quantity);

  const handleAddressSubmit = async (addressData: any) => {
    try {
      // Map the form data to match the database schema
      const dbAddressData = {
        name: addressData.fullName, // Map fullName from form to name in database
        address: addressData.address,
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
        phone: addressData.phone,
        user_id: user?.id
      };

      const { data, error } = await supabase
        .from('delivery_addresses')
        .insert([dbAddressData])
        .select()
        .single();

      if (error) throw error;

      const newAddress: Address = {
        id: data.id,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone,
      };

      setSelectedAddress(newAddress);
      setShowAddressForm(false);
      toast({
        title: "Address Saved",
        description: "Your delivery address has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Error",
        description: "Failed to save address. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast({
        title: "Address Required",
        description: "Please select or add a delivery address.",
        variant: "destructive",
      });
      return;
    }

    // Show prompt for COD orders to encourage online payment
    if (paymentMethod === 'cod') {
      setShowCodPrompt(true);
      return;
    }

    await processOrder();
  };

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

  const processOrder = async () => {
    setIsProcessing(true);

    try {
      const orderData = {
        user_id: user?.id,
        total_amount: priceBreakdown.total,
        delivery_address: selectedAddress as any,
        price_breakdown: priceBreakdown as any,
        status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
        payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
        order_number: `ORD-${Date.now()}`,
        items: [{
          product_id: product.id,
          title: product.title,
          price: product.selling_price,
          quantity: quantity,
          image: product.image,
        }] as any,
      };

      if (paymentMethod === 'cod') {
        // Validate shop owner ID exists
        if (!product.shop_owner_id) {
          throw new Error('Product shop owner information is missing');
        }

        // Create order directly for COD
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([orderData])
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert([{
            order_id: order.id,
            product_id: product.id,
            quantity: quantity,
            price: product.selling_price,
            shop_owner_id: product.shop_owner_id,
            status: 'waiting_for_dispatch',
          }]);

        if (itemsError) throw itemsError;

        // Decrease stock
        const { error: stockError } = await supabase
          .rpc('decrease_product_stock', {
            product_id_param: product.id,
            quantity_param: quantity,
          });

        if (stockError) throw stockError;

        toast({
          title: "COD Order Placed!",
          description: `Your order ${order.order_number} has been placed with Cash on Delivery. Processing may take longer.`,
        });

        navigate('/orders');
      } else {
        // Handle online payment with Razorpay modal
        await handleRazorpayPayment(orderData);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Order Failed",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRazorpayPayment = async (orderData: any) => {
    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway. Please refresh and try again.');
      }

      // Create Razorpay order
      const { data: razorpayData, error: razorpayError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: priceBreakdown.total,
          cartItems: orderData.items,
          deliveryAddress: selectedAddress,
        },
      });

      if (razorpayError || !razorpayData?.success) {
        throw new Error(razorpayError?.message || 'Failed to create payment order');
      }

      const { razorpay_order_id, amount, currency, razorpay_key_id } = razorpayData;

      // Configure Razorpay options
      const options = {
        key: razorpay_key_id,
        amount: amount,
        currency: currency,
        name: 'Your Store',
        description: `Order ${orderData.order_number}`,
        order_id: razorpay_order_id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error('Payment verification failed');
            }

            toast({
              title: "Payment Successful!",
              description: `Your order has been placed successfully.`,
            });

            navigate('/orders');
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support if money was deducted.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: selectedAddress?.name || user?.user_metadata?.full_name || '',
          email: user?.email || '',
          contact: selectedAddress?.phone || '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      
      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        toast({
          title: "Payment Failed",
          description: response.error.description || 'Payment was not completed',
          variant: "destructive",
        });
        setIsProcessing(false);
      });
      
      razorpay.open();

    } catch (error) {
      console.error('Payment initialization error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : 'Failed to initialize payment',
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleContinueWithCod = async () => {
    setShowCodPrompt(false);
    await processOrder();
  };

  const handleSwitchToOnline = () => {
    setShowCodPrompt(false);
    setPaymentMethod('online');
  };

  return (
    <>
      <SEOHead
        title={`Checkout - ${product.title}`}
        description="Complete your purchase with secure checkout. Cash on delivery available."
        ogType="website"
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Shopping
            </Button>
            <h1 className="text-2xl font-bold">Checkout</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Address */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Address
                  </h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAddressForm(!showAddressForm)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                  </Button>
                </div>

                {showAddressForm ? (
                  <AddressForm
                    onSubmit={handleAddressSubmit}
                    onCancel={() => setShowAddressForm(false)}
                  />
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedAddress?.id === address.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                        }`}
                        onClick={() => setSelectedAddress(address)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-4 h-4 rounded-full border-2 ${
                            selectedAddress?.id === address.id ? 'bg-primary border-primary' : 'border-muted-foreground'
                          }`} />
                          <div className="flex-1">
                            <p className="font-medium">{address.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {address.address}, {address.city}, {address.state} - {address.pincode}
                            </p>
                            <p className="text-sm text-muted-foreground">Phone: {address.phone}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {addresses.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        No addresses found. Please add a delivery address to continue.
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {/* Payment Method */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </h2>
                
                <RadioGroup value={paymentMethod} onValueChange={(value: "cod" | "online") => setPaymentMethod(value)}>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="cod" id="cod" />
                      <label htmlFor="cod" className="flex items-center gap-3 cursor-pointer flex-1">
                        <Banknote className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Cash on Delivery</p>
                          <p className="text-sm text-muted-foreground">Pay when you receive the item</p>
                        </div>
                      </label>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="online" id="online" />
                      <label htmlFor="online" className="flex items-center gap-3 cursor-pointer flex-1">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Online Payment</p>
                          <p className="text-sm text-muted-foreground">Pay now with UPI, Card, or Net Banking</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </RadioGroup>
              </Card>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Truck className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Free Delivery</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Secure Payment</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Easy Returns</span>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-8">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                
                {/* Product */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-2">{product.title}</p>
                    <p className="text-sm text-muted-foreground">Qty: {quantity}</p>
                    <p className="text-sm font-semibold">₹{product.selling_price.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal ({quantity} item{quantity > 1 ? 's' : ''})</span>
                    <span>₹{priceBreakdown.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    <span className={priceBreakdown.deliveryCharge > 0 ? '' : 'text-green-600'}>
                      {priceBreakdown.deliveryCharge > 0 ? `₹${priceBreakdown.deliveryCharge.toFixed(2)}` : 'FREE'}
                    </span>
                  </div>
                  {priceBreakdown.couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon Discount</span>
                      <span>-₹{priceBreakdown.couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>₹{priceBreakdown.total.toFixed(2)}</span>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Place Order Button */}
                <Button 
                  onClick={handlePlaceOrder}
                  disabled={!selectedAddress || isProcessing}
                  className="w-full h-12"
                  size="lg"
                >
                  {isProcessing ? (
                    "Processing..."
                  ) : (
                    <>
                      {paymentMethod === 'cod' ? (
                        <>
                          <Banknote className="h-4 w-4 mr-2" />
                          Place Order (COD)
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay ₹{priceBreakdown.total.toFixed(2)}
                        </>
                      )}
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center mt-3">
                  By placing your order, you agree to our Terms & Conditions and Privacy Policy.
                </p>
              </Card>
            </div>
          </div>
        </div>

        {/* COD Payment Prompt Dialog */}
        <Dialog open={showCodPrompt} onOpenChange={setShowCodPrompt}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Get Your Order Faster!
              </DialogTitle>
              <DialogDescription>
                Complete payment now to get your order processed and delivered faster than COD.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Online Payment Benefits:
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Faster order processing</li>
                  <li>• Priority shipping</li>
                  <li>• Immediate order confirmation</li>
                  <li>• Better delivery tracking</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Cash on Delivery:</h4>
                <p className="text-sm text-orange-700">
                  Your order will be placed but may take longer to process and ship.
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSwitchToOnline}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Now (Faster)
                </Button>
                <Button 
                  onClick={handleContinueWithCod}
                  variant="outline"
                  disabled={isProcessing}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Continue COD'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Checkout;
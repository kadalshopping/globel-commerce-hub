import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  CheckCircle
} from "lucide-react";
import { calculatePriceBreakdown } from "@/utils/priceCalculations";
import { SEOHead } from "@/components/seo/SEOHead";

interface CheckoutProduct {
  id: string;
  title: string;
  selling_price: number;
  stock_quantity?: number;
  image?: string;
  shop_owner_id?: string;
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
      const { data, error } = await supabase
        .from('delivery_addresses')
        .insert([{ ...addressData, user_id: user?.id }])
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
            shop_owner_id: product.shop_owner_id || user?.id,
            status: 'pending',
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
          title: "Order Placed Successfully!",
          description: `Your order ${order.order_number} has been placed with Cash on Delivery.`,
        });

        navigate('/orders');
      } else {
        // Handle online payment
        const { data, error } = await supabase.functions.invoke('create-payment-link', {
          body: {
            amount: priceBreakdown.total,
            items: orderData.items,
            delivery_address: selectedAddress,
          },
        });

        if (error) throw error;

        if (data.payment_link) {
          window.location.href = data.payment_link; // Direct navigation instead of new tab
          return;
        }
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
                      <Label htmlFor="cod" className="flex items-center gap-3 cursor-pointer flex-1">
                        <Banknote className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Cash on Delivery</p>
                          <p className="text-sm text-muted-foreground">Pay when you receive the item</p>
                        </div>
                      </Label>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="online" id="online" />
                      <Label htmlFor="online" className="flex items-center gap-3 cursor-pointer flex-1">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Online Payment</p>
                          <p className="text-sm text-muted-foreground">Pay now with UPI, Card, or Net Banking</p>
                        </div>
                      </Label>
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
      </div>
    </>
  );
};

export default Checkout;
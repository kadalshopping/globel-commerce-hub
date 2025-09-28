import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AddressForm } from "@/components/forms/AddressForm";
import { useDeliveryAddresses } from "@/hooks/useDeliveryAddresses";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, CreditCard, Banknote, MapPin, Plus } from "lucide-react";
import { calculatePriceBreakdown } from "@/utils/priceCalculations";

interface BuyNowButtonProps {
  product: {
    id: string;
    title: string;
    selling_price: number;
    stock_quantity?: number;
    image?: string;
    shop_owner_id?: string;
  };
  quantity?: number;
  className?: string;
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

export const BuyNowButton = ({ product, quantity = 1, className }: BuyNowButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: addresses = [] } = useDeliveryAddresses();
  
  const [showDialog, setShowDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const priceBreakdown = calculatePriceBreakdown(product.selling_price * quantity);

  const handleBuyNow = () => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    if (!product.stock_quantity || product.stock_quantity < quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.stock_quantity || 0} items available.`,
        variant: "destructive",
      });
      return;
    }

    setShowDialog(true);
  };

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
        delivery_address: selectedAddress as any, // Cast to any for Json compatibility
        payment_method: paymentMethod,
        price_breakdown: priceBreakdown as any, // Cast to any for Json compatibility
        status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
        payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
        order_number: `ORD-${Date.now()}`,
        items: [{
          product_id: product.id,
          title: product.title,
          price: product.selling_price,
          quantity: quantity,
          image: product.image,
        }] as any, // Cast to any for Json compatibility
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
            shop_owner_id: product.shop_owner_id || user?.id, // Use product owner or current user as fallback
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
          window.open(data.payment_link, '_blank');
          toast({
            title: "Payment Link Created",
            description: "Opening payment page in new tab...",
          });
        }
      }

      setShowDialog(false);
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
      <Button 
        onClick={handleBuyNow}
        disabled={!product.stock_quantity || product.stock_quantity < quantity}
        className={className}
      >
        <ShoppingBag className="h-4 w-4 mr-2" />
        Buy Now
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{product.title}</p>
                  <p className="text-sm text-muted-foreground">Qty: {quantity}</p>
                  <p className="text-sm font-semibold">₹{product.selling_price.toLocaleString('en-IN')}</p>
                </div>
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{priceBreakdown.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span>{priceBreakdown.deliveryCharge > 0 ? `₹${priceBreakdown.deliveryCharge.toFixed(2)}` : 'FREE'}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{priceBreakdown.total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Payment Method</h3>
              <RadioGroup value={paymentMethod} onValueChange={(value: "cod" | "online") => setPaymentMethod(value)}>
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Banknote className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-muted-foreground">Pay when you receive the item</p>
                    </div>
                  </Label>
                  <Badge variant="secondary">Recommended</Badge>
                </div>
                
                <div className="flex items-center space-x-2 p-3 border rounded-md">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Online Payment</p>
                      <p className="text-sm text-muted-foreground">Pay now with UPI, Card, or Net Banking</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </Card>

            {/* Delivery Address */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Delivery Address</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAddressForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
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
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedAddress?.id === address.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                      }`}
                      onClick={() => setSelectedAddress(address)}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{address.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {address.address}, {address.city}, {address.state} - {address.pincode}
                          </p>
                          <p className="text-sm text-muted-foreground">Phone: {address.phone}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {addresses.length === 0 && !showAddressForm && (
                    <p className="text-muted-foreground text-center py-4">
                      No addresses found. Please add a delivery address.
                    </p>
                  )}
                </div>
              )}
            </Card>

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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
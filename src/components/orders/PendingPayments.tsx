import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePendingOrders } from "@/hooks/usePendingOrders";
import { CreditCard, Clock, AlertCircle, Trash2, Minus, Plus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PendingPayments = () => {
  const { data: pendingOrders, isLoading, refetch } = usePendingOrders();
  const { toast } = useToast();
  const { user } = useAuth();
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const completePayment = async (pendingOrder: any) => {
    if (!user) return;
    
    setProcessingOrderId(pendingOrder.id);

    try {
      console.log('🚀 Starting Razorpay payment for order:', pendingOrder.order_number);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create Razorpay order using edge function
      console.log('📞 Calling create-razorpay-order edge function...');
      const { data: razorpayData, error: razorpayError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: pendingOrder.total_amount,
          cartItems: pendingOrder.items,
          deliveryAddress: pendingOrder.delivery_address
        }
      });

      console.log('📊 Edge function response:', { razorpayData, razorpayError });

      if (razorpayError) {
        console.error('❌ Edge function error:', razorpayError);
        throw new Error(`Edge function error: ${razorpayError.message || 'Unknown error'}`);
      }

      if (!razorpayData || !razorpayData.success) {
        console.error('❌ Invalid response from edge function:', razorpayData);
        throw new Error(razorpayData?.error || 'Failed to create Razorpay order');
      }

      console.log('✅ Razorpay order created:', razorpayData);

      // Update pending order with Razorpay order ID
      await supabase
        .from('pending_orders')
        .update({ razorpay_order_id: razorpayData.razorpay_order_id })
        .eq('id', pendingOrder.id);

      // Configure Razorpay options
      const options = {
        key: razorpayData.razorpay_key_id,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        name: 'Your Store Name',
        description: `Order #${pendingOrder.order_number}`,
        order_id: razorpayData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            console.log('💳 Payment successful, verifying...', response);

            // Verify payment using edge function
            const { data: verificationData, error: verificationError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }
            });

            if (verificationError || !verificationData) {
              throw new Error('Payment verification failed');
            }

            console.log('✅ Payment verified and order created');
            
            toast({
              title: '🎉 Payment Successful!',
              description: `Order #${pendingOrder.order_number} has been confirmed`,
            });

            // Refresh the orders list
            refetch();

          } catch (error) {
            console.error('❌ Payment verification error:', error);
            toast({
              title: 'Payment Verification Failed',
              description: 'Payment was processed but verification failed. Please contact support.',
              variant: 'destructive',
            });
          }
        },
        prefill: {
          name: user.user_metadata?.full_name || 'Customer',
          email: user.email,
        },
        theme: {
          color: '#3b82f6'
        },
        modal: {
          ondismiss: () => {
            console.log('💸 Payment cancelled by user');
            toast({
              title: 'Payment Cancelled',
              description: 'You can complete the payment anytime from your orders page.',
            });
          }
        }
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('❌ Payment initiation error:', error);
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const updateOrderItem = async (pendingOrder: any, itemIndex: number, newQuantity: number) => {
    try {
      const updatedItems = [...(pendingOrder.items as any[])];
      if (newQuantity <= 0) {
        updatedItems.splice(itemIndex, 1);
      } else {
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: newQuantity };
      }

      if (updatedItems.length === 0) {
        // If no items left, delete the entire order
        await cancelPendingOrder(pendingOrder);
        return;
      }

      // Recalculate total amount
      const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      await supabase
        .from('pending_orders')
        .update({
          items: updatedItems,
          total_amount: newTotal
        })
        .eq('id', pendingOrder.id);

      toast({
        title: 'Order Updated',
        description: newQuantity <= 0 ? 'Item removed from order' : 'Item quantity updated',
      });

      refetch();
    } catch (error) {
      console.error('Error updating order item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order item',
        variant: 'destructive',
      });
    }
  };

  const removeOrderItem = async (pendingOrder: any, itemIndex: number) => {
    await updateOrderItem(pendingOrder, itemIndex, 0);
  };

  const cancelPendingOrder = async (pendingOrder: any) => {
    try {
      await supabase
        .from('pending_orders')
        .delete()
        .eq('id', pendingOrder.id);

      toast({
        title: 'Order Cancelled',
        description: `Pending order #${pendingOrder.order_number} has been cancelled`,
      });

      refetch();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel order',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading pending payments...</div>;
  }

  if (!pendingOrders || pendingOrders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <h2 className="text-2xl font-bold">Pending Payments</h2>
        </div>
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          {pendingOrders.length} Pending
        </Badge>
      </div>

      <div className="space-y-4">
        {pendingOrders.map((pendingOrder) => (
          <Card key={pendingOrder.id} className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order #{pendingOrder.order_number}</CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800">
                  <Clock className="w-3 h-3" />
                  Payment Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Order Details</h4>
                  <p className="text-sm text-muted-foreground">
                    Created: {format(new Date(pendingOrder.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Amount: ₹{pendingOrder.total_amount}
                  </p>
                </div>
                
                {pendingOrder.delivery_address && (
                  <div>
                    <h4 className="font-medium mb-2">Delivery Address</h4>
                    <div className="text-sm text-muted-foreground">
                      <p>{(pendingOrder.delivery_address as any)?.fullName}</p>
                      <p>{(pendingOrder.delivery_address as any)?.email}</p>
                    </div>
                  </div>
                )}
              </div>

              {pendingOrder.items && Array.isArray(pendingOrder.items) && (pendingOrder.items as any[]).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Items ({(pendingOrder.items as any[]).length})</h4>
                  <div className="space-y-2">
                    {(pendingOrder.items as any[]).map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderItem(pendingOrder, index, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1;
                                if (newQty !== item.quantity && newQty > 0) {
                                  updateOrderItem(pendingOrder, index, newQty);
                                }
                              }}
                              className="w-16 text-center"
                              min="1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderItem(pendingOrder, index, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="text-right min-w-[60px]">
                            <p className="font-medium text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeOrderItem(pendingOrder, index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-lg font-bold text-orange-600">
                    ₹{pendingOrder.items && Array.isArray(pendingOrder.items) 
                      ? (pendingOrder.items as any[]).reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
                      : pendingOrder.total_amount.toFixed(2)
                    }
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => completePayment(pendingOrder)}
                    disabled={processingOrderId === pendingOrder.id}
                    className="flex-1"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {processingOrderId === pendingOrder.id ? 'Processing...' : 'Complete Payment'}
                  </Button>
                  <Button 
                    onClick={() => cancelPendingOrder(pendingOrder)}
                    variant="outline"
                    disabled={processingOrderId === pendingOrder.id}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
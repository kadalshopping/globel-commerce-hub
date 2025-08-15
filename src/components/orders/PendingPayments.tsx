import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePendingOrders } from "@/hooks/usePendingOrders";
import { CreditCard, Clock, AlertCircle } from "lucide-react";
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
      console.log('🚀 Completing payment for pending order:', pendingOrder.order_number);

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create confirmed order directly
      const { data: confirmedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: pendingOrder.total_amount,
          delivery_address: pendingOrder.delivery_address,
          items: pendingOrder.items,
          order_number: pendingOrder.order_number,
          status: 'confirmed',
          payment_status: 'completed',
          razorpay_payment_id: `pay_completed_${Date.now()}`
        })
        .select()
        .single();

      if (orderError) {
        throw new Error('Failed to create confirmed order');
      }

      // Create order items for shop owners
      const items = pendingOrder.items;
      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('shop_owner_id')
          .eq('id', item.productId)
          .maybeSingle();

        if (product) {
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

          // Update product stock
          await supabase.rpc('decrease_product_stock', {
            product_id_param: item.productId,
            quantity_param: item.quantity
          });
        }
      }

      // Delete pending order
      await supabase
        .from('pending_orders')
        .delete()
        .eq('id', pendingOrder.id);

      console.log('✅ Payment completed and order created');

      toast({
        title: '🎉 Payment Completed!',
        description: `Order #${pendingOrder.order_number} has been confirmed`,
      });

      // Refresh pending orders list
      refetch();

    } catch (error) {
      console.error('❌ Payment completion error:', error);
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setProcessingOrderId(null);
    }
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
                    {(pendingOrder.items as any[]).slice(0, 3).map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                    {(pendingOrder.items as any[]).length > 3 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{(pendingOrder.items as any[]).length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-lg font-bold text-orange-600">₹{pendingOrder.total_amount}</span>
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePendingOrders } from "@/hooks/usePendingOrders";
import { ShoppingBag, Clock, AlertCircle, Trash2, Minus, Plus, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const PendingPayments = () => {
  const { data: pendingOrders, isLoading, refetch } = usePendingOrders();
  const { toast } = useToast();
  const { user } = useAuth();
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const completeOrder = async (pendingOrder: any) => {
    if (!user) return;
    
    setProcessingOrderId(pendingOrder.id);

    try {
      console.log('🚀 Auto-completing order:', pendingOrder.order_number);

      // Create completed order directly with confirmed status
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: pendingOrder.user_id,
          total_amount: pendingOrder.total_amount,
          delivery_address: pendingOrder.delivery_address,
          items: pendingOrder.items,
          order_number: pendingOrder.order_number,
          payment_status: 'completed',
          status: 'processing'
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error('Failed to create order');
      }

      // Delete pending order
      const { error: deleteError } = await supabase
        .from('pending_orders')
        .delete()
        .eq('id', pendingOrder.id);

      if (deleteError) {
        console.error('Failed to delete pending order:', deleteError);
      }

      console.log('✅ Order auto-completed successfully:', order.order_number);

      toast({
        title: '🎉 Order Processed!',
        description: `Order #${order.order_number} is now being processed.`,
      });

      refetch();
      
    } catch (error) {
      console.error('❌ Order completion error:', error);
      toast({
        title: 'Order Failed',
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
    return <div className="p-6">Loading pending orders...</div>;
  }

  if (!pendingOrders || pendingOrders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <h2 className="text-2xl font-bold">Orders Ready to Process</h2>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {pendingOrders.length} Ready
        </Badge>
      </div>

      <div className="space-y-4">
        {pendingOrders.map((pendingOrder) => (
          <Card key={pendingOrder.id} className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order #{pendingOrder.order_number}</CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800">
                  <Clock className="w-3 h-3" />
                  Processing
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
                    onClick={() => completeOrder(pendingOrder)}
                    disabled={processingOrderId === pendingOrder.id}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {processingOrderId === pendingOrder.id ? 'Processing...' : 'Start Processing'}
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
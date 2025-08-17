import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserOrders } from "@/hooks/useOrders";
import { useCart } from "@/contexts/CartContext";
import { Package, Truck, CheckCircle, Clock, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard } from "lucide-react";

export const UserOrderHistory = () => {
  const { data: orders, isLoading } = useUserOrders();
  const { addToCart } = useCart();
  const { toast } = useToast();

  if (isLoading) {
    return <div className="p-6">Loading your order history...</div>;
  }

  const getStatusBadge = (status: string, paymentStatus: string) => {
    // Show "Ready to Dispatch" when payment is completed
    if (paymentStatus === 'completed' && status === 'confirmed') {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Ready to Dispatch
        </Badge>
      );
    }

    const statusMap = {
      pending: { label: 'Order Placed', variant: 'secondary' as const, icon: <Package className="w-3 h-3" /> },
      confirmed: { label: 'Order Confirmed', variant: 'default' as const, icon: <CheckCircle className="w-3 h-3" /> },
      processing: { label: 'Processing', variant: 'default' as const, icon: <Clock className="w-3 h-3" /> },
      dispatched: { label: 'Dispatched', variant: 'default' as const, icon: <Truck className="w-3 h-3" /> },
      delivered: { label: 'Delivered', variant: 'default' as const, icon: <CheckCircle className="w-3 h-3" /> },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const, icon: null };
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        {statusInfo.icon}
        {statusInfo.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Payment Incomplete', variant: 'destructive' as const },
      completed: { label: 'Payment Completed', variant: 'default' as const },
      failed: { label: 'Payment Failed', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const completePayment = async (order: any) => {
    try {
      // Verify payment with Razorpay if needed
      const { data: verificationResult, error } = await supabase.functions.invoke('verify-payment-link', {
        body: {
          payment_link_id: order.razorpay_order_id,
          payment_id: 'manual_verification'
        }
      });

      if (error) {
        throw new Error('Payment verification failed');
      }

      toast({
        title: '✅ Payment Verified!',
        description: `Payment for order #${order.order_number} has been verified and completed.`,
      });
      
      // Refresh the orders
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Payment Verification Failed',
        description: 'Please ensure payment was completed or contact support.',
        variant: 'destructive',
      });
    }
  };

  const processPayment = async (order: any) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'completed' })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Payment Processed',
        description: `Payment for order #${order.order_number} has been marked as completed.`,
      });
      
      // Refresh the orders
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process payment',
        variant: 'destructive',
      });
    }
  };

  const handleReorder = (order: any) => {
    if (order.items && order.items.length > 0) {
      order.items.forEach((item: any) => {
        addToCart({
          id: item.id || `reorder-${Date.now()}-${Math.random()}`,
          productId: item.id || `reorder-${Date.now()}-${Math.random()}`,
          title: item.title,
          price: item.price,
          image: item.image || '/placeholder.svg',
          maxStock: item.stock_quantity || 1,
        }, item.quantity);
      });
      toast({
        title: 'Items added to cart',
        description: `${order.items.length} items from order #${order.order_number} added to cart`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order History</h2>
        <Badge variant="outline">{orders?.length || 0} Orders</Badge>
      </div>

      {!orders || orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders yet</h3>
            <p className="text-muted-foreground">Start shopping to see your orders here!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status, order.payment_status)}
                      {getPaymentStatusBadge(order.payment_status)}
                    </div>
                  </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Order Details</h4>
                    <p className="text-sm text-muted-foreground">
                      Order Date: {format(new Date(order.created_at), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Amount: ₹{order.total_amount}
                    </p>
                  </div>
                  
                  {order.delivery_address && (
                    <div>
                      <h4 className="font-medium mb-2">Delivery Address</h4>
                      <div className="text-sm text-muted-foreground">
                        <p>{order.delivery_address.address}</p>
                        <p>{order.delivery_address.city}, {order.delivery_address.state}</p>
                        <p>{order.delivery_address.pincode}</p>
                        <p>Phone: {order.delivery_address.phone}</p>
                      </div>
                    </div>
                  )}
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Items</h4>
                    <div className="space-y-2">
                      {order.items.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-medium">₹{item.price}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total</span>
                    <span className="text-lg font-bold">₹{order.total_amount}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(order as any).price_breakdown && (
                      <div className="bg-muted p-3 rounded-lg space-y-2">
                        <h5 className="font-medium text-sm">Price Breakdown:</h5>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>₹{(order as any).price_breakdown.subtotal?.toFixed(2) || '0.00'}</span>
                          </div>
                          {(order as any).price_breakdown.couponDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Coupon Discount:</span>
                              <span>-₹{(order as any).price_breakdown.couponDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Delivery:</span>
                            <span>{(order as any).price_breakdown.deliveryCharge === 0 ? 'FREE' : `₹${(order as any).price_breakdown.deliveryCharge.toFixed(2)}`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Platform Charge (2%):</span>
                            <span>₹{(order as any).price_breakdown.platformCharge?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST (18%):</span>
                            <span>₹{(order as any).price_breakdown.gst?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {order.payment_status === 'pending' && (
                      <div className="space-y-2">
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">Payment Required</span>
                          </div>
                          <p className="text-sm text-yellow-700 mt-1">
                            Complete your payment to confirm this order and start processing.
                          </p>
                        </div>
                        <Button 
                          onClick={() => completePayment(order)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Complete Payment (₹{order.total_amount})
                        </Button>
                        {order.razorpay_order_id && (
                          <Button 
                            onClick={() => window.open(`https://razorpay.com/payment-link/${order.razorpay_order_id}`, '_blank')}
                            className="w-full"
                            variant="outline"
                          >
                            Open Payment Link
                          </Button>
                        )}
                      </div>
                    )}
                    <Button 
                      onClick={() => handleReorder(order)}
                      className="w-full"
                      variant="outline"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Reorder Items
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
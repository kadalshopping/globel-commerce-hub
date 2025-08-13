import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserOrders } from "@/hooks/useOrders";
import { Package, Truck, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

export const UserOrderHistory = () => {
  const { data: orders, isLoading } = useUserOrders();

  if (isLoading) {
    return <div className="p-6">Loading your order history...</div>;
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Order Placed', variant: 'secondary' as const, icon: <Package className="w-3 h-3" /> },
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
      pending: { label: 'Payment Pending', variant: 'secondary' as const },
      completed: { label: 'Payment Completed', variant: 'default' as const },
      failed: { label: 'Payment Failed', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
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
                    {getStatusBadge(order.status)}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
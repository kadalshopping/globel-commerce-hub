import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShopOwnerOrderItems, useRequestDispatch, usePayoutRequests, useCreatePayoutRequest } from "@/hooks/useOrders";
import { Package, Truck, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";

export const OrderManagement = () => {
  const { data: orderItems, isLoading } = useShopOwnerOrderItems();
  const { data: payoutRequests } = usePayoutRequests();
  const requestDispatch = useRequestDispatch();
  const createPayoutRequest = useCreatePayoutRequest();

  if (isLoading) {
    return <div className="p-6">Loading your orders...</div>;
  }

  const pendingItems = orderItems?.filter(item => item.status === 'pending') || [];
  const dispatchRequestedItems = orderItems?.filter(item => item.status === 'dispatch_requested') || [];
  const dispatchedItems = orderItems?.filter(item => item.status === 'dispatched') || [];
  const deliveredItems = orderItems?.filter(item => item.status === 'delivered') || [];

  const handleRequestDispatch = (orderItemId: string) => {
    requestDispatch.mutate(orderItemId);
  };

  const handleRequestPayout = (orderItemId: string, amount: number, shopOwnerId: string) => {
    createPayoutRequest.mutate({ orderItemId, amount, shopOwnerId });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      dispatch_requested: { label: 'Dispatch Requested', variant: 'default' as const },
      dispatched: { label: 'Dispatched', variant: 'default' as const },
      delivered: { label: 'Delivered', variant: 'default' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const OrderItemCard = ({ item }: { item: any }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-medium">{item.product?.title}</h4>
            <p className="text-sm text-muted-foreground">
              Order #{item.order?.order_number} • Qty: {item.quantity}
            </p>
            <p className="text-sm font-medium">₹{item.price}</p>
          </div>
          <div className="text-right">
            {getStatusBadge(item.status)}
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(item.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm text-muted-foreground">Customer: Order #{item.order?.order_number}</p>
          {item.order?.delivery_address && (
            <div className="text-xs text-muted-foreground mt-1">
              <p>Delivery Address:</p>
              <p>{item.order.delivery_address.address}</p>
              <p>{item.order.delivery_address.city}, {item.order.delivery_address.state} {item.order.delivery_address.pincode}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {item.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => handleRequestDispatch(item.id)}
              disabled={requestDispatch.isPending}
            >
              <Truck className="w-4 h-4 mr-1" />
              Request Dispatch
            </Button>
          )}
          
          {item.status === 'delivered' && !payoutRequests?.some(pr => pr.order_item_id === item.id) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRequestPayout(item.id, item.price, item.shop_owner_id)}
              disabled={createPayoutRequest.isPending}
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Request Payout
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatch Requested</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatchRequestedItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatchedItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredItems.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending ({pendingItems.length})</TabsTrigger>
          <TabsTrigger value="dispatch_requested">Dispatch Requested ({dispatchRequestedItems.length})</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched ({dispatchedItems.length})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({deliveredItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending orders</p>
              </CardContent>
            </Card>
          ) : (
            pendingItems.map((item) => <OrderItemCard key={item.id} item={item} />)
          )}
        </TabsContent>

        <TabsContent value="dispatch_requested" className="space-y-4">
          {dispatchRequestedItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No dispatch requests pending</p>
              </CardContent>
            </Card>
          ) : (
            dispatchRequestedItems.map((item) => <OrderItemCard key={item.id} item={item} />)
          )}
        </TabsContent>

        <TabsContent value="dispatched" className="space-y-4">
          {dispatchedItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No dispatched orders</p>
              </CardContent>
            </Card>
          ) : (
            dispatchedItems.map((item) => <OrderItemCard key={item.id} item={item} />)
          )}
        </TabsContent>

        <TabsContent value="delivered" className="space-y-4">
          {deliveredItems.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No delivered orders</p>
              </CardContent>
            </Card>
          ) : (
            deliveredItems.map((item) => <OrderItemCard key={item.id} item={item} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
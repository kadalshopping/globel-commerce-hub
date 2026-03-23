import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAllOrderItems, useApproveDispatch, useMarkDelivered } from "@/hooks/useOrders";
import { Package, Truck, CheckCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const AdminOrderManagement = () => {
  const { data: orderItems, isLoading, error } = useAllOrderItems();
  const approveDispatch = useApproveDispatch();
  const markDelivered = useMarkDelivered();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  if (isLoading) {
    return <div className="p-6">Loading orders...</div>;
  }

  if (error) {
    return <div className="p-6">Error loading orders: {error.message}</div>;
  }

  const waitingItems = orderItems?.filter(item => item.status === 'waiting_for_dispatch') || [];
  const dispatchRequestedItems = orderItems?.filter(item => item.status === 'dispatch_requested') || [];
  const dispatchedItems = orderItems?.filter(item => item.status === 'dispatched') || [];
  const deliveredItems = orderItems?.filter(item => item.status === 'delivered') || [];

  const handleApproveDispatch = (orderItemId: string) => {
    approveDispatch.mutate(orderItemId);
  };

  const handleMarkDelivered = (orderItemId: string) => {
    markDelivered.mutate(orderItemId);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      waiting_for_dispatch: { label: 'Waiting', className: 'bg-warning text-warning-foreground' },
      dispatch_requested: { label: 'Dispatch Requested', className: 'bg-info text-info-foreground' },
      dispatched: { label: 'Dispatched', className: 'bg-accent text-accent-foreground' },
      delivered: { label: 'Delivered', className: 'bg-success text-success-foreground' },
    };
    const info = statusMap[status] || { label: status, className: 'bg-muted text-muted-foreground' };
    return <Badge className={info.className}>{info.label}</Badge>;
  };

  const getPaymentBadge = (status?: string) => {
    if (!status) return <Badge className="bg-muted text-muted-foreground">Unknown</Badge>;
    const map: Record<string, { label: string; className: string }> = {
      paid: { label: '✓ Paid', className: 'bg-success text-success-foreground' },
      pending: { label: '⏳ Pending', className: 'bg-warning text-warning-foreground' },
      failed: { label: '✗ Failed', className: 'bg-destructive text-destructive-foreground' },
      cod: { label: '💵 COD', className: 'bg-info text-info-foreground' },
    };
    const info = map[status] || { label: status, className: 'bg-muted text-muted-foreground' };
    return <Badge className={info.className}>{info.label}</Badge>;
  };

  const OrderTable = ({ items, showActions }: { items: any[], showActions?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Shop Owner</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>#{item.order?.order_number}</TableCell>
            <TableCell>{item.product?.title}</TableCell>
            <TableCell>{item.shop_owner?.full_name || 'Shop Owner'}</TableCell>
            <TableCell>{item.order?.delivery_address?.name || 'Customer'}</TableCell>
            <TableCell>{item.order?.delivery_address?.phone || 'N/A'}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>₹{item.price}</TableCell>
            <TableCell>{getPaymentBadge(item.order?.payment_status)}</TableCell>
            <TableCell>{getStatusBadge(item.status)}</TableCell>
            <TableCell>{format(new Date(item.created_at), 'MMM dd, yyyy')}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(item)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Order Details</DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium">Order Information</h4>
                            <p className="text-sm">Order #: {selectedOrder.order?.order_number}</p>
                            <p className="text-sm">Product: {selectedOrder.product?.title}</p>
                            <p className="text-sm">Quantity: {selectedOrder.quantity}</p>
                            <p className="text-sm">Price: ₹{selectedOrder.price}</p>
                            <p className="text-sm">Payment: {selectedOrder.order?.payment_status || 'N/A'}</p>
                          </div>
                          <div>
                            <h4 className="font-medium">Shop Owner</h4>
                            <p className="text-sm">Name: {selectedOrder.shop_owner?.full_name || 'N/A'}</p>
                            {selectedOrder.shop_owner?.address && (
                              <p className="text-sm">Address: {selectedOrder.shop_owner.address}</p>
                            )}
                            {selectedOrder.shop_owner?.phone && (
                              <p className="text-sm">Phone: {selectedOrder.shop_owner.phone}</p>
                            )}
                          </div>
                        </div>
                        {selectedOrder.order?.delivery_address && (
                          <div>
                            <h4 className="font-medium">Delivery Address</h4>
                            <div className="text-sm text-muted-foreground">
                              <p>Name: {selectedOrder.order.delivery_address.name}</p>
                              <p>{selectedOrder.order.delivery_address.address}</p>
                              <p>{selectedOrder.order.delivery_address.city}, {selectedOrder.order.delivery_address.state}</p>
                              <p>Pincode: {selectedOrder.order.delivery_address.pincode}</p>
                              <p>Phone: {selectedOrder.order.delivery_address.phone}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {item.status === 'dispatch_requested' && (
                  <Button
                    size="sm"
                    onClick={() => handleApproveDispatch(item.id)}
                    disabled={approveDispatch.isPending}
                  >
                    Approve Dispatch
                  </Button>
                )}
                
                {item.status === 'dispatched' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkDelivered(item.id)}
                    disabled={markDelivered.isPending}
                  >
                    Mark Delivered
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting for Dispatch</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitingItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatch Requests</CardTitle>
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
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveredItems.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dispatch_requested" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="waiting">Waiting ({waitingItems.length})</TabsTrigger>
          <TabsTrigger value="dispatch_requested">Dispatch Requests ({dispatchRequestedItems.length})</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched ({dispatchedItems.length})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({deliveredItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="waiting">
          <Card>
            <CardHeader>
              <CardTitle>Waiting for Dispatch</CardTitle>
            </CardHeader>
            <CardContent>
              {waitingItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No orders waiting for dispatch</p>
                </div>
              ) : (
                <OrderTable items={waitingItems} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch_requested">
          <Card>
            <CardHeader>
              <CardTitle>Dispatch Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {dispatchRequestedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No dispatch requests</p>
                </div>
              ) : (
                <OrderTable items={dispatchRequestedItems} showActions />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatched">
          <Card>
            <CardHeader>
              <CardTitle>Dispatched Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {dispatchedItems.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No dispatched orders</p>
                </div>
              ) : (
                <OrderTable items={dispatchedItems} showActions />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivered">
          <Card>
            <CardHeader>
              <CardTitle>Delivered Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {deliveredItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No delivered orders</p>
                </div>
              ) : (
                <OrderTable items={deliveredItems} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
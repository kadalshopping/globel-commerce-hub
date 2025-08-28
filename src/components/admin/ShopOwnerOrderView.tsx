import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAllOrderItems } from "@/hooks/useOrders";
import { Eye, Package, Truck, CheckCircle, Clock, Store } from "lucide-react";
import { format } from "date-fns";

export const ShopOwnerOrderView = () => {
  const { data: orderItems, isLoading } = useAllOrderItems();
  const [selectedShopOwner, setSelectedShopOwner] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  if (isLoading) {
    return <div className="p-6">Loading shop owner orders...</div>;
  }

  // Get unique shop owners
  const shopOwners = orderItems?.reduce((acc: any[], item: any) => {
    if (item.shop_owner && !acc.find(owner => owner.id === item.shop_owner_id)) {
      acc.push({
        id: item.shop_owner_id,
        name: item.shop_owner.full_name || 'Shop Owner',
        phone: item.shop_owner.phone,
        address: item.shop_owner.address
      });
    }
    return acc;
  }, []) || [];

  // Filter orders by selected shop owner
  const filteredOrders = selectedShopOwner 
    ? orderItems?.filter(item => item.shop_owner_id === selectedShopOwner) || []
    : [];

  const getStatusBadge = (status: string) => {
    const statusMap = {
      waiting_for_dispatch: { label: 'Waiting for Dispatch', variant: 'secondary' as const },
      dispatch_requested: { label: 'Dispatch Requested', variant: 'default' as const },
      dispatched: { label: 'Dispatched', variant: 'default' as const },
      delivered: { label: 'Delivered', variant: 'default' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  // Calculate stats for selected shop owner
  const waitingCount = filteredOrders.filter(item => item.status === 'waiting_for_dispatch').length;
  const dispatchRequestedCount = filteredOrders.filter(item => item.status === 'dispatch_requested').length;
  const dispatchedCount = filteredOrders.filter(item => item.status === 'dispatched').length;
  const deliveredCount = filteredOrders.filter(item => item.status === 'delivered').length;
  const totalRevenue = filteredOrders.reduce((sum, item) => sum + Number(item.price), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Shop Owner Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Shop Owner</label>
              <Select value={selectedShopOwner} onValueChange={setSelectedShopOwner}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shop owner to view their orders" />
                </SelectTrigger>
                <SelectContent>
                  {shopOwners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name} {owner.phone && `(${owner.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedShopOwner && (
            <>
              {/* Shop Owner Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{filteredOrders.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Waiting</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{waitingCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Requested</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dispatchRequestedCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dispatchedCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{deliveredCount}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Revenue Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">₹{totalRevenue.toFixed(2)}</div>
                  <p className="text-muted-foreground">Total revenue from {filteredOrders.length} orders</p>
                </CardContent>
              </Card>

              {/* Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders found for this shop owner</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>#{item.order?.order_number}</TableCell>
                            <TableCell>{item.product?.title}</TableCell>
                            <TableCell>{item.order?.delivery_address?.name || 'Customer'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{item.price}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>{format(new Date(item.created_at), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
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
                                          <p className="text-sm">Status: {selectedOrder.status}</p>
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
                                            <p>Address: {selectedOrder.order.delivery_address.address}</p>
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
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
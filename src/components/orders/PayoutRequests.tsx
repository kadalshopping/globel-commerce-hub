import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePayoutRequests, useAllPayoutRequests, useProcessPayout } from "@/hooks/useOrders";
import { DollarSign, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export const PayoutRequests = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'admin';
  
  const { data: shopOwnerPayouts } = usePayoutRequests();
  const { data: allPayouts } = useAllPayoutRequests();
  const processPayout = useProcessPayout();

  const payouts = isAdmin ? allPayouts : shopOwnerPayouts;

  const pendingPayouts = payouts?.filter(p => p.status === 'pending') || [];
  const processedPayouts = payouts?.filter(p => p.status === 'processed') || [];

  const handleProcessPayout = (payoutId: string) => {
    processPayout.mutate(payoutId);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pending', variant: 'secondary' as const, icon: <Clock className="w-3 h-3" /> },
      processed: { label: 'Processed', variant: 'default' as const, icon: <CheckCircle className="w-3 h-3" /> },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const, icon: null };
    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        {statusInfo.icon}
        {statusInfo.label}
      </Badge>
    );
  };

  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
  const totalProcessed = processedPayouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{pendingPayouts.length} requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Payouts</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalProcessed.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{processedPayouts.length} processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalPending + totalProcessed).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payout Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!payouts || payouts.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payout requests yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
                      #{payout.order_item?.order?.order_number}
                    </TableCell>
                    <TableCell>{payout.order_item?.product?.title}</TableCell>
                    <TableCell className="font-medium">₹{payout.amount}</TableCell>
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>
                    <TableCell>
                      {format(new Date(payout.requested_at), 'MMM dd, yyyy')}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {payout.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleProcessPayout(payout.id)}
                            disabled={processPayout.isPending}
                          >
                            Process Payout
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
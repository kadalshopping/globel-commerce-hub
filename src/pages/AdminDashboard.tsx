import { usePendingProducts } from '@/hooks/useProducts';
import { ProductApprovalCard } from '@/components/admin/ProductApprovalCard';
import { AdminOrderManagement } from '@/components/orders/AdminOrderManagement';
import CreateAccountForm from '@/components/admin/CreateAccountForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Clock, AlertTriangle, ShoppingBag, Database, UserPlus } from 'lucide-react';
import { useMigrateCompletedOrders } from '@/hooks/useOrderMigration';

const AdminDashboard = () => {
  const { data: pendingProducts = [], isLoading, error } = usePendingProducts();
  const migrateOrders = useMigrateCompletedOrders();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading pending products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p>Error loading pending products: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Button
              onClick={() => migrateOrders.mutate()}
              disabled={migrateOrders.isPending}
              variant="outline"
              size="sm"
            >
              <Database className="h-4 w-4 mr-2" />
              {migrateOrders.isPending ? 'Migrating...' : 'Migrate Orders'}
            </Button>
          </div>
          <Badge variant="outline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {pendingProducts.length} Pending Products
          </Badge>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Product Approvals</TabsTrigger>
            <TabsTrigger value="orders">Order Management</TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create Accounts
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="products" className="space-y-4">
            {pendingProducts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-semibold">No Pending Products</h3>
                      <p className="text-muted-foreground">
                        All products have been reviewed. Check back later for new submissions.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingProducts.map((product) => (
                  <ProductApprovalCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="orders" className="space-y-4">
            <AdminOrderManagement />
          </TabsContent>
          
          <TabsContent value="accounts" className="space-y-4">
            <CreateAccountForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
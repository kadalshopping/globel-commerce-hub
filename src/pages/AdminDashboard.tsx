import { usePendingProducts } from '@/hooks/useProducts';
import { ProductApprovalCard } from '@/components/admin/ProductApprovalCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Clock, AlertTriangle } from 'lucide-react';

const AdminDashboard = () => {
  const { data: pendingProducts = [], isLoading, error } = usePendingProducts();

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
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Badge variant="outline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {pendingProducts.length} Pending
          </Badge>
        </div>

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
      </div>
    </div>
  );
};

export default AdminDashboard;
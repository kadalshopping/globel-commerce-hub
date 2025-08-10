import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { ProductForm } from '@/components/shop/ProductForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const ShopOwnerDashboard = () => {
  const [showAddProduct, setShowAddProduct] = useState(false);
  
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: products = [], isLoading } = useProducts(currentUser?.id);

  const pendingProducts = products.filter(p => p.status === 'pending');
  const approvedProducts = products.filter(p => p.status === 'approved');
  const rejectedProducts = products.filter(p => p.status === 'rejected');

  const ProductCard = ({ product }: { product: any }) => {
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending Review' },
      approved: { icon: CheckCircle, color: 'bg-green-500', label: 'Approved' },
      rejected: { icon: XCircle, color: 'bg-red-500', label: 'Rejected' },
    };

    const config = statusConfig[product.status as keyof typeof statusConfig];
    const StatusIcon = config.icon;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
            <Badge variant="outline" className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            )}
            
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-semibold">₹{product.selling_price}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRP</p>
                <p className="font-semibold">₹{product.mrp}</p>
              </div>
            </div>
            
            {product.admin_notes && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Admin Notes:</p>
                <p className="text-sm">{product.admin_notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading your products...</div>
      </div>
    );
  }

  if (showAddProduct) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Add New Product</h1>
            <Button onClick={() => setShowAddProduct(false)} variant="outline">
              Back to Dashboard
            </Button>
          </div>
          <ProductForm />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Shop Dashboard</h1>
          <Button onClick={() => setShowAddProduct(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{products.length}</p>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{approvedProducts.length}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingProducts.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Products ({products.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingProducts.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedProducts.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedProducts.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            {products.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-semibold">No Products Yet</h3>
                      <p className="text-muted-foreground">
                        Start by adding your first product for approval.
                      </p>
                    </div>
                    <Button onClick={() => setShowAddProduct(true)}>
                      Add Your First Product
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pending" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="approved" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="rejected" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rejectedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShopOwnerDashboard;
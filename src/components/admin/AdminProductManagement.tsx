import { useState } from 'react';
import { useAllProducts } from '@/hooks/useAllProducts';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Product } from '@/types/product';
import { Edit, Package, DollarSign, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AdminProductManagement = () => {
  const { user } = useAuth();
  const { data: products = [], isLoading, refetch } = useAllProducts();
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if user is admin (you may need to implement this check based on your auth system)
  const isAdmin = user?.user_metadata?.role === 'admin';

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading products...</div>
      </div>
    );
  }

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          title: updatedProduct.title,
          description: updatedProduct.description,
          mrp: updatedProduct.mrp,
          selling_price: updatedProduct.selling_price,
          category: updatedProduct.category,
          brand: updatedProduct.brand,
          stock_quantity: updatedProduct.stock_quantity,
          tags: updatedProduct.tags,
          images: updatedProduct.images,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedProduct.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });

      setEditingProduct(null);
      refetch();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const approvedProducts = products.filter(product => product.status === 'approved');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Admin Product Management
          </h2>
          <Badge variant="outline" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {approvedProducts.length} Products
          </Badge>
        </div>

        {approvedProducts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No Approved Products</h3>
                  <p className="text-muted-foreground">
                    No approved products available to manage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedProducts.map((product) => (
              <ProductManagementCard 
                key={product.id} 
                product={product} 
                onEdit={setEditingProduct}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <EditProductForm 
              product={editingProduct}
              onSave={handleUpdateProduct}
              onCancel={() => setEditingProduct(null)}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface ProductManagementCardProps {
  product: Product;
  onEdit: (product: Product) => void;
}

const ProductManagementCard = ({ product, onEdit }: ProductManagementCardProps) => {
  const discountAmount = product.mrp - product.selling_price;
  const discountPercentage = discountAmount > 0 ? ((discountAmount / product.mrp) * 100).toFixed(0) : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
          <Badge variant="default" className="ml-2">
            {product.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {product.images && product.images.length > 0 && (
          <div className="aspect-square w-full bg-muted rounded-lg overflow-hidden">
            <img 
              src={product.images[0]} 
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {product.description}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">MRP</p>
              <p className="font-semibold">₹{product.mrp}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Selling Price</p>
              <p className="font-semibold text-success">₹{product.selling_price}</p>
            </div>
          </div>
        </div>
        
        {discountAmount > 0 && (
          <div className="text-center">
            <Badge variant="secondary" className="text-primary">
              {discountPercentage}% OFF - Save ₹{discountAmount}
            </Badge>
          </div>
        )}
        
        <div className="flex justify-between text-sm">
          <span>Stock: {product.stock_quantity || 0} units</span>
          {product.category && <span>Category: {product.category}</span>}
        </div>
        
        <Button 
          onClick={() => onEdit(product)}
          className="w-full"
          variant="outline"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </CardContent>
    </Card>
  );
};

interface EditProductFormProps {
  product: Product;
  onSave: (product: Product) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const EditProductForm = ({ product, onSave, onCancel, isLoading }: EditProductFormProps) => {
  const [formData, setFormData] = useState({
    title: product.title,
    description: product.description || '',
    mrp: product.mrp,
    selling_price: product.selling_price,
    category: product.category || '',
    brand: product.brand || '',
    stock_quantity: product.stock_quantity || 0,
    tags: product.tags?.join(', ') || '',
    images: product.images?.join(', ') || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...product,
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
      images: formData.images ? formData.images.split(',').map(img => img.trim()) : []
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="stock">Stock Quantity</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="mrp">MRP (₹) *</Label>
          <Input
            id="mrp"
            type="number"
            min="0"
            step="0.01"
            value={formData.mrp}
            onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="selling_price">Selling Price (₹) *</Label>
          <Input
            id="selling_price"
            type="number"
            min="0"
            step="0.01"
            value={formData.selling_price}
            onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="electronics, smartphone, android"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="images">Image URLs (comma separated)</Label>
        <Textarea
          id="images"
          value={formData.images}
          onChange={(e) => setFormData({ ...formData, images: e.target.value })}
          placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
          rows={2}
        />
      </div>
      
      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Product'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/product/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Search, Plus, Filter, ArrowRight, CreditCard } from 'lucide-react';
import { PriceBreakdown } from '@/components/cart/PriceBreakdown';
import { PriceBreakdown as PriceBreakdownType } from '@/utils/priceCalculations';
import SimpleOrderButton from '@/components/cart/SimpleOrderButton';

export const AddMoreProducts = () => {
  const { data: approvedProducts = [], isLoading } = useProducts();
  const { cart, addToCart } = useCart();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdownType | null>(null);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  // Filter products based on search and category
  const filteredProducts = approvedProducts.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(approvedProducts.map(p => p.category).filter(Boolean))];

  const handleAddToCart = (product: any) => {
    addToCart({
      id: `cart_${product.id}`,
      productId: product.id,
      title: product.title,
      price: product.selling_price,
      image: product.images?.[0] || "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop",
      maxStock: product.stock_quantity || 0,
    }, 1);

    toast({
      title: 'Added to cart',
      description: `${product.title} has been added to your cart`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Checkout Section - Shows when cart has items */}
      {cart.itemCount > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span>Ready to Checkout</span>
                <Badge variant="default" className="ml-2">
                  {cart.itemCount} items
                </Badge>
              </div>
              <Badge variant="outline" className="text-lg font-bold">
                ₹{priceBreakdown?.total?.toFixed(2) || cart.total.toFixed(2)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cart Items Summary */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Items in Your Cart
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div>
                <PriceBreakdown 
                  cartTotal={cart.total} 
                  onTotalChange={setPriceBreakdown}
                />
              </div>
            </div>

            {/* Checkout Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <SimpleOrderButton priceBreakdown={priceBreakdown} />
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
              >
                <CreditCard className="w-4 h-4" />
                {showPriceBreakdown ? 'Hide Details' : 'View Details'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add More Products
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                {cart.itemCount} items
              </Badge>
              {cart.itemCount > 0 && (
                <>
                  <Badge variant="default" className="bg-primary">
                    Total: ₹{priceBreakdown?.total?.toFixed(2) || cart.total.toFixed(2)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                  >
                    {showPriceBreakdown ? 'Hide' : 'Show'} Details
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border rounded-md px-3 py-2 bg-background"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Current Cart Summary */}
          {cart.itemCount > 0 && showPriceBreakdown && (
            <div className="bg-muted/50 p-4 rounded-lg border">
              <h4 className="font-medium mb-3">Current Cart Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium mb-2">Items in Cart:</h5>
                  <div className="space-y-1">
                    {cart.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="truncate">{item.title} x{item.quantity}</span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <PriceBreakdown 
                    cartTotal={cart.total} 
                    onTotalChange={setPriceBreakdown}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => {
                const productProps = {
                  id: product.id,
                  title: product.title,
                  price: product.selling_price,
                  originalPrice: product.mrp !== product.selling_price ? product.mrp : undefined,
                  image: product.images?.[0] || "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop",
                  discount: product.mrp !== product.selling_price ? 
                    Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : undefined,
                  stockQuantity: product.stock_quantity || 0,
                  shop_owner_id: product.shop_owner_id,
                };

                return (
                  <div key={product.id} className="relative">
                    <ProductCard {...productProps} />
                    <Button
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock_quantity === 0}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || selectedCategory ? 'No products found' : 'No products available'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Check back soon for amazing deals!'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
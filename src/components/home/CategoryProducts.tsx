import { useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Grid, List, Filter, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const CategoryProducts = () => {
  const { data: approvedProducts = [], isLoading } = useProducts();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'name'>('newest');
  const [showCount, setShowCount] = useState(24);

  // Group products by category
  const categorizedProducts = approvedProducts.reduce((acc: Record<string, any[]>, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({
      id: product.id,
      title: product.title,
      price: product.selling_price,
      originalPrice: product.mrp !== product.selling_price ? product.mrp : undefined,
      image: product.images?.[0] || "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop",
      rating: 4.5,
      reviewCount: Math.floor(Math.random() * 1000) + 100,
      discount: product.mrp !== product.selling_price ? 
        Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : undefined,
      stockQuantity: product.stock_quantity || 0,
      shop_owner_id: product.shop_owner_id,
      sizes: product.sizes,
      category: product.category,
      brand: product.brand,
      createdAt: product.created_at,
    });
    return acc;
  }, {});

  // Sort products within each category
  const sortProducts = (products: any[]) => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.title.localeCompare(b.title);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  };

  const categories = Object.keys(categorizedProducts);
  const allProducts = Object.values(categorizedProducts).flat();
  const sortedAllProducts = sortProducts(allProducts).slice(0, showCount);

  if (isLoading) {
    return (
      <section className="py-8 sm:py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      </section>
    );
  }

  if (allProducts.length === 0) {
    return (
      <section className="py-8 sm:py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">No products available yet</p>
            <p className="text-sm text-muted-foreground">Check back soon for amazing deals!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Shop by Category</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Discover our wide range of products organized by categories for easy browsing
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {Math.min(showCount, allProducts.length)} of {allProducts.length} products
            </span>
            {categories.length > 1 && (
              <Badge variant="outline">
                {categories.length} Categories
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full auto-cols-fr mb-8" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length + 1, 8)}, 1fr)` }}>
            <TabsTrigger value="all" className="flex items-center gap-2">
              All Products
              <Badge variant="secondary" className="ml-1">
                {allProducts.length}
              </Badge>
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                {category}
                <Badge variant="secondary" className="ml-1">
                  {categorizedProducts[category].length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <div className={`grid gap-3 sm:gap-4 md:gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {sortedAllProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
            
            {allProducts.length > showCount && (
              <div className="text-center mt-8">
                <Button 
                  onClick={() => setShowCount(prev => prev + 24)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  Load More Products
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          {categories.map((category) => {
            const categoryProducts = sortProducts(categorizedProducts[category]);
            return (
              <TabsContent key={category} value={category}>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">{category}</h3>
                  <p className="text-muted-foreground">
                    {categoryProducts.length} products available in this category
                  </p>
                </div>
                
                <div className={`grid gap-3 sm:gap-4 md:gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' 
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {categoryProducts.map((product) => (
                    <ProductCard key={product.id} {...product} />
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </section>
  );
};
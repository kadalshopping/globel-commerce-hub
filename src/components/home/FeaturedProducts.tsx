import { ProductCard } from "@/components/product/ProductCard";
import { useProducts } from "@/hooks/useProducts";

export const FeaturedProducts = () => {
  const { data: approvedProducts = [], isLoading } = useProducts();
  
  // Only show approved products from database
  const displayProducts = approvedProducts.slice(0, 12).map(product => ({
    id: product.id,
    title: product.title,
    price: product.selling_price,
    originalPrice: product.mrp !== product.selling_price ? product.mrp : undefined,
    image: product.images?.[0] || "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=300&h=300&fit=crop&q=75",
    discount: product.mrp !== product.selling_price ? 
      Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : undefined,
    stockQuantity: product.stock_quantity || 0,
  }));

  return (
    <section className="py-8 sm:py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Featured Products</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Discover our handpicked selection of trending products with amazing deals and fast shipping
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">No products available yet</p>
            <p className="text-sm text-muted-foreground">Check back soon for amazing deals!</p>
          </div>
        )}
      </div>
    </section>
  );
};
import { ProductCard } from "@/components/product/ProductCard";
import { useProducts } from "@/hooks/useProducts";

// Fallback products for when database is empty
const fallbackProducts = [
  {
    id: "1",
    title: "Wireless Bluetooth Headphones with Noise Cancellation",
    price: 7499,
    originalPrice: 10999,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 1284,
    discount: 31,
  },
  {
    id: "2",
    title: "Premium Cotton T-Shirt - Comfortable Everyday Wear",
    price: 1999,
    originalPrice: 3199,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    rating: 4.3,
    reviewCount: 892,
    discount: 38,
  },
  {
    id: "3",
    title: "Smart Watch with Fitness Tracking and Heart Monitor",
    price: 16999,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 2156,
  },
  {
    id: "4",
    title: "Professional Camera Lens 50mm f/1.8 for Photography",
    price: 37999,
    originalPrice: 49999,
    image: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 756,
    discount: 25,
  },
  {
    id: "5",
    title: "Gaming Mechanical Keyboard RGB Backlight",
    price: 10999,
    image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop",
    rating: 4.4,
    reviewCount: 1432,
  },
  {
    id: "6",
    title: "Portable Power Bank 20000mAh Fast Charging",
    price: 3299,
    originalPrice: 4999,
    image: "https://images.unsplash.com/photo-1609592094725-7bb71b0b8f39?w=400&h=400&fit=crop",
    rating: 4.2,
    reviewCount: 967,
    discount: 33,
  },
];

export const FeaturedProducts = () => {
  const { data: approvedProducts = [], isLoading } = useProducts();
  
  // Use approved products from database, fallback to static products if empty
  const displayProducts = approvedProducts.length > 0 ? 
    approvedProducts.slice(0, 6).map(product => ({
      id: product.id,
      title: product.title,
      price: product.selling_price,
      originalPrice: product.mrp !== product.selling_price ? product.mrp : undefined,
      image: product.images?.[0] || "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop",
      rating: 4.5, // Default rating since we don't have reviews yet
      reviewCount: Math.floor(Math.random() * 1000) + 100, // Random review count for demo
      discount: product.mrp !== product.selling_price ? 
        Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : undefined,
    })) : 
    fallbackProducts;

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our handpicked selection of trending products with amazing deals and fast shipping
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
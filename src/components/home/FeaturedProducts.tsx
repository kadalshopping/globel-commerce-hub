import { ProductCard } from "@/components/product/ProductCard";

const featuredProducts = [
  {
    id: "1",
    title: "Wireless Bluetooth Headphones with Noise Cancellation",
    price: 89.99,
    originalPrice: 129.99,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 1284,
    discount: 31,
  },
  {
    id: "2",
    title: "Premium Cotton T-Shirt - Comfortable Everyday Wear",
    price: 24.99,
    originalPrice: 39.99,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    rating: 4.3,
    reviewCount: 892,
    discount: 38,
  },
  {
    id: "3",
    title: "Smart Watch with Fitness Tracking and Heart Monitor",
    price: 199.99,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 2156,
  },
  {
    id: "4",
    title: "Professional Camera Lens 50mm f/1.8 for Photography",
    price: 449.99,
    originalPrice: 599.99,
    image: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 756,
    discount: 25,
  },
  {
    id: "5",
    title: "Gaming Mechanical Keyboard RGB Backlight",
    price: 129.99,
    image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop",
    rating: 4.4,
    reviewCount: 1432,
  },
  {
    id: "6",
    title: "Portable Power Bank 20000mAh Fast Charging",
    price: 39.99,
    originalPrice: 59.99,
    image: "https://images.unsplash.com/photo-1609592094725-7bb71b0b8f39?w=400&h=400&fit=crop",
    rating: 4.2,
    reviewCount: 967,
    discount: 33,
  },
];

export const FeaturedProducts = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our handpicked selection of trending products with amazing deals and fast shipping
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
};
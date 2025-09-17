import { ProductCard } from "@/components/product/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { getResponsiveImageSources } from "@/utils/imageOptimization";

interface SimilarProductsProps {
  currentProductId: string;
  category?: string;
}

export const SimilarProducts = ({ currentProductId, category }: SimilarProductsProps) => {
  const { data: products = [] } = useProducts();
  
  // Filter similar products based on category, excluding current product
  const similarProducts = products
    .filter(product => 
      product.id !== currentProductId && 
      product.status === 'approved' &&
      (!category || product.category === category)
    )
    .slice(0, 8) // Limit to 8 products
    .map(product => ({
      id: product.id,
      title: product.title,
      price: product.selling_price,
      originalPrice: product.mrp !== product.selling_price ? product.mrp : undefined,
      image: product.images?.[0] ? getResponsiveImageSources(product.images[0]).thumbnail : "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=150&h=150&fit=crop&q=60",
      rating: 4.5, // Default rating
      reviewCount: Math.floor(Math.random() * 1000) + 100, // Random review count for demo
      discount: product.mrp !== product.selling_price ? 
        Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : undefined,
      stockQuantity: product.stock_quantity || 0,
    }));

  if (similarProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Similar Products</h2>
        <p className="text-muted-foreground">
          {category ? `More products in ${category}` : 'You might also like these products'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {similarProducts.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
};
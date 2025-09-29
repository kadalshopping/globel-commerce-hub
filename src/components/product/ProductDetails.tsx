import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, Heart, Minus, Plus, Package, Truck, Shield, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "@/types/product";
import { useProductRating } from "@/hooks/useReviews";
import { ReviewSection } from "./ReviewSection";
import { ImageWithSkeleton } from "@/components/ui/image-skeleton";
import { SEOHead } from "@/components/seo/SEOHead";
import { generateProductSchema, generateBreadcrumbSchema } from "@/utils/structuredData";
import { useSEO } from "@/hooks/useSEO";
import { BuyNowButton } from "./BuyNowButton";
import { useTrackProductView } from "@/hooks/useRecentlyViewed";
import { SizeSelector } from "./SizeSelector";

interface ProductDetailsProps {
  product: Product;
}

export const ProductDetails = ({ product }: ProductDetailsProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("");
  
  const navigate = useNavigate();
  const { data: rating } = useProductRating(product.id);
  const { trackProductView } = useSEO();
  const { trackView } = useTrackProductView();
  
  const images = product.images && product.images.length > 0 
    ? product.images 
    : ["https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&h=600&fit=crop&q=80"];
  
  const discount = product.mrp !== product.selling_price ? 
    Math.round(((product.mrp - product.selling_price) / product.mrp) * 100) : 0;

  // Track product view
  useState(() => {
    trackProductView(product.id, product.title, product.category);
    // Also track for recently viewed
    trackView(product);
  });

  // Generate SEO data
  const productSchema = generateProductSchema(product);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: product.category || "Products", url: `/category/${product.category || 'all'}` },
    { name: product.title, url: `/product/${product.id}` }
  ]);

  const seoDescription = product.description || 
    `Buy ${product.title} for ₹${product.selling_price.toLocaleString('en-IN')}. ${product.brand ? `${product.brand} brand. ` : ''}${discount > 0 ? `${discount}% off. ` : ''}Free delivery available.`;
  
  const seoKeywords = [
    product.title,
    product.brand,
    product.category,
    'online shopping',
    'buy online',
    'fast delivery',
    ...(product.tags || [])
  ].filter(Boolean).join(', ');
  

  return (
    <>
      <SEOHead 
        title={product.title}
        description={seoDescription}
        ogType="product"
        ogImage={images[0]}
        keywords={seoKeywords}
        schema={[productSchema, breadcrumbSchema]}
      />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
      {/* Product Images - Enhanced Layout */}
      <div className="space-y-4">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted group shadow-lg">
          <ImageWithSkeleton
            src={images[selectedImageIndex]}
            alt={product.title}
            className="h-full w-full object-cover rounded-xl transition-all duration-500 group-hover:scale-105"
            skeletonClassName="aspect-square rounded-xl"
            priority={true}
            optimizeSize={{ width: 600, height: 600, quality: 85 }}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setSelectedImageIndex(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedImageIndex(selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          
          {/* Image Indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    selectedImageIndex === index 
                      ? 'bg-white scale-125 shadow-sm' 
                      : 'bg-white/60 hover:bg-white/80'
                  }`}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          )}
          
          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
              {selectedImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
        
        {/* Thumbnail Gallery - Enhanced */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 hover:shadow-md ${
                  selectedImageIndex === index 
                    ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                    : 'border-muted hover:border-muted-foreground'
                }`}
              >
                <ImageWithSkeleton
                  src={image}
                  alt={`${product.title} ${index + 1}`}
                  className="h-full w-full object-cover"
                  skeletonClassName="w-20 h-20"
                  optimizeSize={{ width: 80, height: 80, quality: 70 }}
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {product.category && (
              <Badge variant="secondary" className="text-xs">
                {product.category}
              </Badge>
            )}
            {product.brand && (
              <span className="text-sm text-muted-foreground">by {product.brand}</span>
            )}
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{product.title}</h1>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(rating?.average_rating || 0)
                      ? 'fill-accent text-accent' 
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {rating ? `(${rating.average_rating}) • ${rating.review_count} review${rating.review_count !== 1 ? 's' : ''}` : 'No reviews yet'}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-primary">
              ₹{product.selling_price.toLocaleString('en-IN')}
            </span>
            {product.mrp !== product.selling_price && (
              <span className="text-lg text-muted-foreground line-through">
                ₹{product.mrp.toLocaleString('en-IN')}
              </span>
            )}
            {discount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                -{discount}%
              </Badge>
            )}
          </div>
          {discount > 0 && (
            <p className="text-sm text-green-600">
              You save ₹{(product.mrp - product.selling_price).toLocaleString('en-IN')}
            </p>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Description</h3>
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{product.description}</p>
          </div>
        )}

        {/* Stock & SKU */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Stock: {product.stock_quantity || 0} available</span>
          </div>
          {product.sku && (
            <div className="text-muted-foreground">
              SKU: {product.sku}
            </div>
          )}
        </div>

        {/* Size Selection */}
        {product.sizes && product.sizes.length > 0 && (
          <SizeSelector
            sizes={product.sizes}
            selectedSize={selectedSize}
            onSizeSelect={setSelectedSize}
            className="space-y-2"
          />
        )}

        {/* Quantity Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Quantity:</span>
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="px-3 py-2 min-w-[3rem] text-center">{quantity}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.min(product.stock_quantity || 0, quantity + 1))}
                disabled={quantity >= (product.stock_quantity || 0)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <BuyNowButton
            product={{
              id: product.id,
              title: product.title,
              selling_price: product.selling_price,
              stock_quantity: product.stock_quantity,
              image: images[0],
              shop_owner_id: product.shop_owner_id,
              sizes: product.sizes,
            }}
            quantity={quantity}
            selectedSize={selectedSize}
            className="flex-1 h-12"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsWishlisted(!isWishlisted)}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-destructive text-destructive' : ''}`} />
          </Button>
        </div>

        <Separator />

        {/* Features */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-primary" />
            <span>Free Delivery</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="h-4 w-4 text-primary" />
            <span>30-day Returns</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            <span>2 Year Warranty</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-primary" />
            <span>Secure Packaging</span>
          </div>
        </div>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Reviews Section */}
    <ReviewSection productId={product.id} />
  </>
  );
};
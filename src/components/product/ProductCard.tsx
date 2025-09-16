import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProductRating } from "@/hooks/useReviews";
import { ImageWithSkeleton } from "@/components/ui/image-skeleton";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  discount?: number;
  isWishlisted?: boolean;
  stockQuantity?: number;
}

export const ProductCard = ({
  id,
  title,
  price,
  originalPrice,
  image,
  discount,
  isWishlisted = false,
  stockQuantity = 0,
}: ProductCardProps) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: rating } = useProductRating(id);

  const handleAddToCart = () => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    if (stockQuantity <= 0) {
      toast({
        title: "Out of Stock",
        description: "This item is currently out of stock.",
        variant: "destructive",
      });
      return;
    }

    addToCart({
      id: `cart_${id}`,
      productId: id,
      title,
      price,
      image,
      maxStock: stockQuantity,
    });
  };
  const handleCardClick = () => {
    navigate(`/product/${id}`);
  };

  return (
    <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-glow transition-all duration-300 bg-gradient-card cursor-pointer" onClick={handleCardClick}>
      {/* Discount badge */}
      {discount && (
        <Badge className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10 bg-destructive text-destructive-foreground text-xs">
          -{discount}%
        </Badge>
      )}

      {/* Wishlist button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 sm:top-2 sm:right-2 z-10 h-6 w-6 sm:h-8 sm:w-8 bg-background/80 hover:bg-background"
      >
        <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${isWishlisted ? 'fill-destructive text-destructive' : ''}`} />
      </Button>

      {/* Product image */}
      <div className="aspect-square overflow-hidden">
        <ImageWithSkeleton
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          skeletonClassName="aspect-square"
          optimizeSize={{ width: 300, height: 300, quality: 75 }}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
        />
      </div>

      {/* Product info */}
      <div className="p-2 sm:p-4">
        <h3 className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 mb-2 leading-tight">
          {title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-2 w-2 sm:h-3 sm:w-3 ${
                  i < Math.floor(rating?.average_rating || 0)
                    ? 'fill-accent text-accent'
                    : 'text-muted-foreground'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            ({rating?.review_count || 0})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
          <span className="text-sm sm:text-lg font-bold text-primary">₹{price.toLocaleString('en-IN')}</span>
          {originalPrice && (
            <span className="text-xs sm:text-sm text-muted-foreground line-through">
              ₹{originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Add to cart button */}
        <Button 
          variant="cart" 
          className="w-full text-xs sm:text-sm h-8 sm:h-10" 
          onClick={(e) => {
            e.stopPropagation();
            handleAddToCart();
          }}
        >
          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
};
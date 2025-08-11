import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Heart, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  discount?: number;
  isWishlisted?: boolean;
}

export const ProductCard = ({
  title,
  price,
  originalPrice,
  image,
  rating,
  reviewCount,
  discount,
  isWishlisted = false,
}: ProductCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAddToCart = () => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    // Add to cart logic here
    toast({
      title: "Added to Cart",
      description: `${title} has been added to your cart.`,
    });
  };
  return (
    <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-glow transition-all duration-300 bg-gradient-card">
      {/* Discount badge */}
      {discount && (
        <Badge className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground">
          -{discount}%
        </Badge>
      )}

      {/* Wishlist button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 hover:bg-background"
      >
        <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-destructive text-destructive' : ''}`} />
      </Button>

      {/* Product image */}
      <div className="aspect-square overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>

      {/* Product info */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2">
          {title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < Math.floor(rating)
                    ? 'fill-accent text-accent'
                    : 'text-muted-foreground'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">({reviewCount})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-primary">₹{price.toLocaleString('en-IN')}</span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Add to cart button */}
        <Button variant="cart" className="w-full" onClick={handleAddToCart}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </Card>
  );
};
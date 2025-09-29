import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag } from "lucide-react";

interface BuyNowButtonProps {
  product: {
    id: string;
    title: string;
    selling_price: number;
    stock_quantity?: number;
    image?: string;
    shop_owner_id?: string;
    sizes?: string[];
  };
  quantity?: number;
  selectedSize?: string;
  className?: string;
}


export const BuyNowButton = ({ product, quantity = 1, selectedSize, className }: BuyNowButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleBuyNow = () => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast({
        title: "Size Required",
        description: "Please select a size before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    if (!product.stock_quantity || product.stock_quantity < quantity) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.stock_quantity || 0} items available.`,
        variant: "destructive",
      });
      return;
    }

    // Navigate to checkout page with product data
    const params = new URLSearchParams({
      product: product.id,
      title: product.title,
      price: product.selling_price.toString(),
      quantity: quantity.toString(),
      ...(selectedSize && { size: selectedSize }),
      ...(product.image && { image: product.image }),
      ...(product.stock_quantity && { stock: product.stock_quantity.toString() }),
      ...(product.shop_owner_id && { shop_owner: product.shop_owner_id }),
    });

    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <Button 
      onClick={handleBuyNow}
      disabled={!product.stock_quantity || product.stock_quantity < quantity}
      className={className}
    >
      <ShoppingBag className="h-4 w-4 mr-2" />
      Buy Now
    </Button>
  );
};
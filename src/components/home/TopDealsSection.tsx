import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  Star,
  Timer,
  TrendingUp
} from "lucide-react";
import { ImageWithSkeleton } from "@/components/ui/image-skeleton";
import { BuyNowButton } from "@/components/product/BuyNowButton";
import { useSwipe } from "@/hooks/useSwipe";

interface TopDeal {
  id: string;
  title: string;
  selling_price: number;
  mrp: number;
  images: string[];
  stock_quantity: number;
  shop_owner_id: string;
  discount_percentage: number;
}

export const TopDealsSection = () => {
  const [deals, setDeals] = useState<TopDeal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 hours in seconds
  const navigate = useNavigate();

  useEffect(() => {
    fetchTopDeals();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 24 * 60 * 60));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchTopDeals = async () => {
    try {
      // Fetch products with highest discount percentage
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved')
        .gt('stock_quantity', 0)
        .gt('discount_percentage', 10) // Only items with >10% discount
        .order('discount_percentage', { ascending: false })
        .limit(8);

      if (error) throw error;

      const dealsData: TopDeal[] = (data || []).map(product => ({
        ...product,
        discount_percentage: product.mrp !== product.selling_price 
          ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
          : product.discount_percentage || 0
      }));

      setDeals(dealsData);
    } catch (error) {
      console.error('Error fetching top deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < deals.length - 12) {
      setCurrentIndex(currentIndex + 12);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(Math.max(0, currentIndex - 12));
    }
  };

  const handleProductClick = (deal: TopDeal) => {
    navigate(`/product/${deal.id}`);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const visibleDeals = deals.slice(currentIndex, Math.min(currentIndex + 12, deals.length));
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex + 12 < deals.length;

  // Add swipe functionality
  const swipeHandlers = useSwipe({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
  });

  if (loading || deals.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Zap className="h-7 w-7 text-red-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-700">Top Deals of the Day</h2>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-sm text-red-600 font-medium">
                  Limited time offers • Up to 70% OFF
                </p>
                <div className="flex items-center gap-1 text-red-600">
                  <Timer className="h-4 w-4" />
                  <span className="font-mono font-bold">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/?filter=deals')}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              View All Deals
            </Button>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                disabled={!canScrollLeft}
                className="h-8 w-8 border-red-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={!canScrollRight}
                className="h-8 w-8 border-red-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div 
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 touch-pan-y"
          {...swipeHandlers}
        >
          {visibleDeals.map((deal) => (
            <Card
              key={deal.id}
              className="group relative overflow-hidden border-red-200 hover:shadow-xl transition-all duration-300 bg-white"
            >
              {/* Deal Badge */}
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-red-600 text-white font-bold animate-pulse">
                  {deal.discount_percentage}% OFF
                </Badge>
              </div>

              {/* Trending Badge */}
              <div className="absolute top-2 right-2 z-10">
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  HOT
                </Badge>
              </div>

              {/* Product Image */}
              <div 
                className="aspect-square overflow-hidden cursor-pointer"
                onClick={() => handleProductClick(deal)}
              >
                <ImageWithSkeleton
                  src={deal.images?.[0] || "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop&q=80"}
                  alt={deal.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  skeletonClassName="aspect-square"
                  optimizeSize={{ width: 300, height: 300, quality: 80 }}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 
                  className="font-semibold text-sm line-clamp-2 mb-2 cursor-pointer hover:text-primary"
                  onClick={() => handleProductClick(deal)}
                >
                  {deal.title}
                </h3>

                {/* Rating (placeholder) */}
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">(4.2)</span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-red-600">
                    ₹{deal.selling_price.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{deal.mrp.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Buy Now Button */}
                <BuyNowButton
                  product={{
                    id: deal.id,
                    title: deal.title,
                    selling_price: deal.selling_price,
                    stock_quantity: deal.stock_quantity,
                    image: deal.images?.[0],
                    shop_owner_id: deal.shop_owner_id,
                  }}
                  className="w-full h-9 text-sm bg-red-600 hover:bg-red-700 border-red-600"
                />

                {/* Stock Indicator */}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-orange-600 font-medium">
                    Only {deal.stock_quantity} left!
                  </span>
                  <span className="text-muted-foreground">
                    Ends in {formatTime(timeLeft)}
                  </span>
                </div>

                {/* Progress Bar for Stock */}
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.max(20, Math.min(80, (deal.stock_quantity / 100) * 100))}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination dots - Updated condition */}
        {deals.length > 12 && (
          <div className="flex justify-center mt-6">
            <div className="flex gap-2">
              {Array.from({ length: Math.ceil(deals.length / 12) }).map((_, index) => (
                <button
                  key={index}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    Math.floor(currentIndex / 12) === index
                      ? 'bg-red-600'
                      : 'bg-red-200 hover:bg-red-300'
                  }`}
                  onClick={() => setCurrentIndex(index * 12)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
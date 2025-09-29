import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithSkeleton } from "@/components/ui/image-skeleton";
import { useSwipe } from "@/hooks/useSwipe";

interface RecentlyViewedItem {
  id: string;
  title: string;
  price: number;
  image: string;
  viewedAt: number;
}

export const RecentlyViewedSection = () => {
  const [recentItems, setRecentItems] = useState<RecentlyViewedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Load recently viewed items from localStorage
    const loadRecentlyViewed = () => {
      try {
        const stored = localStorage.getItem('recently-viewed-products');
        if (stored) {
          const items = JSON.parse(stored);
          setRecentItems(items.slice(0, 10)); // Show max 10 items
        }
      } catch (error) {
        console.error('Error loading recently viewed items:', error);
      }
    };

    loadRecentlyViewed();
  }, []);

  const handleNext = () => {
    if (currentIndex < recentItems.length - 12) {
      setCurrentIndex(currentIndex + 12);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(Math.max(0, currentIndex - 12));
    }
  };

  const handleProductClick = (item: RecentlyViewedItem) => {
    navigate(`/product/${item.id}`);
  };

  const clearRecentlyViewed = () => {
    localStorage.removeItem('recently-viewed-products');
    setRecentItems([]);
  };

  const visibleItems = recentItems.slice(currentIndex, Math.min(currentIndex + 12, recentItems.length));
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex + 12 < recentItems.length;

  // Add swipe functionality
  const swipeHandlers = useSwipe({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
  });

  if (recentItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-background border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Recently Viewed</h2>
              <p className="text-sm text-muted-foreground">
                Continue shopping from where you left off
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRecentlyViewed}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                disabled={!canScrollLeft}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={!canScrollRight}
                className="h-8 w-8"
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
          {visibleItems.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => handleProductClick(item)}
            >
              <div className="aspect-square overflow-hidden rounded-t-lg">
                <ImageWithSkeleton
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  skeletonClassName="aspect-square"
                  optimizeSize={{ width: 200, height: 200, quality: 75 }}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                />
              </div>
              
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 mb-2 h-10">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Viewed
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {recentItems.length > 12 && (
          <div className="flex justify-center mt-4">
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(recentItems.length / 12) }).map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    Math.floor(currentIndex / 12) === index
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30'
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
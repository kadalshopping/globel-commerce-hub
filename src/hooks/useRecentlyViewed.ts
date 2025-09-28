import { useEffect } from 'react';

interface RecentlyViewedItem {
  id: string;
  title: string;
  price: number;
  image: string;
  viewedAt: number;
}

const STORAGE_KEY = 'recently-viewed-products';
const MAX_ITEMS = 10;

export const useRecentlyViewed = () => {
  const addToRecentlyViewed = (product: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentlyViewedItem[];
      
      // Remove existing item if it exists
      const filtered = existing.filter(item => item.id !== product.id);
      
      // Add new item at the beginning
      const updated = [
        { ...product, viewedAt: Date.now() },
        ...filtered
      ].slice(0, MAX_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving to recently viewed:', error);
    }
  };

  const getRecentlyViewed = (): RecentlyViewedItem[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
      console.error('Error loading recently viewed:', error);
      return [];
    }
  };

  const clearRecentlyViewed = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    addToRecentlyViewed,
    getRecentlyViewed,
    clearRecentlyViewed,
  };
};

// Hook to automatically track product views
export const useTrackProductView = () => {
  const { addToRecentlyViewed } = useRecentlyViewed();

  const trackView = (product: {
    id: string;
    title: string;
    selling_price: number;
    images?: string[];
  }) => {
    const image = product.images && product.images.length > 0 
      ? product.images[0] 
      : "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop&q=80";

    addToRecentlyViewed({
      id: product.id,
      title: product.title,
      price: product.selling_price,
      image,
    });
  };

  return { trackView };
};
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useSEO = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page views for analytics
    if (typeof window.gtag !== 'undefined') {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: location.pathname,
      });
    }
  }, [location]);

  const trackEvent = (eventName: string, parameters?: object) => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', eventName, parameters);
    }
  };

  const trackPurchase = (transactionId: string, value: number, items: any[]) => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'purchase', {
        transaction_id: transactionId,
        value: value,
        currency: 'INR',
        items: items
      });
    }
  };

  const trackProductView = (productId: string, productName: string, category?: string) => {
    trackEvent('view_item', {
      currency: 'INR',
      value: 0,
      items: [{
        item_id: productId,
        item_name: productName,
        item_category: category
      }]
    });
  };

  const trackAddToCart = (productId: string, productName: string, price: number) => {
    trackEvent('add_to_cart', {
      currency: 'INR',
      value: price,
      items: [{
        item_id: productId,
        item_name: productName,
        price: price,
        quantity: 1
      }]
    });
  };

  return {
    trackEvent,
    trackPurchase,
    trackProductView,
    trackAddToCart
  };
};
// Utility functions for image optimization

export const getOptimizedImageUrl = (
  baseUrl: string, 
  width: number, 
  height?: number, 
  quality: number = 85
): string => {
  // Handle Unsplash URLs
  if (baseUrl.includes('unsplash.com')) {
    const url = new URL(baseUrl);
    url.searchParams.set('w', width.toString());
    if (height) {
      url.searchParams.set('h', height.toString());
    }
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('q', quality.toString());
    return url.toString();
  }
  
  // For other URLs, return as-is for now
  return baseUrl;
};

export const getResponsiveImageSources = (baseUrl: string) => {
  return {
    icon: getOptimizedImageUrl(baseUrl, 64, 64, 60),
    thumbnail: getOptimizedImageUrl(baseUrl, 200, 200, 70),
    small: getOptimizedImageUrl(baseUrl, 400, 400, 75),
    medium: getOptimizedImageUrl(baseUrl, 600, 600, 80),
    large: getOptimizedImageUrl(baseUrl, 800, 800, 85),
    hero: getOptimizedImageUrl(baseUrl, 1200, 600, 80),
  };
};

export const getImageSrcSet = (baseUrl: string) => {
  const sources = getResponsiveImageSources(baseUrl);
  return `${sources.small} 400w, ${sources.medium} 600w, ${sources.large} 800w`;
};
// Utility functions for image optimization with fast CDN support

export const getOptimizedImageUrl = (
  baseUrl: string, 
  width: number, 
  height?: number, 
  quality: number = 85
): string => {
  // Handle Unsplash URLs with aggressive optimization for speed
  if (baseUrl.includes('unsplash.com')) {
    const url = new URL(baseUrl);
    url.searchParams.set('w', width.toString());
    if (height) {
      url.searchParams.set('h', height.toString());
    }
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('q', Math.min(quality, 70).toString()); // Cap quality for speed
    url.searchParams.set('auto', 'format'); // Auto WebP/AVIF
    url.searchParams.set('fm', 'webp'); // Force WebP for faster loading
    return url.toString();
  }

  // Handle GitHub raw URLs via jsDelivr CDN for faster loading
  if (baseUrl.includes('github.com') || baseUrl.includes('githubusercontent.com')) {
    const githubUrl = baseUrl.replace('github.com', 'cdn.jsdelivr.net/gh')
                             .replace('githubusercontent.com', 'cdn.jsdelivr.net/gh')
                             .replace('/raw/', '@main/');
    return githubUrl;
  }

  // Handle other CDN optimization
  if (baseUrl.includes('images.unsplash.com')) {
    return `${baseUrl}?w=${width}&h=${height || width}&fit=crop&q=${Math.min(quality, 70)}&auto=format&fm=webp`;
  }
  
  // For other URLs, return as-is
  return baseUrl;
};

export const getResponsiveImageSources = (baseUrl: string) => {
  return {
    icon: getOptimizedImageUrl(baseUrl, 48, 48, 40), // Smaller and lower quality for speed
    thumbnail: getOptimizedImageUrl(baseUrl, 120, 120, 45), // Reduced size for faster load
    small: getOptimizedImageUrl(baseUrl, 200, 200, 50), // Smaller for mobile speed
    medium: getOptimizedImageUrl(baseUrl, 350, 350, 60),
    large: getOptimizedImageUrl(baseUrl, 500, 500, 65),
    hero: getOptimizedImageUrl(baseUrl, 1200, 600, 75),
  };
};

// Fast loading preset for product icons
export const getFastIconUrl = (baseUrl: string) => {
  return getOptimizedImageUrl(baseUrl, 48, 48, 35); // Ultra-small, ultra-fast
};

export const getImageSrcSet = (baseUrl: string) => {
  const sources = getResponsiveImageSources(baseUrl);
  return `${sources.small} 400w, ${sources.medium} 600w, ${sources.large} 800w`;
};
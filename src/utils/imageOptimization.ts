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
    icon: getOptimizedImageUrl(baseUrl, 32, 32, 30), // Ultra-small for instant loading
    thumbnail: getOptimizedImageUrl(baseUrl, 80, 80, 35), // Much smaller for speed
    small: getOptimizedImageUrl(baseUrl, 150, 150, 40), // Reduced for mobile
    medium: getOptimizedImageUrl(baseUrl, 250, 250, 45), // Smaller medium size
    large: getOptimizedImageUrl(baseUrl, 400, 400, 50), // Reduced large size
    hero: getOptimizedImageUrl(baseUrl, 800, 400, 60), // Smaller hero images
  };
};

// Fast loading preset for product icons
export const getFastIconUrl = (baseUrl: string) => {
  return getOptimizedImageUrl(baseUrl, 32, 32, 25); // Tiny size, maximum speed
};

export const getImageSrcSet = (baseUrl: string) => {
  const sources = getResponsiveImageSources(baseUrl);
  return `${sources.small} 300w, ${sources.medium} 500w, ${sources.large} 700w`;
};
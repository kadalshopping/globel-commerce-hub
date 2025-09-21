import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getOptimizedImageUrl, getImageSrcSet } from "@/utils/imageOptimization";

interface ImageWithSkeletonProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  priority?: boolean;
  optimizeSize?: { width: number; height?: number; quality?: number };
}

export const ImageWithSkeleton = ({ 
  src, 
  alt, 
  className, 
  skeletonClassName, 
  priority = false,
  optimizeSize,
  ...props 
}: ImageWithSkeletonProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const optimizedSrc = optimizeSize 
    ? getOptimizedImageUrl(src, optimizeSize.width, optimizeSize.height, optimizeSize.quality || 50)
    : src;

  const srcSet = getImageSrcSet(src);

  // Preload critical images for faster loading
  const shouldPreload = priority || (optimizeSize && optimizeSize.width <= 100);

  return (
    <div className="relative overflow-hidden">
      {!isLoaded && !hasError && (
        <Skeleton className={cn("absolute inset-0", skeletonClassName)} />
      )}
      {shouldPreload && (
        <link rel="preload" as="image" href={optimizedSrc} />
      )}
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        alt={alt}
        className={cn(
          "transition-opacity duration-200", // Faster transition
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        loading={shouldPreload ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={shouldPreload ? "high" : "low"}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...props}
      />
      {hasError && (
        <div className={cn("absolute inset-0 bg-muted flex items-center justify-center", skeletonClassName)}>
          <span className="text-xs text-muted-foreground">Failed to load</span>
        </div>
      )}
    </div>
  );
};
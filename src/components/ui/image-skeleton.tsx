import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  priority?: boolean;
}

export const ImageWithSkeleton = ({ 
  src, 
  alt, 
  className, 
  skeletonClassName, 
  priority = false,
  ...props 
}: ImageWithSkeletonProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {!isLoaded && !hasError && (
        <Skeleton className={cn("absolute inset-0", skeletonClassName)} />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
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
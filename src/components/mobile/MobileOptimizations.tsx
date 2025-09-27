import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export const MobileOptimizations = () => {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      // Add mobile-specific optimizations
      document.documentElement.style.setProperty('--mobile-vh', `${window.innerHeight * 0.01}px`);
      
      // Prevent zoom on input focus (iOS Safari)
      const preventZoom = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
          target.style.fontSize = '16px';
        }
      };

      // Add touch-friendly scrolling
      document.body.style.overscrollBehavior = 'contain';
      document.body.style.touchAction = 'pan-x pan-y';
      
      // Optimize for mobile performance
      document.body.classList.add('mobile-optimized');

      document.addEventListener('focusin', preventZoom);
      
      return () => {
        document.removeEventListener('focusin', preventZoom);
        document.body.classList.remove('mobile-optimized');
      };
    }
  }, [isMobile]);

  // Add mobile-specific CSS variables
  useEffect(() => {
    const updateMobileHeight = () => {
      document.documentElement.style.setProperty('--mobile-vh', `${window.innerHeight * 0.01}px`);
    };

    window.addEventListener('resize', updateMobileHeight);
    updateMobileHeight();

    return () => window.removeEventListener('resize', updateMobileHeight);
  }, []);

  return null; // This component only handles side effects
};
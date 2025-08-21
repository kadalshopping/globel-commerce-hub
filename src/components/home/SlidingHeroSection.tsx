import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroImage1 from "@/assets/hero-banner.jpg";
import heroImage2 from "@/assets/hero-slide-1.jpg";
import heroImage3 from "@/assets/hero-slide-2.jpg";
import heroImage4 from "@/assets/hero-slide-3.jpg";

const heroSlides = [
  {
    image: heroImage1,
    title: "Discover Amazing Products",
    subtitle: "Shop millions of products from trusted sellers worldwide. Great deals, fast shipping, and excellent customer service.",
  },
  {
    image: heroImage2,
    title: "Modern Shopping Experience", 
    subtitle: "Experience the future of online shopping with our curated collection of premium products and seamless checkout.",
  },
  {
    image: heroImage3,
    title: "Trendy Lifestyle Products",
    subtitle: "Stay ahead with the latest trends. Find unique products that match your style and personality.",
  },
  {
    image: heroImage4,
    title: "Premium Quality Guaranteed",
    subtitle: "Luxury meets affordability. Every product is carefully selected for quality and value.",
  },
];

export const SlidingHeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000); // Auto-slide every 5 seconds

    return () => clearInterval(timer);
  }, [currentSlide]);

  const nextSlide = () => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        setIsTransitioning(false);
      }, 200);
    }
  };

  const prevSlide = () => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
        setIsTransitioning(false);
      }, 200);
    }
  };

  const goToSlide = (index: number) => {
    if (!isTransitioning && index !== currentSlide) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(index);
        setIsTransitioning(false);
      }, 200);
    }
  };

  return (
    <section className="relative h-64 sm:h-80 md:h-96 bg-gradient-hero overflow-hidden">
      {/* Background Images */}
      <div className="absolute inset-0">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            } ${isTransitioning ? 'slide-bg-exit' : 'slide-bg-enter'}`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover opacity-30"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-hero opacity-80"></div>
      </div>
      
      {/* Content */}
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl text-primary-foreground">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight animate-fade-in">
            {heroSlides[currentSlide].title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 opacity-90 leading-relaxed animate-fade-in">
            {heroSlides[currentSlide].subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 animate-fade-in">
            <Button variant="hero" size="lg" className="w-full sm:w-auto hover-scale">
              Shop Now
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary hover-scale"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-200 hover-scale z-10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all duration-200 hover-scale z-10"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 hover-scale ${
              index === currentSlide 
                ? 'bg-primary-foreground w-6' 
                : 'bg-primary-foreground/50 hover:bg-primary-foreground/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-5 right-5 sm:top-10 sm:right-10 w-10 h-10 sm:w-20 sm:h-20 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-5 left-5 sm:bottom-10 sm:left-10 w-16 h-16 sm:w-32 sm:h-32 bg-primary-foreground/10 rounded-full blur-2xl animate-pulse"></div>
    </section>
  );
};
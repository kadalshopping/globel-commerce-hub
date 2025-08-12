import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-banner.jpg";

export const HeroSection = () => {
  return (
    <section className="relative h-64 sm:h-80 md:h-96 bg-gradient-hero overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Shop thousands of products"
          className="w-full h-full object-cover opacity-20"
        />
      </div>
      
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl text-primary-foreground">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
            Discover Amazing Products
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 opacity-90 leading-relaxed">
            Shop millions of products from trusted sellers worldwide. 
            Great deals, fast shipping, and excellent customer service.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button variant="hero" size="lg" className="w-full sm:w-auto">
              Shop Now
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="w-full sm:w-auto border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-5 right-5 sm:top-10 sm:right-10 w-10 h-10 sm:w-20 sm:h-20 bg-accent/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-5 left-5 sm:bottom-10 sm:left-10 w-16 h-16 sm:w-32 sm:h-32 bg-primary-foreground/10 rounded-full blur-2xl"></div>
    </section>
  );
};
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-banner.jpg";

export const HeroSection = () => {
  return (
    <section className="relative h-96 bg-gradient-hero overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Shop thousands of products"
          className="w-full h-full object-cover opacity-20"
        />
      </div>
      
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl text-primary-foreground">
          <h1 className="text-5xl font-bold mb-4">
            Discover Amazing Products
          </h1>
          <p className="text-xl mb-6 opacity-90">
            Shop millions of products from trusted sellers worldwide. 
            Great deals, fast shipping, and excellent customer service.
          </p>
          <div className="flex gap-4">
            <Button variant="hero" size="lg">
              Shop Now
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-10 right-10 w-20 h-20 bg-accent/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-10 left-10 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl"></div>
    </section>
  );
};
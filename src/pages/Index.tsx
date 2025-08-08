import { Header } from "@/components/layout/Header";
import { ScrollingOffers } from "@/components/layout/ScrollingOffers";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ScrollingOffers />
      <main>
        <HeroSection />
        <FeaturedProducts />
      </main>
    </div>
  );
};

export default Index;
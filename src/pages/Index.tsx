import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollingOffers } from "@/components/layout/ScrollingOffers";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { AdminProductManagement } from "@/components/admin/AdminProductManagement";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <ScrollingOffers />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProducts />
        {isAdmin && <AdminProductManagement />}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
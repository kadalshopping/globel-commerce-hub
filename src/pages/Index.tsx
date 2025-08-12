import { Header } from "@/components/layout/Header";
import { ScrollingOffers } from "@/components/layout/ScrollingOffers";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { AdminProductManagement } from "@/components/admin/AdminProductManagement";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ScrollingOffers />
      <main>
        <HeroSection />
        <FeaturedProducts />
        {isAdmin && <AdminProductManagement />}
      </main>
    </div>
  );
};

export default Index;
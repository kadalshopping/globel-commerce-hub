import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollingOffers } from "@/components/layout/ScrollingOffers";
import { SlidingHeroSection } from "@/components/home/SlidingHeroSection";
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
        <SlidingHeroSection />
        
        {/* Zero Fees Section */}
        <section className="py-8 bg-green-50 border-y border-green-200">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-800 mb-4">🎉 Zero Extra Charges!</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                  <div className="text-green-600 text-xl mb-2">💰</div>
                  <h3 className="font-semibold text-green-800 mb-1">No Platform Fees</h3>
                  <p className="text-sm text-green-600">Flatfarm charges 0% commission - shop direct from farmers!</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                  <div className="text-green-600 text-xl mb-2">📦</div>
                  <h3 className="font-semibold text-green-800 mb-1">Free Delivery</h3>
                  <p className="text-sm text-green-600">Free delivery on orders above ₹500</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                  <div className="text-green-600 text-xl mb-2">🚫</div>
                  <h3 className="font-semibold text-green-800 mb-1">No Hidden Costs</h3>
                  <p className="text-sm text-green-600">What you see is what you pay - completely transparent pricing</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <FeaturedProducts />
        {isAdmin && <AdminProductManagement />}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
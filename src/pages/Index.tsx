import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollingOffers } from "@/components/layout/ScrollingOffers";
import { SlidingHeroSection } from "@/components/home/SlidingHeroSection";
import { AdminProductManagement } from "@/components/admin/AdminProductManagement";
import { RecentlyViewedSection } from "@/components/home/RecentlyViewedSection";
import { TopDealsSection } from "@/components/home/TopDealsSection";
import { CategoryProducts } from "@/components/home/CategoryProducts";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead } from "@/components/seo/SEOHead";
import { generateWebsiteSchema, generateOrganizationSchema } from "@/utils/structuredData";

const Index = () => {
  const { user } = useAuth();
  const isAdmin = user?.user_metadata?.role === 'admin';

  // Generate structured data for homepage
  const websiteSchema = generateWebsiteSchema();
  const organizationSchema = generateOrganizationSchema();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title="Kadal Shopping - Your Ultimate Shopping Destination"
        description="Discover amazing products with great deals, fast shipping, and excellent customer service. Shop from thousands of quality products with zero platform fees and free delivery."
        keywords="online shopping, ecommerce, products, deals, fast delivery, zero fees, kadal shopping"
        schema={[websiteSchema, organizationSchema]}
      />
      <Header />
      <ScrollingOffers />
      <main className="flex-1">
        <SlidingHeroSection />
        <TopDealsSection />
        <RecentlyViewedSection />
        <CategoryProducts />
        
        {/* Zero Fees Section */}
        <section className="py-8 bg-green-50 border-y border-green-200">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-green-800 mb-4">🎉 Zero Extra Charges!</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <article className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                  <div className="text-green-600 text-xl mb-2">💰</div>
                  <h3 className="font-semibold text-green-800 mb-1">No Platform Fees</h3>
                  <p className="text-sm text-green-600">Kadal Shopping charges 0% commission - shop direct from sellers!</p>
                </article>
                <article className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                  <div className="text-green-600 text-xl mb-2">📦</div>
                  <h3 className="font-semibold text-green-800 mb-1">Free Delivery</h3>
                  <p className="text-sm text-green-600">Free delivery on orders above ₹500</p>
                </article>
                <article className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                  <div className="text-green-600 text-xl mb-2">🚫</div>
                  <h3 className="font-semibold text-green-800 mb-1">No Hidden Costs</h3>
                  <p className="text-sm text-green-600">What you see is what you pay - completely transparent pricing</p>
                </article>
              </div>
            </div>
          </div>
        </section>
        
        {isAdmin && <AdminProductManagement />}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
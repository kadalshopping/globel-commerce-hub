import { useParams, useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductDetails } from "@/components/product/ProductDetails";
import { SimilarProducts } from "@/components/product/SimilarProducts";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, ChevronRight } from "lucide-react";

const ProductDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useProducts();
  
  const product = products.find(p => p.id === id);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading product details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
            <ChevronRight className="h-3 w-3" />
            <button 
              onClick={() => navigate('/')}
              className="hover:text-primary transition-colors"
            >
              Products
            </button>
            {product.category && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{product.category}</span>
              </>
            )}
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground truncate max-w-[200px]">{product.title}</span>
          </nav>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          
          <ProductDetails product={product} />
          <SimilarProducts 
            currentProductId={product.id} 
            category={product.category} 
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetailsPage;
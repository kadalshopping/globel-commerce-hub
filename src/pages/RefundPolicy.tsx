import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Shield, 
  Clock, 
  RefreshCcw, 
  Truck, 
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

const RefundPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Refund Policy - Kadal Shopping"
        description="Learn about our return and refund policy. Easy returns, money-back guarantee, and hassle-free exchanges within 30 days of purchase."
        ogType="website"
      />
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Refund Policy
              </h1>
              <p className="text-muted-foreground mt-1">
                Your satisfaction is our priority. Learn about our return and refund process.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Quick Overview */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h2 className="text-xl font-semibold">30-Day Money Back Guarantee</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  We offer a hassle-free return policy. If you're not satisfied with your purchase, 
                  you can return it within 30 days for a full refund or exchange.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <RefreshCcw className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Easy Returns</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Free Return Pickup</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Quick Refunds</span>
                  </div>
                </div>
              </Card>

              {/* Return Process */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">How to Return Items</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center">1</Badge>
                    <div>
                      <h3 className="font-medium">Initiate Return Request</h3>
                      <p className="text-sm text-muted-foreground">
                        Go to your order history and click "Return Item" or "Cancel Order" within 30 days of delivery.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center">2</Badge>
                    <div>
                      <h3 className="font-medium">Schedule Pickup</h3>
                      <p className="text-sm text-muted-foreground">
                        We'll arrange a free pickup from your address. No need to visit any store or courier office.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Badge variant="outline" className="h-8 w-8 rounded-full flex items-center justify-center">3</Badge>
                    <div>
                      <h3 className="font-medium">Quality Check & Refund</h3>
                      <p className="text-sm text-muted-foreground">
                        Once we receive and verify the item, your refund will be processed within 3-5 business days.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Refund Conditions */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Refund Conditions</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-green-700 mb-2">✅ Eligible for Return</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      <li>• Items in original condition with tags attached</li>
                      <li>• Products received in damaged or defective condition</li>
                      <li>• Items that don't match the description or images</li>
                      <li>• Wrong item delivered</li>
                      <li>• Products with manufacturing defects</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium text-red-700 mb-2">❌ Not Eligible for Return</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      <li>• Items used, washed, or damaged by customer</li>
                      <li>• Products without original packaging or tags</li>
                      <li>• Customized or personalized items</li>
                      <li>• Hygiene products (underwear, cosmetics, etc.)</li>
                      <li>• Items returned after 30 days of delivery</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Refund Timeline */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Refund Timeline</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Cash on Delivery Orders</p>
                      <p className="text-sm text-muted-foreground">Bank transfer within 3-5 business days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Online Payment Orders</p>
                      <p className="text-sm text-muted-foreground">Refund to original payment method within 5-7 business days</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Exchange Policy */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Exchange Policy</h2>
                <p className="text-muted-foreground mb-4">
                  Want a different size or color? We offer easy exchanges for most items.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Size exchanges available for clothing and shoes</p>
                  <p>• Color exchanges subject to availability</p>
                  <p>• No additional charges for exchanges (same price category)</p>
                  <p>• Exchange requests must be made within 15 days of delivery</p>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Support */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Need Help?
                </h3>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => navigate('/orders')}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    My Orders
                  </Button>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>+91-XXXXX-XXXXX</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>support@kadalshopping.com</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: Mon-Sat 9AM-6PM
                  </p>
                </div>
              </Card>

              {/* Important Notice */}
              <Card className="p-6 border-amber-200 bg-amber-50">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-800">Important Notice</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      For Cash on Delivery orders, please provide your bank details for refund processing.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => navigate('/orders')}
                  >
                    View My Orders
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => navigate('/privacy-policy')}
                  >
                    Privacy Policy
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => navigate('/')}
                  >
                    Continue Shopping
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RefundPolicy;
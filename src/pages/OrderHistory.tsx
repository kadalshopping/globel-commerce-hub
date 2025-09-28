import { UserOrderHistory } from "@/components/orders/UserOrderHistory";
import { PendingPayments } from "@/components/orders/PendingPayments";
import { AddMoreProducts } from "@/components/orders/AddMoreProducts";
import { ContinueCheckout } from "@/components/orders/ContinueCheckout";
import { PaymentDebugTester } from "@/components/orders/PaymentDebugTester";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

const OrderHistory = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with refund policy link */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">Track your orders and manage returns</p>
        </div>
        <Button 
          variant="outline"
          onClick={() => navigate('/refund-policy')}
          className="flex items-center gap-2"
        >
          <Shield className="h-4 w-4" />
          Return & Refund Policy
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          <PendingPayments />
          <UserOrderHistory />
        </div>
        
        {/* Sidebar - Checkout */}
        <div className="lg:col-span-1">
          <ContinueCheckout />
        </div>
      </div>
      
      {process.env.NODE_ENV === "development" && <PaymentDebugTester />}
    </div>
  );
};

export default OrderHistory;

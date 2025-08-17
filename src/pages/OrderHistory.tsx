import { UserOrderHistory } from "@/components/orders/UserOrderHistory";
import { PendingPayments } from "@/components/orders/PendingPayments";
import { AddMoreProducts } from "@/components/orders/AddMoreProducts";
import { ContinueCheckout } from "@/components/orders/ContinueCheckout";
import { PaymentDebugTester } from "@/components/orders/PaymentDebugTester";
{process.env.NODE_ENV === "development" && <PaymentDebugTester />}


const OrderHistory = () => {
  return (
    <div className="container mx-auto px-4 py-8">
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
    </div>
  );
};

export default OrderHistory;

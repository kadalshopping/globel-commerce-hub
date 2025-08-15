import { UserOrderHistory } from "@/components/orders/UserOrderHistory";
import { PendingPayments } from "@/components/orders/PendingPayments";

const OrderHistory = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <PendingPayments />
      <UserOrderHistory />
    </div>
  );
};

export default OrderHistory;
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";

interface PaymentDebugInfoProps {
  pendingOrder: any;
}

export const PaymentDebugInfo: React.FC<PaymentDebugInfoProps> = ({ pendingOrder }) => {
  const isTemporaryOrder = pendingOrder.razorpay_order_id?.startsWith('temp_');
  
  if (!isTemporaryOrder) return null;

  return (
    <Card className="mt-4 border-yellow-200 bg-yellow-50/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <CardTitle className="text-lg text-yellow-800">
            Payment Creation Issue
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Temporary Order ID
            </Badge>
            <span className="text-sm text-yellow-700">
              {pendingOrder.razorpay_order_id}
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">What happened:</p>
              <p>The payment order creation failed, but a pending order was saved. This usually means:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Razorpay API credentials issue</li>
                <li>Network connectivity problem</li>
                <li>Server configuration error</li>
              </ul>
            </div>
          </div>

          <div className="text-sm text-yellow-700">
            <p className="font-medium">What you can do:</p>
            <p>Try the "Complete Payment" button again, or use "Already Paid?" if you completed the payment elsewhere.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
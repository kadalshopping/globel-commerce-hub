import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentLinkVerificationProps {
  pendingOrder: any;
  onSuccess: () => void;
}

const PaymentLinkVerification = ({ pendingOrder, onSuccess }: PaymentLinkVerificationProps) => {
  const [paymentId, setPaymentId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerifyPayment = async () => {
    if (!paymentId.trim()) {
      toast({
        title: 'Payment ID Required',
        description: 'Please enter the Razorpay Payment ID',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Verifying payment link payment...', { 
        paymentLinkId: pendingOrder.razorpay_order_id, 
        paymentId 
      });

      // Verify payment via edge function
      const { data: verificationResult, error } = await supabase.functions.invoke('verify-payment-link', {
        body: {
          payment_link_id: pendingOrder.razorpay_order_id,
          payment_id: paymentId.trim(),
          order_id: pendingOrder.id
        }
      });

      console.log('📦 Verification response:', { verificationResult, error });

      if (error) {
        console.error('❌ Payment verification failed:', error);
        throw new Error(`Verification failed: ${error.message || 'Unknown error'}`);
      }

      if (!verificationResult || !verificationResult.success) {
        throw new Error('Payment verification failed - invalid response');
      }

      console.log('✅ Payment verified successfully');

      toast({
        title: '🎉 Payment Verified!',
        description: 'Your order has been confirmed successfully.',
      });

      onSuccess();

    } catch (error) {
      console.error('❌ Payment verification error:', error);
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Failed to verify payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if this is a payment link order (has temp_ or starts with plink_)
  const isPaymentLinkOrder = pendingOrder.razorpay_order_id?.startsWith('temp_') || 
                           pendingOrder.razorpay_order_id?.startsWith('plink_');

  if (!isPaymentLinkOrder) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Payment Link Verification
        </CardTitle>
        <CardDescription>
          If you completed payment via the payment link, enter your Payment ID below to confirm your order.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="paymentId" className="text-sm font-medium">
            Razorpay Payment ID
          </label>
          <Input
            id="paymentId"
            type="text"
            placeholder="pay_XXXXXXXXXXXXXX"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            You can find this in your payment confirmation email or SMS from Razorpay
          </p>
        </div>

        <Button 
          onClick={handleVerifyPayment}
          disabled={loading || !paymentId.trim()}
          className="w-full"
        >
          {loading ? 'Verifying Payment...' : 'Verify Payment'}
        </Button>

        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">How to find your Payment ID:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your payment confirmation email from Razorpay</li>
              <li>Look for SMS from Razorpay with transaction details</li>
              <li>Payment ID format: pay_XXXXXXXXXXXXXX</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentLinkVerification;
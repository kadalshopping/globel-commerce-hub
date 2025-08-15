import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ManualPaymentVerificationProps {
  pendingOrder: any;
  onSuccess: () => void;
}

export const ManualPaymentVerification: React.FC<ManualPaymentVerificationProps> = ({
  pendingOrder,
  onSuccess
}) => {
  const [paymentId, setPaymentId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleManualVerification = async () => {
    if (!paymentId.trim()) {
      toast({
        title: 'Payment ID Required',
        description: 'Please enter your Razorpay payment ID',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🔧 Manual payment verification for:', paymentId);

      // Create confirmed order directly
      const { data: confirmedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user!.id,
          order_number: pendingOrder.order_number,
          total_amount: pendingOrder.total_amount,
          status: 'confirmed',
          payment_status: 'completed',
          payment_id: null,
          razorpay_order_id: pendingOrder.razorpay_order_id,
          razorpay_payment_id: paymentId,
          delivery_address: pendingOrder.delivery_address,
          items: pendingOrder.items,
        })
        .select()
        .single();

      if (orderError) {
        throw new Error('Failed to create confirmed order');
      }

      console.log('✅ Manual order creation successful:', confirmedOrder.id);

      // Create order items and update stock
      const items = pendingOrder.items as any[];
      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('shop_owner_id')
          .eq('id', item.productId)
          .maybeSingle();

        if (product) {
          // Create order item
          await supabase
            .from('order_items')
            .insert({
              order_id: confirmedOrder.id,
              product_id: item.productId,
              shop_owner_id: product.shop_owner_id,
              quantity: item.quantity,
              price: item.price,
              status: 'pending'
            });

          // Update product stock
          await supabase.rpc('decrease_product_stock', {
            product_id_param: item.productId,
            quantity_param: item.quantity
          });
        }
      }

      // Delete pending order
      await supabase
        .from('pending_orders')
        .delete()
        .eq('id', pendingOrder.id);

      toast({
        title: '🎉 Payment Verified!',
        description: `Order #${pendingOrder.order_number} has been confirmed`,
      });

      onSuccess();

    } catch (error) {
      console.error('❌ Manual verification failed:', error);
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Failed to verify payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="text-lg text-blue-800">
          Manual Payment Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-blue-700">
            If you completed the payment but it wasn't automatically verified, 
            please enter your Razorpay Payment ID to complete your order.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="payment-id">Razorpay Payment ID</Label>
            <Input
              id="payment-id"
              placeholder="pay_xxxxxxxxxxxxxxxxx"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              You can find this in your payment confirmation email or SMS
            </p>
          </div>

          <Button 
            onClick={handleManualVerification}
            disabled={loading || !paymentId.trim()}
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Verify Payment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  CreditCard,
  ExternalLink 
} from 'lucide-react';

interface PaymentStatusIndicatorProps {
  paymentLinkId: string;
  orderId?: string;
  initialStatus?: 'pending' | 'paid' | 'failed' | 'expired';
  onStatusChange?: (status: string, orderData?: any) => void;
  showRefreshButton?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  paymentLinkId,
  orderId,
  initialStatus = 'pending',
  onStatusChange,
  showRefreshButton = true,
  autoRefresh = false,
  refreshInterval = 10
}) => {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const { toast } = useToast();

  const checkPaymentStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      console.log('🔍 Checking payment status for:', paymentLinkId);
      
      const { data: result, error } = await supabase.functions.invoke('verify-payment-link', {
        body: {
          payment_link_id: paymentLinkId,
          manual_verification: true
        }
      });

      if (error) {
        console.error('❌ Payment status check error:', error);
        return;
      }

      console.log('📊 Payment status result:', result);
      setLastChecked(new Date());

      if (result?.success) {
        setStatus('paid');
        setOrderData(result);
        onStatusChange?.('paid', result);
        
        toast({
          title: '✅ Payment Confirmed!',
          description: 'Your payment has been successfully processed.',
        });
      } else if (result?.expired) {
        setStatus('expired');
        onStatusChange?.('expired', result);
      } else if (result?.failed) {
        setStatus('failed');
        onStatusChange?.('failed', result);
      }
      // If none of the above, status remains pending
      
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      toast({
        title: 'Status Check Error',
        description: 'Failed to check payment status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || status === 'paid') return;

    const interval = setInterval(() => {
      checkPaymentStatus(false);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, status, paymentLinkId]);

  // Initial check
  useEffect(() => {
    if (paymentLinkId) {
      checkPaymentStatus(false);
    }
  }, [paymentLinkId]);

  const getStatusIcon = () => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'expired':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'paid':
        return 'Payment completed successfully';
      case 'failed':
        return 'Payment failed or was cancelled';
      case 'expired':
        return 'Payment link has expired';
      default:
        return 'Waiting for payment confirmation...';
    }
  };

  return (
    <Card className={`${status === 'paid' ? 'border-green-200 bg-green-50' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>Payment Status</span>
          </div>
          <Badge variant={getStatusColor()}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {getStatusMessage()}
        </p>

        {orderId && (
          <div className="text-xs text-muted-foreground">
            Order ID: {orderId}
          </div>
        )}

        {orderData && (
          <div className="text-xs space-y-1">
            {orderData.order_id && (
              <div>Order: {orderData.order_id}</div>
            )}
            {orderData.payment_id && (
              <div>Payment: {orderData.payment_id}</div>
            )}
          </div>
        )}

        {lastChecked && (
          <div className="text-xs text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}

        <div className="flex gap-2">
          {showRefreshButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkPaymentStatus()}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Refresh
            </Button>
          )}

          {status === 'pending' && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {autoRefresh ? `Auto-refreshing every ${refreshInterval}s` : 'Manual refresh only'}
            </div>
          )}
        </div>

        {status === 'failed' && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              Payment was not completed. You can try creating a new payment or contact support.
            </p>
          </div>
        )}

        {status === 'expired' && (
          <div className="mt-3 p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-800">
              This payment link has expired. Please create a new payment to complete your order.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentStatusIndicator;
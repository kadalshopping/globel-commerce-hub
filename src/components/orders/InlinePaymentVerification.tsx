import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  ExternalLink,
  Monitor,
  X 
} from 'lucide-react';

interface InlinePaymentVerificationProps {
  paymentLinkId: string;
  paymentLinkUrl: string;
  orderId?: string;
  orderNumber: string;
  amount: number;
  onPaymentComplete?: (orderData: any) => void;
  showAsButton?: boolean;
  buttonText?: string;
}

const InlinePaymentVerification: React.FC<InlinePaymentVerificationProps> = ({
  paymentLinkId,
  paymentLinkUrl,
  orderId,
  orderNumber,
  amount,
  onPaymentComplete,
  showAsButton = true,
  buttonText = "Pay Now"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [loading, setLoading] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const checkPaymentStatus = async () => {
    setLoading(true);
    try {
      console.log('🔍 Checking payment status for link:', paymentLinkId);
      
      const { data: result, error } = await supabase.functions.invoke('verify-payment-link', {
        body: {
          payment_link_id: paymentLinkId,
          manual_verification: true
        }
      });

      if (error) {
        console.error('❌ Payment verification error:', error);
        return;
      }

      console.log('📊 Payment verification result:', result);

      if (result?.success) {
        setPaymentStatus('paid');
        
        // Clear polling interval
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }

        toast({
          title: '✅ Payment Verified!',
          description: `Payment for order #${orderNumber} has been confirmed.`,
        });

        // Close modal after success
        setTimeout(() => {
          setIsOpen(false);
          onPaymentComplete?.(result);
        }, 2000);

      } else if (result?.failed) {
        setPaymentStatus('failed');
        toast({
          title: '❌ Payment Failed',
          description: 'Payment was not completed. Please try again.',
          variant: 'destructive',
        });
      }
      
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      toast({
        title: 'Verification Error',
        description: 'Failed to verify payment status.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startStatusPolling = () => {
    // Check immediately
    checkPaymentStatus();
    
    // Then poll every 5 seconds
    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 5000);
    
    setStatusCheckInterval(interval);

    // Stop polling after 10 minutes
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setStatusCheckInterval(null);
      }
    }, 600000);
  };

  const handleOpenPayment = () => {
    setIsOpen(true);
    setPaymentStatus('pending');
    
    // Start polling when modal opens
    startStatusPolling();
    
    toast({
      title: '💳 Payment Ready',
      description: 'Complete payment below and status will update automatically.',
    });
  };

  const handleCloseModal = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
    setIsOpen(false);
    setPaymentStatus('pending');
  };

  const openInNewTab = () => {
    window.open(paymentLinkUrl, '_blank');
    // Continue polling for status even when opened in new tab
    if (!statusCheckInterval) {
      startStatusPolling();
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'paid':
        return 'Payment completed successfully!';
      case 'failed':
        return 'Payment failed or was cancelled.';
      default:
        return 'Waiting for payment completion...';
    }
  };

  if (showAsButton) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button onClick={handleOpenPayment} className="w-full">
            <CreditCard className="w-4 h-4 mr-2" />
            {buttonText} ₹{amount.toFixed(2)}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Payment for Order #{orderNumber}</span>
              <div className="flex items-center gap-2">
                <Badge variant={paymentStatus === 'paid' ? 'default' : 'secondary'}>
                  {getStatusIcon()}
                  <span className="ml-1">
                    {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
                  </span>
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {paymentStatus === 'paid' ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Payment Successful!
                  </h3>
                  <p className="text-green-700">
                    Your payment has been verified and the order is being processed.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Complete Your Payment</CardTitle>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount: ₹{amount.toFixed(2)}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openInNewTab}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open in New Tab
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={checkPaymentStatus}
                          disabled={loading}
                        >
                          {loading ? (
                            <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-1" />
                          )}
                          Check Status
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src={paymentLinkUrl}
                        className="w-full h-96 border-0"
                        title="Payment Gateway"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon()}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{getStatusMessage()}</p>
                        <p className="text-xs text-muted-foreground">
                          Status updates automatically every 5 seconds
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Non-button version - just the status indicator
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium">Payment #{paymentLinkId}</p>
              <p className="text-xs text-muted-foreground">{getStatusMessage()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={checkPaymentStatus}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InlinePaymentVerification;
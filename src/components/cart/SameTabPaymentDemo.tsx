import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Monitor, Smartphone, CheckCircle, ArrowRight } from 'lucide-react';
import InlinePaymentFlow from './InlinePaymentFlow';
import PaymentStatusIndicator from '../orders/PaymentStatusIndicator';

const SameTabPaymentDemo = () => {
  const [activeDemo, setActiveDemo] = useState<'none' | 'desktop' | 'mobile'>('none');
  const { toast } = useToast();

  const handleDemoClick = (type: 'desktop' | 'mobile') => {
    setActiveDemo(type);
    toast({
      title: '🎉 Demo Mode',
      description: `Showing ${type} same-tab payment experience`,
    });
  };

  const features = [
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      title: 'No Tab Switching',
      description: 'Payment happens within the same browser tab'
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      title: 'Real-time Status',
      description: 'Instant payment confirmation without refresh'
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      title: 'Seamless Experience',
      description: 'Embedded payment form with auto-completion'
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      title: 'Mobile Optimized',
      description: 'Works perfectly on all device sizes'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            Same-Tab Payment Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Experience seamless payments without leaving your current tab. Choose your device type to see the optimized flow:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant={activeDemo === 'desktop' ? 'default' : 'outline'}
              className="h-auto p-4 flex-col space-y-2"
              onClick={() => handleDemoClick('desktop')}
            >
              <Monitor className="w-8 h-8" />
              <div className="text-center">
                <div className="font-medium">Desktop Experience</div>
                <div className="text-xs text-muted-foreground">Large screen optimized</div>
              </div>
            </Button>
            
            <Button
              variant={activeDemo === 'mobile' ? 'default' : 'outline'}
              className="h-auto p-4 flex-col space-y-2"
              onClick={() => handleDemoClick('mobile')}
            >
              <Smartphone className="w-8 h-8" />
              <div className="text-center">
                <div className="font-medium">Mobile Experience</div>
                <div className="text-xs text-muted-foreground">Touch optimized</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <Card key={index} className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {feature.icon}
                <div>
                  <h3 className="font-medium text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeDemo !== 'none' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Live Demo - {activeDemo.charAt(0).toUpperCase() + activeDemo.slice(1)} View</span>
              <Badge variant="secondary">Demo Mode</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className={`${activeDemo === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Current Cart:</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Sample Product 1</span>
                    <span>₹299.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sample Product 2</span>
                    <span>₹199.00</span>
                  </div>
                  <div className="border-t pt-1 mt-2 flex justify-between font-medium">
                    <span>Total:</span>
                    <span>₹498.00</span>
                  </div>
                </div>
              </div>
              
              <InlinePaymentFlow />
              
              <div className="mt-6">
                <h4 className="font-medium text-sm mb-3">Payment Status Tracking:</h4>
                <PaymentStatusIndicator
                  paymentLinkId="demo_link_123"
                  initialStatus="pending"
                  showRefreshButton={true}
                  autoRefresh={true}
                  refreshInterval={5}
                  onStatusChange={(status, data) => {
                    console.log('Demo status change:', status, data);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
            <div>
              <h3 className="font-medium text-blue-900">How it works:</h3>
              <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal ml-4">
                <li>Click "Pay" to open the embedded payment modal</li>
                <li>Complete payment in the iframe without leaving the page</li>
                <li>Status updates automatically upon payment completion</li>
                <li>Get redirected to orders page with confirmation</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SameTabPaymentDemo;
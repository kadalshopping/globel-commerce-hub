import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart, ArrowRight, CreditCard, Package } from 'lucide-react';
import { PriceBreakdown } from '@/components/cart/PriceBreakdown';
import { PriceBreakdown as PriceBreakdownType } from '@/utils/priceCalculations';
import SimpleOrderButton from '@/components/cart/SimpleOrderButton';
import { useState } from 'react';

export const ContinueCheckout = () => {
  const { cart } = useCart();
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdownType | null>(null);

  if (cart.itemCount === 0) {
    return null;
  }

  return (
    <Card className="sticky top-4 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Continue Checkout</h3>
              <p className="text-sm text-muted-foreground font-normal">
                {cart.itemCount} item{cart.itemCount > 1 ? 's' : ''} ready for checkout
              </p>
            </div>
          </div>
          <Badge variant="default" className="text-lg font-bold px-3 py-1">
            ₹{priceBreakdown?.total?.toFixed(2) || cart.total.toFixed(2)}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Cart Summary */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Your Items
          </h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {cart.items.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm bg-white/50 rounded p-2">
                <span className="truncate font-medium">{item.title} x{item.quantity}</span>
                <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {cart.items.length > 3 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{cart.items.length - 3} more item{cart.items.length - 3 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-white/70 rounded-lg p-3">
          <PriceBreakdown 
            cartTotal={cart.total} 
            onTotalChange={setPriceBreakdown}
          />
        </div>

        {/* Checkout Button */}
        <div className="space-y-2">
          <SimpleOrderButton priceBreakdown={priceBreakdown} />
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="w-3 h-3" />
            <span>Secure checkout process</span>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-sm font-medium text-green-700">Why checkout now?</p>
          </div>
          <ul className="text-xs text-green-600 space-y-1">
            <li>• Fast processing and quick delivery</li>
            <li>• Apply coupon codes for extra savings</li>
            <li>• Secure payment options</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
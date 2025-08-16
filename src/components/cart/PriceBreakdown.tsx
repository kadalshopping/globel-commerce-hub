import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculatePriceBreakdown, formatPrice, PriceBreakdown as PriceBreakdownType } from '@/utils/priceCalculations';
import { Separator } from '@/components/ui/separator';
import { Tag, Truck, CreditCard, Receipt } from 'lucide-react';

interface PriceBreakdownProps {
  cartTotal: number;
  onTotalChange: (breakdown: PriceBreakdownType) => void;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({ cartTotal, onTotalChange }) => {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponError, setCouponError] = useState('');

  const breakdown = calculatePriceBreakdown(cartTotal, appliedCoupon);

  React.useEffect(() => {
    onTotalChange(breakdown);
  }, [breakdown, onTotalChange]);

  const handleApplyCoupon = () => {
    const validCoupons = ['SAVE10', 'WELCOME20', 'NEW2025'];
    if (validCoupons.includes(couponCode.toUpperCase())) {
      setAppliedCoupon(couponCode.toUpperCase());
      setCouponError('');
      setCouponCode('');
    } else {
      setCouponError('Invalid coupon code');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponError('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Price Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(breakdown.subtotal)}</span>
        </div>

        {/* Discount */}
        {breakdown.discount > 0 && (
          <div className="flex justify-between items-center text-green-600">
            <span className="text-sm flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Discount
            </span>
            <span className="font-medium">-{formatPrice(breakdown.discount)}</span>
          </div>
        )}

        {/* Coupon Section */}
        <div className="space-y-2">
          {appliedCoupon ? (
            <div className="flex justify-between items-center text-green-600">
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3" />
                <span className="text-sm">Coupon ({appliedCoupon})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                  className="h-6 px-2 text-xs"
                >
                  Remove
                </Button>
              </div>
              <span className="font-medium">-{formatPrice(breakdown.couponDiscount)}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim()}
                >
                  Apply
                </Button>
              </div>
              {couponError && (
                <p className="text-xs text-destructive">{couponError}</p>
              )}
              <div className="flex gap-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">SAVE10 - 10% off</Badge>
                <Badge variant="secondary" className="text-xs">WELCOME20 - 20% off</Badge>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">NEW2025 - No extra charges!</Badge>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Delivery Charge */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Delivery Charge
          </span>
          <div className="text-right">
            {breakdown.deliveryCharge === 0 ? (
              <div>
                <span className="font-medium text-green-600">FREE</span>
                <p className="text-xs text-muted-foreground">Orders above ₹500</p>
              </div>
            ) : (
              <span className="font-medium">{formatPrice(breakdown.deliveryCharge)}</span>
            )}
          </div>
        </div>

        {/* Platform Charge */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            Platform Charge (2%)
          </span>
          <div className="text-right">
            {breakdown.platformCharge === 0 && appliedCoupon === 'NEW2025' ? (
              <div>
                <span className="font-medium text-green-600">WAIVED</span>
                <p className="text-xs text-muted-foreground">NEW2025 applied</p>
              </div>
            ) : (
              <span className="font-medium">{formatPrice(breakdown.platformCharge)}</span>
            )}
          </div>
        </div>

        <Separator />

        {/* GST */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">GST (18%)</span>
          <div className="text-right">
            {breakdown.gst === 0 && appliedCoupon === 'NEW2025' ? (
              <div>
                <span className="font-medium text-green-600">WAIVED</span>
                <p className="text-xs text-muted-foreground">NEW2025 applied</p>
              </div>
            ) : (
              <span className="font-medium">{formatPrice(breakdown.gst)}</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total Amount</span>
          <span className="text-primary">{formatPrice(breakdown.total)}</span>
        </div>

        {/* Savings Display */}
        {((breakdown.discount + breakdown.couponDiscount) > 0 || appliedCoupon === 'NEW2025') && (
          <div className="bg-green-50 p-3 rounded-lg">
            {appliedCoupon === 'NEW2025' ? (
              <div>
                <p className="text-sm text-green-700 font-medium">
                  🎉 NEW2025 Applied! All additional charges waived!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Saved on delivery, platform charge & GST
                </p>
              </div>
            ) : (
              <p className="text-sm text-green-700 font-medium">
                🎉 You saved {formatPrice(breakdown.discount + breakdown.couponDiscount)}!
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
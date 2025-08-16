export interface PriceBreakdown {
  subtotal: number;
  discount: number;
  couponDiscount: number;
  deliveryCharge: number;
  platformCharge: number;
  gst: number;
  total: number;
}

export const calculatePriceBreakdown = (cartTotal: number, couponCode?: string): PriceBreakdown => {
  const subtotal = cartTotal;
  
  // Apply coupon discount (example: 10% for "SAVE10")
  let couponDiscount = 0;
  let isSpecialCoupon = false;
  
  if (couponCode === 'SAVE10') {
    couponDiscount = subtotal * 0.1;
  } else if (couponCode === 'WELCOME20') {
    couponDiscount = subtotal * 0.2;
  } else if (couponCode === 'NEW2025') {
    // Special coupon that zeros all additional charges
    isSpecialCoupon = true;
    couponDiscount = 0; // No percentage discount, but removes all additional charges
  }
  
  // Base discount (can be product-specific or general)
  const discount = 0;
  
  // Delivery charge (free for orders above ₹500 OR with NEW2025 coupon)
  const deliveryCharge = (subtotal >= 500 || isSpecialCoupon) ? 0 : 50;
  
  // Platform charge (2% of subtotal, waived with NEW2025)
  const platformCharge = isSpecialCoupon ? 0 : subtotal * 0.02;
  
  // Calculate amount after discounts and before tax
  const amountBeforeTax = subtotal - discount - couponDiscount + deliveryCharge + platformCharge;
  
  // GST (18% on the final amount, waived with NEW2025)
  const gst = isSpecialCoupon ? 0 : amountBeforeTax * 0.18;
  
  // Final total
  const total = amountBeforeTax + gst;
  
  return {
    subtotal,
    discount,
    couponDiscount,
    deliveryCharge,
    platformCharge,
    gst,
    total
  };
};

export const formatPrice = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};
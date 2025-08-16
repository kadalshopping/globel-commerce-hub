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
  if (couponCode === 'SAVE10') {
    couponDiscount = subtotal * 0.1;
  } else if (couponCode === 'WELCOME20') {
    couponDiscount = subtotal * 0.2;
  }
  
  // Base discount (can be product-specific or general)
  const discount = 0;
  
  // Delivery charge (free for orders above ₹500)
  const deliveryCharge = subtotal >= 500 ? 0 : 50;
  
  // Platform charge (2% of subtotal)
  const platformCharge = subtotal * 0.02;
  
  // Calculate amount after discounts and before tax
  const amountBeforeTax = subtotal - discount - couponDiscount + deliveryCharge + platformCharge;
  
  // GST (18% on the final amount)
  const gst = amountBeforeTax * 0.18;
  
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
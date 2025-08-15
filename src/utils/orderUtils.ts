import { supabase } from '@/integrations/supabase/client';

/**
 * Look up an order by Razorpay payment ID
 * Since we now use payment ID as order number, this simplifies verification
 */
export const findOrderByPaymentId = async (paymentId: string) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', paymentId) // Payment ID is now the order number
      .single();

    if (error) {
      console.error('Error finding order by payment ID:', error);
      return null;
    }

    return order;
  } catch (error) {
    console.error('Error in findOrderByPaymentId:', error);
    return null;
  }
};

/**
 * Verify if a payment ID corresponds to a valid order
 */
export const verifyPaymentOrder = async (paymentId: string) => {
  const order = await findOrderByPaymentId(paymentId);
  
  if (!order) {
    return {
      isValid: false,
      message: 'No order found with this payment ID'
    };
  }

  if (order.payment_status === 'completed') {
    return {
      isValid: true,
      order,
      message: 'Payment already verified'
    };
  }

  return {
    isValid: true,
    order,
    message: 'Order found, payment can be verified'
  };
};

/**
 * Generate order number from payment details
 * Now simply uses the payment ID as the order number
 */
export const generateOrderNumber = (razorpayPaymentId: string) => {
  return razorpayPaymentId;
};
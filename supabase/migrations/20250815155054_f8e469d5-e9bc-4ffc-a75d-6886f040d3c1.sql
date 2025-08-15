-- Create a function to safely decrease product stock
CREATE OR REPLACE FUNCTION public.decrease_product_stock(
  product_id_param UUID,
  quantity_param INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the product stock if sufficient quantity is available
  UPDATE public.products 
  SET 
    stock_quantity = stock_quantity - quantity_param,
    updated_at = now()
  WHERE 
    id = product_id_param 
    AND stock_quantity >= quantity_param
    AND status = 'approved';
    
  -- Return true if update was successful (at least one row affected)
  RETURN FOUND;
END;
$$;
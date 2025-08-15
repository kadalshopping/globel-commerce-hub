-- Add INSERT policy for order_items table to allow edge functions to create order items
CREATE POLICY "Edge functions can insert order items" ON public.order_items
  FOR INSERT
  WITH CHECK (true);

-- Also add a policy for confirmed orders to allow creation via edge functions  
CREATE POLICY "Edge functions can insert orders" ON public.orders
  FOR INSERT  
  WITH CHECK (true);
-- Add policy to allow service role to insert pending orders
CREATE POLICY "Service role can insert pending orders" 
ON public.pending_orders 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Add policy to allow service role to select pending orders
CREATE POLICY "Service role can select pending orders" 
ON public.pending_orders 
FOR SELECT 
TO service_role
USING (true);

-- Add policy to allow service role to delete pending orders
CREATE POLICY "Service role can delete pending orders" 
ON public.pending_orders 
FOR DELETE 
TO service_role
USING (true);
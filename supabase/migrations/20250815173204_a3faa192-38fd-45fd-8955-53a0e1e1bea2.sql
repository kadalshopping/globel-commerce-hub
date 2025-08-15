-- Add explicit policy to deny anonymous/public access to delivery_addresses table
-- This prevents any potential bypasses and follows security best practices
CREATE POLICY "Deny anonymous access to delivery addresses" 
ON public.delivery_addresses 
FOR ALL 
TO anon 
USING (false);
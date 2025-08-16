-- Add restrictive policy to explicitly deny unauthorized access to shop_bank_accounts
-- This prevents anonymous users and regular users from accessing sensitive banking data

CREATE POLICY "Deny unauthorized access to bank accounts" 
ON public.shop_bank_accounts 
AS RESTRICTIVE
FOR ALL 
TO public 
USING (
  -- Only allow access if user is authenticated AND meets one of these conditions:
  auth.uid() IS NOT NULL 
  AND (
    -- User is the shop owner of this bank account
    auth.uid() = shop_owner_id 
    OR 
    -- User is an admin
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Add additional security: Deny all access to anonymous users explicitly
CREATE POLICY "Deny anonymous access to bank accounts" 
ON public.shop_bank_accounts 
AS RESTRICTIVE
FOR ALL 
TO anon 
USING (false);
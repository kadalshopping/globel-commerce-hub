-- Add RLS policy for admins to delete any products
CREATE POLICY "Admins can delete any products"
ON public.products
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
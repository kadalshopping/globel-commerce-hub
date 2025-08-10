-- Fix the approve product function to check for admin role correctly
CREATE OR REPLACE FUNCTION public.approve_product(
  product_id UUID,
  admin_notes_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve products';
  END IF;
  
  -- Update product status
  UPDATE public.products 
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    admin_notes = admin_notes_text,
    updated_at = now()
  WHERE id = product_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- Fix update_updated_at_column function search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
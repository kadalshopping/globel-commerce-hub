-- Function to approve product
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
  IF NOT public.has_role(auth.uid(), 'shop_owner') THEN
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

-- Function to reject product
CREATE OR REPLACE FUNCTION public.reject_product(
  product_id UUID,
  admin_notes_text TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject products';
  END IF;
  
  -- Update product status
  UPDATE public.products 
  SET 
    status = 'rejected',
    approved_by = auth.uid(),
    approved_at = now(),
    admin_notes = admin_notes_text,
    updated_at = now()
  WHERE id = product_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- Fix search path for existing functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;
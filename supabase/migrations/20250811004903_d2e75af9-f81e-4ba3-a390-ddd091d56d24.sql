-- Update the handle_new_user function to assign roles based on signup data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Get the role from user metadata, default to 'user'
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'user');
  
  -- Assign the specified role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;
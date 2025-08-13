-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Create RLS policies for product images
CREATE POLICY "Public can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Shop owners can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND 
    has_role(auth.uid(), 'shop_owner') AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Shop owners can update their product images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'product-images' AND 
    has_role(auth.uid(), 'shop_owner') AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Shop owners can delete their product images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images' AND 
    has_role(auth.uid(), 'shop_owner') AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can manage all product images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'product-images' AND 
    has_role(auth.uid(), 'admin')
  );

-- Add image upload helper function
CREATE OR REPLACE FUNCTION public.get_product_image_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN concat('https://ojgftnjpssnuarxpbweb.supabase.co/storage/v1/object/public/', bucket_name, '/', file_path);
END;
$$;
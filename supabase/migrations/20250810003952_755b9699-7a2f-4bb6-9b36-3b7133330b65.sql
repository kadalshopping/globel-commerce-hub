-- Create product status enum
CREATE TYPE public.product_status AS ENUM ('pending', 'approved', 'rejected');

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  brand TEXT,
  mrp DECIMAL(10,2) NOT NULL CHECK (mrp > 0),
  selling_price DECIMAL(10,2) NOT NULL CHECK (selling_price > 0),
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  sku TEXT UNIQUE,
  tags TEXT[],
  images TEXT[],
  status product_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policies for shop owners
CREATE POLICY "Shop owners can view their own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = shop_owner_id);

CREATE POLICY "Shop owners can create products" 
ON public.products 
FOR INSERT 
WITH CHECK (
  auth.uid() = shop_owner_id 
  AND has_role(auth.uid(), 'shop_owner')
  AND status = 'pending'
);

CREATE POLICY "Shop owners can update their pending products" 
ON public.products 
FOR UPDATE 
USING (
  auth.uid() = shop_owner_id 
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = shop_owner_id 
  AND status = 'pending'
);

CREATE POLICY "Shop owners can delete their pending products" 
ON public.products 
FOR DELETE 
USING (
  auth.uid() = shop_owner_id 
  AND status = 'pending'
);

-- Policies for admins
CREATE POLICY "Admins can view all products" 
ON public.products 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product status" 
ON public.products 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy for public to view approved products
CREATE POLICY "Public can view approved products" 
ON public.products 
FOR SELECT 
USING (status = 'approved');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
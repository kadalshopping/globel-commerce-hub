-- Add sizes column to products table
ALTER TABLE public.products 
ADD COLUMN sizes TEXT[] DEFAULT NULL;

-- Add comment to explain the sizes column
COMMENT ON COLUMN public.products.sizes IS 'Available sizes for the product (e.g., ["S", "M", "L", "XL"] or ["6", "7", "8", "9", "10"])';

-- Create index for better performance when filtering by sizes
CREATE INDEX idx_products_sizes ON public.products USING GIN(sizes);
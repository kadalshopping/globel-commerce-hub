-- Create product_reviews table
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for reviews
CREATE POLICY "Anyone can view approved product reviews" 
ON public.product_reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_reviews.product_id 
    AND products.status = 'approved'
  )
);

CREATE POLICY "Users can create reviews for approved products" 
ON public.product_reviews 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_reviews.product_id 
    AND products.status = 'approved'
  )
);

CREATE POLICY "Users can update their own reviews" 
ON public.product_reviews 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.product_reviews 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews(rating);

-- Create function to update timestamps
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view to get product ratings summary
CREATE VIEW public.product_ratings AS
SELECT 
  product_id,
  COUNT(*) as review_count,
  ROUND(AVG(rating)::numeric, 1) as average_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
FROM public.product_reviews
GROUP BY product_id;
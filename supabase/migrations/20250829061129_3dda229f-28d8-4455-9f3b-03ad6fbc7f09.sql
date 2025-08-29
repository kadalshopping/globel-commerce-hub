-- Drop the existing view and recreate with SECURITY INVOKER
DROP VIEW public.product_ratings;

-- Create a secure view to get product ratings summary
CREATE VIEW public.product_ratings
WITH (security_invoker = true)
AS
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
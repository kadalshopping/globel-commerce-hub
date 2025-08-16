-- Add price_breakdown column to orders table to store detailed pricing information
ALTER TABLE public.orders 
ADD COLUMN price_breakdown JSONB DEFAULT NULL;
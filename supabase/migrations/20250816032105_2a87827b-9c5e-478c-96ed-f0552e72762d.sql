-- Add price_breakdown column to pending_orders table to store detailed pricing information
ALTER TABLE public.pending_orders 
ADD COLUMN price_breakdown JSONB DEFAULT NULL;
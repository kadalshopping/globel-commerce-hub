-- Add shop_owner role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'shop_owner';
-- Create delivery addresses table for users
CREATE TABLE public.delivery_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery addresses
CREATE POLICY "Users can view their own addresses" 
ON public.delivery_addresses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own addresses" 
ON public.delivery_addresses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses" 
ON public.delivery_addresses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses" 
ON public.delivery_addresses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create bank accounts table for shop owners
CREATE TABLE public.shop_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_owner_id UUID NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  branch_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for bank accounts
CREATE POLICY "Shop owners can view their own bank accounts" 
ON public.shop_bank_accounts 
FOR SELECT 
USING (auth.uid() = shop_owner_id);

CREATE POLICY "Shop owners can create their own bank accounts" 
ON public.shop_bank_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = shop_owner_id AND has_role(auth.uid(), 'shop_owner'::app_role));

CREATE POLICY "Shop owners can update their own bank accounts" 
ON public.shop_bank_accounts 
FOR UPDATE 
USING (auth.uid() = shop_owner_id);

CREATE POLICY "Admins can view all bank accounts" 
ON public.shop_bank_accounts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update bank account verification" 
ON public.shop_bank_accounts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at timestamps
CREATE TRIGGER update_delivery_addresses_updated_at
BEFORE UPDATE ON public.delivery_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_bank_accounts_updated_at
BEFORE UPDATE ON public.shop_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
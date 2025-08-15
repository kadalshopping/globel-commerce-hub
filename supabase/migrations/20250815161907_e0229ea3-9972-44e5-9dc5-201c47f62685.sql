-- Create pending_orders table to store order data before payment verification
CREATE TABLE public.pending_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_address JSONB NOT NULL,
  items JSONB NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own pending orders" 
ON public.pending_orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pending orders" 
ON public.pending_orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending orders" 
ON public.pending_orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending orders" 
ON public.pending_orders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pending_orders_updated_at
BEFORE UPDATE ON public.pending_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create orders table for managing customer orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  delivery_address JSONB NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table for individual product items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  shop_owner_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  dispatch_requested_at TIMESTAMP WITH TIME ZONE,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payout_requests table for shop owner earnings
CREATE TABLE public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_owner_id UUID NOT NULL,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for order_items
CREATE POLICY "Users can view their order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can view their order items" ON public.order_items
  FOR SELECT USING (auth.uid() = shop_owner_id);

CREATE POLICY "Shop owners can update their order items" ON public.order_items
  FOR UPDATE USING (auth.uid() = shop_owner_id);

CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all order items" ON public.order_items
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for payout_requests
CREATE POLICY "Shop owners can view their payout requests" ON public.payout_requests
  FOR SELECT USING (auth.uid() = shop_owner_id);

CREATE POLICY "Shop owners can create payout requests" ON public.payout_requests
  FOR INSERT WITH CHECK (auth.uid() = shop_owner_id);

CREATE POLICY "Admins can view all payout requests" ON public.payout_requests
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payout requests" ON public.payout_requests
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_shop_owner_id ON public.order_items(shop_owner_id);
CREATE INDEX idx_order_items_status ON public.order_items(status);
CREATE INDEX idx_payout_requests_shop_owner_id ON public.payout_requests(shop_owner_id);
CREATE INDEX idx_payout_requests_status ON public.payout_requests(status);
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  delivery_address: any;
  items: any;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  shop_owner_id: string;
  quantity: number;
  price: number;
  status: string;
  dispatch_requested_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  product?: any;
  order?: {
    order_number?: string;
    delivery_address?: any;
    user_id?: string;
    profiles?: {
      full_name?: string;
    };
  };
}

export interface PayoutRequest {
  id: string;
  shop_owner_id: string;
  order_item_id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  order_item?: OrderItem;
}

// Hook to fetch user orders with shop owner details
export const useUserOrders = () => {
  return useQuery({
    queryKey: ['user-orders'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // For each order, fetch the order items with shop owner details
      const ordersWithShopOwners = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              *,
              product:products(id, title, images),
              shop_owner:profiles!shop_owner_id(full_name, address, phone)
            `)
            .eq('order_id', order.id);

          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            return order;
          }

          return {
            ...order,
            order_items: orderItems || []
          };
        })
      );

      return ordersWithShopOwners as Order[];
    },
  });
};

// Hook to fetch order items for shop owners
export const useShopOwnerOrderItems = () => {
  return useQuery({
    queryKey: ['shop-owner-order-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(id, title, images),
          order:orders(order_number, delivery_address, user_id)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OrderItem[];
    },
  });
};

// Hook to fetch all order items for admin
export const useAllOrderItems = () => {
  return useQuery({
    queryKey: ['all-order-items'],
    queryFn: async () => {
      console.log('Fetching all order items...');
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(id, title, images),
          order:orders(order_number, delivery_address, user_id),
          shop_owner:profiles!shop_owner_id(full_name, address, phone)
        `)
        .order('created_at', { ascending: false });
      
      console.log('Order items query result:', { data, error });
      if (error) throw error;
      return data as OrderItem[];
    },
    staleTime: 0, // Force fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Hook to fetch payout requests for shop owners
export const usePayoutRequests = () => {
  return useQuery({
    queryKey: ['payout-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_requests')
        .select(`
          *,
          order_item:order_items(
            *,
            product:products(title),
            order:orders(order_number)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PayoutRequest[];
    },
  });
};

// Hook to fetch all payout requests for admin
export const useAllPayoutRequests = () => {
  return useQuery({
    queryKey: ['all-payout-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_requests')
        .select(`
          *,
          order_item:order_items(
            *,
            product:products(title),
            order:orders(order_number)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PayoutRequest[];
    },
  });
};

// Hook to request dispatch
export const useRequestDispatch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderItemId: string) => {
      const { data, error } = await supabase
        .from('order_items')
        .update({
          status: 'dispatch_requested',
          dispatch_requested_at: new Date().toISOString(),
        })
        .eq('id', orderItemId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-owner-order-items'] });
      toast({
        title: 'Dispatch Requested',
        description: 'Dispatch request has been sent to admin.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to request dispatch. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Hook to approve dispatch (admin)
export const useApproveDispatch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderItemId: string) => {
      const { data, error } = await supabase
        .from('order_items')
        .update({
          status: 'dispatched',
          dispatched_at: new Date().toISOString(),
        })
        .eq('id', orderItemId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-order-items'] });
      toast({
        title: 'Dispatch Approved',
        description: 'Order has been marked as dispatched.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to approve dispatch. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Hook to mark order as delivered (admin)
export const useMarkDelivered = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderItemId: string) => {
      const { data, error } = await supabase
        .from('order_items')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', orderItemId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-order-items'] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      toast({
        title: 'Order Delivered',
        description: 'Order has been marked as delivered.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to mark as delivered. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Hook to create payout request
export const useCreatePayoutRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderItemId, amount, shopOwnerId }: { orderItemId: string; amount: number; shopOwnerId: string }) => {
      const { data, error } = await supabase
        .from('payout_requests')
        .insert({
          order_item_id: orderItemId,
          shop_owner_id: shopOwnerId,
          amount: amount,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-requests'] });
      toast({
        title: 'Payout Requested',
        description: 'Your payout request has been submitted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create payout request. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Hook to process payout request (admin)
export const useProcessPayout = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payoutRequestId: string) => {
      const { data, error } = await supabase
        .from('payout_requests')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', payoutRequestId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-payout-requests'] });
      toast({
        title: 'Payout Processed',
        description: 'Payout request has been processed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to process payout. Please try again.',
        variant: 'destructive',
      });
    },
  });
};
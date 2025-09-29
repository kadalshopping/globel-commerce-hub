import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DeliveryAddress {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useDeliveryAddresses = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['delivery-addresses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (address: Omit<DeliveryAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) {
        throw new Error('Authentication required. Please sign in to save addresses.');
      }
      
      console.log('Creating address with user_id:', user.id, address);
      
      const { data, error } = await supabase
        .from('delivery_addresses')
        .insert({ ...address, user_id: user.id })
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST301') {
          throw new Error('Permission denied. Please check your authentication status.');
        } else if (error.code === '23505') {
          throw new Error('This address already exists.');
        } else {
          throw new Error(error.message || 'Failed to save address. Please try again.');
        }
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-addresses'] });
    },
    onError: (error) => {
      console.error('Address creation failed:', error);
    }
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryAddress> & { id: string }) => {
      const { data, error } = await supabase
        .from('delivery_addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-addresses'] });
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_addresses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-addresses'] });
    },
  });
};
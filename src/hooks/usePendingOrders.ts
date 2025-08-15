import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePendingOrders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('pending_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending orders:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user,
  });
};
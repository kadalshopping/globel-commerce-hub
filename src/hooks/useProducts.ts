import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, CreateProductData } from '@/types/product';
import { useToast } from '@/hooks/use-toast';

export const useProducts = (userId?: string) => {
  return useQuery({
    queryKey: ['products', userId],
    queryFn: async () => {
      const query = supabase.from('products').select('*');
      
      if (userId) {
        query.eq('shop_owner_id', userId);
      } else {
        query.eq('status', 'approved');
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Product[];
    },
  });
};

export const usePendingProducts = () => {
  return useQuery({
    queryKey: ['products', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Product[];
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (productData: CreateProductData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in to create products');

      const { data, error } = await supabase
        .from('products')
        .insert([{ ...productData, shop_owner_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product created successfully and sent for approval',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create product: ' + error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update product: ' + error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete product: ' + error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useApproveProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, adminNotes }: { productId: string; adminNotes?: string }) => {
      const { data, error } = await supabase.rpc('approve_product', {
        product_id: productId,
        admin_notes_text: adminNotes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product approved successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to approve product: ' + error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRejectProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, adminNotes }: { productId: string; adminNotes: string }) => {
      const { data, error } = await supabase.rpc('reject_product', {
        product_id: productId,
        admin_notes_text: adminNotes,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product rejected',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to reject product: ' + error.message,
        variant: 'destructive',
      });
    },
  });
};
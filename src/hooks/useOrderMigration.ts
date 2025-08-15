import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMigrateCompletedOrders = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      console.log('🔄 Starting migration of completed orders...');
      
      // Get all completed orders that don't have order_items
      const { data: completedOrders, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          items,
          status,
          payment_status
        `)
        .eq('status', 'confirmed')
        .eq('payment_status', 'completed');

      if (fetchError) {
        throw new Error('Failed to fetch completed orders');
      }

      if (!completedOrders || completedOrders.length === 0) {
        return { message: 'No completed orders found to migrate' };
      }

      let migratedCount = 0;

      for (const order of completedOrders) {
        try {
          // Check if order_items already exist for this order
          const { data: existingItems } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', order.id)
            .limit(1);

          if (existingItems && existingItems.length > 0) {
            console.log(`✅ Order ${order.order_number} already has order_items, skipping`);
            continue;
          }

          console.log(`🔧 Migrating order ${order.order_number}...`);

          // Create order_items for each item in the order
          const items = order.items as any[];
          if (!items || !Array.isArray(items)) {
            console.log(`⚠️ Order ${order.order_number} has no items, skipping`);
            continue;
          }

          for (const item of items) {
            // Get product details to find shop_owner_id
            const { data: product } = await supabase
              .from('products')
              .select('shop_owner_id')
              .eq('id', item.productId)
              .maybeSingle();

            if (product) {
              // Create order_item
              const { error: insertError } = await supabase
                .from('order_items')
                .insert({
                  order_id: order.id,
                  product_id: item.productId,
                  shop_owner_id: product.shop_owner_id,
                  quantity: item.quantity,
                  price: item.price,
                  status: 'pending' // Start with pending status for existing orders
                });

              if (insertError) {
                console.error(`❌ Failed to create order_item for order ${order.order_number}:`, insertError);
              } else {
                console.log(`✅ Created order_item for product ${item.productId} in order ${order.order_number}`);
              }
            } else {
              console.log(`⚠️ Product ${item.productId} not found, skipping order_item creation`);
            }
          }

          migratedCount++;
        } catch (error) {
          console.error(`❌ Error migrating order ${order.order_number}:`, error);
        }
      }

      return { 
        message: `Successfully migrated ${migratedCount} completed orders`,
        migratedCount,
        totalFound: completedOrders.length
      };
    },
    onSuccess: (result) => {
      console.log('🎉 Migration completed:', result);
      toast({
        title: 'Migration Completed',
        description: result.message,
      });
    },
    onError: (error) => {
      console.error('❌ Migration failed:', error);
      toast({
        title: 'Migration Failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    },
  });
};
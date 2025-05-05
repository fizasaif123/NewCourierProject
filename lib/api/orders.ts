import { supabase } from '@/lib/supabase/client';

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        quantity,
        skus (
          name,
          code
        )
      ),
      warehouses (
        name,
        location
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createOrder(order: {
  customer_id: string;
  warehouse_id: string;
  items: Array<{ sku_id: string; quantity: number }>;
}) {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: `ORD${Date.now()}`,
      status: 'pending',
      customer_id: order.customer_id,
      warehouse_id: order.warehouse_id
    })
    .select()
    .single();

  if (orderError) throw orderError;

  const orderItems = order.items.map(item => ({
    order_id: orderData.id,
    sku_id: item.sku_id,
    quantity: item.quantity
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  return orderData;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { data, error } = await supabase
    .rpc('update_order_status', {
      order_id: orderId,
      new_status: status
    });

  if (error) throw error;
  return data;
}

export async function subscribeToOrderUpdates(callback: (payload: any) => void) {
  return supabase
    .channel('orders')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders'
      },
      callback
    )
    .subscribe();
}

export async function subscribeToInventoryUpdates(callback: (payload: any) => void) {
  return supabase
    .channel('inventory')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_levels'
      },
      callback
    )
    .subscribe();
}
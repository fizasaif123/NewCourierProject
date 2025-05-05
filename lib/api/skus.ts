import { supabase } from '@/lib/supabase/client';

// Get all SKUs with inventory levels and warehouse info
export async function getSKUs() {
    const { data, error } = await supabase
        .from('skus')
        .select(`
            *,
            inventory_levels (
                quantity,
                warehouse_id,
                warehouses (
                    name
                )
            )
        `);

    if (error) throw error;
    return data;
}

// Create a new SKU (prevent duplicates)
export async function createSKU(sku: {
    code: string;
    name: string;
    description?: string;
    category: string;
}) {
    // Check if SKU code already exists
    const { data: existingSKU, error: fetchError } = await supabase
        .from('skus')
        .select('*')
        .eq('code', sku.code)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        // Ignore "row not found" error
        throw fetchError;
    }

    if (existingSKU) {
        throw new Error(`SKU with code '${sku.code}' already exists.`);
    }

    // Insert new SKU
    const { data, error } = await supabase
        .from('skus')
        .insert(sku)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Update an existing SKU
export async function updateSKU(
    id: string,
    updates: Partial<{
        code: string;
        name: string;
        description: string;
        category: string;
    }>
) {
    const { data, error } = await supabase
        .from('skus')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Delete an SKU (with cascading deletions)
export async function deleteSKU(id: string) {
    // Delete related inventory levels
    const { error: inventoryError } = await supabase
        .from('inventory_levels')
        .delete()
        .eq('sku_id', id);

    if (inventoryError) throw inventoryError;

    // Delete related transactions
    const { error: transactionsError } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('sku_id', id);

    if (transactionsError) throw transactionsError;

    // Delete the SKU itself
    const { error } = await supabase
        .from('skus')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

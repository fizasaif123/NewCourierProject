import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { sku_id, bin_id, quantity } = await request.json();

    if (!sku_id || !bin_id || quantity === undefined) {
      return NextResponse.json(
        { error: 'SKU ID, Bin ID, and Quantity are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('pallets')
      .insert({ sku_id, bin_id, quantity })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

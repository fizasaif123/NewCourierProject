import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const { sku_id, reason, quantity, location } = await request.json();

    if (!sku_id || !reason || !location || quantity === undefined) {
      return NextResponse.json(
        { error: 'SKU ID, Reason, Quantity, and Location are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('quarantine')
      .insert({ sku_id, reason, quantity, location })
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

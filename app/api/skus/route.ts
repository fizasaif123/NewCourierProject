import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// GET Method
export async function GET() {
    console.log('GET /api/skus called');
    const { data, error } = await supabase.from('skus').select('*');
    if (error) {
        console.error('Supabase GET Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log('GET Data:', data);
    return NextResponse.json(data, { status: 200 });
}

// POST Method
export async function POST(request: Request) {
    console.log('POST /api/skus called');
    try {
        const body = await request.json();
        const { code, name, description, category } = body;

        console.log('POST Body:', body);

        if (!code || !name || !category) {
            console.error('POST Validation Error: Missing required fields');
            return NextResponse.json(
                { error: 'Code, name, and category are required.' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('skus')
            .insert({ code, name, description, category })
            .select()
            .single();

        if (error) {
            console.error('Supabase POST Error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('POST Data:', data);
        return NextResponse.json(data, { status: 201 });
    } catch (err) {
    // @ts-expect-error jks js
        console.error('POST Exception:', err.message);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// PATCH Method
export async function PATCH(request: Request) {
    console.log('PATCH /api/skus called');
    try {
        const body = await request.json();
        const { id, updates } = body;

        console.log('PATCH Body:', body);

        if (!id || !updates) {
            console.error('PATCH Validation Error: Missing ID or updates');
            return NextResponse.json(
                { error: 'ID and updates are required.' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('skus')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Supabase PATCH Error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('PATCH Data:', data);
        return NextResponse.json(data, { status: 200 });
    } catch (err) {
    // @ts-expect-error jks js
        console.error('PATCH Exception:', err.message);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// DELETE Method
export async function DELETE(request: Request) {
    console.log('DELETE /api/skus called');
    try {
        const body = await request.json();
        const { id } = body;

        console.log('DELETE Body:', body);

        if (!id) {
            console.error('DELETE Validation Error: Missing ID');
            return NextResponse.json({ error: 'ID is required.' }, { status: 400 });
        }

        const { error } = await supabase.from('skus').delete().eq('id', id);

        if (error) {
            console.error('Supabase DELETE Error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('DELETE Success');
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
    // @ts-expect-error jks js
        console.error('DELETE Exception:', err.message);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

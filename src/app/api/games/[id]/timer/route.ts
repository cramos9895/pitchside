import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await request.json();
        
        // Ensure payload only contains timer-related fields
        const allowedFields = ['timer_status', 'timer_duration', 'timer_started_at', 'half_length'];
        const safePayload: any = {};
        for (const key of Object.keys(payload)) {
            if (allowedFields.includes(key)) {
                safePayload[key] = payload[key];
            }
        }

        const { data, error } = await supabase
            .from('games')
            .update(safePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[API/Games/Timer] DB Update Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (e: any) {
        console.error('[API/Games/Timer] Exception:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

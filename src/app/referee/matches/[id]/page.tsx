import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { LiveMatchClient } from './LiveMatchClient';

export const revalidate = 0;

export default async function LiveMatchPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: matchId } = await params;
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // 1. Fetch Match
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

    if (matchError || !match) {
        return notFound();
    }

    // 2. Security Check: Is this user a Confirmed official for this match?
    const { data: official, error: officialError } = await supabase
        .from('match_officials')
        .select('role, status')
        .eq('match_id', matchId)
        .eq('user_id', user.id)
        .single();

    // If not confirmed, they have no business being on the live match card.
    if (officialError || !official || official.status !== 'Confirmed') {
        redirect('/referee'); // Kick them back to the hub
    }

    return <LiveMatchClient initialMatch={match} />;
}

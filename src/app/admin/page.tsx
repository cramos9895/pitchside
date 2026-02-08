
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdminGameList } from '@/components/admin/AdminGameList';

export const revalidate = 0;

export default async function AdminDashboard() {
    const supabase = await createClient();

    // Fetch all games, ordered by start time
    const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching games:', error);
    }

    return (
        <div className="min-h-screen bg-pitch-black text-white font-sans pt-32 px-6">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 border-b border-white/10 pb-6 gap-6">
                    <div>
                        <div className="inline-block px-3 py-1 bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-widest rounded mb-2">
                            Admin Portal
                        </div>
                        <h1 className="font-heading text-4xl md:text-5xl font-bold uppercase italic tracking-tighter">
                            Game <span className="text-pitch-accent">Manager</span>
                        </h1>
                        <p className="text-pitch-secondary mt-2">
                            Create matches, manage rosters, and assign teams.
                        </p>
                    </div>

                    <Link
                        href="/admin/games/new"
                        className="flex items-center gap-2 px-6 py-4 bg-pitch-accent text-pitch-black font-black uppercase tracking-wider rounded-sm hover:bg-white transition-colors"
                    >
                        <Plus className="w-5 h-5" /> Create New Game
                    </Link>
                </div>

                {/* Games List (Client Component with Tabs) */}
                <AdminGameList initialGames={games || []} />
            </div>
        </div>
    );
}

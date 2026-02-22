import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { LayoutDashboard, Users, MapPin, Settings, ArrowLeft } from 'lucide-react';

export default async function FacilityLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role')
        .eq('id', user.id)
        .single();

    if (profile?.system_role !== 'facility_admin' && profile?.system_role !== 'super_admin') {
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-pitch-black flex pt-20">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-pitch-card hidden md:block border-t">
                <div className="p-6">
                    <h2 className="text-xl font-heading font-black italic text-pitch-accent uppercase tracking-wider mb-6">
                        Facility Panel
                    </h2>
                    <nav className="space-y-2">
                        <Link href="/facility" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                            <LayoutDashboard className="w-5 h-5" />
                            <span className="font-bold uppercase tracking-wider text-sm">Dashboard</span>
                        </Link>
                        <Link href="/facility/leagues" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                            <Users className="w-5 h-5" />
                            <span className="font-bold uppercase tracking-wider text-sm">Leagues</span>
                        </Link>
                        <Link href="/facility/resources" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                            <MapPin className="w-5 h-5" />
                            <span className="font-bold uppercase tracking-wider text-sm">Resources</span>
                        </Link>
                        <Link href="/facility/settings" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                            <Settings className="w-5 h-5" />
                            <span className="font-bold uppercase tracking-wider text-sm">Settings</span>
                        </Link>
                    </nav>
                </div>

                <div className="absolute bottom-0 w-full p-6 border-t border-white/10 bg-black/20">
                    <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-bold uppercase tracking-wider text-sm">Return to Pitch Side</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto mt-4">
                {children}
            </main>
        </div>
    );
}

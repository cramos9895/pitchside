import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { LayoutDashboard, Users, Settings, ArrowLeft, Building2, Banknote } from 'lucide-react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role')
        .eq('id', user.id)
        .single();

    const isMasterAdmin = profile?.role === 'master_admin';
    const isSuperAdmin = profile?.system_role === 'super_admin';
    const isRegularAdmin = profile?.role === 'host';

    // Fetch pending count for Master Admin badge
    let pendingCount = 0;
    if (isMasterAdmin || isSuperAdmin) {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'pending');

        if (count) pendingCount = count;
    }

    if (!isMasterAdmin && !isSuperAdmin && !isRegularAdmin) {
        console.warn(`[ADMIN BLOCK]: User ${user.email} attempted to access Admin Portal without rights.`);
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-pitch-black flex pt-20">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-pitch-card hidden md:flex flex-col border-t h-[calc(100vh-5rem)] sticky top-20">
                <div className="p-6 flex-1 overflow-y-auto">
                    <h2 className="text-xl font-heading font-black italic text-red-500 uppercase tracking-wider mb-6">
                        {isMasterAdmin || isSuperAdmin ? 'Master Panel' : 'Admin Panel'}
                    </h2>
                    <nav className="space-y-2">
                        <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                            <LayoutDashboard className="w-5 h-5" />
                            <span className="font-bold uppercase tracking-wider text-sm">Game Manager</span>
                        </Link>

                        {(isMasterAdmin || isSuperAdmin) && (
                            <>
                                <Link href="/admin/facilities" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                    <Building2 className="w-5 h-5" />
                                    <span className="font-bold uppercase tracking-wider text-sm">Facilities</span>
                                </Link>
                                <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                    <Users className="w-5 h-5" />
                                    <span className="font-bold uppercase tracking-wider text-sm">Users</span>
                                </Link>
                                <Link href="/admin/financials" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-600 cursor-not-allowed">
                                    <Banknote className="w-5 h-5 text-gray-600" />
                                    <span className="font-bold uppercase tracking-wider text-sm">Financials</span>
                                </Link>

                                {/* New Requests Link with Badge */}
                                <Link href="/admin/requests" className="flex items-center justify-between px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 group-hover:text-blue-400 transition-colors" /> {/* Note: Could use a different icon like ShieldCheck or Bell */}
                                        <span className="font-bold uppercase tracking-wider text-sm">Requests</span>
                                    </div>
                                    {pendingCount > 0 && (
                                        <div className="bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse">
                                            {pendingCount}
                                        </div>
                                    )}
                                </Link>

                                <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                    <Settings className="w-5 h-5" />
                                    <span className="font-bold uppercase tracking-wider text-sm">Settings</span>
                                </Link>
                            </>
                        )}
                    </nav>
                </div>

                <div className="p-6 border-t border-white/10 bg-black/20 mt-auto">
                    <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-bold uppercase tracking-wider text-sm">Main Site</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto mt-4 max-w-7xl w-full">
                {children}
            </main>
        </div>
    );
}

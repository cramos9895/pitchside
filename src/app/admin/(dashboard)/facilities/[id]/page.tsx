import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { Building2, MapPin, Database, Trophy, CalendarCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { enterGodMode } from '@/app/actions/impersonate';

export default async function FacilityOverviewPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';

    if (!isSuperAdmin) {
        redirect('/admin');
    }

    const { id } = params;
    const adminClient = createAdminClient();

    // Fetch Facility Data
    const { data: facility, error } = await adminClient
        .from('facilities')
        .select(`
            *,
            resources(count)
        `)
        .eq('id', id)
        .single();

    if (error || !facility) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-2xl font-bold text-red-500 mb-2">Facility Not Found</h2>
                <Link href="/admin/facilities" className="text-pitch-accent hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Directory
                </Link>
            </div>
        );
    }

    const resourceCount = facility.resources?.[0]?.count || 0;
    // Placeholders for future phases as requested by user
    const placeholderLeagues = 0;
    const placeholderBookings = 0;

    return (
        <div className="animate-in fade-in duration-500 space-y-8">
            <Link href="/admin/facilities" className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors mb-4 text-sm font-bold uppercase tracking-wider w-fit">
                <ArrowLeft className="w-4 h-4" /> Directory
            </Link>

            {/* Header & Action Bar */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-8 border-b border-white/10">
                <div>
                    <h1 className="text-4xl font-heading font-black italic text-white uppercase tracking-wider mb-2 flex items-center gap-3">
                        <Building2 className="w-10 h-10 text-pitch-accent" />
                        {facility.name}
                    </h1>
                    <div className="flex items-center gap-4 text-gray-400">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-pitch-secondary" />
                            {facility.address || 'Address not listed'}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-xs">ID: {facility.id}</span>
                    </div>
                </div>

                {/* The God Mode Entry Node */}
                {/* @ts-ignore */}
                <form action={enterGodMode.bind(null, facility.id)}>
                    <button
                        type="submit"
                        className="bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500 transition-all font-black uppercase tracking-widest px-8 py-4 rounded-sm flex items-center justify-center min-w-[250px] gap-3"
                    >
                        <ShieldAlert className="w-5 h-5" />
                        Manage Facility
                    </button>
                    <p className="text-xs text-red-500/80 text-center mt-2 uppercase tracking-widest font-bold">Initiates God Mode</p>
                </form>
            </div>

            {/* Health Check Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-sm p-6 flex flex-col items-center text-center">
                    <Database className="w-8 h-8 text-blue-400 mb-3" />
                    <div className="text-4xl font-black text-white mb-1">{resourceCount}</div>
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-widest">Registred Resources</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-sm p-6 flex flex-col items-center text-center opacity-70">
                    <Trophy className="w-8 h-8 text-pitch-accent mb-3" />
                    <div className="text-4xl font-black text-white mb-1">{placeholderLeagues}</div>
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-widest">Active Leagues</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-sm p-6 flex flex-col items-center text-center opacity-70">
                    <CalendarCheck className="w-8 h-8 text-emerald-400 mb-3" />
                    <div className="text-4xl font-black text-white mb-1">{placeholderBookings}</div>
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-widest">Total Bookings</div>
                </div>
            </div>

            <div className="bg-pitch-card border border-white/10 rounded-sm p-8 text-center mt-8">
                <h3 className="text-xl font-bold text-white mb-2">More details coming soon</h3>
                <p className="text-gray-400">The facility financial overviews, granular booking logs, and active league tables will be injected here during Phase 4.</p>
            </div>

        </div>
    );
}

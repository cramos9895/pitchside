import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { LayoutDashboard, Users, MapPin, Settings, ArrowLeft, ShieldAlert, Calendar, MonitorPlay, ClipboardList, Tag } from 'lucide-react';
import { exitGodMode } from '@/app/actions/impersonate';

export default async function FacilityLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('system_role, role, facility_id')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';

    if (profile?.system_role !== 'facility_admin' && !isSuperAdmin) {
        console.warn(`[FACILITY BLOCK]: User ${user.email} attempted to access Facility Portal without facility_admin role. Redirecting to home.`);
        redirect('/');
    }

    // Handle God Mode Impersonation
    let activeFacilityId = profile?.facility_id;
    let impersonatedFacilityName = null;

    if (isSuperAdmin) {
        const cookieStore = await cookies();
        const impersonateCookie = cookieStore.get('pitchside_impersonate_facility_id');

        if (impersonateCookie?.value) {
            activeFacilityId = impersonateCookie.value;

            // Fetch the name of the facility they are impersonating securely
            const adminClient = createAdminClient();
            const { data: targetFacility } = await adminClient
                .from('facilities')
                .select('name')
                .eq('id', activeFacilityId)
                .single();

            if (targetFacility) {
                impersonatedFacilityName = targetFacility.name;
            }
        }
    }

    if (!isSuperAdmin && !activeFacilityId) {
        console.warn(`[FACILITY BLOCK]: User ${user.email} is a facility_admin but has no assigned facility_id. Redirecting to home.`);
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-pitch-black flex flex-col">
            {/* God Mode Banner */}
            {impersonatedFacilityName && (
                <div className="w-full bg-red-600 text-white px-4 py-2 flex items-center justify-between text-sm z-40 sticky top-16 shadow-lg border-b border-red-700">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                        <ShieldAlert className="w-4 h-4" />
                        God Mode: Viewing as {impersonatedFacilityName}
                    </div>
                    <form action={exitGodMode}>
                        <button type="submit" className="bg-black/20 hover:bg-black/40 transition-colors px-3 py-1 rounded-sm font-bold text-xs">
                            Exit God Mode
                        </button>
                    </form>
                </div>
            )}

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 border-r border-white/10 bg-pitch-card hidden md:block h-[calc(100vh-5rem)] sticky top-20 overflow-y-auto">
                    <div className="p-6">
                        <h2 className="text-xl font-heading font-black italic text-pitch-accent uppercase tracking-wider mb-6">
                            Facility Panel
                        </h2>
                        <nav className="space-y-2">
                            <Link href="/facility" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                <LayoutDashboard className="w-5 h-5" />
                                <span className="font-bold uppercase tracking-wider text-sm">Dashboard</span>
                            </Link>
                            <Link href="/facility/operations" className="flex items-center gap-3 px-4 py-3 rounded-sm text-pitch-accent/80 hover:bg-white/5 hover:text-pitch-accent transition-colors">
                                <ClipboardList className="w-5 h-5" />
                                <span className="font-bold uppercase tracking-wider text-sm">Game Day</span>
                            </Link>
                            <Link href="/facility/leagues" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                <Users className="w-5 h-5" />
                                <span className="font-bold uppercase tracking-wider text-sm">Leagues</span>
                            </Link>
                            <Link href="/facility/resources" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                <MapPin className="w-5 h-5" />
                                <span className="font-bold uppercase tracking-wider text-sm">Resources</span>
                            </Link>
                            <Link href="/facility/settings/team" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                <Users className="w-5 h-5" />
                                <span className="font-bold uppercase tracking-wider text-sm">Team</span>
                            </Link>

                            <Link href="/facility/calendar" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                <Calendar className="w-5 h-5" />
                                <span className="font-bold uppercase tracking-wider text-sm">Schedule Engine</span>
                            </Link>

                            <Link href="/facility/display" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                <MonitorPlay className="w-5 h-5" />
                                <span className="font-bold uppercase tracking-wider text-sm">Kiosk Mode</span>
                            </Link>

                            <Link href="/facility/settings" className="flex items-center gap-3 px-4 py-3 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                <Settings className="w-5 h-5" />
                                <span className="font-bold uppercase tracking-wider text-sm">Settings</span>
                            </Link>

                            <Link href="/facility/settings/promotions" className="flex items-center gap-3 px-4 py-3 rounded-sm text-pitch-accent/80 hover:bg-white/5 hover:text-pitch-accent transition-colors ml-4 border-l border-white/10">
                                <Tag className="w-4 h-4" />
                                <span className="font-bold uppercase tracking-wider text-xs">Promotions Hub</span>
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
                <main className="flex-1 p-8 overflow-y-auto pt-2">
                    {children}
                </main>
            </div>
        </div>
    );
}

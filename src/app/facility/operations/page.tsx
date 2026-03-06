import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import OperationsCheckIn from '@/components/facility/operations/OperationsCheckIn';
import { Search } from 'lucide-react';
import { cookies } from 'next/headers';

export const metadata = { title: 'Game Day Operations | Pitch Side' };

export default async function OperationsDashboard() {
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

    if (!profile) return <div>Access Denied</div>;

    const isSuperAdmin = profile.system_role === 'super_admin' || profile.role === 'master_admin';
    let targetFacilityId = profile.facility_id;

    if (isSuperAdmin) {
        const cookieStore = await cookies();
        const godFacility = cookieStore.get('pitchside_impersonate_facility_id')?.value;
        if (godFacility) targetFacilityId = godFacility;
    }

    if (!targetFacilityId) {
        return <div className="p-8 text-white">Please assign a facility to manage operations.</div>;
    }

    const adminSupabase = createAdminClient();

    // Fetch TODAY'S Bookings. 
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: bookings } = await adminSupabase
        .from('resource_bookings')
        .select(`
            *,
            resource:resources(name)
        `)
        .eq('facility_id', targetFacilityId)
        .in('status', ['confirmed', 'paid', 'awaiting_payment']) // Paid or confirmed events
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .order('start_time', { ascending: true });

    return (
        <div className="max-w-3xl mx-auto pb-20">
            <header className="mb-6">
                <h1 className="text-3xl font-black italic uppercase text-white mb-1">Game Day</h1>
                <p className="text-gray-400 text-sm font-bold tracking-wide uppercase">{format(todayStart, 'EEEE, MMMM do, yyyy')}</p>
            </header>

            {!bookings || bookings.length === 0 ? (
                <div className="bg-pitch-card p-8 rounded border border-white/5 text-center flex flex-col items-center justify-center shadow-md">
                    <Search className="w-8 h-8 text-white/20 mb-3" />
                    <h3 className="text-white font-bold text-lg mb-1">No Events Today</h3>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto">There are no confirmed bookings scheduled for today. Kick back and relax.</p>
                </div>
            ) : (
                <div className="space-y-4 relative">
                    <OperationsCheckIn bookings={bookings} facilityId={targetFacilityId} />
                </div>
            )}
        </div>
    );
}

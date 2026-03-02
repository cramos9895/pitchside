import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { KioskWrapper } from '@/components/facility/KioskWrapper';

export const metadata = {
    title: 'Kiosk Display | Pitch Side',
    description: 'Digital signage for today\'s events',
};

// Next.js dynamic rendering to ensure the kiosk always pulls fresh data when loaded
export const dynamic = 'force-dynamic';

export default async function KioskDisplayPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, system_role, role')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.system_role === 'super_admin' || profile?.role === 'master_admin';
    const facilityId = profile?.facility_id;

    if (!isSuperAdmin && !facilityId) {
        redirect('/');
    }

    // Get today's midnight boundaries for the query
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Fetch Today's Bookings
    const { data: bookingsData } = await supabase
        .from('resource_bookings')
        .select(`
            id,
            title,
            start_time,
            end_time,
            renter_name,
            color,
            resources (
                name,
                resource_types (
                    name
                )
            )
        `)
        .eq('facility_id', facilityId)
        .neq('status', 'cancelled')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

    return (
        <KioskWrapper>
            {/* Header */}
            <div className="flex justify-between items-end border-b border-white/20 pb-8 mb-8">
                <div>
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter text-pitch-accent">
                        Today's Schedule
                    </h1>
                    <p className="text-2xl text-gray-400 mt-2 font-bold uppercase tracking-widest">
                        {format(now, 'EEEE, MMMM do')}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-4xl font-bold font-numeric text-white/80">
                        {format(now, 'h:mm a')}
                    </p>
                </div>
            </div>

            {/* List */}
            {(!bookingsData || bookingsData.length === 0) ? (
                <div className="flex items-center justify-center h-[50vh]">
                    <h2 className="text-4xl font-bold text-gray-600 uppercase tracking-widest">No Events Scheduled Today</h2>
                </div>
            ) : (
                <div className="space-y-6">
                    {bookingsData.map((booking: any) => {
                        const start = new Date(booking.start_time);
                        const end = new Date(booking.end_time);
                        const isHappeningNow = now >= start && now <= end;

                        return (
                            <div
                                key={booking.id}
                                className={`flex items-stretch gap-6 p-6 rounded-xl border-l-8 transition-all ${isHappeningNow
                                    ? 'bg-pitch-accent/10 border-pitch-accent transform scale-[1.01] shadow-2xl shadow-pitch-accent/10'
                                    : 'bg-white/5 border-white/20'
                                    }`}
                                style={{ borderLeftColor: isHappeningNow ? undefined : (booking.color || '#3B82F6') }}
                            >
                                {/* Time Block */}
                                <div className="w-64 shrink-0 flex flex-col justify-center border-r border-white/10 pr-6">
                                    <div className="text-4xl font-black font-numeric whitespace-nowrap">
                                        {format(start, 'h:mm')} <span className="text-2xl text-gray-400">{format(start, 'a')}</span>
                                    </div>
                                    <div className="text-xl text-gray-500 font-bold mt-1">
                                        to {format(end, 'h:mm a')}
                                    </div>
                                </div>

                                {/* Event Info */}
                                <div className="flex-1 flex flex-col justify-center pl-4 py-2">
                                    <h2 className={`text-4xl font-black uppercase tracking-tight ${isHappeningNow ? 'text-white' : 'text-gray-200'}`}>
                                        {booking.title}
                                    </h2>
                                    {booking.renter_name && (
                                        <div className="text-2xl text-gray-400 font-bold mt-1">
                                            {booking.renter_name}
                                        </div>
                                    )}
                                    {isHappeningNow && (
                                        <div className="text-pitch-accent font-bold uppercase tracking-widest text-sm mt-3 flex items-center gap-2">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch-accent opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-pitch-accent"></span>
                                            </span>
                                            Happening Now
                                        </div>
                                    )}
                                </div>

                                {/* Resource Block */}
                                <div className="w-80 shrink-0 bg-black/40 rounded-lg p-4 flex flex-col justify-center items-end border border-white/5">
                                    <div className="text-xl text-gray-400 font-bold uppercase tracking-wider mb-1">
                                        {booking.resources?.resource_types?.name || 'Location'}
                                    </div>
                                    <div className="text-3xl font-black text-white text-right">
                                        {booking.resources?.name}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </KioskWrapper>
    );
}

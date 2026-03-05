import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FacilityCalendar } from '@/components/calendar/FacilityCalendar';
import { Calendar } from 'lucide-react';

export const metadata = {
    title: 'Schedule Master | Pitch Side',
    description: 'Manage facility bookings and resources',
};

export default async function FacilityCalendarPage() {
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

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-4xl font-heading font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-pitch-accent" />
                        Schedule Master
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium max-w-2xl">
                        Click on any empty slot to add a new booking. The grid prevents double-booking across all registered resources.
                    </p>
                </div>
            </div>

            <div className="relative">
                <FacilityCalendar
                    initialFacilityId={facilityId}
                />
            </div>
        </div>
    );
}
